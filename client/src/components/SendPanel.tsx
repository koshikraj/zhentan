"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Button } from "./ui/Button";
import { proposeTransaction } from "@/lib/propose";
import { useAuth } from "@/app/context/AuthContext";
import { UsdcIcon } from "./icons/UsdcIcon";
import { ThemeLoaderSpinner } from "./ThemeLoader";
import { ChevronDown, ArrowUpRight, CheckCircle2, ExternalLink, Clock } from "lucide-react";
import { truncateAddress, formatDate, statusLabel } from "@/lib/format";
import { BSC_EXPLORER_URL } from "@/lib/constants";
import { getBackendApiUrl } from "@/lib/api";
import type { TransactionWithStatus, TokenPosition } from "@/types";

function TokenOption({ token, selected }: { token: TokenPosition; selected: boolean }) {
  return (
    <div className="flex items-center gap-3">
      {token.iconUrl ? (
        <span className="relative w-8 h-8 flex-shrink-0 rounded-full overflow-hidden bg-white/10">
          <Image src={token.iconUrl} alt="" width={32} height={32} className="object-cover" unoptimized />
        </span>
      ) : (
        <span className="w-8 h-8 flex-shrink-0 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-claw">
          {token.symbol.slice(0, 2)}
        </span>
      )}
      <div className="flex-1 min-w-0 text-left">
        <p className="text-sm font-semibold text-white">{token.symbol}</p>
        <p className="text-xs text-slate-400 truncate">
          {token.balance} {token.symbol}
          {token.usdValue != null && ` · $${token.usdValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
        </p>
      </div>
      {selected && <CheckCircle2 className="h-4 w-4 text-claw flex-shrink-0" />}
    </div>
  );
}

interface SendPanelProps {
  onSuccess: () => void;
  onClose?: () => void;
  onRefreshActivities?: () => void;
  /** BNB chain token positions (from portfolio API) */
  tokens: TokenPosition[];
  screeningMode?: boolean;
}

export function SendPanel({ onSuccess, onClose, onRefreshActivities, tokens, screeningMode = true }: SendPanelProps) {
  const { user, wallet, getOwnerAccount } = useAuth();
  const [recipient, setRecipient] = useState("");
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sendPhase, setSendPhase] = useState<"form" | "proposing" | "proposed" | "sending" | "success">("form");
  const [proposedTx, setProposedTx] = useState<TransactionWithStatus | null>(null);
  const [executedResult, setExecutedResult] = useState<{
    to: string;
    amount: string;
    token: string;
    txHash: string;
    executedAt: string;
  } | null>(null);
  const [tokenSelectorOpen, setTokenSelectorOpen] = useState(false);
  const ZERO = "0x0000000000000000000000000000000000000000";
  const sendableTokens = tokens.filter((t) => t.address && t.address.toLowerCase() !== ZERO);
  const [selectedToken, setSelectedToken] = useState<TokenPosition | null>(() => sendableTokens[0] ?? null);

  useEffect(() => {
    if (sendableTokens.length > 0 && !selectedToken) setSelectedToken(sendableTokens[0]);
    else if (sendableTokens.length > 0 && selectedToken && !sendableTokens.some((t) => t.id === selectedToken.id)) setSelectedToken(sendableTokens[0]);
  }, [tokens]);

  const balanceRaw = selectedToken?.balance ?? "0";
  const balanceNum = parseFloat(balanceRaw) || 0;
  const amountNum = parseFloat(amount) || 0;
  const insufficientFunds = amountNum > 0 && amountNum > balanceNum;

  const resolveRecipient = useCallback(async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      setResolvedAddress(null);
      setResolveError(null);
      return;
    }
    if (trimmed.startsWith("0x") && trimmed.length === 42) {
      setResolvedAddress(trimmed);
      setResolveError(null);
      return;
    }
    setResolving(true);
    setResolveError(null);
    try {
      const res = await fetch(`/api/resolve?name=${encodeURIComponent(trimmed)}`);
      const data = await res.json();
      if (!res.ok) {
        setResolvedAddress(null);
        setResolveError(data.error || "Could not resolve");
        return;
      }
      setResolvedAddress(data.address);
    } catch {
      setResolvedAddress(null);
      setResolveError("Resolve failed");
    } finally {
      setResolving(false);
    }
  }, []);

  useEffect(() => {
    if (!recipient.trim()) {
      setResolvedAddress(null);
      setResolveError(null);
      return;
    }
    const t = setTimeout(() => resolveRecipient(recipient), 400);
    return () => clearTimeout(t);
  }, [recipient, resolveRecipient]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const address = resolvedAddress || (recipient.startsWith("0x") && recipient.length === 42 ? recipient : null);
    if (!address) {
      setError(resolveError || "Enter a valid wallet address or ENS name");
      return;
    }
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      setError("Enter a valid amount");
      return;
    }
    if (insufficientFunds) {
      setError("Insufficient funds");
      return;
    }

    if (!user || !wallet) {
      setError("Please log in first");
      return;
    }

    setLoading(true);
    setError(null);
    if (screeningMode) setSendPhase("proposing");
    else setSendPhase("sending");

    try {
      // 1. Propose (sign with embedded wallet, save to queue)
      const pendingTx = await proposeTransaction({
        recipient: address,
        amount,
        ownerAddress: wallet.address,
        getOwnerAccount,
        tokenAddress: selectedToken?.address ?? undefined,
        tokenDecimals: selectedToken?.decimals,
        tokenSymbol: selectedToken?.symbol,
        tokenIconUrl: selectedToken?.iconUrl ?? undefined,
      });

      onRefreshActivities?.();

      if (!screeningMode) {
        // 2. Screening OFF: execute immediately
        const execRes = await fetch(getBackendApiUrl("execute"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ txId: pendingTx.id }),
        });
        if (!execRes.ok) {
          const data = await execRes.json();
          throw new Error(data.error || "Execution failed");
        }
        const data = await execRes.json();
        setExecutedResult({
          to: data.to ?? address,
          amount: data.amount ?? amount,
          token: data.token ?? "USDC",
          txHash: data.txHash ?? "",
          executedAt: new Date().toISOString(),
        });
        setSendPhase("success");
      } else {
        setProposedTx({ ...pendingTx, status: "pending" });
        setSendPhase("proposed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Transaction failed");
      setSendPhase("form");
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = resolvedAddress || (recipient.startsWith("0x") && recipient.length === 42);
  const submitLabel = canSubmit
    ? screeningMode
      ? "Propose Transaction"
      : "Send Now"
    : "Select recipient";

  // Screening ON: proposing phase (loader + tx details)
  if (screeningMode && sendPhase === "proposing") {
    const toAddress = resolvedAddress || (recipient.startsWith("0x") && recipient.length === 42 ? recipient : "");
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col items-center gap-4">
          <ThemeLoaderSpinner variant="transaction" />
          <p className="text-sm font-semibold text-claw">Proposing transaction</p>
          <p className="text-xs text-slate-500 uppercase tracking-widest">Awaiting your signature</p>
        </div>
        <div className="flex items-center gap-3 rounded-2xl bg-white/[0.06] p-4">
          <div className="w-10 h-10 rounded-2xl bg-white/[0.08] flex items-center justify-center text-claw">
            <ArrowUpRight className="h-5 w-5" />
          </div>
          <UsdcIcon size={24} className="flex-shrink-0 opacity-90" />
          <span className="text-lg font-semibold text-white">{amount} {selectedToken?.symbol ?? "USDC"}</span>
        </div>
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">To</dt>
            <dd className="font-mono text-slate-200 truncate min-w-0 max-w-[50%] sm:max-w-[200px]" title={toAddress}>
              {truncateAddress(toAddress)}
            </dd>
          </div>
        </dl>
        {onClose && (
          <Button type="button" variant="ghost" onClick={onClose} className="w-full py-3 text-slate-400 hover:text-slate-200">
            Close
          </Button>
        )}
      </div>
    );
  }

  // Screening ON: proposed/pending phase (same as TransactionDetailDialog for pending)
  if (screeningMode && sendPhase === "proposed" && proposedTx) {
    const tx = proposedTx;
    return (
      <div className="space-y-6">
        <div className="flex flex-col items-center gap-3">
          <motion.div
            className="w-20 h-20 rounded-2xl bg-amber-400/15 text-amber-400 flex items-center justify-center"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1, rotate: [0, 5, -5, 0] }}
            transition={{
              opacity: { duration: 0.3 },
              scale: { type: "spring", bounce: 0.4 },
              rotate: { repeat: Infinity, duration: 2, ease: "easeInOut" },
            }}
          >
            <Clock className="h-10 w-10" />
          </motion.div>
          <span className="text-sm font-semibold text-amber-400">{statusLabel(tx.status)}</span>
        </div>
        <div className="flex items-center gap-3 rounded-2xl bg-white/[0.06] p-4">
          <div className="w-10 h-10 rounded-2xl bg-white/[0.08] flex items-center justify-center text-claw">
            <ArrowUpRight className="h-5 w-5" />
          </div>
          <UsdcIcon size={24} className="flex-shrink-0 opacity-90" />
          <span className="text-lg font-semibold text-white">{tx.amount} {tx.token}</span>
        </div>
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">To</dt>
            <dd className="font-mono text-slate-200 truncate min-w-0 max-w-[50%] sm:max-w-[200px]" title={tx.to}>
              {truncateAddress(tx.to)}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">Proposed</dt>
            <dd className="text-slate-300">{formatDate(tx.proposedAt)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">Signatures</dt>
            <dd className="text-slate-300">
              {tx.signatures.length} of {tx.threshold}
            </dd>
          </div>
        </dl>
        <Button
          type="button"
          onClick={() => {
            setSendPhase("form");
            setProposedTx(null);
            setRecipient("");
            setResolvedAddress(null);
            setAmount("");
            setResolveError(null);
            onSuccess();
          }}
          className="w-full py-3.5"
        >
          Done
        </Button>
      </div>
    );
  }

  // Screening OFF: sending phase (loader + tx details)
  if (!screeningMode && sendPhase === "sending") {
    const toAddress = resolvedAddress || (recipient.startsWith("0x") && recipient.length === 42 ? recipient : "");
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col items-center gap-4">
          <ThemeLoaderSpinner variant="transaction" />
          <p className="text-sm font-semibold text-claw">Processing transaction</p>
          <p className="text-xs text-slate-500 uppercase tracking-widest">Sending on chain</p>
        </div>
        <div className="flex items-center gap-3 rounded-2xl bg-white/[0.06] p-4">
          <div className="w-10 h-10 rounded-2xl bg-white/[0.08] flex items-center justify-center text-claw">
            <ArrowUpRight className="h-5 w-5" />
          </div>
          <UsdcIcon size={24} className="flex-shrink-0 opacity-90" />
          <span className="text-lg font-semibold text-white">
            {amount} {selectedToken?.symbol ?? "USDC"}
          </span>
        </div>
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">To</dt>
            <dd className="font-mono text-slate-200 truncate min-w-0 max-w-[50%] sm:max-w-[200px]" title={toAddress}>
              {truncateAddress(toAddress)}
            </dd>
          </div>
        </dl>
        {onClose && (
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="w-full py-3 text-slate-400 hover:text-slate-200"
          >
            Close
          </Button>
        )}
      </div>
    );
  }

  if (!screeningMode && sendPhase === "success" && executedResult) {
    const { to, amount: amt, token, txHash, executedAt } = executedResult;
    const explorerTxUrl = txHash ? `${BSC_EXPLORER_URL}/tx/${txHash}` : null;
    return (
      <div className="space-y-6">
        <div className="flex flex-col items-center gap-3">
          <div className="w-20 h-20 rounded-2xl bg-claw/20 text-claw flex items-center justify-center">
            <CheckCircle2 className="h-10 w-10" />
          </div>
          <span className="text-sm font-semibold text-claw">Executed</span>
        </div>
        <div className="flex items-center gap-3 rounded-2xl bg-white/[0.06] p-4">
          <div className="w-10 h-10 rounded-2xl bg-white/[0.08] flex items-center justify-center text-claw">
            <ArrowUpRight className="h-5 w-5" />
          </div>
          <UsdcIcon size={24} className="flex-shrink-0 opacity-90" />
          <span className="text-lg font-semibold text-white">{amt} {token}</span>
        </div>
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">To</dt>
            <dd className="font-mono text-slate-200 truncate min-w-0 max-w-[50%] sm:max-w-[200px]" title={to}>
              {truncateAddress(to)}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">Executed</dt>
            <dd className="text-slate-300">{formatDate(executedAt)}</dd>
          </div>
        </dl>
        {explorerTxUrl && (
          <a
            href={explorerTxUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full rounded-2xl py-3 bg-white/[0.08] text-slate-300 hover:text-white hover:bg-white/[0.12] transition-colors text-sm font-medium"
          >
            <span className="relative w-[18px] h-[18px] flex-shrink-0">
              <Image src="/bscscan.png" alt="" fill className="object-contain rounded" sizes="18px" />
            </span>
            <ExternalLink className="h-4 w-4" />
            View on BSC Explorer
          </a>
        )}
        <Button
          type="button"
          onClick={() => {
            setSendPhase("form");
            setExecutedResult(null);
            setRecipient("");
            setResolvedAddress(null);
            setAmount("");
            setResolveError(null);
            onSuccess();
          }}
          className="w-full py-3.5"
        >
          Done
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {/* You're sending - big amount */}
      <div>
        <label className="block text-sm font-medium text-slate-400 mb-2">
          You&apos;re sending
        </label>
        <input
          type="number"
          inputMode="decimal"
          step="any"
          min="0"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full bg-transparent border-0 rounded-2xl py-2 text-3xl sm:text-4xl md:text-5xl font-semibold text-white placeholder-slate-500 focus:outline-none focus:ring-0 touch-manipulation"
        />
        {insufficientFunds && (
          <p className="text-sm text-red-400 mt-1">Insufficient funds</p>
        )}
      </div>

      {/* Token selector */}
      <div>
        <label className="block text-sm font-medium text-slate-400 mb-2">
          Token
        </label>
        <button
          type="button"
          onClick={() => setTokenSelectorOpen((o) => !o)}
          className="w-full flex items-center gap-3 rounded-2xl bg-white/[0.06] p-4 text-left hover:bg-white/[0.08] transition-colors min-h-[2.75rem] touch-manipulation"
        >
          {selectedToken ? (
            <>
              {selectedToken.iconUrl ? (
                <span className="relative w-8 h-8 flex-shrink-0 rounded-full overflow-hidden bg-white/10">
                  <Image src={selectedToken.iconUrl} alt="" width={32} height={32} className="object-cover" unoptimized />
                </span>
              ) : (
                <span className="w-8 h-8 flex-shrink-0 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-claw">
                  {selectedToken.symbol.slice(0, 2)}
                </span>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-base font-semibold text-white">{selectedToken.symbol}</p>
                <p className="text-sm text-slate-400">
                  Balance: {selectedToken.balance} {selectedToken.symbol}
                  {selectedToken.usdValue != null && ` · $${selectedToken.usdValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                </p>
              </div>
              <ChevronDown className={`h-5 w-5 text-slate-500 flex-shrink-0 transition-transform ${tokenSelectorOpen ? "rotate-180" : ""}`} aria-hidden />
            </>
          ) : (
            <>
              <UsdcIcon size={32} className="flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-base font-semibold text-white">Select token</p>
                <p className="text-sm text-slate-400">{sendableTokens.length === 0 ? "No sendable tokens" : "No tokens in portfolio"}</p>
              </div>
              <ChevronDown className="h-5 w-5 text-slate-500 flex-shrink-0" aria-hidden />
            </>
          )}
        </button>
        {tokenSelectorOpen && sendableTokens.length > 0 && (
          <div className="mt-2 rounded-2xl bg-white/[0.06] overflow-hidden divide-y divide-white/[0.06] max-h-48 overflow-y-auto">
            {sendableTokens.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setSelectedToken(t);
                  setTokenSelectorOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.08] transition-colors"
              >
                <TokenOption token={t} selected={selectedToken?.id === t.id} />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* To - recipient with ENS/address */}
      <div>
        <label className="block text-sm font-medium text-slate-400 mb-2">
          To
        </label>
        <input
          type="text"
          placeholder="Wallet address or ENS name"
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          className="w-full rounded-2xl bg-white/[0.06] px-4 py-3.5 text-base sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-claw/40 focus:bg-white/[0.08] transition-all min-h-[2.75rem] touch-manipulation"
        />
        {resolving && (
          <p className="text-xs text-slate-500 mt-1">Resolving…</p>
        )}
        {resolveError && !resolving && recipient.trim() && !recipient.startsWith("0x") && (
          <p className="text-xs text-amber-400 mt-1">{resolveError}</p>
        )}
        {resolvedAddress && !resolving && (
          <p className="text-xs text-claw mt-1 font-mono truncate">{resolvedAddress}</p>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-400">{error}</p>
      )}

      <Button
        type="submit"
        loading={loading}
        disabled={!canSubmit || !amount || amountNum <= 0 || insufficientFunds || !selectedToken}
        className="w-full py-3.5"
      >
        {submitLabel}
      </Button>
    </form>
  );
}
