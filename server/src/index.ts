import "dotenv/config";
import cors from "cors";
import express from "express";
import { createTransactionsRouter } from "./routes/transactions.js";
import { createQueueRouter } from "./routes/queue.js";
import { createExecuteRouter } from "./routes/execute.js";
import { createInvoicesRouter } from "./routes/invoices.js";
import { createPortfolioRouter } from "./routes/portfolio.js";
import { createStatusRouter } from "./routes/status.js";
import { createResolveRouter } from "./routes/resolve.js";
import { editNotification } from "./notify.js";

const app = express();

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
app.use(express.json());

const getQueuePath = () => process.env.QUEUE_PATH;
const getInvoiceQueuePath = () => process.env.INVOICE_QUEUE_PATH;
const getStatePath = () => process.env.STATE_PATH;
const getPatternsPath = () => process.env.PATTERNS_PATH;

app.use("/transactions", createTransactionsRouter(getQueuePath));
app.use("/queue", createQueueRouter(getQueuePath));
app.use("/execute", createExecuteRouter(getQueuePath));
app.use("/invoices", createInvoicesRouter(getInvoiceQueuePath));
app.use("/portfolio", createPortfolioRouter());
app.use("/status", createStatusRouter(getStatePath, getPatternsPath));
app.use("/resolve", createResolveRouter());

app.post("/notify-resolve", (req, res) => {
  const { txId, action, txHash } = req.body ?? {};
  if (!txId || !action) {
    res.status(400).json({ error: "Missing txId or action" });
    return;
  }

  let message: string;
  if (action === "approved") {
    message = `✅ Approved — ${txId}`;
    if (txHash) message += `\nTX: https://bscscan.com/tx/${txHash}`;
  } else if (action === "rejected") {
    message = `❌ Rejected — ${txId}`;
  } else {
    message = `${action} — ${txId}`;
  }

  editNotification(txId, message);
  res.json({ ok: true });
});

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

const port = Number(process.env.PORT) || 3001;
app.listen(port, () => {
  console.log(`Zhentan server listening on http://localhost:${port}`);
});
