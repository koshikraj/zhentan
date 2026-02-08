"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Skeleton } from "./ui/Skeleton";
import { truncateAddress } from "@/lib/format";
import { ArrowUpRight, ArrowDownLeft, Copy, Check, RefreshCw } from "lucide-react";
import { UsdcIcon } from "./icons/UsdcIcon";

const cardVariants = {
  hidden: { opacity: 0, y: 40, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.6,
      type: "spring" as const,
      bounce: 0.18,
    },
  },
};

interface BalanceCardProps {
  balance: string | null;
  safeAddress: string;
  loading: boolean;
  email?: string | null;
  onRefresh?: () => void;
  onToggleSend: () => void;
  onToggleReceive: () => void;
  sendOpen: boolean;
  receiveOpen: boolean;
}

export function BalanceCard({
  balance,
  safeAddress,
  loading,
  email,
  onRefresh,
  onToggleSend,
  onToggleReceive,
  sendOpen,
  receiveOpen,
}: BalanceCardProps) {
  const [copied, setCopied] = useState(false);

  const copyAddress = async () => {
    await navigator.clipboard.writeText(safeAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const cardNumberStyle = safeAddress.startsWith("0x")
    ? `${safeAddress.slice(0, 6)} ${safeAddress.slice(6, 10)} ${safeAddress.slice(10, 14)} ···· ···· ${safeAddress.slice(-4)}`
    : truncateAddress(safeAddress);

  return (
    <motion.div
      className="balance-card p-6 sm:p-8 text-left relative"
      initial="hidden"
      animate="visible"
      variants={cardVariants}
    >
      {/* Top row: chip + email */}
      <div className="flex items-center justify-between mb-8">
        <div className="balance-card-chip" aria-hidden />
        {email ? (
          <span className="text-xs font-semibold italic tracking-wide text-claw/90 truncate max-w-[160px] sm:max-w-[220px]" title={email}>
            {email}
          </span>
        ) : (
          <span className="text-xs font-medium italic tracking-wide logo-text">
            Zhentan
          </span>
        )}
      </div>

      {/* Balance + refresh */}
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="text-sm font-medium text-slate-400 tracking-wide">
          Available balance
        </span>
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            aria-label="Refresh balance and activity"
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.08] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        )}
      </div>
      {loading ? (
        <Skeleton className="h-12 w-36 rounded-xl" />
      ) : (
        <motion.div
          className="text-4xl sm:text-5xl font-bold gradient-text tracking-tight"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          ${balance ?? "—"}
        </motion.div>
      )}
      <div className="flex items-center gap-1.5 mt-0.5">
        <UsdcIcon size={20} className="flex-shrink-0" />
        <span className="text-xs font-medium text-claw/80">USDC</span>
      </div>

      {/* Card number style address */}
      <button
        onClick={copyAddress}
        className="flex items-center gap-2 mt-6 text-slate-400 hover:text-white transition-colors font-mono text-xs sm:text-sm tracking-[0.1em] sm:tracking-[0.15em] min-h-[2.75rem] touch-manipulation break-all text-left"
      >
        <span className="text-slate-500 break-all">{cardNumberStyle}</span>
        {copied ? (
          <Check className="h-4 w-4 text-claw flex-shrink-0" />
        ) : (
          <Copy className="h-4 w-4 flex-shrink-0 opacity-70" />
        )}
      </button>

      {/* Actions: card-style buttons */}
      <motion.div
        className="flex gap-2 sm:gap-3 mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-white/[0.06]"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.5 }}
      >
        <button
          type="button"
          onClick={onToggleSend}
          className={`flex-1 flex items-center justify-center gap-2 rounded-2xl py-3 sm:py-3.5 text-sm font-semibold transition-all min-h-[2.75rem] touch-manipulation ${
            sendOpen
              ? "bg-claw text-white shadow-[0_4px_20px_-2px_rgba(240,185,11,0.4)]"
              : "bg-white/[0.08] text-slate-200 hover:bg-white/[0.12]"
          }`}
        >
          <ArrowUpRight className="h-5 w-5" />
          Send
        </button>
        <button
          type="button"
          onClick={onToggleReceive}
          className={`flex-1 flex items-center justify-center gap-2 rounded-2xl py-3 sm:py-3.5 text-sm font-semibold transition-all min-h-[2.75rem] touch-manipulation ${
            receiveOpen
              ? "bg-claw text-white shadow-[0_4px_20px_-2px_rgba(240,185,11,0.4)]"
              : "bg-white/[0.08] text-slate-200 hover:bg-white/[0.12]"
          }`}
        >
          <ArrowDownLeft className="h-5 w-5" />
          Receive
        </button>
      </motion.div>
    </motion.div>
  );
}
