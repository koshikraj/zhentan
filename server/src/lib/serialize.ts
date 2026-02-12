/**
 * Restore BigInts from tagged strings and null to undefined.
 * Must match client and propose-tx.js serialization exactly.
 */
export function deserializeUserOp(
  raw: Record<string, unknown>
): Record<string, unknown> {
  const userOp: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (typeof v === "string" && v.startsWith("bigint:")) {
      userOp[k] = BigInt(v.slice(7));
    } else if (v === null) {
      userOp[k] = undefined;
    } else {
      userOp[k] = v;
    }
  }
  return userOp;
}
