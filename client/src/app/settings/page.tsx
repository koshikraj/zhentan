"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useLinkAccount, usePrivy } from "@privy-io/react-auth";
import { TopBar } from "@/components/TopBar";
import { Card } from "@/components/ui/Card";
import { AuthGuard } from "@/components/AuthGuard";
import { useAuth } from "@/app/context/AuthContext";
import { ShieldCheck, ShieldOff, Loader2, MessageCircle } from "lucide-react";
import { getBackendApiUrl } from "@/lib/api";

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

function SettingsPageContent() {
  const [screeningMode, setScreeningMode] = useState(true);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [telegramLinked, setTelegramLinked] = useState(false);
  const [linkingTelegram, setLinkingTelegram] = useState(false);
  const { telegramUserId, privyUser, safeAddress } = useAuth();
  const { unlinkTelegram } = usePrivy();

  const { linkTelegram } = useLinkAccount({
    onSuccess: ({ linkedAccount, linkMethod }) => {
      if (linkMethod === "telegram") {
        const acc = linkedAccount as unknown as Record<string, unknown>;
        const tgUserId = (acc?.telegramUserId as string) || (acc?.username as string) || (acc?.subject as string);
        if (tgUserId) {
          setTelegramLinked(true);
          // Save to backend
          fetch(getBackendApiUrl("status"), {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ safe: safeAddress, telegramChatId: String(tgUserId) }),
          }).catch(() => {});
        }
      }
      setLinkingTelegram(false);
    },
    onError: () => {
      setLinkingTelegram(false);
    },
  });

  useEffect(() => {
    if (telegramUserId) setTelegramLinked(true);
  }, [telegramUserId]);

  useEffect(() => {
    if (!safeAddress) return;
    fetch(`${getBackendApiUrl("status")}?safe=${encodeURIComponent(safeAddress)}`)
      .then((res) => res.json())
      .then((data) => {
        setScreeningMode(data.screeningMode ?? true);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [safeAddress]);

  const handleToggle = async () => {
    setToggling(true);
    try {
      const res = await fetch(getBackendApiUrl("status"), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ safe: safeAddress, screeningMode: !screeningMode }),
      });
      if (res.ok) {
        const data = await res.json();
        setScreeningMode(data.screeningMode);
      }
    } catch {
      // silent
    } finally {
      setToggling(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen cosmic-bg starfield">
      <TopBar screeningMode={screeningMode} />
      <main className="flex-1 w-full px-4 py-5 sm:p-6 md:p-8 max-w-4xl mx-auto overflow-y-auto">
        <motion.div initial="hidden" animate="visible" variants={cardVariants}>
          <Card className="p-6">
            <h1 className="text-xl font-semibold text-white mb-6">
              <span className="text-claw">›</span> Settings
            </h1>

            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-claw" />
              </div>
            ) : (
              <div className="space-y-6">
                {/* Screening Mode Toggle */}
                <div className="flex flex-col sm:flex-row sm:items-start gap-4 p-4 rounded-xl bg-slate-800/30 border border-slate-700/50">
                  <div className="w-10 h-10 rounded-xl bg-claw/10 border border-claw/20 flex items-center justify-center flex-shrink-0">
                    {screeningMode ? (
                      <ShieldCheck className="h-5 w-5 text-claw" />
                    ) : (
                      <ShieldOff className="h-5 w-5 text-slate-500" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-white">
                        AI Screening Mode
                      </h3>
                      <button
                        onClick={handleToggle}
                        disabled={toggling}
                        className={`relative w-12 h-6 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-claw/50 ${
                          screeningMode ? "bg-claw" : "bg-slate-600"
                        }`}
                      >
                        {toggling ? (
                          <span className="absolute inset-0 flex items-center justify-center">
                            <Loader2 className="h-3 w-3 animate-spin text-white" />
                          </span>
                        ) : (
                          <span
                            className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-200 ${
                              screeningMode ? "left-6" : "left-0.5"
                            }`}
                          />
                        )}
                      </button>
                    </div>
                    <p className="text-sm text-slate-400 mt-1">
                      {screeningMode ? (
                        <>
                          <span className="text-claw font-medium">Enabled</span> — Transactions are queued for AI review before execution. The agent analyzes spending patterns and flags anomalies.
                        </>
                      ) : (
                        <>
                          <span className="text-amber-400 font-medium">Disabled</span> — Transactions execute immediately after signing. No AI review or pattern analysis.
                        </>
                      )}
                    </p>
                  </div>
                </div>

                {/* Warning when disabled */}
                {!screeningMode && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="p-4 rounded-xl bg-amber-400/10 border border-amber-400/20"
                  >
                    <p className="text-sm text-amber-400">
                      <strong>Warning:</strong> With screening disabled, all transactions will be signed and submitted immediately without AI review. Make sure you trust all transaction destinations.
                    </p>
                  </motion.div>
                )}

                {/* Telegram Notifications */}
                <div className="flex flex-col sm:flex-row sm:items-start gap-4 p-4 rounded-xl bg-slate-800/30 border border-slate-700/50">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
                    <MessageCircle className="h-5 w-5 text-blue-400" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-white">
                        Telegram Notifications
                      </h3>
                      {telegramLinked ? (
                        <button
                          onClick={async () => {
                            try {
                              const tgAccount = (privyUser?.linkedAccounts as unknown as Array<Record<string, unknown>>)?.find(
                                (a) => a.type === "telegram"
                              );
                              if (tgAccount) {
                                const identifier =
                                  (tgAccount.subject as string) ||
                                  (tgAccount.telegramUserId as string) ||
                                  (tgAccount.username as string);
                                if (identifier) {
                                  await (unlinkTelegram as unknown as (id: string) => Promise<unknown>)(identifier);
                                }
                              }
                              setTelegramLinked(false);
                              // Clear from backend
                              await fetch(getBackendApiUrl("status"), {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ safe: safeAddress, telegramChatId: "" }),
                              });
                            } catch { /* ignore */ }
                          }}
                          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors"
                        >
                          Unlink
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setLinkingTelegram(true);
                            linkTelegram();
                          }}
                          disabled={linkingTelegram}
                          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors disabled:opacity-50"
                        >
                          {linkingTelegram ? (
                            <Loader2 className="h-3 w-3 animate-spin inline mr-1" />
                          ) : null}
                          Link Telegram
                        </button>
                      )}
                    </div>
                    <p className="text-sm text-slate-400 mt-1">
                      {telegramLinked ? (
                        <span className="text-blue-400 font-medium">Linked</span>
                      ) : (
                        <>
                          Message{" "}
                          <a
                            href="https://t.me/kos_claw_bot"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 underline hover:text-blue-300"
                          >
                            @kos_claw_bot
                          </a>{" "}
                          on Telegram first, then link your account here.
                        </>
                      )}
                    </p>
                    {!telegramLinked && (
                      <p className="text-xs text-slate-500 mt-1">
                        This is a public OpenClaw bot on a basic plan.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </Card>
        </motion.div>
      </main>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <AuthGuard>
      <SettingsPageContent />
    </AuthGuard>
  );
}
