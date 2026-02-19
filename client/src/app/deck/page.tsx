"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap,
  Bell,
  Bot,
  Search,
  TrendingUp,
  Lock,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from "lucide-react";

/* ─── Risk Gauge (reused from landing) ───────────────────────────── */

function RiskGauge() {
  const ref = useRef<HTMLDivElement>(null);
  const [score, setScore] = useState(0);
  const [started, setStarted] = useState(false);
  const TARGET = 65;

  useEffect(() => {
    if (!started) return;
    let raf: number;
    const duration = 1800;
    const startTime = Date.now();
    const tick = () => {
      const elapsed = Date.now() - startTime;
      const t = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setScore(Math.round(eased * TARGET));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    const delay = setTimeout(() => { raf = requestAnimationFrame(tick); }, 400);
    return () => { clearTimeout(delay); cancelAnimationFrame(raf); };
  }, [started]);

  // Reset when slide becomes visible
  useEffect(() => {
    setScore(0);
    setStarted(false);
    const t = setTimeout(() => setStarted(true), 200);
    return () => clearTimeout(t);
  }, []);

  const R = 70, cx = 90, cy = 90;
  const arcPath = (fromDeg: number, toDeg: number) => {
    const toRad = (d: number) => (d * Math.PI) / 180;
    const fx = cx + R * Math.cos(toRad(fromDeg));
    const fy = cy + R * Math.sin(toRad(fromDeg));
    const tx = cx + R * Math.cos(toRad(toDeg));
    const ty = cy + R * Math.sin(toRad(toDeg));
    const large = toDeg - fromDeg > 180 ? 1 : 0;
    return `M ${fx.toFixed(2)} ${fy.toFixed(2)} A ${R} ${R} 0 ${large} 1 ${tx.toFixed(2)} ${ty.toFixed(2)}`;
  };
  const progressEndDeg = 135 + (score / 100) * 270;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const nx = cx + R * Math.cos(toRad(progressEndDeg));
  const ny = cy + R * Math.sin(toRad(progressEndDeg));
  const color = score < 40 ? "#10b981" : score < 70 ? "#f59e0b" : "#ef4444";
  const label = score < 40 ? "SAFE" : score < 70 ? "REVIEW" : "BLOCK";
  const labelColor = score < 40 ? "text-emerald-400" : score < 70 ? "text-amber-400" : "text-red-400";

  return (
    <div ref={ref} className="flex flex-col items-center gap-2">
      <svg width="180" height="150" viewBox="0 0 180 150" className="overflow-visible">
        <defs>
          <filter id="glow-g2" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <path d={arcPath(135, 405)} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="12" strokeLinecap="round" />
        <path d={arcPath(135, 243)} fill="none" stroke="rgba(16,185,129,0.2)" strokeWidth="12" strokeLinecap="butt" />
        <path d={arcPath(243, 324)} fill="none" stroke="rgba(245,158,11,0.2)" strokeWidth="12" strokeLinecap="butt" />
        <path d={arcPath(324, 405)} fill="none" stroke="rgba(239,68,68,0.2)" strokeWidth="12" strokeLinecap="butt" />
        {score > 0 && (
          <path d={arcPath(135, Math.min(progressEndDeg, 405))} fill="none" stroke={color}
            strokeWidth="12" strokeLinecap="round" filter="url(#glow-g2)" />
        )}
        <circle cx={nx} cy={ny} r="7" fill={color} filter="url(#glow-g2)" />
        <text x={cx} y={cy - 4} textAnchor="middle" dominantBaseline="middle" fill="white" fontSize="30" fontWeight="bold">{score}</text>
        <text x={cx} y={cy + 18} textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="9" letterSpacing="2">RISK SCORE</text>
      </svg>
      <div className="flex justify-between w-[170px] -mt-3 text-[8px] font-bold uppercase tracking-widest">
        <span className="text-emerald-400/60">Safe</span>
        <span className="text-amber-400/60">Review</span>
        <span className="text-red-400/60">Block</span>
      </div>
      <motion.span key={label} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", bounce: 0.4 }}
        className={`text-[10px] font-black tracking-[0.2em] uppercase mt-1 ${labelColor}`}>
        ● {label}
      </motion.span>
    </div>
  );
}

/* ─── Slide data ──────────────────────────────────────────────────── */

const features = [
  { icon: Bot,        title: "Agentic AI Co-Signer",        desc: "OpenClaw agent (Qwen3-235B) acts as the second signer on your Safe multisig." },
  { icon: TrendingUp, title: "Behavioral Pattern Learning", desc: "Builds a profile of your habits — recipients, amounts, timing, daily limits." },
  { icon: Lock,       title: "2-of-2 Safe Multisig",        desc: "Your wallet holds one key; the agent holds the other. No single point of compromise." },
  { icon: Search,     title: "Deep Security Scan",           desc: "On-demand GoPlus + Honeypot.is checks for scams, sanctions, and token security." },
  { icon: Zap,        title: "Gasless via ERC-4337",         desc: "Pimlico bundler sponsors every transaction. Zero gas fees for users." },
  { icon: Bell,       title: "Telegram Reviews",             desc: "Borderline txs trigger interactive Telegram messages. Approve or reject anywhere." },
];

const verdicts = [
  { range: "< 40",    label: "APPROVE", desc: "Auto-signed and executed immediately.",                           border: "rgba(16,185,129,0.28)",  accent: "rgba(16,185,129,0.70)",  bg: "rgba(16,185,129,0.07)",  text: "text-emerald-400" },
  { range: "40 – 70", label: "REVIEW",  desc: "Telegram notification with [Approve] [Reject] buttons.",         border: "rgba(245,158,11,0.28)",  accent: "rgba(245,158,11,0.70)",  bg: "rgba(245,158,11,0.07)",  text: "text-amber-400"  },
  { range: "> 70",    label: "BLOCK",   desc: "Transaction blocked outright. Telegram alert with risk details.", border: "rgba(239,68,68,0.28)",   accent: "rgba(239,68,68,0.70)",   bg: "rgba(239,68,68,0.07)",   text: "text-red-400"    },
];

/* ─── Individual slides ───────────────────────────────────────────── */

function SlideTitle() {
  return (
    <div className="flex flex-col items-center justify-center text-center h-full gap-6 px-8">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1, type: "spring", bounce: 0.3 }}
        className="relative w-[280px] h-[112px] sm:w-[360px] sm:h-[144px]">
        <Image src="/cover.png" alt="Zhentan" fill className="object-contain drop-shadow-[0_0_40px_rgba(240,185,11,0.3)]" priority sizes="360px" />
      </motion.div>

      <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, type: "spring" }}
        className="text-3xl sm:text-5xl font-bold tracking-tight leading-tight">
        Your Onchain Behavior, <br /><span className="gradient-text">Guarded</span>
      </motion.h1>

      <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45, type: "spring" }}
        className="text-slate-400 text-base sm:text-lg max-w-xl">
        An AI agent that learns how you transact — auto-approving safe flows,
        routing borderline ones for review, and blocking threats in real time.
      </motion.p>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-claw/10 border border-claw/20 text-[10px] font-semibold text-claw/70 uppercase tracking-widest">
        <motion.span animate={{ opacity: [1, 0.4, 1] }} transition={{ repeat: Infinity, duration: 2.5 }}
          className="w-1.5 h-1.5 rounded-full bg-claw" />
        Powered by OpenClaw Agent · BNB Chain · ERC-4337
      </motion.div>
    </div>
  );
}

function SlideProblem() {
  const problems = [
    { stat: "$2.2B+", label: "lost to crypto hacks & scams in 2023 (Chainalysis)" },
    { stat: "0",      label: "guardrails between signing and execution in standard wallets" },
    { stat: "100%",   label: "responsibility on the user to verify every transaction manually" },
  ];
  return (
    <div className="flex flex-col items-center justify-center h-full gap-10 px-8 max-w-3xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="text-center">
        <h2 className="text-3xl sm:text-4xl font-bold mb-3">The <span className="gradient-text">Problem</span></h2>
        <p className="text-slate-400 text-sm max-w-md mx-auto">
          DeFi wallets offer no protection between "sign" and "execute." Once you click approve, the transaction goes through — scam or not.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
        {problems.map((p, i) => (
          <motion.div key={p.stat} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + i * 0.12, type: "spring" }}
            className="glass-card p-6 text-center">
            <div className="text-3xl font-black gradient-text mb-2">{p.stat}</div>
            <div className="text-slate-400 text-xs leading-relaxed">{p.label}</div>
          </motion.div>
        ))}
      </div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
        className="text-slate-500 text-xs text-center max-w-md">
        Phishing, address poisoning, honeypot tokens — existing wallets only confirm what you already signed. They don&apos;t screen it.
      </motion.div>
    </div>
  );
}

function SlideSolution() {
  const steps = [
    { emoji: "🧠", title: "Learn",  desc: "Builds a behavioral profile: typical recipients, amounts, time-of-day, daily limits." },
    { emoji: "🔍", title: "Screen", desc: "Scores every transaction 0–100 against your patterns. Instant — no LLM latency on the hot path." },
    { emoji: "⚡", title: "Act",    desc: "APPROVE automatically, send for REVIEW via Telegram, or BLOCK outright." },
  ];
  return (
    <div className="flex flex-col items-center justify-center h-full gap-10 px-8 max-w-3xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="text-center">
        <h2 className="text-3xl sm:text-4xl font-bold mb-3">The <span className="gradient-text">Solution</span></h2>
        <p className="text-slate-400 text-sm max-w-lg mx-auto">
          A Safe 2-of-2 multisig where the second signer is an AI agent that has learned your onchain habits. It co-signs only when it trusts the transaction.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
        {steps.map((s, i) => (
          <motion.div key={s.title} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + i * 0.14, type: "spring" }}
            className="glass-card p-6 text-center">
            <div className="text-4xl mb-3">{s.emoji}</div>
            <div className="text-sm font-bold mb-2 gradient-text">{s.title}</div>
            <div className="text-slate-400 text-xs leading-relaxed">{s.desc}</div>
          </motion.div>
        ))}
      </div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}
        className="flex flex-wrap justify-center gap-2">
        {["Safe Multisig", "OpenClaw Agent", "Privy Auth", "Gasless ERC-4337"].map((tag) => (
          <span key={tag} className="px-3 py-1 rounded-full border border-claw/20 bg-claw/5 text-[11px] text-claw/70 font-medium">{tag}</span>
        ))}
      </motion.div>
    </div>
  );
}

function SlideArchitecture() {
  const SF = "system-ui, -apple-system, sans-serif";
  const PATHS = [
    { id: "dp1", d: "M 117,80 C 117,112 360,110 360,135",  color: "rgba(240,185,11,0.45)", dur: "2.4s", begin: "0.3s", delay: 0.30 },
    { id: "dp2", d: "M 602,105 C 602,122 360,122 360,135", color: "rgba(240,185,11,0.45)", dur: "2.4s", begin: "1.1s", delay: 0.45 },
    { id: "dp3", d: "M 360,203 L 360,232",                 color: "rgba(240,185,11,0.45)", dur: "2.0s", begin: "0.8s", delay: 0.60 },
    { id: "dp4", d: "M 288,300 C 200,358 117,390 117,450", color: "rgba(16,185,129,0.60)", dur: "2.0s", begin: "0.6s", delay: 0.85 },
    { id: "dp5", d: "M 360,368 L 360,450",                 color: "rgba(245,158,11,0.60)", dur: "1.8s", begin: "0.2s", delay: 0.80 },
    { id: "dp6", d: "M 432,300 C 520,358 602,390 602,450", color: "rgba(239,68,68,0.60)",  dur: "2.0s", begin: "1.4s", delay: 0.90 },
    { id: "dp7", d: "M 117,525 L 117,572",                 color: "rgba(16,185,129,0.40)", dur: "1.4s", begin: "0.9s", delay: 1.20 },
    { id: "dp8", d: "M 360,525 L 360,572",                 color: "rgba(245,158,11,0.40)", dur: "1.4s", begin: "0.4s", delay: 1.30 },
    { id: "dp9", d: "M 602,525 L 602,572",                 color: "rgba(239,68,68,0.40)",  dur: "1.4s", begin: "1.2s", delay: 1.40 },
  ];
  const n = (delay: number) => ({
    initial: { opacity: 0, scale: 0.92 },
    animate: { opacity: 1, scale: 1 },
    transition: { delay, type: "spring" as const, bounce: 0.22 },
  });

  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 px-4">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="text-center">
        <h2 className="text-2xl sm:text-3xl font-bold mb-1">How It <span className="gradient-text">Works</span></h2>
        <p className="text-slate-500 text-xs">User signs → Agent screens → Executes on BNB Chain</p>
      </motion.div>

      <div className="w-full max-w-2xl mx-auto">
        <svg viewBox="0 0 720 640" className="w-full" style={{ maxHeight: 460 }}>
          <defs>
            {PATHS.map((p) => <path key={`def-${p.id}`} id={p.id} d={p.d} fill="none" />)}
            <linearGradient id="dg-gold" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#F0B90B" stopOpacity={0} /><stop offset="50%" stopColor="#F0B90B" stopOpacity={0.7} /><stop offset="100%" stopColor="#F0B90B" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="dg-green" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#10b981" stopOpacity={0} /><stop offset="50%" stopColor="#10b981" stopOpacity={0.7} /><stop offset="100%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="dg-amber" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity={0} /><stop offset="50%" stopColor="#f59e0b" stopOpacity={0.7} /><stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="dg-red" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#ef4444" stopOpacity={0} /><stop offset="50%" stopColor="#ef4444" stopOpacity={0.7} /><stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="dg-glass" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="white" stopOpacity={0.07} /><stop offset="100%" stopColor="white" stopOpacity={0.02} />
            </linearGradient>
            <clipPath id="dclip-dapps"><rect x="521" y="46" width="163" height="48" rx="6" /></clipPath>
            <clipPath id="dclip-agent"><circle cx="360" cy="300" r="54" /></clipPath>
            <clipPath id="dclip-safe"><circle cx="256" cy="169" r="24" /></clipPath>
            <clipPath id="dclip-bnb"><circle cx="50" cy="602" r="20" /></clipPath>
            <clipPath id="dclip-tg"><circle cx="292" cy="602" r="20" /></clipPath>
          </defs>
          {PATHS.map((p) => (
            <motion.path key={p.id} d={p.d} fill="none" stroke={p.color} strokeWidth="1.5" strokeLinecap="round"
              initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 1.0, delay: p.delay, ease: "easeInOut" }} />
          ))}
          {PATHS.map((p) => (
            <circle key={`dot-${p.id}`} r="3.5" fill={p.color} opacity="0.9">
              <animateMotion dur={p.dur} repeatCount="indefinite" begin={p.begin}><mpath href={`#${p.id}`} /></animateMotion>
            </circle>
          ))}
          {/* User Wallet */}
          <motion.g {...n(0.10)}>
            <rect x="20" y="15" width="195" height="65" rx="12" fill="url(#dg-glass)" stroke="rgba(255,255,255,0.10)" strokeWidth="1" />
            <rect x="20" y="15" width="195" height="1.5" rx="1" fill="url(#dg-gold)" />
            <text x="117" y="43" textAnchor="middle" fill="rgba(255,255,255,0.90)" fontSize="12" fontWeight="600" fontFamily={SF}>User Wallet</text>
            <text x="117" y="59" textAnchor="middle" fill="rgba(240,185,11,0.65)" fontSize="8.5" fontFamily={SF}>1 of 2 signers · Privy</text>
          </motion.g>
          {/* WalletConnect DApp */}
          <motion.g {...n(0.20)}>
            <rect x="505" y="15" width="195" height="90" rx="12" fill="url(#dg-glass)" stroke="rgba(255,255,255,0.10)" strokeWidth="1" />
            <rect x="505" y="15" width="195" height="1.5" rx="1" fill="url(#dg-gold)" />
            <text x="602" y="33" textAnchor="middle" fill="rgba(255,255,255,0.90)" fontSize="12" fontWeight="600" fontFamily={SF}>WalletConnect DApp</text>
            <image href="/arch-dapps.png" x="521" y="46" width="163" height="48" clipPath="url(#dclip-dapps)" preserveAspectRatio="xMidYMid slice" />
          </motion.g>
          {/* Safe Multisig */}
          <motion.g {...n(0.35)}>
            <rect x="222" y="135" width="276" height="68" rx="12" fill="url(#dg-glass)" stroke="rgba(255,255,255,0.10)" strokeWidth="1" />
            <rect x="222" y="135" width="276" height="1.5" rx="1" fill="url(#dg-gold)" />
            <image href="/arch-safe.png" x="236" y="149" width="40" height="40" clipPath="url(#dclip-safe)" preserveAspectRatio="xMidYMid meet" />
            <circle cx="256" cy="169" r="25" fill="none" stroke="rgba(240,185,11,0.18)" strokeWidth="1" />
            <text x="389" y="162" textAnchor="middle" fill="white" fontSize="11.5" fontWeight="700" fontFamily={SF}>Safe Multisig — 2 of 2</text>
            <text x="389" y="178" textAnchor="middle" fill="rgba(255,255,255,0.45)" fontSize="9" fontFamily={SF}>User + OpenClaw agent both must sign</text>
          </motion.g>
          {/* Zhentan Agent */}
          <motion.g {...n(0.55)}>
            <motion.g animate={{ y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}>
              <motion.circle cx="360" cy="300" r="70" fill="rgba(240,185,11,0.04)" stroke="rgba(240,185,11,0.22)" strokeWidth="1"
                animate={{ opacity: [0.8, 0.3, 0.8] }} transition={{ repeat: Infinity, duration: 2.8, ease: "easeInOut" }} />
              <motion.circle cx="360" cy="300" r="60" fill="rgba(240,185,11,0.08)" stroke="rgba(240,185,11,0.50)" strokeWidth="1.8"
                style={{ filter: "drop-shadow(0 0 12px rgba(240,185,11,0.45))" }}
                animate={{ opacity: [1, 0.5, 1] }} transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }} />
              <motion.g animate={{ filter: ["drop-shadow(0 0 4px rgba(240,185,11,0.15))", "drop-shadow(0 0 22px rgba(240,185,11,0.80))", "drop-shadow(0 0 4px rgba(240,185,11,0.15))"] }}
                transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}>
                <image href="/arch-agent.png" x="306" y="246" width="108" height="108" clipPath="url(#dclip-agent)" preserveAspectRatio="xMidYMid slice" />
              </motion.g>
              <text x="360" y="382" textAnchor="middle" fill="#F0B90B" fontSize="14" fontWeight="700" fontFamily={SF}>Zhentan Agent</text>
              <text x="360" y="397" textAnchor="middle" fill="rgba(255,255,255,0.40)" fontSize="9" fontFamily={SF}>powered by OpenClaw</text>
            </motion.g>
          </motion.g>
          {/* APPROVE */}
          <motion.g {...n(0.90)}>
            <rect x="20" y="450" width="195" height="75" rx="12" fill="rgba(16,185,129,0.07)" stroke="rgba(16,185,129,0.30)" strokeWidth="1" />
            <rect x="20" y="450" width="195" height="1.5" rx="1" fill="url(#dg-green)" />
            <text x="117" y="482" textAnchor="middle" fill="#10b981" fontSize="13" fontWeight="700" fontFamily={SF}>APPROVE</text>
            <text x="117" y="498" textAnchor="middle" fill="rgba(255,255,255,0.42)" fontSize="9" fontFamily={SF}>Score &lt; 40</text>
            <text x="117" y="513" textAnchor="middle" fill="rgba(16,185,129,0.65)" fontSize="8" fontFamily={SF}>Auto-execute · gasless</text>
          </motion.g>
          {/* REVIEW */}
          <motion.g {...n(1.00)}>
            <rect x="262" y="450" width="196" height="75" rx="12" fill="rgba(245,158,11,0.07)" stroke="rgba(245,158,11,0.30)" strokeWidth="1" />
            <rect x="262" y="450" width="196" height="1.5" rx="1" fill="url(#dg-amber)" />
            <text x="360" y="482" textAnchor="middle" fill="#f59e0b" fontSize="13" fontWeight="700" fontFamily={SF}>REVIEW</text>
            <text x="360" y="498" textAnchor="middle" fill="rgba(255,255,255,0.42)" fontSize="9" fontFamily={SF}>Score 40–70</text>
            <text x="360" y="513" textAnchor="middle" fill="rgba(245,158,11,0.65)" fontSize="8" fontFamily={SF}>Telegram notified</text>
          </motion.g>
          {/* BLOCK */}
          <motion.g {...n(1.10)}>
            <rect x="505" y="450" width="195" height="75" rx="12" fill="rgba(239,68,68,0.07)" stroke="rgba(239,68,68,0.30)" strokeWidth="1" />
            <rect x="505" y="450" width="195" height="1.5" rx="1" fill="url(#dg-red)" />
            <text x="602" y="482" textAnchor="middle" fill="#ef4444" fontSize="13" fontWeight="700" fontFamily={SF}>BLOCK</text>
            <text x="602" y="498" textAnchor="middle" fill="rgba(255,255,255,0.42)" fontSize="9" fontFamily={SF}>Score &gt; 70</text>
            <text x="602" y="513" textAnchor="middle" fill="rgba(239,68,68,0.65)" fontSize="8" fontFamily={SF}>Denied · user alerted</text>
          </motion.g>
          {/* BNB Chain */}
          <motion.g {...n(1.28)}>
            <rect x="20" y="572" width="195" height="58" rx="12" fill="url(#dg-glass)" stroke="rgba(255,255,255,0.09)" strokeWidth="1" />
            <rect x="20" y="572" width="195" height="1.5" rx="1" fill="url(#dg-gold)" />
            <image href="/arch-bnb.png" x="30" y="582" width="40" height="40" clipPath="url(#dclip-bnb)" preserveAspectRatio="xMidYMid slice" />
            <circle cx="50" cy="602" r="21" fill="none" stroke="rgba(240,185,11,0.20)" strokeWidth="1" />
            <text x="143" y="597" textAnchor="middle" fill="rgba(255,255,255,0.88)" fontSize="11" fontWeight="600" fontFamily={SF}>BNB Chain</text>
            <text x="143" y="613" textAnchor="middle" fill="rgba(240,185,11,0.55)" fontSize="8.5" fontFamily={SF}>Gasless · ERC-4337 · Pimlico</text>
          </motion.g>
          {/* Telegram */}
          <motion.g {...n(1.40)}>
            <rect x="262" y="572" width="196" height="58" rx="12" fill="url(#dg-glass)" stroke="rgba(255,255,255,0.09)" strokeWidth="1" />
            <rect x="262" y="572" width="196" height="1.5" rx="1" fill="url(#dg-amber)" />
            <image href="/arch-telegram.png" x="272" y="582" width="40" height="40" clipPath="url(#dclip-tg)" preserveAspectRatio="xMidYMid slice" />
            <circle cx="292" cy="602" r="21" fill="none" stroke="rgba(245,158,11,0.20)" strokeWidth="1" />
            <text x="385" y="597" textAnchor="middle" fill="rgba(255,255,255,0.88)" fontSize="11" fontWeight="600" fontFamily={SF}>Telegram</text>
            <text x="385" y="613" textAnchor="middle" fill="rgba(245,158,11,0.55)" fontSize="8.5" fontFamily={SF}>Interactive approve / reject</text>
          </motion.g>
          {/* Blocked */}
          <motion.g {...n(1.52)}>
            <rect x="505" y="572" width="195" height="58" rx="12" fill="url(#dg-glass)" stroke="rgba(255,255,255,0.09)" strokeWidth="1" />
            <rect x="505" y="572" width="195" height="1.5" rx="1" fill="url(#dg-red)" />
            <text x="602" y="597" textAnchor="middle" fill="rgba(255,255,255,0.85)" fontSize="12" fontWeight="600" fontFamily={SF}>Blocked</text>
            <text x="602" y="613" textAnchor="middle" fill="rgba(239,68,68,0.55)" fontSize="8.5" fontFamily={SF}>Rejected · alert dispatched</text>
          </motion.g>
        </svg>
      </div>
    </div>
  );
}

function SlideRiskAssessment() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-8 px-8 max-w-3xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="text-center">
        <h2 className="text-2xl sm:text-3xl font-bold mb-2">Dynamic <span className="gradient-text">Risk Assessment</span></h2>
        <p className="text-slate-400 text-xs max-w-md mx-auto">
          Every transaction scored 0–100 against your behavioral profile. Instant — no LLM roundtrip on the hot path.
        </p>
      </motion.div>

      <div className="flex flex-col items-center gap-6 w-full">
        <RiskGauge />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full">
          {verdicts.map((v, i) => (
            <motion.div key={v.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.1, type: "spring" }}
              className="relative rounded-2xl p-4 overflow-hidden"
              style={{ background: `linear-gradient(to bottom, rgba(255,255,255,0.05), transparent), ${v.bg}`, border: `1px solid ${v.border}` }}>
              <div className="absolute top-0 left-0 right-0" style={{ height: "1.5px", background: `linear-gradient(90deg, transparent, ${v.accent}, transparent)` }} />
              <div className="flex items-baseline gap-2 mb-1.5">
                <span className={`text-sm font-black ${v.text}`}>{v.label}</span>
                <span className="text-[10px] text-slate-500 font-mono">{v.range}</span>
              </div>
              <p className="text-slate-400 text-xs leading-relaxed">{v.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SlideFeatures() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-8 px-8 max-w-4xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="text-center">
        <h2 className="text-2xl sm:text-3xl font-bold mb-2">Built with <span className="gradient-text">Agentic Security</span></h2>
        <p className="text-slate-500 text-xs">Full-stack AI protection — from behavioral modeling to on-chain execution.</p>
      </motion.div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full">
        {features.map((feat, i) => {
          const Icon = feat.icon;
          return (
            <motion.div key={feat.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.07, type: "spring" }}
              className="relative rounded-2xl overflow-hidden bg-white/[0.05] border border-white/[0.07] p-4">
              <div className="absolute top-0 left-0 right-0 h-px"
                style={{ background: "linear-gradient(90deg, transparent, rgba(240,185,11,0.3), transparent)" }} />
              <div className="w-8 h-8 rounded-xl bg-claw/10 flex items-center justify-center mb-2.5">
                <Icon className="w-4 h-4 text-claw" />
              </div>
              <h3 className="text-xs font-semibold mb-1">{feat.title}</h3>
              <p className="text-slate-500 text-[11px] leading-relaxed">{feat.desc}</p>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function SlideTechStack() {
  const stack = [
    { name: "OpenClaw Agent",  role: "AI co-signer (Qwen3-235B)",       color: "rgba(240,185,11,0.15)",  border: "rgba(240,185,11,0.30)" },
    { name: "Safe 1.4.1",      role: "2-of-2 multisig smart account",   color: "rgba(16,185,129,0.10)",  border: "rgba(16,185,129,0.28)" },
    { name: "ERC-4337",        role: "Account abstraction",              color: "rgba(99,102,241,0.10)",  border: "rgba(99,102,241,0.28)" },
    { name: "Pimlico",         role: "Bundler + gas sponsorship",        color: "rgba(168,85,247,0.10)",  border: "rgba(168,85,247,0.28)" },
    { name: "BNB Chain",       role: "Chain ID 56, 1rpc.io/bnb",        color: "rgba(240,185,11,0.10)",  border: "rgba(240,185,11,0.25)" },
    { name: "Privy",           role: "Embedded wallets + Google OAuth",  color: "rgba(59,130,246,0.10)",  border: "rgba(59,130,246,0.25)" },
    { name: "Next.js 14",      role: "Frontend framework",               color: "rgba(255,255,255,0.05)", border: "rgba(255,255,255,0.12)" },
    { name: "GoPlus / Honeypot.is", role: "Deep threat intelligence",   color: "rgba(239,68,68,0.08)",   border: "rgba(239,68,68,0.22)" },
    { name: "viem + permissionless", role: "Onchain libs",              color: "rgba(255,255,255,0.04)", border: "rgba(255,255,255,0.10)" },
  ];
  return (
    <div className="flex flex-col items-center justify-center h-full gap-8 px-8 max-w-3xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="text-center">
        <h2 className="text-2xl sm:text-3xl font-bold mb-2"><span className="gradient-text">Tech Stack</span></h2>
        <p className="text-slate-500 text-xs">Every layer chosen for production-grade reliability on BNB Chain.</p>
      </motion.div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full">
        {stack.map((s, i) => (
          <motion.div key={s.name} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 + i * 0.06, type: "spring" }}
            className="rounded-xl p-3.5" style={{ background: s.color, border: `1px solid ${s.border}` }}>
            <div className="text-xs font-bold text-white mb-0.5">{s.name}</div>
            <div className="text-[10px] text-slate-500">{s.role}</div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function SlideLinks() {
  const links = [
    { label: "Live Demo",           href: "https://zhentan.me",                           icon: "🌐", note: "Gasless transfers on BNB Chain" },
    { label: "DoraHacks Submission", href: "https://dorahacks.io/buidl/39545",            icon: "🏆", note: "Good Vibes Only: OpenClaw Edition" },
    { label: "Demo Video",          href: "https://youtu.be/7SS_hgfzrjo",                icon: "▶️", note: "Watch the full walkthrough" },
  ];
  return (
    <div className="flex flex-col items-center justify-center h-full gap-10 px-8 max-w-2xl mx-auto text-center">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <h2 className="text-3xl sm:text-4xl font-bold mb-3">
          Ready to guard your <span className="gradient-text">assets</span>?
        </h2>
        <p className="text-slate-400 text-sm">
          Set up your AI-secured wallet in seconds. No gas fees, no friction — intelligent protection on BNB Chain.
        </p>
      </motion.div>

      <div className="flex flex-col gap-3 w-full">
        {links.map((l, i) => (
          <motion.a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer"
            initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.25 + i * 0.12, type: "spring" }}
            className="glass-card flex items-center gap-4 px-5 py-4 rounded-2xl hover:border-claw/30 transition-colors group">
            <span className="text-2xl">{l.icon}</span>
            <div className="flex-1 text-left">
              <div className="text-sm font-semibold text-white group-hover:text-claw transition-colors">{l.label}</div>
              <div className="text-xs text-slate-500">{l.note}</div>
            </div>
            <ExternalLink className="w-4 h-4 text-slate-600 group-hover:text-claw transition-colors" />
          </motion.a>
        ))}
      </div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-claw/20 bg-claw/5">
        <motion.span animate={{ opacity: [1, 0.5, 1] }} transition={{ repeat: Infinity, duration: 3 }}
          className="w-1.5 h-1.5 rounded-full bg-claw flex-shrink-0" />
        <span className="text-[11px] text-claw/60 font-medium">
          Built for DoraHacks Good Vibes Only: OpenClaw Edition · BNBChain
        </span>
      </motion.div>
    </div>
  );
}

/* ─── Slide registry ──────────────────────────────────────────────── */

const SLIDES = [
  { id: "title",      label: "Title",           component: SlideTitle },
  { id: "problem",    label: "Problem",          component: SlideProblem },
  { id: "solution",   label: "Solution",         component: SlideSolution },
  { id: "arch",       label: "How It Works",     component: SlideArchitecture },
  { id: "risk",       label: "Risk Assessment",  component: SlideRiskAssessment },
  { id: "features",   label: "Features",         component: SlideFeatures },
  { id: "tech",       label: "Tech Stack",       component: SlideTechStack },
  { id: "links",      label: "Links",            component: SlideLinks },
];

/* ─── Deck shell ──────────────────────────────────────────────────── */

export default function DeckPage() {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(1);
  const total = SLIDES.length;

  const go = useCallback((next: number) => {
    if (next < 0 || next >= total) return;
    setDirection(next > current ? 1 : -1);
    setCurrent(next);
  }, [current, total]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") go(current + 1);
      if (e.key === "ArrowLeft"  || e.key === "ArrowUp")   go(current - 1);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [current, go]);

  const Slide = SLIDES[current].component;

  const variants = {
    enter:  (dir: number) => ({ x: dir > 0 ? "100%" : "-100%", opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit:   (dir: number) => ({ x: dir > 0 ? "-100%" : "100%", opacity: 0 }),
  };

  return (
    <div className="cosmic-bg starfield min-h-screen text-white flex flex-col overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.04] flex-shrink-0">
        <Link href="/" className="text-[11px] text-slate-600 hover:text-slate-400 transition-colors font-medium tracking-wide">
          ← zhentan.me
        </Link>
        {/* Slide pills */}
        <div className="hidden sm:flex items-center gap-1">
          {SLIDES.map((s, i) => (
            <button key={s.id} onClick={() => go(i)}
              className={`px-2.5 py-1 rounded-full text-[9px] font-semibold uppercase tracking-widest transition-colors ${
                i === current ? "bg-claw/20 text-claw border border-claw/30" : "text-slate-600 hover:text-slate-400"
              }`}>
              {s.label}
            </button>
          ))}
        </div>
        <span className="text-[11px] text-slate-600 font-mono tabular-nums">
          {String(current + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
        </span>
      </div>

      {/* Slide area */}
      <div className="flex-1 relative overflow-hidden">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div key={current} custom={direction} variants={variants}
            initial="enter" animate="center" exit="exit"
            transition={{ duration: 0.38, ease: [0.32, 0, 0.2, 1] }}
            className="absolute inset-0 flex items-center justify-center">
            <Slide />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom navigation */}
      <div className="flex items-center justify-center gap-4 py-4 border-t border-white/[0.04] flex-shrink-0">
        <button onClick={() => go(current - 1)} disabled={current === 0}
          className="w-9 h-9 rounded-full border border-white/[0.08] flex items-center justify-center text-slate-500 hover:text-white hover:border-claw/30 disabled:opacity-25 disabled:cursor-not-allowed transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Dot indicators */}
        <div className="flex items-center gap-1.5">
          {SLIDES.map((_, i) => (
            <button key={i} onClick={() => go(i)}
              className={`rounded-full transition-all duration-300 ${
                i === current ? "w-5 h-1.5 bg-claw" : "w-1.5 h-1.5 bg-white/20 hover:bg-white/40"
              }`} />
          ))}
        </div>

        <button onClick={() => go(current + 1)} disabled={current === total - 1}
          className="w-9 h-9 rounded-full border border-white/[0.08] flex items-center justify-center text-slate-500 hover:text-white hover:border-claw/30 disabled:opacity-25 disabled:cursor-not-allowed transition-colors">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Keyboard hint */}
      <div className="text-center pb-2 text-[9px] text-slate-700 tracking-widest uppercase">
        ← → arrow keys to navigate
      </div>
    </div>
  );
}
