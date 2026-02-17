"use client";

import { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, useInView } from "framer-motion";
import { Send, Brain, ShieldCheck, Zap, Bell, Lock } from "lucide-react";
import { Button } from "@/components/ui/Button";

function Section({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <motion.section
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, type: "spring", bounce: 0.18 }}
      className={className}
    >
      {children}
    </motion.section>
  );
}

const steps = [
  { icon: Send, title: "Sign & Send", desc: "Propose a transaction from your wallet. You sign as 1 of 2 owners." },
  { icon: Brain, title: "AI Screens", desc: "Zhentan analyzes risk against your learned behavior patterns in real time." },
  { icon: ShieldCheck, title: "Safe Execution", desc: "If approved, the agent co-signs and executes gaslessly on BNB Chain." },
];

const features = [
  { icon: Brain, title: "AI Risk Analysis", desc: "Every transaction is scored against your behavioral patterns. Anomalies get flagged before they execute." },
  { icon: Zap, title: "Gasless Transactions", desc: "Account abstraction via Pimlico means you never pay gas. Transactions are sponsored automatically." },
  { icon: Bell, title: "Telegram Notifications", desc: "Get instant alerts for flagged transactions. Review and approve or reject directly from your phone." },
  { icon: Lock, title: "2-of-2 Multisig", desc: "Safe smart account requires both you and the AI agent to sign. No single point of compromise." },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen cosmic-bg starfield text-white">
      {/* Hero */}
      <section className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, type: "spring", bounce: 0.35 }}
          className="relative w-[280px] h-[112px] sm:w-[360px] sm:h-[144px]"
        >
          <Image
            src="/cover.png"
            alt="Zhentan"
            fill
            className="object-contain drop-shadow-[0_0_24px_rgba(240,185,11,0.25)]"
            priority
            sizes="(max-width: 640px) 280px, 360px"
          />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, type: "spring", bounce: 0.18 }}
          className="mt-8 text-3xl sm:text-5xl font-bold tracking-tight"
        >
          Your AI <span className="gradient-text">Wallet Guardian</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, type: "spring", bounce: 0.18 }}
          className="mt-4 text-slate-400 text-base sm:text-lg max-w-md"
        >
          Every transaction screened by AI before it hits the chain.
          Sleep easy knowing your assets are guarded 24/7.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, type: "spring", bounce: 0.18 }}
          className="mt-8"
        >
          <Link href="/login">
            <Button className="text-lg px-8 py-4">Get Started</Button>
          </Link>
        </motion.div>
      </section>

      {/* How It Works */}
      <Section className="py-20 sm:py-28 px-4">
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-14">
          How It <span className="gradient-text">Works</span>
        </h2>
        <div className="max-w-3xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-8">
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 32 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ delay: i * 0.15, type: "spring", bounce: 0.18 }}
                className="flex flex-col items-center text-center"
              >
                <div className="w-14 h-14 rounded-2xl bg-claw/10 flex items-center justify-center mb-4">
                  <Icon className="w-7 h-7 text-claw" />
                </div>
                <div className="text-xs font-medium text-claw/60 uppercase tracking-widest mb-1">
                  Step {i + 1}
                </div>
                <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{step.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </Section>

      {/* Features */}
      <Section className="py-20 sm:py-28 px-4">
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-14">
          Built for <span className="gradient-text">Security</span>
        </h2>
        <div className="max-w-3xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-6">
          {features.map((feat, i) => {
            const Icon = feat.icon;
            return (
              <motion.div
                key={feat.title}
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ delay: i * 0.1, type: "spring", bounce: 0.18 }}
                className="glass-card p-6"
              >
                <Icon className="w-8 h-8 text-claw mb-3" />
                <h3 className="text-base font-semibold mb-1.5">{feat.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{feat.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </Section>

      {/* Final CTA */}
      <Section className="py-20 sm:py-28 px-4 text-center">
        <h2 className="text-2xl sm:text-4xl font-bold mb-4">
          Ready to guard your <span className="gradient-text">assets</span>?
        </h2>
        <p className="text-slate-400 mb-8 max-w-md mx-auto">
          Set up your AI-secured wallet in under a minute. No gas, no stress.
        </p>
        <Link href="/login">
          <Button className="text-lg px-8 py-4">Launch App</Button>
        </Link>
        <p className="mt-12 text-xs text-slate-500 uppercase tracking-[0.2em]">
          Powered by Safe, Pimlico, and OpenClaw on BNB Chain
        </p>
      </Section>
    </div>
  );
}
