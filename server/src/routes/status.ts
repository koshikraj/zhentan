import { Router, Request, Response } from "express";
import { readFileSync, writeFileSync } from "fs";

interface UserState {
  screeningMode: boolean;
  lastCheck: string | null;
  decisions: unknown[];
  telegramChatId?: string;
}

interface StateFile {
  users: Record<string, UserState>;
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

const DEFAULT_USER_STATE: UserState = {
  screeningMode: false,
  lastCheck: null,
  decisions: [],
};

export function readState(statePath: string): StateFile {
  try {
    const raw = JSON.parse(readFileSync(statePath, "utf8"));
    // Auto-migrate: old flat format has screeningMode at top level
    if ("screeningMode" in raw && !("users" in raw)) {
      const migrated: StateFile = {
        users: {
          default: {
            screeningMode: raw.screeningMode ?? false,
            lastCheck: raw.lastCheck ?? null,
            decisions: raw.decisions ?? [],
            telegramChatId: raw.telegramChatId,
          },
        },
      };
      writeFileSync(statePath, JSON.stringify(migrated, null, 2));
      return migrated;
    }
    return raw as StateFile;
  } catch {
    return { users: {} };
  }
}

export function writeState(statePath: string, state: StateFile): void {
  writeFileSync(statePath, JSON.stringify(state, null, 2));
}

function getUserState(state: StateFile, safe: string): UserState {
  return state.users[safe.toLowerCase()] ?? { ...DEFAULT_USER_STATE };
}

export function createStatusRouter(
  getStatePath: () => string | undefined,
  getPatternsPath: () => string | undefined
) {
  const router = Router();

  router.get("/", (req: Request, res: Response) => {
    try {
      const statePath = getStatePath();
      const patternsPath = getPatternsPath();
      if (!statePath || !patternsPath) {
        res.status(500).json({ error: "Missing STATE_PATH or PATTERNS_PATH" });
        return;
      }

      const safe = req.query.safe as string | undefined;
      if (!safe) {
        res.status(400).json({ error: "Missing required query param: safe" });
        return;
      }

      const state = readState(statePath);
      const userState = getUserState(state, safe);

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
        screeningMode: userState.screeningMode,
        lastCheck: userState.lastCheck,
        totalDecisions: userState.decisions.length,
        telegramChatId: userState.telegramChatId,
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

      const { safe, screeningMode, telegramChatId } = req.body;

      if (!safe) {
        res.status(400).json({ error: "Missing required field: safe" });
        return;
      }

      if (screeningMode === undefined && telegramChatId === undefined) {
        res.status(400).json({ error: "No valid fields to update" });
        return;
      }

      if (screeningMode !== undefined && typeof screeningMode !== "boolean") {
        res.status(400).json({ error: "screeningMode must be a boolean" });
        return;
      }

      if (telegramChatId !== undefined && typeof telegramChatId !== "string") {
        res.status(400).json({ error: "telegramChatId must be a string" });
        return;
      }

      const state = readState(statePath);
      const key = safe.toLowerCase();
      if (!state.users[key]) {
        state.users[key] = { ...DEFAULT_USER_STATE };
      }

      if (screeningMode !== undefined) state.users[key].screeningMode = screeningMode;
      if (telegramChatId !== undefined) state.users[key].telegramChatId = telegramChatId || undefined;
      writeState(statePath, state);

      res.json({
        screeningMode: state.users[key].screeningMode,
        telegramChatId: state.users[key].telegramChatId,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      res.status(500).json({ error: message });
    }
  });

  return router;
}
