import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, Clock3, ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import heroImage from "@/assets/bond-hero.jpg";
import { Brand } from "@/components/Brand";
import { ButtonLink } from "@/components/Button";
import { SiteFooter } from "@/components/SiteFooter";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BOND — Settlement you can prove" },
      {
        name: "description",
        content:
          "Mandate-controlled subscriptions to licensed RWA vaults. Pending until shares exist — never earlier.",
      },
      { property: "og:title", content: "BOND — Settlement you can prove" },
      {
        property: "og:description",
        content:
          "Mandate-controlled subscriptions to licensed RWA vaults. Pending until shares exist — never earlier.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const [intro, setIntro] = useState(true);
  const lastCta = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setIntro(false);
      return;
    }
    document.documentElement.classList.add("bond-intro");
    const failsafe = window.setTimeout(() => {
      document.documentElement.classList.remove("bond-intro", "bond-intro-play");
      setIntro(false);
    }, 5000);
    const start = () => {
      document.documentElement.classList.add("bond-intro-play");
    };
    const fontsReady = document.fonts?.ready ?? Promise.resolve();
    const t = window.setTimeout(start, 700);
    void fontsReady.then(() => {
      window.clearTimeout(t);
      requestAnimationFrame(() => requestAnimationFrame(start));
    });
    return () => {
      window.clearTimeout(failsafe);
      window.clearTimeout(t);
      document.documentElement.classList.remove("bond-intro", "bond-intro-play");
    };
  }, []);

  useEffect(() => {
    const el = lastCta.current;
    if (!el) return;
    const onEnd = (e: AnimationEvent) => {
      if (e.target !== el) return;
      document.documentElement.classList.remove("bond-intro", "bond-intro-play");
      setIntro(false);
    };
    el.addEventListener("animationend", onEnd);
    return () => el.removeEventListener("animationend", onEnd);
  }, []);

  return (
    <div className="bg-hero text-hero-foreground">
      <section className="bond-frame relative h-[100dvh] min-h-[640px] overflow-hidden">
        <img
          src={heroImage}
          alt="BOND treasury atmosphere — dark horizon over calm water"
          width={1920}
          height={1280}
          className="bond-sky pointer-events-none absolute inset-0 size-full object-cover object-top select-none"
        />
        <div className="bond-veil pointer-events-none absolute inset-0 bg-black/25" />
        <header className="bond-bar absolute inset-x-0 top-0 z-30">
          <div className="mx-auto flex h-[4.5rem] max-w-6xl items-center justify-between px-5 lg:px-8">
            <Brand inverted />
            <nav aria-label="Primary" className="bond-nav hidden items-center gap-7 lg:flex">
              {[
                ["Product", "/product"],
                ["Vaults", "/vaults"],
                ["How it works", "/how-it-works"],
                ["Security", "/security"],
                ["Docs", "/docs"],
              ].map(([label, to]) => (
                <a
                  key={to}
                  href={to}
                  className="text-sm text-white/90 transition-colors hover:text-white"
                >
                  {label}
                </a>
              ))}
            </nav>
            <div className="bond-actions flex items-center gap-2">
              <ButtonLink to="/dashboard" className="bg-white text-black hover:bg-white/90">
                Open treasury
              </ButtonLink>
            </div>
          </div>
        </header>

        <main className="bond-hero relative z-10 mx-auto flex h-full max-w-5xl flex-col items-center px-5 pt-[18vh] text-center sm:pt-[20vh]">
          <p className="bond-pill text-xs font-semibold uppercase tracking-[0.2em] text-white/80">
            BOND
          </p>
          <h1 className="bond-headline mt-7 max-w-4xl font-display text-[clamp(2.4rem,6vw,4.6rem)] font-semibold leading-[1.02] tracking-tight">
            <span className="bond-ln block overflow-hidden pb-2 -mb-2">
              <span className="bond-ln-i block">The bond is yours</span>
            </span>
            <span className="bond-ln block overflow-hidden pb-2 -mb-2">
              <span className="bond-ln-i block">when the shares exist.</span>
            </span>
          </h1>
          <p className="bond-sub mt-6 max-w-2xl text-base leading-7 text-white/75 sm:text-lg">
            BOND checks the mandate, sends the deposit, and keeps the position Pending until the
            vault proves finality.
          </p>
          <div className="bond-cta mt-8 flex justify-center">
            <ButtonLink to="/dashboard" className="min-w-44 bg-white text-black hover:bg-white/90">
              Open treasury
            </ButtonLink>
          </div>
          <span ref={lastCta} className="sr-only" aria-hidden="true" />
          {intro ? <span className="sr-only">Entrance animation playing</span> : null}
        </main>
      </section>

      <section className="bg-background text-foreground">
        <div className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
          <p className="text-xs font-bold uppercase text-primary">One rule changes everything</p>
          <div className="mt-6 grid gap-12 lg:grid-cols-2">
            <h2 className="font-display text-4xl font-semibold leading-tight sm:text-5xl">
              A deposit is an instruction.
              <br />
              Shares are ownership.
            </h2>
            <p className="max-w-xl text-lg leading-8 text-muted-foreground">
              Async vaults do not settle instantly. BOND makes that interval visible instead of
              turning uncertainty into a polished but false balance.
            </p>
          </div>
          <div className="mt-16 grid gap-8 md:grid-cols-3">
            {(
              [
                [
                  ShieldCheck,
                  "Mandate first",
                  "Every subscription is checked against amount, network, and asset rules.",
                ],
                [
                  Clock3,
                  "Pending means pending",
                  "Submitted deposits stay separate from owned positions and yield.",
                ],
                [
                  CheckCircle2,
                  "Shares prove finality",
                  "Only a confirmed vault share balance moves value into the books.",
                ],
              ] as const
            ).map(([Icon, title, text]) => (
              <div key={title} className="border-t border-border pt-6">
                <Icon size={22} className="text-primary" />
                <h3 className="mt-5 text-lg font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-surface-soft text-foreground">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 lg:grid-cols-[1fr_1.2fr] lg:px-8">
          <div>
            <p className="text-xs font-bold uppercase text-primary">The eight-second truth</p>
            <h2 className="mt-5 font-display text-4xl font-semibold">
              Allow. Deposit. Wait. Verify.
            </h2>
          </div>
          <ol className="grid gap-px overflow-hidden rounded-md border border-border bg-border sm:grid-cols-2">
            {[
              "Mandate allows $100",
              "USDC deposit lands",
              "Status remains Pending",
              "Vault shares appear",
            ].map((item, i) => (
              <li key={item} className="bg-background p-7">
                <span className="text-xs text-muted-foreground">0{i + 1}</span>
                <p className="mt-8 font-semibold">{item}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
