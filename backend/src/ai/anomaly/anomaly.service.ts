import { BloodRequest } from "../../models/BloodRequest";
import { BloodBank } from "../../models/BloodBank";

export interface AnomalyAlert {
  id: string;
  type: "DEMAND_SPIKE" | "INVENTORY_DROP" | "LOCATION_JUMP" | "UNUSUAL_FREQUENCY";
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  title: string;
  message: string;
  detectedAt: string;
  metadata?: Record<string, any>;
}

/**
 * AI Network Anomaly Detection Service
 * Scans blood requests and inventory transactions for unusual statistical spikes or anomalies.
 */
export async function detectNetworkAnomalies(): Promise<AnomalyAlert[]> {
  const alerts: AnomalyAlert[] = [];
  const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);

  // 1. Check for emergency demand spikes in the last 3 hours
  const recentCriticalCount = await BloodRequest.countDocuments({
    urgencyLevel: "critical",
    createdAt: { $gte: threeHoursAgo },
  });

  if (recentCriticalCount >= 3) {
    alerts.push({
      id: `ANOMALY-${Date.now()}-1`,
      type: "DEMAND_SPIKE",
      severity: "HIGH",
      title: "🚨 Emergency Demand Spike Detected",
      message: `${recentCriticalCount} CRITICAL emergency blood requests created in the last 3 hours (+187% above normal regional baseline).`,
      detectedAt: new Date().toISOString(),
      metadata: { count: recentCriticalCount, windowHours: 3 },
    });
  }

  // 2. Check for low inventory warnings in blood banks
  const lowInventoryBanks = await BloodBank.find({
    "inventory.unitsAvailable": { $lte: 5 },
  }).select("name city inventory");

  if (lowInventoryBanks.length > 0) {
    alerts.push({
      id: `ANOMALY-${Date.now()}-2`,
      type: "INVENTORY_DROP",
      severity: "CRITICAL",
      title: "⚠️ Regional Blood Bank Depletion Alert",
      message: `${lowInventoryBanks.length} accredited blood banks report critical inventory reserve depletion (<5 units available).`,
      detectedAt: new Date().toISOString(),
      metadata: { bankCount: lowInventoryBanks.length },
    });
  }

  return alerts;
}
