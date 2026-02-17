import { Router, Request, Response } from "express";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { execFile } from "child_process";
import { dirname, join } from "path";
import type { QueueFile } from "../types.js";
import { analyzeRisk, loadPatterns } from "../risk.js";
import { notifyTelegram } from "../notify.js";

export function createQueueRouter(getQueuePath: () => string | undefined) {
  const router = Router();

  router.post("/", async (req: Request, res: Response) => {
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

      // When screening is disabled, only queue; client will call execute. Skip risk analysis.
      if (pendingTx.screeningDisabled) {
        res.json({ success: true, id: pendingTx.id });
        return;
      }

      // --- Risk analysis ---
      const patternsPath = process.env.PATTERNS_PATH;
      if (!patternsPath) {
        console.warn("PATTERNS_PATH not set, skipping risk analysis");
        res.json({ success: true, id: pendingTx.id });
        return;
      }

      let risk;
      try {
        const patterns = loadPatterns(patternsPath);
        risk = analyzeRisk(pendingTx, patterns);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        console.error("Risk analysis failed:", msg);
        res.json({ success: true, id: pendingTx.id, riskError: msg });
        return;
      }

      // Write risk result back onto the tx in the queue
      const txIndex = queue.pending.findIndex((t) => t.id === pendingTx.id);
      if (txIndex !== -1) {
        queue.pending[txIndex].riskScore = risk.riskScore;
        queue.pending[txIndex].riskVerdict = risk.verdict;
        queue.pending[txIndex].riskReasons = risk.reasons;
      }

      const shortTo = `${pendingTx.to.slice(0, 6)}...${pendingTx.to.slice(-4)}`;

      if (risk.verdict === "APPROVE") {
        // Auto-execute: call local /execute endpoint
        const port = Number(process.env.PORT) || 3001;
        writeFileSync(queuePath, JSON.stringify(queue, null, 2));

        try {
          const execRes = await fetch(
            `http://localhost:${port}/execute`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ txId: pendingTx.id }),
            }
          );
          const execResult = (await execRes.json()) as Record<string, unknown>;

          if (execResult.status === "executed") {
            // Record pattern
            const skillsDir = dirname(patternsPath);
            execFile(
              "node",
              [join(skillsDir, "record-pattern.js"), pendingTx.id],
              (err) => {
                if (err)
                  console.error("record-pattern failed:", err.message);
              }
            );

            notifyTelegram(
              `✅ Auto-approved and executed ${pendingTx.id}:\n` +
                `${pendingTx.amount} ${pendingTx.token || "USDC"} → ${shortTo}\n` +
                `Risk: ${risk.riskScore}/100 — ${risk.reasons.join(", ")}\n` +
                `Explore: https://bscscan.com/tx/${execResult.txHash}`
            );

            res.json({
              success: true,
              id: pendingTx.id,
              risk,
              autoExecuted: true,
              txHash: execResult.txHash,
            });
            return;
          }

          // Execute call didn't succeed — fall through to notify as APPROVE pending
          console.error("Auto-execute returned:", execResult);
          notifyTelegram(
            `⚠️ Auto-approve attempted but execution failed for ${pendingTx.id}:\n` +
              `${pendingTx.amount} ${pendingTx.token || "USDC"} → ${shortTo}\n` +
              `Risk: ${risk.riskScore}/100 — ${risk.reasons.join(", ")}\n` +
              `Error: ${execResult.error || "unknown"}\n` +
              `Reply \`approve ${pendingTx.id}\` to retry.`
          );
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Unknown error";
          console.error("Auto-execute fetch failed:", msg);
          notifyTelegram(
            `⚠️ Auto-approve attempted but execution failed for ${pendingTx.id}:\n` +
              `${pendingTx.amount} ${pendingTx.token || "USDC"} → ${shortTo}\n` +
              `Risk: ${risk.riskScore}/100 — ${risk.reasons.join(", ")}\n` +
              `Error: ${msg}\n` +
              `Reply \`approve ${pendingTx.id}\` to retry.`
          );
        }

        res.json({ success: true, id: pendingTx.id, risk, autoExecuted: false });
        return;
      }

      // REVIEW or BLOCK — mark inReview
      if (txIndex !== -1) {
        queue.pending[txIndex].inReview = true;
        queue.pending[txIndex].reviewedAt = new Date().toISOString();
        queue.pending[txIndex].reviewReason = risk.reasons.join("; ");
      }
      writeFileSync(queuePath, JSON.stringify(queue, null, 2));

      const reviewButtons = [
        [
          { text: "✅ Approve", callback_data: `approve ${pendingTx.id}` },
          { text: "❌ Reject", callback_data: `reject ${pendingTx.id}` },
        ],
      ];

      if (risk.verdict === "REVIEW") {
        notifyTelegram(
          `🔍 REVIEW NEEDED — ${pendingTx.id}:\n` +
            `${pendingTx.amount} ${pendingTx.token || "USDC"} → ${shortTo}\n` +
            `Risk: ${risk.riskScore}/100\n` +
            `Reasons: ${risk.reasons.join(", ")}`,
          reviewButtons,
          pendingTx.id
        );
      } else {
        notifyTelegram(
          `🚫 BLOCKED — ${pendingTx.id}:\n` +
            `${pendingTx.amount} ${pendingTx.token || "USDC"} → ${shortTo}\n` +
            `Risk: ${risk.riskScore}/100\n` +
            `Reasons: ${risk.reasons.join(", ")}`,
          reviewButtons,
          pendingTx.id
        );
      }

      res.json({ success: true, id: pendingTx.id, risk });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      res.status(500).json({ error: message });
    }
  });

  return router;
}
