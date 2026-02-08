"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/TopBar";
import { Card } from "@/components/ui/Card";
import { AuthGuard } from "@/components/AuthGuard";
import { useAuth } from "@/app/context/AuthContext";
import { Wallet, Shield, Copy, Check, ExternalLink, LogOut, Bot } from "lucide-react";
import { truncateAddress } from "@/lib/format";
import { useSafeAddress } from "@/lib/useSafeAddress";
import { toHex } from "viem";

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

function ProfilePageContent() {
  const [screeningMode, setScreeningMode] = useState(true);
  const [copied, setCopied] = useState(false);
  const [signing, setSigning] = useState(false);
  const [signResult, setSignResult] = useState<string | null>(null);
  const [signError, setSignError] = useState<string | null>(null);
  const router = useRouter();
  const { user, wallet, getOwnerAccount, logout } = useAuth();
  const { safeAddress: computedSafeAddress } = useSafeAddress(wallet?.address);
  const safeAddress = computedSafeAddress || "";

  useEffect(() => {
    fetch("/api/status")
      .then((res) => res.json())
      .then((data) => setScreeningMode(data.screeningMode ?? true))
      .catch(() => {});
  }, []);

  const copyAddress = async () => {
    await navigator.clipboard.writeText(safeAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSign = async () => {
    if (!wallet) return;

    setSigning(true);
    setSignResult(null);
    setSignError(null);

    try {
      const account = await getOwnerAccount();
      if (!account) throw new Error("Wallet not ready");

      const sig = await account.signMessage({
        message: { raw: toHex("Zhentan signing test") },
      });
      setSignResult(sig);
    } catch (err) {
      setSignError(err instanceof Error ? err.message : "Signing failed");
    } finally {
      setSigning(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen cosmic-bg starfield">
      <TopBar screeningMode={screeningMode} />
      <main className="flex-1 w-full px-4 py-5 sm:p-6 md:p-8 max-w-4xl mx-auto overflow-y-auto space-y-6">
        <motion.div initial="hidden" animate="visible" variants={cardVariants}>
          <Card>
            <h1 className="text-xl font-semibold text-white mb-6">
              <span className="text-claw">›</span> Profile
            </h1>

            <div className="space-y-6">
              {/* User info (email, name, image) from login */}
              {user && (user.email || user.name || user.image) && (
                <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-700/50">
                  <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                    {user.image ? (
                      <img
                        src={user.image}
                        alt=""
                        className="w-14 h-14 rounded-full object-cover border-2 border-claw/30"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-claw/20 border border-claw/30 flex items-center justify-center text-xl font-semibold text-claw">
                        {(user.name || user.email || "?").charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-white truncate">
                        {!user.name || user.name == "" || user.name == "null" ? `Signed in as` : `${user.name}`}
                      </p>
                      {user.email && (
                        <p className="text-xs text-slate-400 truncate">
                          {user.email}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Multisig Section */}
              <div className="rounded-2xl bg-white/[0.06] border border-white/[0.08] overflow-hidden">
                <div className="flex items-center gap-3 p-4 border-b border-white/[0.06]">
                  <div className="w-10 h-10 rounded-xl bg-claw/10 border border-claw/20 flex items-center justify-center flex-shrink-0">
                    <Shield className="h-5 w-5 text-claw" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-white">Multisig Config</h2>
                    <p className="text-xs text-slate-500">2-of-2 treasury wallet</p>
                  </div>
                </div>

                <div className="p-4 flex flex-wrap items-center gap-2 border-b border-white/[0.06]">
                  <Wallet className="h-4 w-4 text-slate-400 flex-shrink-0" />
                  <span className="font-mono text-sm text-slate-300 truncate min-w-0">
                    {truncateAddress(safeAddress)}
                  </span>
                  <button
                    onClick={copyAddress}
                    className="p-1.5 rounded-lg hover:bg-white/[0.08] text-slate-400 hover:text-white transition-colors"
                    aria-label="Copy safe address"
                  >
                    {copied ? <Check className="h-4 w-4 text-claw" /> : <Copy className="h-4 w-4" />}
                  </button>
                  <a
                    href={`https://app.safe.global/home?safe=bsc:${safeAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-lg hover:bg-white/[0.08] text-slate-400 hover:text-white transition-colors"
                    aria-label="Open in Safe"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>

                <p className="px-4 pt-3 pb-2 text-xs font-medium text-slate-500 uppercase tracking-wider">Signers</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 pt-0">
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                    <div className="w-11 h-11 rounded-xl bg-white/[0.08] flex items-center justify-center flex-shrink-0">
                      <Wallet className="h-6 w-6 text-claw" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-claw">Signer 1</p>
                      <p className="text-xs text-slate-400 mb-0.5">Privy embedded wallet</p>
                      <p className="font-mono text-xs text-slate-300 truncate" title={wallet?.address}>
                        {wallet?.address ? truncateAddress(wallet.address) : "—"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                    <div className="w-11 h-11 rounded-xl bg-claw/10 border border-claw/20 flex items-center justify-center flex-shrink-0">
                      <Bot className="h-6 w-6 text-claw" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-claw">Signer 2</p>
                      <p className="text-xs text-slate-400 mb-0.5">Agent</p>
                      <p className="font-mono text-xs text-slate-300 truncate" title={process.env.NEXT_PUBLIC_AGENT_ADDRESS}>
                        {process.env.NEXT_PUBLIC_AGENT_ADDRESS
                          ? truncateAddress(process.env.NEXT_PUBLIC_AGENT_ADDRESS)
                          : "—"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Logout */}
              <div className="pt-6 mt-6 border-t border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    router.replace("/login");
                  }}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  Log out
                </button>
              </div>
            </div>
          </Card>
        </motion.div>
      </main>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <AuthGuard>
      <ProfilePageContent />
    </AuthGuard>
  );
}
