import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http, formatUnits, type Hex } from "viem";
import { bsc } from "viem/chains";
import { ERC20_BALANCE_OF_ABI, USDC_DECIMALS, BSC_RPC } from "@/lib/constants";

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

export async function GET(request: NextRequest) {
  try {
    const safeAddress =
      request.nextUrl.searchParams.get("safeAddress")
    const usdcAddress = process.env.USDC_CONTRACT_ADDRESS;

    if (!safeAddress || !ADDRESS_RE.test(safeAddress)) {
      return NextResponse.json(
        { error: "Missing or invalid safeAddress" },
        { status: 400 }
      );
    }

    if (!usdcAddress) {
      return NextResponse.json(
        { error: "Missing USDC_CONTRACT_ADDRESS" },
        { status: 500 }
      );
    }

    const client = createPublicClient({
      chain: bsc,
      transport: http(BSC_RPC),
    });

    const balance = await client.readContract({
      address: usdcAddress as Hex,
      abi: ERC20_BALANCE_OF_ABI,
      functionName: "balanceOf",
      args: [safeAddress as Hex],
    });

    const formatted = formatUnits(balance as bigint, USDC_DECIMALS);

    return NextResponse.json({
      balance: (balance as bigint).toString(),
      formatted,
      safeAddress,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
