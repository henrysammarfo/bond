import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { Brand } from "./Brand";
import { Button, ButtonLink } from "./Button";

const links = [
  ["Product", "/product"],
  ["Vaults", "/vaults"],
  ["How it works", "/how-it-works"],
  ["Security", "/security"],
  ["Docs", "/docs"],
] as const;

export function SiteHeader({ overlay = false }: { overlay?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <header
      className={
        overlay
          ? "absolute inset-x-0 top-0 z-30 text-hero-foreground"
          : "sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur-xl"
      }
    >
      <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-5 lg:px-8">
        <Brand />
        <nav aria-label="Primary" className="hidden items-center gap-7 lg:flex">
          {links.map(([label, to]) => (
            <Link
              key={to}
              to={to}
              className="text-sm text-current opacity-70 transition-opacity hover:opacity-100"
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-2 lg:flex">
          <ButtonLink
            to="/dashboard"
            className={overlay ? "bg-hero-foreground text-hero hover:bg-hero-foreground/90" : ""}
          >
            Open treasury
          </ButtonLink>
        </div>
        <Button
          variant="ghost"
          className="size-10 px-0 lg:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </Button>
      </div>
      {open && (
        <nav className="border-t border-border bg-background px-5 py-4 text-foreground lg:hidden">
          {links.map(([label, to]) => (
            <Link
              key={to}
              to={to}
              onClick={() => setOpen(false)}
              className="block border-b border-border py-3 text-sm"
            >
              {label}
            </Link>
          ))}
          <ButtonLink to="/dashboard" className="mt-4 w-full">
            Open treasury
          </ButtonLink>
        </nav>
      )}
    </header>
  );
}
