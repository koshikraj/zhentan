import { formatUnits, zeroAddress } from "viem";

const ZERION_API_KEY = process.env.ZERION_API_KEY;
const BASE_URL = "https://api.zerion.io/v1";

/** Zerion chain id strings -> numeric chainId (we only care about BNB = 56) */
const CHAIN_ID_BY_ZERION_ID: Record<string, number> = {
  binance_smart_chain: 56,
  "binance-smart-chain": 56,
  bsc: 56,
};

const BNB_CHAIN_ID = 56;

export interface TokenPosition {
  id: string;
  tokenId?: string;
  name: string;
  symbol: string;
  decimals: number;
  iconUrl?: string;
  usdValue: number | null;
  balance: string;
  price: number;
  address: string | null;
  chain: { id: string; chainId: number; name: string };
  verified: boolean;
}

export interface PortfolioResponse {
  tokens: TokenPosition[];
  totalUsd: number;
}

function getChainId(zerionChainId: string): number | undefined {
  return CHAIN_ID_BY_ZERION_ID[zerionChainId];
}

export async function fetchTokenPositions(
  address: string,
  pageSize = 100,
  maxRetries = 3
): Promise<{ tokens: TokenPosition[] }> {
  if (!ZERION_API_KEY) {
    console.warn("ZERION_API_KEY not set; portfolio will be empty");
    return { tokens: [] };
  }

  const params = new URLSearchParams({
    currency: "usd",
    "filter[positions]": "no_filter",
    "filter[trash]": "only_non_trash",
    sort: "value",
    "page[size]": pageSize.toString(),
  });

  const url = `${BASE_URL}/wallets/${address}/positions/?${params}`;
  const options: RequestInit = {
    method: "GET",
    headers: {
      accept: "application/json",
      authorization: `Basic ${ZERION_API_KEY}`,
    },
  };

  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const json = await response.json();
      const data: unknown[] = json?.data ?? [];

      const walletPositions = data.filter((p: unknown) => {
        const a = (p as { attributes?: { position_type?: string; flags?: { displayable?: boolean }; fungible_info?: unknown } })?.attributes;
        return a?.position_type === "wallet" && a?.flags?.displayable && a?.fungible_info;
      });

      const tokens: TokenPosition[] = [];
      for (const position of walletPositions) {
        const pos = position as {
          id?: string;
          attributes: Record<string, unknown>;
          relationships?: { chain?: { data?: { id?: string } }; fungible?: { data?: { id?: string } } };
        };
        const attrs = pos.attributes;
        const rel = pos.relationships;
        const chainIdStr = rel?.chain?.data?.id ?? "";
        const chainId = getChainId(chainIdStr);
        if (chainId !== BNB_CHAIN_ID) continue;

        const fungibleInfo = attrs.fungible_info as {
          name: string;
          symbol: string;
          icon?: { url?: string };
          implementations?: { chain_id: string; address?: string; decimals?: number }[];
          flags?: { verified?: boolean };
        };
        const quantity = attrs.quantity as { int: string; decimals: number };
        const impl = fungibleInfo?.implementations?.find((i) => i.chain_id === chainIdStr);

        tokens.push({
          id: pos.id ?? "",
          tokenId: rel?.fungible?.data?.id,
          name: fungibleInfo?.name ?? "Unknown",
          symbol: fungibleInfo?.symbol ?? "?",
          decimals: quantity?.decimals ?? impl?.decimals ?? 18,
          iconUrl: fungibleInfo?.icon?.url,
          usdValue: (attrs.value as number) ?? null,
          balance: formatUnits(BigInt(quantity?.int ?? "0"), quantity?.decimals ?? 18),
          price: (attrs.price as number) ?? 0,
          address: impl?.address ?? zeroAddress,
          chain: { id: chainIdStr, chainId, name: "BNB Chain" },
          verified: fungibleInfo?.flags?.verified ?? false,
        });
      }

      return { tokens };
    } catch (err) {
      console.error(`Zerion positions attempt ${attempt + 1}/${maxRetries}:`, err);
      attempt++;
      if (attempt === maxRetries) {
        return { tokens: [] };
      }
      await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 1000));
    }
  }
  return { tokens: [] };
}

export async function getPortfolioForAddress(address: string): Promise<PortfolioResponse> {
  const { tokens } = await fetchTokenPositions(address, 100);
  const totalUsd = tokens.reduce((sum, t) => sum + (t.usdValue ?? 0), 0);
  return { tokens, totalUsd };
}
