import { NextResponse } from "next/server";
import { readFileSync, writeFileSync } from "fs";
import type { StateFile, PatternsFile } from "@/types";

export async function GET() {
  try {
    const statePath = process.env.STATE_PATH;
    const patternsPath = process.env.PATTERNS_PATH;

    if (!statePath || !patternsPath) {
      return NextResponse.json(
        { error: "Missing STATE_PATH or PATTERNS_PATH" },
        { status: 500 }
      );
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
      patterns = { recipients: {}, dailyStats: {}, globalLimits: { maxSingleTx: "5000", maxDailyVolume: "20000", allowedHoursUTC: [] } };
    }

    return NextResponse.json({
      screeningMode: state.screeningMode,
      lastCheck: state.lastCheck,
      totalDecisions: state.decisions.length,
      patterns,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const statePath = process.env.STATE_PATH;
    if (!statePath) {
      return NextResponse.json({ error: "Missing STATE_PATH" }, { status: 500 });
    }

    const body = await request.json();
    if (typeof body.screeningMode !== "boolean") {
      return NextResponse.json(
        { error: "screeningMode must be a boolean" },
        { status: 400 }
      );
    }

    let state: StateFile;
    try {
      state = JSON.parse(readFileSync(statePath, "utf8"));
    } catch {
      state = { screeningMode: false, lastCheck: null, decisions: [] };
    }

    state.screeningMode = body.screeningMode;
    writeFileSync(statePath, JSON.stringify(state, null, 2));

    return NextResponse.json({ screeningMode: state.screeningMode });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
