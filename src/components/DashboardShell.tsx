import { Link, Outlet, useNavigate } from "@tanstack/react-router";
import {
  Activity,
  BookOpenCheck,
  Building2,
  LayoutDashboard,
  Menu,
  Radar,
  Settings,
  ShieldCheck,
  WalletCards,
  X,
  LogOut,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSessionFn, logoutFn } from "@/backend/fns/auth";
import { Brand } from "./Brand";
import { Button } from "./Button";
import { cn } from "@/lib/utils";

const nav = [
  ["Overview", "/dashboard", LayoutDashboard],
  ["Scan", "/dashboard/scan", Radar],
  ["Mandates", "/dashboard/mandates", ShieldCheck],
  ["Vaults", "/dashboard/vaults", Building2],
  ["Subscriptions", "/dashboard/subscriptions", BookOpenCheck],
  ["Activity", "/dashboard/activity", Activity],
  ["Wallet", "/dashboard/wallet", WalletCards],
  ["Settings", "/dashboard/settings", Settings],
] as const;

export function DashboardShell() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const session = useQuery({ queryKey: ["session"], queryFn: () => getSessionFn() });
  const logout = useMutation({
    mutationFn: () => logoutFn(),
    onSuccess: async () => {
      await qc.clear();
      void navigate({ to: "/login" });
    },
  });

  useEffect(() => {
    if (session.isLoading) return;
    if (!session.data?.authenticated) {
      void navigate({ to: "/login", search: { next: "/dashboard" } });
    }
  }, [session.isLoading, session.data, navigate]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (session.isLoading || !session.data?.authenticated) {
    return (
      <div className="grid min-h-screen place-items-center bg-dashboard text-sm text-dashboard-muted">
        {session.isLoading ? "Loading session…" : "Redirecting to sign in…"}
      </div>
    );
  }

  const orgName = session.data.org.name;
  const initials = session.data.user.displayName
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-dashboard-foreground">
      {open && (
        <button
          type="button"
          aria-label="Close menu overlay"
          className="fixed inset-0 z-30 bg-black/30 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-60 flex-col border-r border-dashboard-border bg-[#FAFAFA] transition-transform lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-14 shrink-0 items-center justify-between px-4">
          <Brand />
          <Button
            variant="ghost"
            className="size-8 px-0 lg:hidden"
            onClick={() => setOpen(false)}
            aria-label="Close navigation"
          >
            <X size={18} />
          </Button>
        </div>
        <div className="shrink-0 border-y border-dashboard-border px-4 py-3">
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-dashboard-muted">
            Workspace
          </p>
          <p className="mt-1 truncate text-sm font-medium text-[#111]">{orgName}</p>
        </div>
        <nav aria-label="Dashboard" className="flex-1 space-y-0.5 overflow-y-auto px-3 py-3">
          {nav.map(([label, to, Icon]) => (
            <Link
              key={to}
              to={to}
              activeOptions={{ exact: to === "/dashboard" }}
              activeProps={{ className: "bg-[#F4F4F5] text-[#111] font-medium" }}
              inactiveProps={{
                className: "text-dashboard-muted hover:bg-[#F4F4F5] hover:text-[#111]",
              }}
              onClick={() => setOpen(false)}
              className="flex h-8 items-center gap-2.5 rounded-[8px] px-2 text-sm transition-colors"
            >
              <Icon size={16} strokeWidth={1.75} />
              {label}
            </Link>
          ))}
        </nav>
        <div className="shrink-0 space-y-2 border-t border-dashboard-border p-3">
          <div className="rounded-[10px] border border-dashboard-border bg-white p-3">
            <p className="text-[13px] font-medium text-[#111]">Avalanche + BNB</p>
            <p className="mt-1 text-[12px] leading-4 text-dashboard-muted">
              Pending until IXS proves shares.
            </p>
          </div>
          <Button
            variant="ghost"
            className="h-8 w-full justify-start px-2 text-sm"
            onClick={() => logout.mutate()}
          >
            <LogOut size={15} /> Sign out
          </Button>
        </div>
      </aside>
      <div className="lg:pl-60">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-dashboard-border bg-white/90 px-4 backdrop-blur-md sm:px-6">
          <Button
            variant="ghost"
            className="size-8 px-0 lg:hidden"
            onClick={() => setOpen(true)}
            aria-label="Open navigation"
          >
            <Menu size={18} />
          </Button>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden items-center gap-2 text-[12px] text-dashboard-muted sm:inline-flex">
              <span className="size-1.5 rounded-full bg-[#15B042]" aria-hidden />
              Live · Avalanche · BNB
            </span>
            <span
              className="grid size-8 place-items-center rounded-[10px] bg-[#F4F4F5] text-[12px] font-medium text-[#111]"
              title={session.data.user.displayName}
            >
              {initials || "B"}
            </span>
          </div>
        </header>
        <main className="mx-auto max-w-[1280px] p-4 sm:p-6 lg:p-8">{<Outlet />}</main>
      </div>
    </div>
  );
}
