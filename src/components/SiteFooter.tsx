import { Link } from "@tanstack/react-router";
import { Brand } from "./Brand";

const groups = [
  ["Product", [["Overview", "/product"], ["Vaults", "/vaults"], ["How it works", "/how-it-works"], ["Pricing", "/pricing"]]],
  ["Company", [["About", "/about"], ["Security", "/security"], ["Blog", "/blog"], ["Contact", "/contact"]]],
  ["Resources", [["Documentation", "/docs"], ["Compliance", "/compliance"], ["Risk disclosure", "/risk-disclosure"], ["Privacy", "/privacy"], ["Terms", "/terms"]]],
] as const;

export function SiteFooter() {
  return <footer className="border-t border-border bg-surface-dark text-hero-foreground">
    <div className="mx-auto grid max-w-7xl gap-12 px-5 py-14 md:grid-cols-[1.4fr_2fr] lg:px-8">
      <div><Brand /><p className="mt-5 max-w-xs text-sm leading-6 text-hero-muted">Mandate-controlled access to real-world asset vaults, with settlement status you can verify.</p></div>
      <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">{groups.map(([title, links]) => <div key={title}><h2 className="text-xs font-semibold uppercase text-hero-muted">{title}</h2><div className="mt-4 space-y-3">{links.map(([label, to]) => <Link key={to} to={to} className="block text-sm text-hero-foreground/80 hover:text-hero-foreground">{label}</Link>)}</div></div>)}</div>
    </div>
    <div className="mx-auto flex max-w-7xl flex-col gap-2 border-t border-hero-foreground/10 px-5 py-6 text-xs text-hero-muted sm:flex-row sm:justify-between lg:px-8"><p>© 2026 BOND. Interactive product demonstration.</p><p>Pending is not ownership. Shares determine finality.</p></div>
  </footer>;
}