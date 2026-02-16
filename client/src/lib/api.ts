/**
 * Base URL for queue/execute/invoices/transactions APIs.
 * When NEXT_PUBLIC_BACKEND_URL is set (e.g. Vercel + separate server), use that.
 * Otherwise use same-origin Next.js API routes.
 */
const BACKEND_BASE = (process.env.NEXT_PUBLIC_BACKEND_URL ?? "").replace(
  /\/$/,
  ""
);

export type BackendApiPath = "transactions" | "queue" | "execute" | "invoices" | "portfolio";

export function getBackendApiUrl(path: BackendApiPath): string {
  return BACKEND_BASE ? `${BACKEND_BASE}/${path}` : `/api/${path}`;
}
