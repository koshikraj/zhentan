# Zhentan Skills

OpenClaw skill pack for **Zhentan** — a treasury monitor agent that watches pending multisig transactions, analyzes risk, auto-signs safe ones, flags risky ones for review, and handles invoices.

---

## Prerequisites

| Requirement | Details |
|---|---|
| **OpenClaw** | Installed and configured — [OpenClaw setup guide](https://github.com/anthropics/openclaw) |
| **Node.js** | v18 or higher |
| **Environment variables** | Same config as the [Zhentan server](../server/README.md): `QUEUE_PATH`, `INVOICE_QUEUE_PATH`, `AGENT_PRIVATE_KEY`, `PIMLICO_API_KEY`, etc. These must be set in the environment where OpenClaw runs. |

---

## Quick Start

### 1. Link the skill into OpenClaw

From the Zhentan repo root:

```bash
mkdir -p ~/.openclaw/skills
ln -sf "$(pwd)/zhentan-skills" ~/.openclaw/skills/zhentan
```

### 2. Register the cron job

```bash
openclaw cron add --name "zhentan-monitor" --every "10s" --session isolated --message "You are Zhentan, a treasury monitor. Follow SKILL.md in skills/zhentan/.

  1. Run: node skills/zhentan/check-pending.js
     - If screening OFF or no pending txs, stop here and say nothing.

  2. For each pending tx, run: node skills/zhentan/analyze-risk.js <tx-id>

  3. Based on verdict:
     - APPROVE: run node skills/zhentan/sign-and-execute.js <tx-id>, then node skills/zhentan/record-pattern.js <tx-id>. Report: approved, amount, recipient, tx hash.
     - REVIEW: run node skills/zhentan/mark-review.js <tx-id> <risk reasons>. Report: tx details, risk score, reasons. End with: Reply approve <tx-id> or reject <tx-id>
     - BLOCK: run node skills/zhentan/mark-review.js <tx-id> <risk reasons>. Report urgently: tx details, risk score, reasons. End with: Reply approve <tx-id> to override, or reject <tx-id>

  Be concise. Output only the action taken and key details." \
    --deliver \
    --channel telegram
```

This runs every 10 seconds in an isolated session and delivers alerts to Telegram.

### 3. Restart OpenClaw

```bash
openclaw gateway restart
```

Confirm that the zhentan skill is detected.

```bash
openclaw skills check
```


OpenClaw will load the skill from `SKILL.md` and the cron will begin monitoring.

---

## Alternative Skill Install Methods

### Copy into OpenClaw's skill directory

```bash
mkdir -p ~/.openclaw/skills
cp -r /path/to/zhentan/zhentan-skills ~/.openclaw/skills/zhentan
```

> If you copy, remember to re-copy after editing the skill source.

### Project-local skills

Create a symlink at the repo root so OpenClaw discovers it locally:

```bash
mkdir -p .openclaw/skills
ln -sf "$(pwd)/zhentan-skills" .openclaw/skills/zhentan
```



For full usage details, cron flow, and owner commands, see **[SKILL.md](./SKILL.md)**.
