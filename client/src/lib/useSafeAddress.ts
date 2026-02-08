"use client";

import { useState, useEffect, useRef } from "react";
import { createPublicClient, http } from "viem";
import { bsc } from "viem/chains";
import { toAccount } from "viem/accounts";
import { entryPoint07Address } from "viem/account-abstraction";
import { toSafeSmartAccount } from "permissionless/accounts";

import {
  SAFE_SINGLETON,
  SAFE_PROXY_FACTORY,
  SAFE_VERSION,
  BSC_RPC,
} from "./constants";

const cache = new Map<string, string>();

export function useSafeAddress(ownerAddress: string | undefined) {
  const [safeAddress, setSafeAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const computingRef = useRef<string | null>(null);

  useEffect(() => {
    if (!ownerAddress) {
      setSafeAddress(null);
      return;
    }

    // Return cached result
    const cached = cache.get(ownerAddress);
    if (cached) {
      setSafeAddress(cached);
      return;
    }

    // Avoid duplicate computation for same address
    if (computingRef.current === ownerAddress) return;
    computingRef.current = ownerAddress;

    setLoading(true);

    const ownerAddr2 = process.env.NEXT_PUBLIC_AGENT_ADDRESS;
    if (!ownerAddr2) {
      console.error("Missing NEXT_PUBLIC_AGENT_ADDRESS");
      setLoading(false);
      return;
    }

    const publicClient = createPublicClient({
      chain: bsc,
      transport: http(BSC_RPC),
    });

    const owners = [
      toAccount(ownerAddress as `0x${string}`),
      toAccount(ownerAddr2 as `0x${string}`),
    ];

    toSafeSmartAccount({
      client: publicClient,
      entryPoint: { address: entryPoint07Address, version: "0.7" },
      owners,
      saltNonce: 0n,
      safeSingletonAddress: SAFE_SINGLETON,
      safeProxyFactoryAddress: SAFE_PROXY_FACTORY,
      version: SAFE_VERSION,
      threshold: 2n,
    })
      .then((account) => {
        cache.set(ownerAddress, account.address);
        setSafeAddress(account.address);
      })
      .catch((err) => {
        console.error("Failed to compute Safe address:", err);
      })
      .finally(() => {
        setLoading(false);
        computingRef.current = null;
      });
  }, [ownerAddress]);

  return { safeAddress, loading };
}
