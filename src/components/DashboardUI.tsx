import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageTitle({
  eyebrow,
  title,
  action,
}: {
  eyebrow?: string;
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col justify-between gap-3 sm:mb-8 sm:flex-row sm:items-end">
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-1.5 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-dashboard-muted">
            {eyebrow}
          </p>
        )}
        <h1 className="font-display text-[28px] font-medium leading-9 tracking-[-0.025em] text-dashboard-foreground sm:text-[32px]">
          {title}
        </h1>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section
      className={cn(
        "rounded-[10px] border border-dashboard-border bg-dashboard-panel p-5 shadow-[0_1px_3px_rgb(0_0_0/0.04)]",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function Status({ value }: { value: string }) {
  const v = value.toLowerCase();
  const tone =
    v === "finalized" ||
    v === "open" ||
    v === "active" ||
    v === "allocate" ||
    v === "primary" ||
    v === "bnb lane" ||
    v === "subscribe open" ||
    v === "withdrawn"
      ? "bg-[#CAFACE] text-[#0E7A2F]"
      : v === "pending" ||
          v === "claimable" ||
          v === "redeempending" ||
          v === "redeemclaimable" ||
          v === "defer" ||
          v === "draft" ||
          v === "whitelist"
        ? "bg-[#FFF1D6] text-[#8A4B00]"
        : v === "browse" || v === "paused"
          ? "bg-[#F4F4F5] text-[#6B6B6B]"
          : "bg-[#FFE8E6] text-[#B42318]";
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center rounded-md px-2 text-[12px] font-medium leading-none",
        tone,
      )}
    >
      {value}
    </span>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <Panel className="flex flex-col items-start gap-3 py-10">
      <p className="font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-dashboard-muted">
        Empty
      </p>
      <h2 className="text-base font-medium tracking-[-0.01em]">{title}</h2>
      <p className="max-w-md text-sm leading-5 text-dashboard-muted">{body}</p>
      {action}
    </Panel>
  );
}

export function Kpi({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <Panel>
      <p className="text-[13px] font-medium leading-4 text-dashboard-muted">{label}</p>
      <p className="mt-4 font-display text-[32px] font-medium leading-9 tracking-[-0.025em] tabular-nums">
        {value}
      </p>
      <p className="mt-2 text-xs leading-4 text-dashboard-muted">{detail}</p>
    </Panel>
  );
}
