import type { TransactionStatus, PendingTransaction } from "@/types";

export function truncateAddress(addr: string): string {
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getTransactionStatus(tx: PendingTransaction): TransactionStatus {
  if (tx.rejected) return "rejected";
  if (tx.executedAt) return "executed";
  if (tx.inReview) return "in_review";
  return "pending";
}

export function statusLabel(status: TransactionStatus): string {
  switch (status) {
    case "pending":
      return "Pending";
    case "in_review":
      return "In Review";
    case "executed":
      return "Executed";
    case "rejected":
      return "Rejected";
  }
}
