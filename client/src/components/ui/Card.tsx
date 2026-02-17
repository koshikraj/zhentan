import { clsx } from "clsx";

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className }: CardProps) {
  return (
    <div className={clsx("glass-card transition-all duration-200", className)}>
      {children}
    </div>
  );
}
