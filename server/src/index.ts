import "dotenv/config";
import cors from "cors";
import express from "express";
import { createTransactionsRouter } from "./routes/transactions.js";
import { createQueueRouter } from "./routes/queue.js";
import { createExecuteRouter } from "./routes/execute.js";
import { createInvoicesRouter } from "./routes/invoices.js";

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

app.use("/transactions", createTransactionsRouter(getQueuePath));
app.use("/queue", createQueueRouter(getQueuePath));
app.use("/execute", createExecuteRouter(getQueuePath));
app.use("/invoices", createInvoicesRouter(getInvoiceQueuePath));

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

const port = Number(process.env.PORT) || 3001;
app.listen(port, () => {
  console.log(`Zhentan server listening on http://localhost:${port}`);
});
