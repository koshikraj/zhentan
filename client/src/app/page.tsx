"use client";

import { useState, useEffect, useCallback } from "react";
import { TopBar } from "@/components/TopBar";
import { BalanceCard } from "@/components/BalanceCard";
import { SendPanel } from "@/components/SendPanel";
import { ReceivePanel } from "@/components/ReceivePanel";
import { ActivityList } from "@/components/ActivityList";
import { Dialog } from "@/components/ui/Dialog";
import { AuthGuard } from "@/components/AuthGuard";
import { ThemeLoader } from "@/components/ThemeLoader";
import { useAuth } from "@/app/context/AuthContext";
import { useSafeAddress } from "@/lib/useSafeAddress";
import { getBackendApiUrl } from "@/lib/api";
import type { TransactionWithStatus, StatusResponse } from "@/types";

function Dashboard() {
  const { user, wallet } = useAuth();
  const { safeAddress, loading: safeLoading } = useSafeAddress(wallet?.address);

  const [balance, setBalance] = useState<string | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(true);
  const [transactions, setTransactions] = useState<TransactionWithStatus[]>([]);
  const [txLoading, setTxLoading] = useState(true);
  const [screeningMode, setScreeningMode] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [receiveOpen, setReceiveOpen] = useState(false);

  const fetchBalance = useCallback(async () => {
    if (!safeAddress) return;
    try {
      const res = await fetch(`/api/balance?safeAddress=${safeAddress}`);
      if (res.ok) {
        const data = await res.json();
        setBalance(data.formatted);
      }
    } catch {
      // silent
    } finally {
      setBalanceLoading(false);
    }
  }, [safeAddress]);

  const fetchTransactions = useCallback(async () => {
    if (!safeAddress) return;
    try {
      const res = await fetch(
        `${getBackendApiUrl("transactions")}?safeAddress=${encodeURIComponent(safeAddress)}`
      );
      if (res.ok) {
        const data = await res.json();
        setTransactions(data.transactions);
      }
    } catch {
      // silent
    } finally {
      setTxLoading(false);
    }
  }, [safeAddress]);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/status");
      if (res.ok) {
        const data: StatusResponse = await res.json();
        setScreeningMode(data.screeningMode);
      }
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    if (!safeAddress) return;
    fetchBalance();
    fetchTransactions();
    fetchStatus();
  }, [safeAddress, fetchBalance, fetchTransactions, fetchStatus]);

  const handleSendSuccess = () => {
    setSendOpen(false);
    fetchTransactions();
    fetchBalance();
  };

  const handleRefresh = useCallback(() => {
    setBalanceLoading(true);
    setTxLoading(true);
    fetchBalance();
    fetchTransactions();
  }, [fetchBalance, fetchTransactions]);

  if (safeLoading || !safeAddress) {
    return (
      <ThemeLoader
        variant="auth"
        message="Preparing your wallet..."
        subtext="Securing your session"
      />
    );
  }

  return (
    <div className="flex flex-col h-screen min-h-0 cosmic-bg starfield">
      <TopBar screeningMode={screeningMode} />

      <main className="flex-1 flex flex-col min-h-0 w-full px-4 py-5 sm:p-6 md:p-8 max-w-4xl mx-auto overflow-y-auto">
        <div className="flex-shrink-0 mb-4 sm:mb-6">
          <BalanceCard
          balance={balance}
          safeAddress={safeAddress}
          loading={balanceLoading}
          email={user?.email}
          onRefresh={handleRefresh}
          onToggleSend={() => {
            setSendOpen(!sendOpen);
            setReceiveOpen(false);
          }}
          onToggleReceive={() => {
            setReceiveOpen(!receiveOpen);
            setSendOpen(false);
          }}
          sendOpen={sendOpen}
          receiveOpen={receiveOpen}
        />
        </div>

        <Dialog
          open={sendOpen}
          onClose={() => setSendOpen(false)}
          title="Send crypto"
          className="max-w-md min-h-[28rem]"
        >
          <SendPanel
            onSuccess={handleSendSuccess}
            onClose={() => setSendOpen(false)}
            onRefreshActivities={fetchTransactions}
            balance={balance}
            screeningMode={screeningMode}
          />
        </Dialog>

        <Dialog open={receiveOpen} onClose={() => setReceiveOpen(false)}>
          <ReceivePanel safeAddress={safeAddress} />
        </Dialog>

        <div className="flex-1 min-h-0 overflow-y-auto">
          <ActivityList transactions={transactions} loading={txLoading} />
        </div>
      </main>
    </div>
  );
}

export default function Home() {
  return (
    <AuthGuard>
      <Dashboard />
    </AuthGuard>
  );
}
