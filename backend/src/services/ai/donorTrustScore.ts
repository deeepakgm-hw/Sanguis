export interface DonorTrustInput {
  responseRate: number; // Percentage (e.g., 94 or 0.94)
  donationsCompleted: number; // Count of successful donations
  accountAgeDays: number; // Age of the account in days
  noShowCount: number; // Count of no-show appointments
}

export interface DonorTrustOutput {
  score: number; // Final score capped between 0 and 100
  breakdown: {
    responseRatePoints: number;
    donationsCompletedPoints: number;
    accountAgePoints: number;
    noShowPenaltyPoints: number;
    explanations: {
      responseRate: string;
      donationsCompleted: string;
      accountAge: string;
      noShows: string;
    };
  };
}

/**
 * Calculates a donor's trust score using a transparent, explainable formula.
 * Strictly avoids AI. Score is derived from:
 * Response Rate (Max 40 points) + Donations Completed (Max 35 points) + Account Age (Max 25 points) - No-Show Penalty (15 pts per event)
 */
export function calculateDonorTrustScore(input: DonorTrustInput): DonorTrustOutput {
  const { responseRate, donationsCompleted, accountAgeDays, noShowCount } = input;

  // 1. Normalize and calculate Response Rate points (Max 40)
  // If response rate is provided as decimal (e.g., 0.94), convert to percentage
  const ratePercentage = responseRate <= 1.0 && responseRate > 0 ? responseRate * 100 : responseRate;
  const clampedRate = Math.max(0, Math.min(100, ratePercentage));
  const responseRatePoints = Math.round((clampedRate * 0.4) * 10) / 10; // Max 40

  // 2. Calculate Donations Completed points (Max 35)
  // 5 points per completed donation, capped at 35 (7 donations)
  const donationValue = 5;
  const donationsCompletedPoints = Math.min(35, donationsCompleted * donationValue);

  // 3. Calculate Account Age points (Max 25)
  // 0.05 points per day (~1.5 points per month), capped at 25 (500 days)
  const ageValuePerDay = 0.05;
  const accountAgePoints = Math.round(Math.min(25, accountAgeDays * ageValuePerDay) * 10) / 10;

  // 4. Calculate No-Show Penalty points
  // Subtract 15 points per no-show
  const penaltyPerNoShow = 15;
  const noShowPenaltyPoints = noShowCount * penaltyPerNoShow;

  // 5. Total Score calculation (Capped between 0 and 100)
  const rawScore = responseRatePoints + donationsCompletedPoints + accountAgePoints - noShowPenaltyPoints;
  const score = Math.max(0, Math.min(100, Math.round(rawScore)));

  return {
    score,
    breakdown: {
      responseRatePoints,
      donationsCompletedPoints,
      accountAgePoints,
      noShowPenaltyPoints,
      explanations: {
        responseRate: `${clampedRate.toFixed(0)}% response rate contributed ${responseRatePoints} points (out of 40).`,
        donationsCompleted: `${donationsCompleted} completed donations contributed ${donationsCompletedPoints} points (out of 35).`,
        accountAge: `${accountAgeDays} days of account age contributed ${accountAgePoints} points (out of 25).`,
        noShows: `${noShowCount} no-show appointments resulted in a penalty of -${noShowPenaltyPoints} points.`,
      },
    },
  };
}
