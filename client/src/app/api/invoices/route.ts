import { NextRequest, NextResponse } from "next/server";
import { readFileSync, writeFileSync } from "fs";
import type { InvoiceQueueFile, InvoiceStatus } from "@/types";

function readQueue(path: string): InvoiceQueueFile {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return { invoices: [] };
  }
}

export async function GET() {
  try {
    const queuePath = process.env.INVOICE_QUEUE_PATH;
    if (!queuePath) {
      return NextResponse.json(
        { error: "Missing INVOICE_QUEUE_PATH" },
        { status: 500 }
      );
    }

    const queue = readQueue(queuePath);
    const invoices = queue.invoices.sort(
      (a, b) =>
        new Date(b.queuedAt).getTime() - new Date(a.queuedAt).getTime()
    );

    return NextResponse.json({ invoices });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

const VALID_STATUSES: InvoiceStatus[] = [
  "queued",
  "approved",
  "executed",
  "rejected",
];

export async function PATCH(request: NextRequest) {
  try {
    const queuePath = process.env.INVOICE_QUEUE_PATH;
    if (!queuePath) {
      return NextResponse.json(
        { error: "Missing INVOICE_QUEUE_PATH" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { id, status, rejectReason, txId, txHash } = body;

    if (!id || !status) {
      return NextResponse.json(
        { error: "Missing id or status" },
        { status: 400 }
      );
    }

    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status: ${status}` },
        { status: 400 }
      );
    }

    const queue = readQueue(queuePath);
    const invoice = queue.invoices.find((inv) => inv.id === id);

    if (!invoice) {
      return NextResponse.json(
        { error: `Invoice not found: ${id}` },
        { status: 404 }
      );
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

    return NextResponse.json({ invoice });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
