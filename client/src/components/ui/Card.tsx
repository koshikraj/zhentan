import { clsx } from "clsx";

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className }: CardProps) {
  return (
    <div className={clsx("glass-card p-4 sm:p-6 transition-all duration-200", className)}>
      {children}
    </div>
  );
}
