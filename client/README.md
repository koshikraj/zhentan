# Zhentan Client

Next.js frontend for the Zhentan wallet: dashboard, send/receive USDC, activity, invoice requests, settings.

## Pages

| Route | Description |
|-------|-------------|
| `/` | Landing page — project overview, architecture diagram, features |
| `/deck` | Interactive slide deck — 8 slides, keyboard navigable (← →) |
| `/login` | Sign in with Google via Privy |
| `/app` | Main wallet dashboard |

## Prerequisites

- Node.js 18+
- npm (or pnpm / yarn)

## Setup

1. **Install dependencies**

   ```bash
   cd client
   npm install
   ```

2. **Configure environment**

   ```bash
   cp .env.example .env.local
   ```

   Edit `.env.local` and set at least:

   - **Propose flow:** `NEXT_PUBLIC_PIMLICO_API_KEY`, `NEXT_PUBLIC_AGENT_ADDRESS`, `NEXT_PUBLIC_PRIVY_APP_ID`
   - **Server-side (if using built-in API routes):** `PIMLICO_API_KEY`, `USDC_CONTRACT_ADDRESS`, `QUEUE_PATH` (and optionally `STATE_PATH`, `PATTERNS_PATH`)
## Run

**Development**

```bash
npm run dev
```

App runs at [http://localhost:3000](http://localhost:3000). Restart the dev server after changing `.env.local`.

**Production**

```bash
npm run build
npm start
```

**Lint**

```bash
npm run lint
```
