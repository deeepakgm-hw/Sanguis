import { Request, Response, NextFunction } from "express";
import { findNearbyHospitals } from "../services/hospital.service";

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
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
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
