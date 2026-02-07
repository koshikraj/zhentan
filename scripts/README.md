## The user and agent signing flow:


OWNER                                    AGENT (Zhentan)
  ─────                                    ─────────────────
  node propose-tx.js
    │
    ├─ prepareUserOperation()
    ├─ sign with PRIVATE_KEY (owner 1)
    └─ write to pending-queue.json ──────► cron picks up (every 30s)
                                             │
                                             ├─ check-pending.js
                                             ├─ analyze-risk.js <tx-id>
                                             │
                                      ┌──────┴──────┐
                                   APPROVE        REVIEW/BLOCK
                                      │               │
                            sign-and-execute.js    Telegram alert
                                      │
                                ┌─────▼──────┐
                                │ agent-sign  │
                                │   .js       │
                                └─────┬──────┘
                                      │
                                ├─ sign with PRIVATE_KEY2 (agent)
                                ├─ pack signatures
                                ├─ sendUserOperation()
                                └─ update pending-queue.json
