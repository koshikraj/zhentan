# Zhentan Server

Express backend that handles queue and invoice file I/O. Use this when deploying the Next.js client to Vercel (or any read-only filesystem): run this server on a host with a writable filesystem and point the client at it for transactions, queue, execute, and invoices.

## Setup

1. Install and configure env:

   ```bash
   cd server
   npm install
   cp .env.example .env
   # Edit .env: QUEUE_PATH, INVOICE_QUEUE_PATH, AGENT_PRIVATE_KEY, PIMLICO_API_KEY
   ```

2. Ensure queue files exist and are writable, e.g.:

   ```bash
   mkdir -p data
   echo '{"pending":[]}' > data/pending-queue.json
   echo '{"invoices":[]}' > data/invoice-queue.json
   ```

3. Run:

   ```bash
   npm run dev   # development (tsx watch)
   # or
   npm run build && npm start
   ```

If `BACKEND_URL` is unset, the client can keep using the existing Next.js API routes (e.g. for local dev with a local queue file).
