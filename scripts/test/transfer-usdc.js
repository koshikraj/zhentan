/**
 * Simple USDC transfer using a Safe account (ERC-4337) via permissionless.js.
 * Uses Sepolia. Configure via .env (see .env.example).
 */
import "dotenv/config";
import { createSmartAccountClient } from "permissionless";
import { createPimlicoClient } from "permissionless/clients/pimlico";
import { toSafeSmartAccount } from "permissionless/accounts";
import {
  createPublicClient,
  http,
  parseUnits,
  encodeFunctionData,
} from "viem";
import { bsc } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { entryPoint07Address } from "viem/account-abstraction";

// USDC (official): https://developer.interlace.money/docs/usdc-on-testing-networks
const DEFAULT_USDC_SEPOLIA = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";
const USDC_DECIMALS = 6;

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
  const privateKey = process.env.PRIVATE_KEY;
  const pimlicoApiKey = process.env.PIMLICO_API_KEY;
  const recipient = process.env.RECIPIENT_ADDRESS;
  const amountHuman = process.env.USDC_AMOUNT ?? "1";
  const usdcAddress =
    process.env.USDC_CONTRACT_ADDRESS ?? DEFAULT_USDC_SEPOLIA;

  if (!privateKey?.startsWith("0x")) {
    throw new Error("Missing or invalid PRIVATE_KEY in .env");
  }
  if (!pimlicoApiKey) {
    throw new Error("Missing PIMLICO_API_KEY in .env");
  }
  if (!recipient?.startsWith("0x")) {
    throw new Error("Missing or invalid RECIPIENT_ADDRESS in .env");
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

  const owner = privateKeyToAccount(privateKey);

  const safeAccount = await toSafeSmartAccount({
    client: publicClient,
    entryPoint: {
      address: entryPoint07Address,
      version: "0.7",
    },
    owners: [owner],
    saltNonce: 0n,
    version: "1.4.1",
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

  console.log("Safe account:", safeAccount.address);
  console.log("Sending USDC:", amountHuman, "USDC ->", recipient);

  const txHash = await smartAccountClient.sendTransaction({
    to: usdcAddress,
    value: 0n,
    data,
  });

  console.log("Transaction hash:", txHash);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
