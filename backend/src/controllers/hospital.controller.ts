import { Request, Response, NextFunction } from "express";
import { findNearbyHospitals, fetchIndianHospitalsFromRapidAPI } from "../services/hospital.service";
import { ApiResponse } from "../utils/ApiResponse";

/**
 * GET /api/v1/hospitals/nearby?lat=&lng=&radius=
 * Controller handler for looking up nearby hospitals via Google Places API / DB fallback.
 */
export async function getNearbyHospitalsHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const lat = Number(req.query.lat) || 12.9716;
    const lng = Number(req.query.lng) || 77.5946;
    const radius = req.query.radius ? Number(req.query.radius) : 15000;

    const result = await findNearbyHospitals(lat, lng, radius);

    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/hospitals/all
 * GET /api/hospitals
 * Controller handler for fetching real-time Indian hospitals via RapidAPI.
 * Query Params: city, state, search, page, limit
 */
export async function getAllHospitals(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const city = req.query.city as string | undefined;
    const state = req.query.state as string | undefined;
    const search = req.query.search as string | undefined;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;

    const result = await fetchIndianHospitalsFromRapidAPI({
      city,
      state,
      search,
      page,
      limit,
    });

    ApiResponse.success(res, result.hospitals, "Hospitals fetched successfully", 200, {
      total: result.total,
      page: result.page,
      limit: result.limit,
      fromCache: result.fromCache,
      source: result.source,
    });
  } catch (err) {
    next(err);
  }
}
