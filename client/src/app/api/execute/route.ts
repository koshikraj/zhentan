import { NextResponse } from "next/server";
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
} from "@/lib/constants";
import { deserializeUserOp } from "@/lib/serialize";
import type { QueueFile } from "@/types";

/**
 * POST /api/execute
 * Co-signs a pending transaction with the agent key and submits to bundler.
 * Used when screening mode is OFF for immediate execution.
 */
export async function POST(request: Request) {
  try {
    const { txId } = await request.json();
    if (!txId) {
      return NextResponse.json({ error: "Missing txId" }, { status: 400 });
    }

    const queuePath = process.env.QUEUE_PATH;
    const agentPrivateKey = process.env.AGENT_PRIVATE_KEY;
    const pimlicoApiKey = process.env.PIMLICO_API_KEY;

    console.log("queuePath", queuePath);
    console.log("agentPrivateKey", agentPrivateKey);
    console.log("pimlicoApiKey", pimlicoApiKey);

    if (!queuePath) {
      return NextResponse.json({ error: "Missing QUEUE_PATH" }, { status: 500 });
    }
    if (!agentPrivateKey) {
      return NextResponse.json({ error: "Missing AGENT_PRIVATE_KEY" }, { status: 500 });
    }
    if (!pimlicoApiKey) {
      return NextResponse.json({ error: "Missing PIMLICO_API_KEY" }, { status: 500 });
    }

    // 1. Read queue and find tx
    let queue: QueueFile;
    try {
      queue = JSON.parse(readFileSync(queuePath, "utf8"));
    } catch {
      return NextResponse.json({ error: "Queue file not found" }, { status: 500 });
    }

    const txIndex = queue.pending.findIndex((t) => t.id === txId);
    if (txIndex === -1) {
      return NextResponse.json({ error: `Transaction ${txId} not found` }, { status: 404 });
    }

    const tx = queue.pending[txIndex];
    if (tx.executedAt) {
      return NextResponse.json({
        status: "already_executed",
        txHash: tx.txHash,
      });
    }

    if (!tx.userOp || !tx.partialSignatures) {
      return NextResponse.json(
        { error: "Missing userOp or partialSignatures" },
        { status: 400 }
      );
    }

    // 2. Set up clients
    const agentAccount = privateKeyToAccount(agentPrivateKey as `0x${string}`);
    const owners = tx.ownerAddresses.map((addr) => toAccount(addr as `0x${string}`));
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

    console.log("Safe account:", safeAccount.address);

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

    // 3. Agent co-signs
    // Mirror agent-sign.js: spread userOp, then set signatures AFTER
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const signParams: any = {
      version: SAFE_VERSION,
      entryPoint: { address: entryPoint07Address, version: "0.7" },
      chainId: bsc.id,
      owners,
      account: agentAccount,
      ...userOp,
    };
    signParams.signatures = tx.partialSignatures;

    const combinedSignatures = await SafeSmartAccount.signUserOperation(signParams);

    // 4. Submit to bundler
    const userOpHash = await smartAccountClient.sendUserOperation({
      ...userOp,
      signature: combinedSignatures,
    } as Parameters<typeof smartAccountClient.sendUserOperation>[0]);

    const receipt = await smartAccountClient.waitForUserOperationReceipt({
      hash: userOpHash,
    });

    const txHash = receipt.receipt?.transactionHash || userOpHash;

    // 5. Update queue
    tx.executedAt = new Date().toISOString();
    tx.executedBy = agentAccount.address;
    tx.txHash = txHash;
    tx.success = receipt.success;
    queue.pending[txIndex] = tx;
    writeFileSync(queuePath, JSON.stringify(queue, null, 2));

    return NextResponse.json({
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
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
