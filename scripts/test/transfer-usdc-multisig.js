/**
 * Multisig USDC transfer using a Safe account (ERC-4337) via permissionless.js.
 * Prepares a user operation, collects signatures from multiple owners, then submits.
 * Uses bsc. Configure via .env (see .env.example).
 */
import "dotenv/config";
import { createSmartAccountClient } from "permissionless";
import { createPimlicoClient } from "permissionless/clients/pimlico";
import { toSafeSmartAccount } from "permissionless/accounts";
import { SafeSmartAccount } from "permissionless/accounts/safe";
import {
  createPublicClient,
  http,
  parseUnits,
  encodeFunctionData,
} from "viem";
import { bsc } from "viem/chains";
import { privateKeyToAccount, toAccount } from "viem/accounts";
import { entryPoint07Address } from "viem/account-abstraction";

// USDC (official)
const DEFAULT_USDC_SEPOLIA = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";
const USDC_DECIMALS = 6;
const SAFE_VERSION = "1.4.1";

const erc20TransferAbi = [
  {
    name: "transfer",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
];


async function main() {
  const pimlicoApiKey = process.env.PIMLICO_API_KEY;
  const recipient = process.env.RECIPIENT_ADDRESS;
  const amountHuman = process.env.USDC_AMOUNT ?? "1";
  const usdcAddress =
    process.env.USDC_CONTRACT_ADDRESS ?? DEFAULT_USDC_SEPOLIA;
  const ownerPrivateKeys =[
        process.env.PRIVATE_KEY,
        process.env.PRIVATE_KEY2
      ]
  const ownerAddresses = [ process.env.OWNER_ADDRESS1, process.env.OWNER_ADDRESS2]
  const threshold = process.env.SAFE_THRESHOLD
    ? parseInt(process.env.SAFE_THRESHOLD, 10)
    : null;

  if (!pimlicoApiKey) {
    throw new Error("Missing PIMLICO_API_KEY in .env");
  }
  if (!recipient?.startsWith("0x")) {
    throw new Error("Missing or invalid RECIPIENT_ADDRESS in .env");
  }
  const ownerAccounts = ownerPrivateKeys
    .filter((key) => key?.startsWith("0x"))
    .map((key) => privateKeyToAccount(key));
  if (ownerAccounts.length < 1) {
    throw new Error(
      "At least 1 owner private key required (PRIVATE_KEY, PRIVATE_KEY2, ... or OWNER_PRIVATE_KEYS)"
    );
  }
  const owners =  ownerAddresses.map((addr) => toAccount(addr))
  if (owners.length < 2) {
    throw new Error(
      "Safe needs at least 2 owners. Set OWNER_ADDRESSES (all owner addresses) or provide at least 2 private keys."
    );
  }
  const safeThreshold =
    threshold != null && threshold >= 1 && threshold <= owners.length
      ? BigInt(threshold)
      : BigInt(owners.length);
  if (ownerAccounts.length < Number(safeThreshold)) {
    throw new Error(
      `Need at least ${safeThreshold} signing keys (have ${ownerAccounts.length}). Set PRIVATE_KEY, PRIVATE_KEY2, ... for each signer.`
    );
  }

  const publicClient = createPublicClient({
    chain: bsc,
    transport: http("https://1rpc.io/bnb"),
  });

  const paymasterClient = createPimlicoClient({
    transport: http(
      `https://api.pimlico.io/v2/binance/rpc?apikey=${pimlicoApiKey}`
    ),
    entryPoint: {
      address: entryPoint07Address,
      version: "0.7",
    },
    });

  const safeAccount = await toSafeSmartAccount({
    client: publicClient,
    entryPoint: {
      address: entryPoint07Address,
      version: "0.7",
    },
    owners,
    saltNonce: 0n,
    safeSingletonAddress: '0x29fcB43b46531BcA003ddC8FCB67FFE91900C762',
    safeProxyFactoryAddress: '0x4e1DCf7AD4e460CfD30791CCC4F9c8a4f820ec67',
    version: SAFE_VERSION,

    threshold: safeThreshold,
  });

  const smartAccountClient = createSmartAccountClient({
    account: safeAccount,
    chain: bsc,
    paymaster: paymasterClient,
    bundlerTransport: http(
      `https://api.pimlico.io/v2/binance/rpc?apikey=${pimlicoApiKey}`
    ),
    userOperation: {
      estimateFeesPerGas: async () =>
        (await paymasterClient.getUserOperationGasPrice()).fast,
    },
  });

  const amountWei = parseUnits(amountHuman, USDC_DECIMALS);
  const data = encodeFunctionData({
    abi: erc20TransferAbi,
    functionName: "transfer",
    args: [recipient, amountWei],
  });

  const call = {
    to: usdcAddress,
    value: 0n,
    data,
  };

  console.log("Safe account:", safeAccount.address);
  console.log("USDC transfer:", amountHuman, "USDC ->", recipient);
  console.log(
    "Owners:",
    owners.length,
    "| Threshold:",
    safeThreshold.toString(),
    "| Signing with:",
    ownerAccounts.length,
    "key(s)"
  );

  const unSignedUserOperation = await smartAccountClient.prepareUserOperation({
    calls: [call],
  });

  // Collect signatures from the keys we have (may be fewer than all owners, e.g. 2-of-3).
  let partialSignatures;
  for (let i = 0; i < ownerAccounts.length; i++) {
    const ownerAccount = ownerAccounts[i];
    const signParams = {
      version: SAFE_VERSION,
      entryPoint: {
        address: entryPoint07Address,
        version: "0.7",
      },
      chainId: bsc.id,
      owners,
      account: ownerAccount,
      ...unSignedUserOperation,
    };
    if (partialSignatures) {
      signParams.signatures = partialSignatures;
    }
    partialSignatures = await SafeSmartAccount.signUserOperation(signParams);
    console.log("Signature", i + 1, "/", ownerAccounts.length);
  }

  // Safe4337Module only accepts packed format: abi.encodePacked(validAfter, validUntil, signatures).
  // When we have fewer signers than owners, permissionless returns a tuple; convert it to packed.
  const finalSignature = partialSignatures

  const userOpHash = await smartAccountClient.sendUserOperation({
    ...unSignedUserOperation,
    signature: finalSignature,
  });

  console.log("UserOperation hash:", userOpHash);

  const receipt = await smartAccountClient.waitForUserOperationReceipt({
    hash: userOpHash,
  });

  console.log("Success:", receipt.success);
  if (receipt.receipt?.transactionHash) {
    console.log("Transaction hash:", receipt.receipt.transactionHash);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
