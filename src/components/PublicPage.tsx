import type { ReactNode } from "react";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";

export function PublicPage({
  eyebrow,
  title,
  intro,
  children,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main>
        <section className="border-b border-border bg-surface-soft">
          <div className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-28">
            <p className="text-xs font-bold uppercase text-primary">{eyebrow}</p>
            <h1 className="mt-5 max-w-4xl font-display text-4xl font-semibold leading-tight sm:text-6xl">
              {title}
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">{intro}</p>
          </div>
        </section>
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}

export function Section({
  title,
  children,
  dark = false,
}: {
  title?: string;
  children: ReactNode;
  dark?: boolean;
}) {
  return (
    <section className={dark ? "bg-surface-dark text-hero-foreground" : "bg-background"}>
      <div className="mx-auto max-w-7xl px-5 py-16 lg:px-8 lg:py-24">
        {title && (
          <h2 className="mb-10 font-display text-3xl font-semibold sm:text-4xl">{title}</h2>
        )}
        {children}
      </div>
    </section>
  );
}

export function InfoCard({
  label,
  title,
  children,
}: {
  label?: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <article className="border-t border-border pt-6">
      {label && <p className="text-xs font-bold uppercase text-primary">{label}</p>}
      <h3 className="mt-2 text-xl font-semibold">{title}</h3>
      <div className="mt-3 text-sm leading-7 text-muted-foreground">{children}</div>
    </article>
  );
}
