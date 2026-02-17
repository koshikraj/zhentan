"use client";

import PrivyProvider from "./context/PrivyProvider";
import { AuthProvider } from "./context/AuthContext";
import { WalletConnectProvider } from "./context/WalletConnectContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PrivyProvider>
      <AuthProvider>
        <WalletConnectProvider>{children}</WalletConnectProvider>
      </AuthProvider>
    </PrivyProvider>
  );
}
