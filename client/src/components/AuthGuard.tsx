"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ThemeLoader } from "./ThemeLoader";
import { useAuth } from "@/app/context/AuthContext";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, wallet, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!user || !wallet)) {
      router.replace("/login");
    }
  }, [loading, user, wallet, router]);

  if (loading) {
    return (
      <ThemeLoader
        variant="auth"
        message="Loading Zhentan"
        subtext="Securing your session"
      />
    );
  }

  if (!user || !wallet) {
    return null;
  }

  return <>{children}</>;
}
