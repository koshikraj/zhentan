import type { TransactionStatus, PendingTransaction } from "../types.js";

export function getTransactionStatus(tx: PendingTransaction): TransactionStatus {
  if (tx.rejected) return "rejected";
  if (tx.executedAt) return "executed";
  if (tx.inReview) return "in_review";
  return "pending";
}
