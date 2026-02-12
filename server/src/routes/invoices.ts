import { Router, Request, Response } from "express";
import { readFileSync, writeFileSync } from "fs";
import type { InvoiceQueueFile, InvoiceStatus } from "../types.js";

const VALID_STATUSES: InvoiceStatus[] = [
  "queued",
  "approved",
  "executed",
  "rejected",
];

function readQueue(path: string): InvoiceQueueFile {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return { invoices: [] };
  }
}

export function createInvoicesRouter(
  getInvoiceQueuePath: () => string | undefined
) {
  const router = Router();

  router.get("/", (_req: Request, res: Response) => {
    try {
      const queuePath = getInvoiceQueuePath();
      if (!queuePath) {
        res.status(500).json({ error: "Missing INVOICE_QUEUE_PATH" });
        return;
      }

      const queue = readQueue(queuePath);
      const invoices = queue.invoices.sort(
        (a, b) =>
          new Date(b.queuedAt).getTime() - new Date(a.queuedAt).getTime()
      );

      res.json({ invoices });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      res.status(500).json({ error: message });
    }
  });

  router.patch("/", (req: Request, res: Response) => {
    try {
      const queuePath = getInvoiceQueuePath();
      if (!queuePath) {
        res.status(500).json({ error: "Missing INVOICE_QUEUE_PATH" });
        return;
      }

      const body = req.body ?? {};
      const { id, status, rejectReason, txId, txHash } = body;

      if (!id || !status) {
        res.status(400).json({ error: "Missing id or status" });
        return;
      }

      if (!VALID_STATUSES.includes(status)) {
        res.status(400).json({ error: `Invalid status: ${status}` });
        return;
      }

      const queue = readQueue(queuePath);
      const invoice = queue.invoices.find((inv) => inv.id === id);

      if (!invoice) {
        res.status(404).json({ error: `Invoice not found: ${id}` });
        return;
      }

      invoice.status = status;

      if (status === "approved" && txId) {
        invoice.txId = txId;
      }

      if (status === "executed") {
        invoice.executedAt = new Date().toISOString();
        if (txHash) invoice.txHash = txHash;
      }

      if (status === "rejected") {
        invoice.rejectedAt = new Date().toISOString();
        if (rejectReason) invoice.rejectReason = rejectReason;
      }

      writeFileSync(queuePath, JSON.stringify(queue, null, 2));

      res.json({ invoice });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      res.status(500).json({ error: message });
    }
  });

  return router;
}
