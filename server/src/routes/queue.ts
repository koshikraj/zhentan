import { Router, Request, Response } from "express";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { dirname } from "path";
import type { QueueFile } from "../types.js";

export function createQueueRouter(getQueuePath: () => string | undefined) {
  const router = Router();

  router.post("/", (req: Request, res: Response) => {
    try {
      const queuePath = getQueuePath();
      if (!queuePath) {
        res.status(500).json({ error: "Missing QUEUE_PATH" });
        return;
      }

      const pendingTx = req.body;

      if (!pendingTx?.id || !pendingTx?.to || !pendingTx?.amount) {
        res.status(400).json({
          error: "Missing required fields: id, to, amount",
        });
        return;
      }

      mkdirSync(dirname(queuePath), { recursive: true });

      let queue: QueueFile;
      try {
        queue = JSON.parse(readFileSync(queuePath, "utf8"));
      } catch {
        queue = { pending: [] };
      }

      queue.pending.push(pendingTx);
      writeFileSync(queuePath, JSON.stringify(queue, null, 2));

      res.json({ success: true, id: pendingTx.id });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      res.status(500).json({ error: message });
    }
  });

  return router;
}
