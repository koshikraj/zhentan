"use client";

import { useEffect, useCallback } from "react";
import { X } from "lucide-react";
import { clsx } from "clsx";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function Dialog({
  open,
  onClose,
  title,
  children,
  className,
}: DialogProps) {
  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (!open) return;
    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [open, handleEscape]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 safe-area-bottom">
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Panel: full width on small screens, max-width on larger */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? "dialog-title" : undefined}
        className={clsx(
          "relative w-full max-w-md max-h-[85vh] sm:max-h-[90vh] overflow-y-auto overflow-x-hidden",
          "rounded-2xl p-4 sm:p-6 bg-[#0f0f14] shadow-[0_24px_48px_-12px_rgba(0,0,0,0.5)]",
          "transition-all duration-200",
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={clsx("relative flex items-center", title ? "mb-5" : "mb-2")}>
          {title && (
            <h2
              id="dialog-title"
              className="flex-1 text-center text-sm font-semibold text-white tracking-wide"
            >
              {title}
            </h2>
          )}
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className={clsx(
              "p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors",
              title ? "absolute right-0 top-1/2 -translate-y-1/2" : "ml-auto"
            )}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
