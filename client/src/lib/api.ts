/**
 * Base URL for all backend API endpoints (Express server).
 * Defaults to http://localhost:3001 for local dev.
 */
const BACKEND_BASE = (
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001"
).replace(/\/$/, "");

export type BackendApiPath =
  | "transactions"
  | "queue"
  | "execute"
  | "invoices"
  | "portfolio"
  | "status"
  | "resolve";

export function getBackendApiUrl(path: BackendApiPath): string {
  return `${BACKEND_BASE}/${path}`;
}
