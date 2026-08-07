import { z } from "zod";

export const getNearbyHospitalsSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({
    lat: z.coerce
      .number({ required_error: "lat (latitude) is required" })
      .min(-90, "Latitude must be between -90 and 90")
      .max(90, "Latitude must be between -90 and 90"),
    lng: z.coerce
      .number({ required_error: "lng (longitude) is required" })
      .min(-180, "Longitude must be between -180 and 180")
      .max(180, "Longitude must be between -180 and 180"),
    radius: z.coerce
      .number()
      .min(100, "Radius must be at least 100 meters")
      .max(50000, "Radius cannot exceed 50,000 meters")
      .optional()
      .default(15000),
  }),
  params: z.object({}).optional(),
});
