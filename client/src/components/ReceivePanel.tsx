"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Card } from "./ui/Card";
import { Copy, Check, ArrowDownLeft } from "lucide-react";
import { UsdcIcon } from "./icons/UsdcIcon";

interface ReceivePanelProps {
  safeAddress: string;
}

export function ReceivePanel({ safeAddress }: ReceivePanelProps) {
  const [copied, setCopied] = useState(false);

  const copyAddress = async () => {
    await navigator.clipboard.writeText(safeAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card>
      <div className="flex items-center gap-2 mb-4">
        <ArrowDownLeft className="h-5 w-5 text-claw" />
        <UsdcIcon size={20} />
        <h2 className="text-sm font-semibold text-white tracking-wide">
          <span className="text-claw">›</span> Receive USDC
        </h2>
      </div>

      <div className="flex flex-col items-center gap-4">
        <div className="p-4 sm:p-5 bg-white rounded-2xl shadow-[0_8px_32px_-8px_rgba(0,0,0,0.2)] inline-flex">
          <QRCodeSVG value={safeAddress} size={140} />
        </div>

        <button
          onClick={copyAddress}
          className="flex items-center gap-2 text-xs sm:text-sm text-slate-400 hover:text-claw transition-colors font-mono break-all text-center min-h-[2.75rem] touch-manipulation px-2"
        >
          {safeAddress}
          {copied ? (
            <Check className="h-4 w-4 text-claw flex-shrink-0" />
          ) : (
            <Copy className="h-4 w-4 flex-shrink-0" />
          )}
        </button>
      </div>
    </Card>
  );
}
