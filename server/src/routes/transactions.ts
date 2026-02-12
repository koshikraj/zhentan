import { Router, Request, Response } from "express";
import { readFileSync } from "fs";
import type { QueueFile, TransactionWithStatus } from "../types.js";
import { getTransactionStatus } from "../lib/format.js";

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

export function createTransactionsRouter(getQueuePath: () => string | undefined) {
  const router = Router();

  router.get("/", (req: Request, res: Response) => {
    try {
      const safeAddress =
        (req.query.safeAddress as string);

      if (!safeAddress || !ADDRESS_RE.test(safeAddress)) {
        res.status(400).json({ error: "Missing or invalid safeAddress" });
        return;
      }

      const queuePath = getQueuePath();
      if (!queuePath) {
        res.status(500).json({ error: "Missing QUEUE_PATH" });
        return;
      }

      let queue: QueueFile;
      try {
        queue = JSON.parse(readFileSync(queuePath, "utf8"));
      } catch {
        queue = { pending: [] };
      }

      const safeLower = safeAddress.toLowerCase();
      const transactions: TransactionWithStatus[] = queue.pending
        .filter((tx) => (tx.safeAddress || "").toLowerCase() === safeLower)
        .map((tx) => ({
          ...tx,
          status: getTransactionStatus(tx),
        }))
        .sort(
          (a, b) =>
            new Date(b.proposedAt).getTime() - new Date(a.proposedAt).getTime()
        );

      res.json({ transactions });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      res.status(500).json({ error: message });
    }
  });

  return router;
}
