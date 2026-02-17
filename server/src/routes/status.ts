import { Router, Request, Response } from "express";
import { readFileSync, writeFileSync } from "fs";

interface StateFile {
  screeningMode: boolean;
  lastCheck: string | null;
  decisions: unknown[];
}

interface PatternsFile {
  recipients: Record<string, unknown>;
  dailyStats: Record<string, unknown>;
  globalLimits: {
    maxSingleTx: string;
    maxDailyVolume: string;
    allowedHoursUTC: number[];
  };
}

export function createStatusRouter(
  getStatePath: () => string | undefined,
  getPatternsPath: () => string | undefined
) {
  const router = Router();

  router.get("/", (_req: Request, res: Response) => {
    try {
      const statePath = getStatePath();
      const patternsPath = getPatternsPath();
      if (!statePath || !patternsPath) {
        res.status(500).json({ error: "Missing STATE_PATH or PATTERNS_PATH" });
        return;
      }

      let state: StateFile;
      try {
        state = JSON.parse(readFileSync(statePath, "utf8"));
      } catch {
        state = { screeningMode: false, lastCheck: null, decisions: [] };
      }

      let patterns: PatternsFile;
      try {
        patterns = JSON.parse(readFileSync(patternsPath, "utf8"));
      } catch {
        patterns = {
          recipients: {},
          dailyStats: {},
          globalLimits: {
            maxSingleTx: "5000",
            maxDailyVolume: "20000",
            allowedHoursUTC: [],
          },
        };
      }

      res.json({
        screeningMode: state.screeningMode,
        lastCheck: state.lastCheck,
        totalDecisions: state.decisions.length,
        patterns,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      res.status(500).json({ error: message });
    }
  });

  router.patch("/", async (req: Request, res: Response) => {
    try {
      const statePath = getStatePath();
      if (!statePath) {
        res.status(500).json({ error: "Missing STATE_PATH" });
        return;
      }

      if (typeof req.body.screeningMode !== "boolean") {
        res.status(400).json({ error: "screeningMode must be a boolean" });
        return;
      }

      let state: StateFile;
      try {
        state = JSON.parse(readFileSync(statePath, "utf8"));
      } catch {
        state = { screeningMode: false, lastCheck: null, decisions: [] };
      }

      state.screeningMode = req.body.screeningMode;
      writeFileSync(statePath, JSON.stringify(state, null, 2));

      res.json({ screeningMode: state.screeningMode });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      res.status(500).json({ error: message });
    }
  });

  return router;
}
