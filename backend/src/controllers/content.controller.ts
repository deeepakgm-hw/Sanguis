import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse } from "../utils/ApiResponse";

const FAQ_DATA = [
  {
    question: "How often can I donate blood?",
    answer: "For whole blood donations, the standard minimum interval is 90 days (approximately 3 months). This follows AABB guidelines and ensures your body fully replenishes the donated red blood cells.",
  },
  {
    question: "What are the eligibility requirements?",
    answer: "To be eligible to donate through Sanguis: (1) At least 18 years old, (2) Weigh at least 50kg (110 lbs), (3) In good general health, and (4) Hemoglobin >= 12.5 g/dL.",
  },
  {
    question: "How is my trust score calculated?",
    answer: "Your Sanguis Trust Score (0–100) rewards reliability and responsiveness based on completed donations, response time, and recipient feedback.",
  },
  {
    question: "Is my medical information kept private?",
    answer: "Yes. Your medical data is encrypted at rest and in transit. Only verified hospitals matched with you can view relevant blood group data during active emergency dispatches.",
  },
];

const BLOG_DATA = [
  {
    id: "1",
    category: "Education",
    date: "August 3, 2026",
    title: "Why O-Negative is Called the Universal Donor",
    excerpt: "O-negative blood can be given to any patient regardless of blood type, making it critical in emergencies.",
    readMin: 4,
  },
  {
    id: "2",
    category: "Community",
    date: "July 22, 2026",
    title: "How Blood Donation Impacts Sickle Cell Patients",
    excerpt: "For patients with sickle cell disease, regular blood transfusions are life-sustaining interventions.",
    readMin: 6,
  },
  {
    id: "3",
    category: "News",
    date: "July 10, 2026",
    title: "Sanguis Reaches 1,000 Successful Matches in Lagos",
    excerpt: "Sanguis has facilitated over 1,000 life-saving blood donor-recipient connections across Lagos state.",
    readMin: 3,
  },
];

export const getFaqContent = asyncHandler(async (_req: Request, res: Response) => {
  return ApiResponse.success(res, FAQ_DATA, "FAQ content fetched");
});

export const getBlogContent = asyncHandler(async (_req: Request, res: Response) => {
  return ApiResponse.success(res, BLOG_DATA, "Blog content fetched");
});
