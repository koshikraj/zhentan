# 🦞 Zhentan

Personalized transaction guard and payment assistant that learns your onchain behavior.

## Project structure

| Directory | What it does |
|-----------|--------------|
| **`client/`** | Next.js app: dashboard, send/receive USDC, activity, invoices, settings. Proposes txs and calls queue/execute/invoices (same-origin or backend). |
| **`server/`** | Express API for queue + execute. |
| **`zhentan-skills/`** | OpenClaw skills: check pending, analyze risk, sign/execute, review, reject, record patterns, toggle screening, queue invoices. See `SKILL.md`. |

## Description

Zhentan is a personalized wallet assistant built with an OpenClaw agent that learns how you transact onchain. It understands patterns—amounts, timing, recipients, assets—and rates transaction risk in real time.

- **Screening ON:** Routine USDC payouts get approved instantly; unusual or suspicious transactions are blocked and sent for review (Telegram/WhatsApp).
- The agent can also read invoices, assess risk from chat, and proactively propose transactions.
- **Screening OFF:** Regular multisig—you and an auto-executed signature for the agent service. Turn it off anytime for full auto-execution.

The agent builds a profile of your normal activity (typical amounts, frequent recipients, time-of-day, categories) and gets smarter over time. Risky flows open a review where you can approve or reject; clearly malicious transactions are fully blocked. Built on an industry-standard smart account (Safe) with multisig, Privy embedded wallets for onboarding, and the agent as a designated signer. Zero gas fees (account abstraction), instant approvals for legitimate flows, and USDC as the settlement layer. For individuals, DAOs, DeFi protocols, and treasuries that need speed without sacrificing security.

> **Live demo:** You can try normal (non-screened) transactions at [http://zhentan.me/](http://zhentan.me/). That deployment is not wired to an OpenClaw agent—screening is personalized per user and requires your own agent setup. **Run the app locally** (client + server + OpenClaw skills) for screened mode with AI approval, review, and blocking.

## Flow

```
┌─────────┐
│  User   │  "Send $50 (USDC) to Alice"
└────┬────┘
     │ Creates transaction
     ▼
┌──────────────┐
│  Zhentan App  │  User signs (1 of 2)
└──────┬───────┘
       │ Sends to backend
       ▼
┌──────────────────┐
│  Pending Tx Queue │  Stores pending transaction
└──────┬───────────┘
       │ Notifies AI
       ▼
┌──────────────────┐
│  Zhentan Agent   │  🤖 Analyzes: normal spending? known recipient? drain?
│  (OpenClaw)       │
└──────┬───────────┘
       ├─── SAFE ─────┬─── SUSPICIOUS ─┬─── REVIEW ─┬─── LEARNING ─┐
       ▼              ▼                ▼            ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────────┐ ┌──────────────────┐
│  Agent Signs │ │ Agent Blocks │ │  Review flow     │ │  Learning &      │
│  (2 of 2)    │ │  Transaction │ │ Telegram/WhatsApp│ │ feedback → memory│
└──────┬───────┘ └──────────────┘ └──────────────────┘ └──────────────────┘
       │
       ▼
┌──────────────────┐     ┌──────────────────┐
│  AA Bundler      │ ──► │  BNB Chain       │  ✅ Executed
└──────────────────┘     └──────────────────┘
```

## How It Is Made

Zhentan is built with three main components working together.

### 1. User-facing app & smart account setup

The frontend handles onchain interactions and transaction creation. Users onboard with Google sign-in and an embedded wallet (Privy). Each user gets a smart account with multisig support, powered by ERC-4337 for gas sponsorship and transaction bundling. The backend queues pending UserOperations and coordinates signature collection for non-screened transactions.

### 2. OpenClaw AI screening & agent logic

When a transaction is proposed with screening enabled, it is sent to an OpenClaw agent running models like Qwen3-235B and Sonnet 4.5 via OpenRouter, updated with the Zhentan skills. The agent continuously evaluates transactions against learned behavioral patterns and hard guardrails.

If the transaction is safe, the agent partially signs the UserOperation and proceeds with execution. If it's risky, the transaction is blocked and alerts are sent via Telegram or WhatsApp. Clearly malicious transactions are fully blocked. OpenClaw's skill system powers autonomous decision-making using custom logic for transaction analysis.

### 3. Onchain execution on BNB Chain

Transaction signatures are queued and combined once final approval is available. The completed UserOperation is submitted to a bundler for gasless execution on BNB Chain. Zhentan uses an ERC-4337 module contract deployed on BNB Chain, with Viem and Permissionless.js handling smart account interactions and execution.
