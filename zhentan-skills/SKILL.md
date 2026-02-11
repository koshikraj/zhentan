---
name: zhentan
description: Monitors pending multisig transactions, analyzes risk, and auto-signs safe ones. Use when the user wants to check pending transactions, approve or reject transactions, toggle screening, or view transaction status.
metadata:
  openclaw:
    requires:
      bins: ["node"]
    primaryEnv: ""
---

# Zhentan — Treasury Transaction Monitor

Monitors pending multisig transactions, analyzes risk, and auto-signs safe ones.

## How it works

1. **Owner** runs `propose-tx.js` which signs a USDC transfer and stores the userOp + signature in pending-queue.json
2. **Agent** (via cron) picks up pending txs, analyzes risk, and either auto-signs, sends for review, or blocks

## Transaction lifecycle

- **pending** → new tx, not yet processed by the agent
- **in_review** → agent flagged it, waiting for owner to approve or reject
- **executed** → signed and submitted on-chain
- **rejected** → owner rejected it

## Scripts (cron job uses these)

### check-pending
Check for new pending transactions (skips in_review, executed, rejected).
```bash
node skills/zhentan/check-pending.js
```

### analyze-risk
Analyze a pending transaction. Returns risk score and verdict (APPROVE/REVIEW/BLOCK).
```bash
node skills/zhentan/analyze-risk.js <tx-id>
```

### sign-and-execute
Co-sign and submit an approved transaction on-chain.
```bash
node skills/zhentan/sign-and-execute.js <tx-id>
```

### mark-review
Mark a transaction as in_review so cron stops picking it up. Used for REVIEW and BLOCK verdicts.
```bash
node skills/zhentan/mark-review.js <tx-id> <reason>
```

### record-pattern
Record a completed transaction to the pattern database.
```bash
node skills/zhentan/record-pattern.js <tx-id>
```

## Scripts (owner uses these via Telegram)

### approve
When the owner says "approve tx-XXX", run sign-and-execute then record-pattern:
```bash
node skills/zhentan/sign-and-execute.js <tx-id>
node skills/zhentan/record-pattern.js <tx-id>
```
After execution, confirm to the owner with the tx hash.

### reject
When the owner says "reject tx-XXX" or "reject tx-XXX <reason>":
```bash
node skills/zhentan/reject-tx.js <tx-id> [reason]
```
Confirm the rejection to the owner.

### get-status
Get current screening mode and recent decisions.
```bash
node skills/zhentan/get-status.js
```

### toggle-screening
When the owner says "screening on" or "screening off":
```bash
node skills/zhentan/toggle-screening.js <on|off>
```

## Cron behavior

The cron job should follow this logic:
1. Run check-pending — if screening OFF or no pending txs, stop
2. For each pending tx, run analyze-risk
3. Based on verdict:
   - **APPROVE** (risk < 40): run sign-and-execute, then record-pattern
   - **REVIEW** (risk 40-70): run mark-review, then alert the owner with details and say "Reply: approve tx-XXX or reject tx-XXX"
   - **BLOCK** (risk > 70): run mark-review, then send urgent alert with full risk breakdown and say "Reply: approve tx-XXX to override, or reject tx-XXX"

## Invoice Detection

When a user sends an invoice file or message containing an invoice:

1. Read the invoice and extract:
   - **to** (wallet address, required) — the recipient's blockchain address
   - **amount** (required) — total amount due
   - **token** — payment token (default: USDC)
   - **invoiceNumber** — invoice reference number
   - **issueDate** / **dueDate** — dates
   - **billedFrom** — sender company name + email
   - **billedTo** — recipient company name + email
   - **services** — line items with description, qty, rate, total
   - **riskScore** (0-100) — your assessment based on:
     - Known vs unknown recipient (check patterns.json)
     - Amount relative to history
     - Due date urgency
   - **riskNotes** — brief explanation of your risk assessment

2. Queue the invoice:
   ```bash
   node skills/zhentan/queue-invoice.js '<json>'
   ```

3. Confirm to the user: "Invoice [number] for [amount] [token] queued for review. Check your Zhentan dashboard to approve."

If the invoice is missing a wallet address, ask the user to provide one.

## Risk scoring

- Unknown recipient: +40
- Amount > 3x average for known recipient: +25
- Outside business hours (UTC 6-20): +20
- Exceeds single-tx limit (default 5000 USDC): +30
- Would exceed daily volume limit (default 20000 USDC): +20

Verdicts: APPROVE (<40), REVIEW (40-70), BLOCK (>70)
