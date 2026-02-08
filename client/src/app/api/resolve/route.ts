import { NextResponse } from "next/server";
import { createPublicClient, http, isAddress } from "viem";
import { mainnet } from "viem/chains";
import { normalize } from "viem/ens";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const name = searchParams.get("name")?.trim();
    if (!name) {
      return NextResponse.json({ error: "Missing name" }, { status: 400 });
    }
    if (name.startsWith("0x") && name.length === 42 && isAddress(name)) {
      return NextResponse.json({ address: name });
    }
    const client = createPublicClient({
      chain: mainnet,
      transport: http(),
    });
    const address = await client.getEnsAddress({
      name: normalize(name),
    });
    if (!address) {
      return NextResponse.json({ error: "Name not found" }, { status: 404 });
    }
    return NextResponse.json({ address });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Resolve failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
