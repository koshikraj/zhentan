import { NextRequest, NextResponse } from "next/server";
import { readFileSync } from "fs";
import type { QueueFile, TransactionWithStatus } from "@/types";
import { getTransactionStatus } from "@/lib/format";

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

export async function GET(request: NextRequest) {
  try {
    const safeAddress =
      request.nextUrl.searchParams.get("safeAddress")

    if (!safeAddress || !ADDRESS_RE.test(safeAddress)) {
      return NextResponse.json(
        { error: "Missing or invalid safeAddress" },
        { status: 400 }
      );
    }

    const queuePath = process.env.QUEUE_PATH;
    console.log("queuePath", queuePath);
    if (!queuePath) {
      return NextResponse.json({ error: "Missing QUEUE_PATH" }, { status: 500 });
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

    return NextResponse.json({ transactions });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
