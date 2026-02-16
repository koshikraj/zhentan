import { NextRequest, NextResponse } from "next/server";

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

/**
 * GET /api/portfolio?safeAddress=0x... (or address=0x...)
 * Proxies to the Express server portfolio endpoint when NEXT_PUBLIC_BACKEND_URL is not set (local dev).
 * When NEXT_PUBLIC_BACKEND_URL is set, the client calls that URL directly.
 */
export async function GET(request: NextRequest) {
  try {
    const safeAddress =
      request.nextUrl.searchParams.get("safeAddress") ??
      request.nextUrl.searchParams.get("address");
    if (!safeAddress || !ADDRESS_RE.test(safeAddress)) {
      return NextResponse.json(
        { error: "Missing or invalid safeAddress" },
        { status: 400 }
      );
    }

    const backendBase =
      process.env.BACKEND_URL ??
      process.env.NEXT_PUBLIC_BACKEND_URL ??
      "http://localhost:3001";
    const url = `${backendBase.replace(/\/$/, "")}/portfolio?address=${encodeURIComponent(safeAddress)}`;

    const res = await fetch(url, {
      headers: { accept: "application/json" },
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      return NextResponse.json(err, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
