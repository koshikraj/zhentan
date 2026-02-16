"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import type { TokenPosition } from "@/types";
import { truncateAddress } from "@/lib/format";
import { CheckCircle2 } from "lucide-react";

interface TokenRowProps {
  token: TokenPosition;
  index?: number;
}

function formatUsd(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(2)}K`;
  return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function TokenRow({ token, index = 0 }: TokenRowProps) {
  const usdStr = token.usdValue != null ? formatUsd(token.usdValue) : null;
  const priceStr =
    token.price > 0
      ? token.price >= 1
        ? token.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 })
        : token.price.toFixed(6)
      : null;

  return (
    <motion.div
      className="flex items-center gap-3 sm:gap-4 px-3 sm:px-4 py-3 hover:bg-white/[0.06] rounded-2xl transition-all min-h-[3.5rem]"
      initial={{ opacity: 0, y: 30, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        delay: index * 0.1,
        duration: 0.5,
        type: "spring",
        bounce: 0.15,
      }}
    >
      <div className="w-10 h-10 rounded-2xl bg-white/[0.08] flex items-center justify-center flex-shrink-0 overflow-hidden">
        {token.iconUrl ? (
          <Image
            src={token.iconUrl}
            alt=""
            width={40}
            height={40}
            className="object-cover w-full h-full"
            unoptimized
          />
        ) : (
          <span className="text-xs font-bold text-claw">
            {token.symbol.slice(0, 2)}
          </span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-slate-200 truncate inline-flex items-center gap-1.5">
            {token.name}
            {token.verified && (
              <CheckCircle2 className="h-3.5 w-3.5 text-claw flex-shrink-0" aria-label="Verified" />
            )}
          </span>
          <span className="text-slate-600 shrink-0">·</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap mt-0.5">
          <span className="text-xs text-slate-500">
            {token.balance} {token.symbol}
          </span>
          {priceStr != null && (
            <>
              <span className="text-slate-600 shrink-0">·</span>
              <span className="text-xs text-slate-500 shrink-0">
                ${priceStr}
              </span>
            </>
          )}
          <span className="hidden sm:inline text-slate-600 shrink-0">·</span>
          {token.address && (
            <span className="hidden md:flex items-center gap-1 text-xs text-slate-600 font-mono truncate max-w-[120px]">
              {truncateAddress(token.address)}
            </span>
          )}
        </div>
      </div>

      {usdStr != null && (
        <div className="flex-shrink-0 text-right">
          <span className="text-sm font-semibold text-white tabular-nums">
            $ {usdStr}
          </span>
          <p className="text-xs text-slate-500 mt-0.5">USD</p>
        </div>
      )}
    </motion.div>
  );
}
