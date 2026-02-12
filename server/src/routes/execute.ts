import { Router, Request, Response } from "express";
import { readFileSync, writeFileSync } from "fs";
import { createPublicClient, http } from "viem";
import { bsc } from "viem/chains";
import { privateKeyToAccount, toAccount } from "viem/accounts";
import { entryPoint07Address } from "viem/account-abstraction";
import { createSmartAccountClient } from "permissionless";
import { createPimlicoClient } from "permissionless/clients/pimlico";
import { toSafeSmartAccount } from "permissionless/accounts";
import { SafeSmartAccount } from "permissionless/accounts/safe";
import {
  SAFE_SINGLETON,
  SAFE_PROXY_FACTORY,
  SAFE_VERSION,
  BSC_RPC,
  getPimlicoRpcUrl,
} from "../lib/constants.js";
import { deserializeUserOp } from "../lib/serialize.js";
import type { QueueFile } from "../types.js";

export function createExecuteRouter(getQueuePath: () => string | undefined) {
  const router = Router();

  router.post("/", async (req: Request, res: Response) => {
    try {
      const { txId } = req.body ?? {};
      if (!txId) {
        res.status(400).json({ error: "Missing txId" });
        return;
      }

      const queuePath = getQueuePath();
      const agentPrivateKey = process.env.AGENT_PRIVATE_KEY;
      const pimlicoApiKey = process.env.PIMLICO_API_KEY;

      if (!queuePath) {
        res.status(500).json({ error: "Missing QUEUE_PATH" });
        return;
      }
      if (!agentPrivateKey) {
        res.status(500).json({ error: "Missing AGENT_PRIVATE_KEY" });
        return;
      }
      if (!pimlicoApiKey) {
        res.status(500).json({ error: "Missing PIMLICO_API_KEY" });
        return;
      }

      let queue: QueueFile;
      try {
        queue = JSON.parse(readFileSync(queuePath, "utf8"));
      } catch {
        res.status(500).json({ error: "Queue file not found" });
        return;
      }

      const txIndex = queue.pending.findIndex((t) => t.id === txId);
      if (txIndex === -1) {
        res.status(404).json({ error: `Transaction ${txId} not found` });
        return;
      }

      const tx = queue.pending[txIndex];
      if (tx.executedAt) {
        res.json({
          status: "already_executed",
          txHash: tx.txHash,
        });
        return;
      }

      if (!tx.userOp || !tx.partialSignatures) {
        res.status(400).json({
          error: "Missing userOp or partialSignatures",
        });
        return;
      }

      const agentAccount = privateKeyToAccount(agentPrivateKey as `0x${string}`);
      const owners = tx.ownerAddresses.map((addr) =>
        toAccount(addr as `0x${string}`)
      );
      const userOp = deserializeUserOp(tx.userOp);

      const publicClient = createPublicClient({
        chain: bsc,
        transport: http(BSC_RPC),
      });

      const paymasterClient = createPimlicoClient({
        transport: http(getPimlicoRpcUrl(pimlicoApiKey)),
        entryPoint: { address: entryPoint07Address, version: "0.7" },
      });

      const safeAccount = await toSafeSmartAccount({
        client: publicClient,
        entryPoint: { address: entryPoint07Address, version: "0.7" },
        owners,
        saltNonce: 0n,
        safeSingletonAddress: SAFE_SINGLETON,
        safeProxyFactoryAddress: SAFE_PROXY_FACTORY,
        version: SAFE_VERSION,
        threshold: BigInt(tx.threshold),
      });

      const smartAccountClient = createSmartAccountClient({
        account: safeAccount,
        chain: bsc,
        paymaster: paymasterClient,
        bundlerTransport: http(getPimlicoRpcUrl(pimlicoApiKey)),
        userOperation: {
          estimateFeesPerGas: async () =>
            (await paymasterClient.getUserOperationGasPrice()).fast,
        },
      });

      const signParams: Record<string, unknown> = {
        version: SAFE_VERSION,
        entryPoint: { address: entryPoint07Address, version: "0.7" },
        chainId: bsc.id,
        owners,
        account: agentAccount,
        ...userOp,
      };
      signParams.signatures = tx.partialSignatures;

      const combinedSignatures = await SafeSmartAccount.signUserOperation(
        signParams as Parameters<typeof SafeSmartAccount.signUserOperation>[0]
      );

      const userOpHash = await smartAccountClient.sendUserOperation({
        ...userOp,
        signature: combinedSignatures,
      } as Parameters<typeof smartAccountClient.sendUserOperation>[0]);

      const receipt = await smartAccountClient.waitForUserOperationReceipt({
        hash: userOpHash,
      });

      const txHash = receipt.receipt?.transactionHash ?? userOpHash;

      tx.executedAt = new Date().toISOString();
      tx.executedBy = agentAccount.address;
      tx.txHash = txHash;
      tx.success = receipt.success;
      queue.pending[txIndex] = tx;
      writeFileSync(queuePath, JSON.stringify(queue, null, 2));

      res.json({
        status: "executed",
        txId: tx.id,
        to: tx.to,
        amount: tx.amount,
        token: tx.token,
        txHash,
        success: receipt.success,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error("Execute error:", message);
      res.status(500).json({ error: message });
    }
  });

  return router;
}
