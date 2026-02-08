/**
 * Convert all BigInts to tagged strings and undefined to null
 * so we can round-trip through JSON without losing any fields.
 * Must match propose-tx.js serialization exactly.
 */
export function serializeUserOp(
  userOp: Record<string, unknown>
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(userOp)) {
    if (typeof v === "bigint") {
      out[k] = `bigint:${v.toString()}`;
    } else if (v === undefined) {
      out[k] = null;
    } else {
      out[k] = v;
    }
  }
  return out;
}

/**
 * Restore BigInts from tagged strings and null to undefined.
 * Must match agent-sign.js deserialization exactly.
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
