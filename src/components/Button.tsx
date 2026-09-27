import { Link, type LinkProps } from "@tanstack/react-router";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

const base =
  "inline-flex h-8 min-h-8 items-center justify-center gap-2 rounded-[10px] px-3 text-[13px] font-medium leading-4 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50";
const variants = {
  primary: "bg-primary text-primary-foreground hover:bg-[#005FC2]",
  secondary:
    "border border-[#EBEBEB] bg-white text-[#333] hover:bg-[#F4F4F5]",
  ghost: "text-[#6B6B6B] hover:bg-[#F4F4F5] hover:text-[#111]",
} as const;

export function Button({
  variant = "primary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof variants }) {
  return <button className={cn(base, variants[variant], className)} {...props} />;
}

export function ButtonLink({
  variant = "primary",
  className,
  children,
  ...props
}: LinkProps & { variant?: keyof typeof variants; className?: string; children: ReactNode }) {
  return (
    <Link className={cn(base, variants[variant], className)} {...props}>
      {children}
    </Link>
  );
}
