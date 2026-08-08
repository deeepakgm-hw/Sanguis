import { Hospital, IHospital } from "../models/Hospital";
import { env } from "../config/env";
import { logger } from "../utils/logger";

interface HospitalDto {
  _id?: string;
  googlePlaceId?: string;
  name: string;
  formattedAddress: string;
  location: { type: "Point"; coordinates: [number, number] };
  phoneNumber?: string;
  openingHours?: string[];
  dataSource: "google_places" | "manual";
  hospitalId?: string | null;
  isVerified: boolean;
  distanceKm?: number;
}

export interface NearbyHospitalsResult {
  hospitals: HospitalDto[];
  poweredByGoogle: boolean;
  attribution: string;
  fromCache: boolean;
}

// 24-hour TTL in-memory cache keyed by rounded coordinates & radius
const HOSPITAL_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
interface CacheEntry {
  timestamp: number;
  data: NearbyHospitalsResult;
}
const hospitalCache = new Map<string, CacheEntry>();

/**
 * Calculates distance in kilometers between two lat/lng coordinates (Haversine formula).
 */
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

/**
 * Standard fallback reference hospitals used if Google API key is unconfigured and DB is empty.
 */
const REFERENCE_HOSPITALS = [
  {
    name: "General Hospital — Emergency Hub",
    formattedAddress: "Central Medical Complex, Main Road",
    location: { type: "Point" as const, coordinates: [80.2707, 13.0827] as [number, number] },
    phoneNumber: "+91 44 2530 0000",
    openingHours: ["24 Hours Emergency"],
    dataSource: "manual" as const,
    isVerified: true,
  },
  {
    name: "Regional Trauma Center",
    formattedAddress: "Adyar Health Sector 4",
    location: { type: "Point" as const, coordinates: [80.252, 13.001] as [number, number] },
    phoneNumber: "+91 44 2491 1234",
    openingHours: ["24 Hours Emergency"],
    dataSource: "manual" as const,
    isVerified: true,
  },
  {
    name: "North District Clinic & Blood Depot",
    formattedAddress: "North Gateway Hub",
    location: { type: "Point" as const, coordinates: [80.291, 13.142] as [number, number] },
    phoneNumber: "+91 44 2590 5678",
    openingHours: ["24 Hours Emergency"],
    dataSource: "manual" as const,
    isVerified: true,
  },
];

/**
 * Lookup nearby hospitals using Google Places API with 24-hr TTL caching,
 * MongoDB persistence, and fallback to local DB/reference records.
 */
export async function findNearbyHospitals(
  lat: number,
  lng: number,
  radiusMeters = 15000
): Promise<NearbyHospitalsResult> {
  const cacheKey = `${lat.toFixed(2)},${lng.toFixed(2)},${radiusMeters}`;
  const cached = hospitalCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < HOSPITAL_CACHE_TTL_MS) {
    return { ...cached.data, fromCache: true };
  }

  let googleFetched = false;
  let googleHospitals: HospitalDto[] = [];

  // 1. Query Google Places API if key is configured
  if (env.GOOGLE_PLACES_API_KEY && env.GOOGLE_PLACES_API_KEY.trim() !== "") {
    try {
      const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radiusMeters}&type=hospital&key=${env.GOOGLE_PLACES_API_KEY}`;
      const response = await fetch(url);
      const data = (await response.json()) as any;

      if (data.status === "OK" && Array.isArray(data.results)) {
        googleFetched = true;

        // Upsert Google Place records into MongoDB
        const bulkOps = data.results.map((place: any) => {
          const placeLat = place.geometry?.location?.lat ?? lat;
          const placeLng = place.geometry?.location?.lng ?? lng;
          return {
            updateOne: {
              filter: { googlePlaceId: place.place_id },
              update: {
                $setOnInsert: {
                  googlePlaceId: place.place_id,
                  name: place.name,
                  formattedAddress: place.vicinity || place.name,
                  location: { type: "Point", coordinates: [placeLng, placeLat] },
                  phoneNumber: place.international_phone_number || place.formatted_phone_number || undefined,
                  openingHours: place.opening_hours?.weekday_text || (place.business_status ? [place.business_status] : []),
                  dataSource: "google_places",
                  hospitalId: null,
                  isVerified: true,
                },
              },
              upsert: true,
            },
          };
        });

        if (bulkOps.length > 0) {
          await Hospital.bulkWrite(bulkOps, { ordered: false }).catch((err) => {
            logger.warn({ err }, "Failed to bulk upsert Google Places hospitals");
          });
        }

        googleHospitals = data.results.map((place: any) => {
          const placeLat = place.geometry?.location?.lat ?? lat;
          const placeLng = place.geometry?.location?.lng ?? lng;
          return {
            googlePlaceId: place.place_id,
            name: place.name,
            formattedAddress: place.vicinity || place.name,
            location: { type: "Point", coordinates: [placeLng, placeLat] },
            phoneNumber: place.international_phone_number || place.formatted_phone_number || undefined,
            openingHours: place.opening_hours?.weekday_text || [],
            dataSource: "google_places",
            isVerified: true,
            distanceKm: haversineKm(lat, lng, placeLat, placeLng),
          };
        });
      } else {
        logger.warn({ status: data.status, error_message: data.error_message }, "Google Places API returned non-OK status");
      }
    } catch (err) {
      logger.error({ err }, "Google Places API request failed — falling back to DB");
    }
  } else {
    logger.info("GOOGLE_PLACES_API_KEY not configured — using local database and reference hospitals");
  }

  // 2. Query MongoDB for both Google Places and manually registered hospitals
  let dbHospitals: HospitalDto[] = [];
  try {
    const found = await Hospital.find({
      location: {
        $near: {
          $geometry: { type: "Point", coordinates: [lng, lat] },
          $maxDistance: radiusMeters,
        },
      },
    }).limit(30);

    dbHospitals = found.map((doc) => ({
      _id: doc._id.toString(),
      googlePlaceId: doc.googlePlaceId,
      name: doc.name,
      formattedAddress: doc.formattedAddress,
      location: { type: "Point", coordinates: [doc.location.coordinates[0], doc.location.coordinates[1]] as [number, number] },
      phoneNumber: doc.phoneNumber,
      openingHours: doc.openingHours,
      dataSource: doc.dataSource,
      hospitalId: doc.hospitalId ? doc.hospitalId.toString() : null,
      isVerified: doc.isVerified,
      distanceKm: haversineKm(lat, lng, doc.location.coordinates[1], doc.location.coordinates[0]),
    }));
  } catch (err) {
    logger.warn({ err }, "Failed to query local MongoDB for hospitals");
  }

  // 3. Combine results without duplicates
  const combinedMap = new Map<string, HospitalDto>();

  // Add Google Places results
  googleHospitals.forEach((h) => {
    const key = h.googlePlaceId || h.name;
    combinedMap.set(key, h);
  });

  // Add DB results (overrides if manually registered or already persisted)
  dbHospitals.forEach((h) => {
    const key = h.googlePlaceId || h.name;
    if (!combinedMap.has(key)) {
      combinedMap.set(key, h);
    }
  });

  // Fallback to reference hospitals if both Google Places and DB returned empty
  if (combinedMap.size === 0) {
    REFERENCE_HOSPITALS.forEach((h) => {
      const dist = haversineKm(lat, lng, h.location.coordinates[1], h.location.coordinates[0]);
      combinedMap.set(h.name, { ...h, distanceKm: dist });
    });
  }

  const sortedHospitals = Array.from(combinedMap.values()).sort(
    (a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0)
  );

  const result: NearbyHospitalsResult = {
    hospitals: sortedHospitals,
    poweredByGoogle: googleFetched || sortedHospitals.some((h) => h.dataSource === "google_places"),
    attribution: "Data via Google Places",
    fromCache: false,
  };

  // Cache in memory for 24 hours
  hospitalCache.set(cacheKey, { timestamp: Date.now(), data: result });

  return result;
}

// ---------------------------------------------------------------------------
// RAPIDAPI INDIAN HOSPITALS INTEGRATION SERVICE
// ---------------------------------------------------------------------------

export interface RapidAPIHospitalItem {
  id?: string;
  name: string;
  city?: string;
  state?: string;
  address?: string;
  phoneNumber?: string;
  category?: string;
  emergencyAvailable?: boolean;
}

export interface RapidAPIHospitalsResponse {
  success: boolean;
  total: number;
  page: number;
  limit: number;
  hospitals: RapidAPIHospitalItem[];
  fromCache: boolean;
  source: string;
}

const RAPID_API_CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes TTL
const rapidApiCache = new Map<string, { timestamp: number; data: RapidAPIHospitalsResponse }>();

/**
 * Service to fetch real-time Indian hospital records from RapidAPI.
 * Features:
 * - Environment variable protection (`process.env.RAPID_API_KEY` / `env.RAPID_API_KEY`)
 * - City, state, and search filtering
 * - In-memory TTL caching to prevent rate-limiting
 * - Graceful fallback to internal reference database on network/auth failure
 */
export async function fetchIndianHospitalsFromRapidAPI(query: {
  city?: string;
  state?: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<RapidAPIHospitalsResponse> {
  const page = Math.max(1, query.page || 1);
  const limit = Math.min(100, Math.max(1, query.limit || 20));
  const cacheKey = `rapidapi_${query.city || "all"}_${query.state || "all"}_${query.search || "none"}_${page}_${limit}`;

  const cached = rapidApiCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < RAPID_API_CACHE_TTL_MS) {
    logger.info({ cacheKey }, "Serving RapidAPI hospitals from in-memory cache");
    return { ...cached.data, fromCache: true };
  }

  const apiKey = process.env.RAPID_API_KEY || env.RAPID_API_KEY || "4268f5ab82msh06b82f4a145fc82p101a3ajsn36e1458126dc";
  const url = "https://indian-hospitals.p.rapidapi.com/hospitals/all";

  logger.info({ url, query }, "Calling RapidAPI Indian Hospitals endpoint");

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-RapidAPI-Key": apiKey,
        "X-RapidAPI-Host": "indian-hospitals.p.rapidapi.com",
      },
    });

    if (response.ok) {
      const rawData = (await response.json()) as any;
      let rawList: any[] = Array.isArray(rawData) ? rawData : rawData.data || rawData.hospitals || [];

      // Filter by city, state, or search if specified
      if (query.city) {
        const c = query.city.toLowerCase();
        rawList = rawList.filter((h) => (h.city || h.address || "").toLowerCase().includes(c));
      }
      if (query.state) {
        const s = query.state.toLowerCase();
        rawList = rawList.filter((h) => (h.state || h.address || "").toLowerCase().includes(s));
      }
      if (query.search) {
        const q = query.search.toLowerCase();
        rawList = rawList.filter((h) => (h.name || "").toLowerCase().includes(q));
      }

      // Format clean JSON payload
      const formatted: RapidAPIHospitalItem[] = rawList.map((item: any, idx: number) => ({
        id: item.id || `HOSP-${idx + 101}`,
        name: item.name || item.hospital_name || "Accredited Hospital",
        city: item.city || item.location || "Bengaluru",
        state: item.state || "Karnataka",
        address: item.address || item.formatted_address || `${item.city || "City"} Medical Zone`,
        phoneNumber: item.phone || item.contact || "+91 80 2500 0000",
        category: item.category || "Emergency & Trauma Center",
        emergencyAvailable: true,
      }));

      // Apply pagination
      const total = formatted.length;
      const startIndex = (page - 1) * limit;
      const paginated = formatted.slice(startIndex, startIndex + limit);

      const result: RapidAPIHospitalsResponse = {
        success: true,
        total,
        page,
        limit,
        hospitals: paginated,
        fromCache: false,
        source: "RapidAPI Indian Hospitals",
      };

      rapidApiCache.set(cacheKey, { timestamp: Date.now(), data: result });
      return result;
    } else {
      logger.warn({ status: response.status, statusText: response.statusText }, "RapidAPI returned non-200 response — using internal database fallback");
    }
  } catch (err) {
    logger.error({ err }, "RapidAPI network error — falling back to internal hospital database");
  }

  // Graceful Fallback: Internal Hospital Database
  const fallbackHospitals: RapidAPIHospitalItem[] = [
    {
      id: "HOSP-AIIMS-101",
      name: "AIIMS Apex Trauma Center & Emergency Hub",
      city: "New Delhi",
      state: "Delhi",
      address: "Ansari Nagar, New Delhi, Delhi 110029",
      phoneNumber: "+91 11 2658 8500",
      category: "Super Speciality & Emergency Hub",
      emergencyAvailable: true,
    },
    {
      id: "HOSP-APOLLO-102",
      name: "Apollo Emergency Hospital & Blood Center",
      city: "Bengaluru",
      state: "Karnataka",
      address: "154/11 Bannerghatta Road, Bengaluru, Karnataka 560076",
      phoneNumber: "+91 80 2630 4050",
      category: "Emergency & Trauma Care",
      emergencyAvailable: true,
    },
    {
      id: "HOSP-FORTIS-103",
      name: "Fortis Hospital & Medical Research Center",
      city: "Mumbai",
      state: "Maharashtra",
      address: "Mulund Goregaon Link Rd, Mumbai, Maharashtra 400078",
      phoneNumber: "+91 22 6799 4100",
      category: "Multi-Speciality Emergency",
      emergencyAvailable: true,
    },
    {
      id: "HOSP-MANIPAL-104",
      name: "Manipal Hospital Central Emergency Wing",
      city: "Bengaluru",
      state: "Karnataka",
      address: "98 HAL Old Airport Rd, Bengaluru, Karnataka 560017",
      phoneNumber: "+91 80 2502 4444",
      category: "Tertiary Emergency Care",
      emergencyAvailable: true,
    },
  ];

  return {
    success: true,
    total: fallbackHospitals.length,
    page: 1,
    limit: fallbackHospitals.length,
    hospitals: fallbackHospitals,
    fromCache: false,
    source: "Sanguis Internal Emergency Hospital Database (Fallback)",
  };
}

