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
    <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        {eyebrow && (
          <p className="mb-2 text-xs font-semibold uppercase text-dashboard-muted">{eyebrow}</p>
        )}
        <h1 className="font-display text-3xl font-semibold">{title}</h1>
      </div>
      {action}
    </div>
  );
}
export function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section
      className={cn("rounded-md border border-dashboard-border bg-dashboard-panel p-5", className)}
    >
      {children}
    </section>
  );
}
export function Status({ value }: { value: string }) {
  const tone =
    value === "Finalized" || value === "Open" || value === "Active"
      ? "bg-success/15 text-success"
      : value === "Pending"
        ? "bg-warning/15 text-warning"
        : "bg-danger/15 text-danger";
  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-semibold", tone)}>
      {value}
    </span>
  );
}
