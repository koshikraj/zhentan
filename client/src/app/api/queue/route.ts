import { NextResponse } from "next/server";
import { readFileSync, writeFileSync } from "fs";
import type { QueueFile } from "@/types";

export async function POST(request: Request) {
  try {
    const queuePath = process.env.QUEUE_PATH;
    if (!queuePath) {
      return NextResponse.json({ error: "Missing QUEUE_PATH" }, { status: 500 });
    }

    const pendingTx = await request.json();

    if (!pendingTx.id || !pendingTx.to || !pendingTx.amount) {
      return NextResponse.json(
        { error: "Missing required fields: id, to, amount" },
        { status: 400 }
      );
    }

    let queue: QueueFile;
    try {
      queue = JSON.parse(readFileSync(queuePath, "utf8"));
    } catch {
      queue = { pending: [] };
    }

    queue.pending.push(pendingTx);
    writeFileSync(queuePath, JSON.stringify(queue, null, 2));

    return NextResponse.json({ success: true, id: pendingTx.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
