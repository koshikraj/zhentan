"use client";

import {
  createContext,
  useContext,
  useMemo,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { usePrivy, useWallets, useCreateWallet } from "@privy-io/react-auth";
import { createWalletClient, custom } from "viem";
import { bsc } from "viem/chains";
import type { Address, LocalAccount } from "viem";

export interface AuthUser {
  email?: string;
  name?: string;
  image?: string;
}

export interface AuthWallet {
  address: string;
}

export interface AuthContextType {
  user: AuthUser | null;
  wallet: AuthWallet | null;
  loading: boolean;
  login: () => void;
  logout: () => void;
  /** Returns a signer (wallet client + account) for the embedded wallet (for Safe signing). */
  getOwnerAccount: () => Promise<LocalAccount | null>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { ready, authenticated, user: privyUser, login: privyLogin, logout: privyLogout } = usePrivy();
  const { wallets } = useWallets();
  const { createWallet } = useCreateWallet();
  const hasAttemptedCreate = useRef(false);

  const primaryWallet = useMemo(
    () => wallets.find((w) => w.walletClientType === "privy"),
    [wallets]
  );

  useEffect(() => {
    if (!ready || !authenticated || primaryWallet) return;
    if (hasAttemptedCreate.current) return;
    hasAttemptedCreate.current = true;
    createWallet().catch((e) => {
      console.error("Privy createWallet failed:", e);
      hasAttemptedCreate.current = false;
    });
  }, [ready, authenticated, primaryWallet, createWallet]);

  // Switch embedded wallet to app chain (bsc) for signing
  useEffect(() => {
    if (!primaryWallet) return;
    primaryWallet.switchChain(bsc.id).catch((e) => {
      console.warn("Could not switch wallet to bsc:", e);
    });
  }, [primaryWallet]);

  const user: AuthUser | null = useMemo(() => {
    if (!privyUser) return null;
    const google = (privyUser as { google?: { email?: string; name?: string; picture?: string } }).google;
    console.log("privyUser", privyUser);
    return {
      email: google?.email,
      name: google?.name,
      image: google?.picture,
    };
  }, [privyUser]);

  const wallet: AuthWallet | null = useMemo(() => {
    if (!primaryWallet?.address) return null;
    return { address: primaryWallet.address };
  }, [primaryWallet]);

  const loading = !ready || (authenticated && !primaryWallet);

  const login = useCallback(() => {
    privyLogin();
  }, [privyLogin]);

  const logout = useCallback(() => {
    privyLogout();
  }, [privyLogout]);

  const getOwnerAccount = useCallback(async (): Promise<LocalAccount | null> => {
    if (!primaryWallet) return null;
    try {
      const provider = await primaryWallet.getEthereumProvider();
      const walletAddress = primaryWallet.address as Address;
      const walletClient = createWalletClient({
        account: walletAddress,
        chain: bsc,
        transport: custom(provider),
      });
      const signer = { ...walletClient, address: walletAddress };
      return signer as unknown as LocalAccount;
    } catch (e) {
      console.error("getOwnerAccount failed:", e);
      return null;
    }
  }, [primaryWallet]);

  const value: AuthContextType = useMemo(
    () => ({
      user,
      wallet,
      loading,
      login,
      logout,
      getOwnerAccount,
    }),
    [user, wallet, loading, login, logout, getOwnerAccount]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider (inside PrivyProvider)");
  }
  return ctx;
}
