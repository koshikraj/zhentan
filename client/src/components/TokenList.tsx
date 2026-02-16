"use client";

import { motion } from "framer-motion";
import { Card } from "./ui/Card";
import { Skeleton } from "./ui/Skeleton";
import { TokenRow } from "./TokenRow";
import { Coins } from "lucide-react";
import type { TokenPosition } from "@/types";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const headerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      type: "spring" as const,
      bounce: 0.18,
    },
  },
};

interface TokenListProps {
  tokens: TokenPosition[];
  loading: boolean;
}

export function TokenList({ tokens, loading }: TokenListProps) {
  return (
    <Card>
      <motion.div
        className="flex items-center gap-2 mb-4"
        initial="hidden"
        animate="visible"
        variants={headerVariants}
      >
        <Coins className="h-4 w-4 text-claw" />
        <h2 className="text-sm font-semibold text-white tracking-wide">
          <span className="text-claw">›</span> Tokens
        </h2>
      </motion.div>

      {loading ? (
        <div className="space-y-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="flex items-center gap-3 sm:gap-4 px-3 sm:px-4 py-3 rounded-2xl"
            >
              <Skeleton className="h-10 w-10 rounded-2xl flex-shrink-0" />
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-3 rounded-full" />
                  <Skeleton className="h-4 w-20" />
                </div>
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-6 w-16 rounded-full flex-shrink-0" />
            </div>
          ))}
        </div>
      ) : tokens.length === 0 ? (
        <motion.p
          className="text-sm text-slate-500 text-center py-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.4 }}
        >
          No tokens on BNB Chain
        </motion.p>
      ) : (
        <motion.div
          className="space-y-1"
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >
          {tokens.map((token, i) => (
            <TokenRow key={token.id} token={token} index={i} />
          ))}
        </motion.div>
      )}
    </Card>
  );
}
