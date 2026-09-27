import { Link, Outlet } from "@tanstack/react-router";
import { Activity, BookOpenCheck, Building2, LayoutDashboard, Menu, Settings, ShieldCheck, WalletCards, X } from "lucide-react";
import { useState } from "react";
import { Brand } from "./Brand";
import { Button } from "./Button";

const nav = [
  ["Overview", "/dashboard", LayoutDashboard], ["Mandates", "/dashboard/mandates", ShieldCheck], ["Vaults", "/dashboard/vaults", Building2], ["Subscriptions", "/dashboard/subscriptions", BookOpenCheck], ["Activity", "/dashboard/activity", Activity], ["Wallet", "/dashboard/wallet", WalletCards], ["Settings", "/dashboard/settings", Settings],
] as const;

export function DashboardShell() {
  const [open, setOpen] = useState(false);
  return <div className="min-h-screen bg-dashboard text-dashboard-foreground">
    <aside className={`fixed inset-y-0 left-0 z-40 w-64 border-r border-dashboard-border bg-dashboard-panel p-4 transition-transform lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
      <div className="flex h-12 items-center justify-between px-2"><Brand /><Button variant="ghost" className="size-9 px-0 lg:hidden" onClick={() => setOpen(false)} aria-label="Close navigation"><X size={18} /></Button></div>
      <div className="my-5 border-y border-dashboard-border py-4"><p className="px-3 text-[11px] font-semibold uppercase text-dashboard-muted">Workspace</p><p className="mt-1 px-3 text-sm font-medium">Northstar Treasury</p></div>
      <nav aria-label="Dashboard" className="space-y-1">{nav.map(([label, to, Icon]) => <Link key={to} to={to} activeOptions={{ exact: to === "/dashboard" }} activeProps={{ className: "bg-dashboard-accent text-dashboard-foreground" }} inactiveProps={{ className: "text-dashboard-muted hover:bg-dashboard-accent/60 hover:text-dashboard-foreground" }} onClick={() => setOpen(false)} className="flex h-10 items-center gap-3 rounded-md px-3 text-sm"><Icon size={17} />{label}</Link>)}</nav>
      <div className="absolute inset-x-4 bottom-4 rounded-md border border-dashboard-border bg-dashboard-accent/40 p-3"><p className="text-xs font-semibold">Demo environment</p><p className="mt-1 text-[11px] leading-5 text-dashboard-muted">No wallet or real funds are connected.</p></div>
    </aside>
    <div className="lg:pl-64"><header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-dashboard-border bg-dashboard/90 px-4 backdrop-blur-xl sm:px-6"><Button variant="ghost" className="size-9 px-0 lg:hidden" onClick={() => setOpen(true)} aria-label="Open navigation"><Menu size={19} /></Button><div className="ml-auto flex items-center gap-3"><span className="hidden text-xs text-dashboard-muted sm:inline">Avalanche · Demo</span><span className="size-2 rounded-full bg-success" /><span className="grid size-8 place-items-center rounded-full bg-dashboard-accent text-xs font-semibold">JM</span></div></header><main className="mx-auto max-w-[1500px] p-4 sm:p-6 lg:p-8"><Outlet /></main></div>
  </div>;
}