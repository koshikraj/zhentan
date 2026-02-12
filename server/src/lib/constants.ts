import type { Hex } from "viem";

export const SAFE_SINGLETON: Hex =
  "0x29fcB43b46531BcA003ddC8FCB67FFE91900C762";
export const SAFE_PROXY_FACTORY: Hex =
  "0x4e1DCf7AD4e460CfD30791CCC4F9c8a4f820ec67";
export const SAFE_VERSION = "1.4.1" as const;

export const BSC_RPC = "https://1rpc.io/bnb";

export function getPimlicoRpcUrl(apiKey: string): string {
  return `https://api.pimlico.io/v2/binance/rpc?apikey=${apiKey}`;
}
