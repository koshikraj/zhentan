# 🦞 Zhentan

Personalized transaction guard and payment assistant that learns your onchain behavior.

## Project structure

| Directory | What it does |
|-----------|--------------|
| **`client/`** | Next.js app: dashboard, send/receive tokens, WalletConnect DApp connectivity, activity, invoices, settings. Proposes txs and calls queue/execute/invoices (same-origin or backend). |
| **`server/`** | Express API: inline risk analysis on `/queue`, auto-execute for safe txs, Telegram notifications with interactive review, `/portfolio` via Zerion, `/invoices` queue. |
| **`zhentan-skills/`** | OpenClaw skills: sign/execute, reject, deep-analyze (GoPlus + Honeypot.is), record patterns, toggle screening, queue invoices. See `SKILL.md`. |

## Description

Zhentan is a personalized wallet assistant built with an OpenClaw agent that learns how you transact onchain. It understands patterns—amounts, timing, recipients, assets—and rates transaction risk in real time.

- **Screening ON:** The server runs instant pattern-based risk analysis on every queued transaction. Safe txs (score < 40) are auto-executed immediately. Suspicious txs are blocked, and borderline txs are sent for interactive review via Telegram with approve/reject buttons.
- **WalletConnect:** Connect any DApp (PancakeSwap, Venus, etc.) via WalletConnect. DApp transaction requests flow through the same screening pipeline before execution.
- **Deep analysis on demand:** The agent can run external security checks (GoPlus, Honeypot.is) on addresses and tokens when asked from Telegram.
- **Portfolio visibility:** Live token balances, prices, and 24h change via Zerion API integration.
- **Screening OFF:** Regular multisig—you and an auto-executed signature for the agent service. Turn it off anytime for full auto-execution.

The server builds a profile of your normal activity (typical amounts, frequent recipients, time-of-day, categories) and applies it as deterministic rules for instant screening. The OpenClaw agent handles conversational support, deeper analysis, and manual intervention via Telegram. Risky flows open an interactive review where you can approve or reject; clearly malicious transactions are fully blocked. Built on an industry-standard smart account (Safe) with multisig, Privy embedded wallets for onboarding, and the agent as a designated signer. Zero gas fees (account abstraction), instant approvals for legitimate flows, and support for any ERC-20 token on BNB Chain. For individuals, DAOs, DeFi protocols, and treasuries that need speed without sacrificing security.

> **Live demo:** You can try normal (non-screened) transactions at [http://zhentan.me/](http://zhentan.me/). That deployment is not wired to an OpenClaw agent—screening is personalized per user and requires your own agent setup. **Run the app locally** (client + server + OpenClaw skills) for screened mode with AI approval, review, and blocking.

## Flow

```
┌─────────────┐                          ┌──────────────┐
│    User     │  "Send $50 to Alice"     │  External    │  Swap, lend, stake …
│  (Send UI)  │                          │  DApp        │  (PancakeSwap, etc.)
└──────┬──────┘                          └──────┬───────┘
       │ Creates transaction                    │ WalletConnect session_request
       ▼                                        ▼
┌─────────────────────────────────────────────────────┐
│                   Zhentan App                        │
│  User approves & signs (1 of 2) via embedded wallet  │
└──────────────────────┬──────────────────────────────┘
                       │ POST /queue
                       ▼
              ┌──────────────────┐
              │ Static risk check│  Inline risk analysis (instant)
              │  analyzeRisk()   │  Patterns: recipients, amounts,
              │                  │  hours, daily limits
              └──────┬───────────┘
       ┌── APPROVE ──┼── BLOCK ────────┬── REVIEW ─────┐
       │  (score<40)  │  (score>70)     │  (40-70)      │
       ▼              ▼                 ▼               │
┌────────────┐ ┌────────────┐ ┌──────────────────┐     │
│ Auto-sign  │ │  Blocked   │ │  Telegram notify │     │
│ & execute  │ │ + Telegram │ │ [Approve][Reject]│     │
│ immediately│ │   alert    │ │  Interactive btns │     │
└──────┬─────┘ └────────────┘ └───────┬──────────┘     │
       │                              │ User responds   │
       │                    ┌─────────┴────────┐        │
       │                    │ Agent signs &    │        │
       │                    │ executes (or     │        │
       │                    │ rejects)         │        │
       │                    └────────┬─────────┘        │
       ▼                             ▼                  │
┌──────────────────┐     ┌──────────────────┐           │
│  AA Bundler      │ ──► │  BNB Chain       │ ✅        │
└──────────────────┘     └──────┬───────────┘           │
                               │ txHash returned        │
                               ▼                        │
                    ┌────────────────────┐  ┌───────────┴────────┐
                    │  DApp gets result  │  │  Pattern recorded  │
                    │  User sees confirm │  │  (learning)        │
                    └────────────────────┘  └────────────────────┘

          ┌──────────────────────────────────┐
          │  On-demand deep analysis         │
          │  (GoPlus + Honeypot.is)          │
          │  Triggered by user via Telegram  │
          └──────────────────────────────────┘
```

## How It Is Made

Zhentan is built with three tiers working together: instant server-side screening, interactive Telegram review, and on-demand deep analysis.

### 1. User-facing app & smart account setup

The frontend handles onchain interactions and transaction creation. Users onboard with Google sign-in and an embedded wallet (Privy). Each user gets a smart account with multisig support, powered by ERC-4337 for gas sponsorship and transaction bundling. The dashboard shows live token balances and portfolio value via Zerion API integration.

Users can also connect external DApps (PancakeSwap, Venus, etc.) via WalletConnect. The app acts as a wallet that DApps connect to — transaction requests from DApps are presented for user approval, then flow through the same Safe 2-of-2 multisig and screening pipeline. Once executed, the transaction hash is returned to the DApp via WalletConnect.

### 2. Server-side inline risk analysis

When a transaction hits the `/queue` endpoint, the server runs `analyzeRisk()` instantly against learned behavioral patterns — known recipients, typical amounts, business hours, daily volume limits, and single-transaction caps. Each factor contributes to a 0-100 risk score:

- **APPROVE (< 40):** The server auto-signs (2 of 2) and executes the UserOperation immediately. No agent roundtrip needed. Patterns are recorded asynchronously.
- **REVIEW (40-70):** A Telegram notification is sent with interactive approve/reject buttons. The user reviews and responds from Telegram.
- **BLOCK (> 70):** The transaction is blocked outright and the user is alerted via Telegram.

Risk scores, verdicts, and reasons are stored on each `PendingTransaction` for full auditability.

### 3. OpenClaw agent & conversational support

The OpenClaw agent (Qwen3-235B / Sonnet 4.5 via OpenRouter) handles the interactive layer rather than driving initial screening. When a user responds to a Telegram review notification, the agent signs and executes approved transactions or records rejections. The `/notify-resolve` endpoint updates the original Telegram message with the final outcome.

For deeper investigation, the agent can run `deep-analyze` — calling GoPlus Security API and Honeypot.is to check recipient address reputation (scams, phishing, sanctions) and token security (honeypot detection, mintable supply, tax rates). This is triggered on-demand when the user asks from Telegram, not automatically on every transaction.

### 4. Onchain execution on BNB Chain

Transaction signatures are combined once final approval is available. The completed UserOperation is submitted to a Pimlico bundler for gasless execution on BNB Chain. Zhentan uses an ERC-4337 module contract deployed on BNB Chain, with Viem and Permissionless.js handling smart account interactions and execution.
