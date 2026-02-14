import { readFileSync } from "fs";
import type { PendingTransaction } from "./types.js";

export interface PatternsRecipient {
  label: string | null;
  totalTxCount: number;
  totalVolume: string;
  avgAmount: string;
  maxAmount: string;
  lastSeen: string | null;
  typicalHours: (number | null)[];
  category: string;
}

export interface PatternsFile {
  recipients: Record<string, PatternsRecipient>;
  dailyStats: Record<string, { txCount: number; totalVolume: string }>;
  globalLimits: {
    maxSingleTx: string;
    maxDailyVolume: string;
    allowedHoursUTC: number[];
  };
}

export interface RiskResult {
  riskScore: number;
  verdict: "APPROVE" | "REVIEW" | "BLOCK";
  reasons: string[];
}

export function loadPatterns(patternsPath: string): PatternsFile {
  return JSON.parse(readFileSync(patternsPath, "utf8"));
}

export function analyzeRisk(
  tx: PendingTransaction,
  patterns: PatternsFile
): RiskResult {
  let riskScore = 0;
  const reasons: string[] = [];
  const recipient = patterns.recipients[tx.to.toLowerCase()];

  // 1. Unknown recipient = +40 risk
  if (!recipient) {
    riskScore += 40;
    reasons.push("Unknown recipient (never seen before)");
  } else {
    // Known recipient but unusual amount
    const avg = parseFloat(recipient.avgAmount || "0");
    const txAmount = parseFloat(tx.amount);
    if (avg > 0 && txAmount > avg * 3) {
      riskScore += 25;
      reasons.push(
        `Amount ${tx.amount} is ${(txAmount / avg).toFixed(1)}x the average (${avg})`
      );
    }
  }

  // 2. Time of day check
  const hour = new Date().getUTCHours();
  if (!patterns.globalLimits.allowedHoursUTC.includes(hour)) {
    riskScore += 20;
    reasons.push(`Current time ${hour}:00 UTC is outside business hours`);
  }

  // 3. Amount exceeds global single-tx limit
  if (parseFloat(tx.amount) > parseFloat(patterns.globalLimits.maxSingleTx)) {
    riskScore += 30;
    reasons.push(
      `Amount ${tx.amount} exceeds single-tx limit of ${patterns.globalLimits.maxSingleTx}`
    );
  }

  // 4. Daily volume check
  const today = new Date().toISOString().split("T")[0];
  const dailyUsed = parseFloat(
    patterns.dailyStats[today]?.totalVolume || "0"
  );
  if (
    dailyUsed + parseFloat(tx.amount) >
    parseFloat(patterns.globalLimits.maxDailyVolume)
  ) {
    riskScore += 20;
    reasons.push(
      `Would exceed daily volume limit (${dailyUsed} + ${tx.amount} > ${patterns.globalLimits.maxDailyVolume})`
    );
  }

  riskScore = Math.min(riskScore, 100);

  if (reasons.length === 0) {
    reasons.push("Known recipient, normal amount, within business hours");
  }

  const verdict: RiskResult["verdict"] =
    riskScore < 40 ? "APPROVE" : riskScore < 70 ? "REVIEW" : "BLOCK";

  return { riskScore, verdict, reasons };
}
