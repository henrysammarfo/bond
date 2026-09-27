import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, Clock3, ShieldCheck } from "lucide-react";
import heroImage from "@/assets/bond-hero.jpg";
import { ButtonLink } from "@/components/Button";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

// No head() here: the home route inherits title/description/og/twitter from
// __root.tsx, and ships no og:image so serve-time hosting can inject the
// project's social preview (explicit og:image or latest screenshot).
export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "BOND — Settlement you can prove" },
    { name: "description", content: "Mandate-controlled subscriptions to real-world asset vaults, with pending and finalized states kept honest." },
    { property: "og:title", content: "BOND — Settlement you can prove" },
    { property: "og:description", content: "Mandate-controlled subscriptions to real-world asset vaults, with pending and finalized states kept honest." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: Index,
});

// IMPORTANT: Replace this placeholder. See ./README.md for routing conventions.
function Index() {
  return <div className="bg-hero text-hero-foreground">
    <section className="relative min-h-[760px] overflow-hidden sm:min-h-[820px]">
      <img src={heroImage} alt="A monumental bond certificate orbiting above a luminous settlement network" width={1920} height={1280} className="absolute inset-0 size-full object-cover object-center" />
      <div className="absolute inset-0 bg-hero/20" />
      <SiteHeader overlay />
      <div className="relative z-10 mx-auto flex min-h-[700px] max-w-5xl flex-col items-center px-5 pt-36 text-center sm:pt-44">
        <div className="animate-bond-rise inline-flex items-center gap-2 rounded-full border border-hero-foreground/20 bg-hero-foreground/10 px-3 py-1.5 text-xs font-semibold backdrop-blur-md"><span className="rounded-full bg-hero-foreground px-2 py-0.5 text-hero">New</span> Settlement, without the story <ArrowRight size={13} /></div>
        <h1 className="animate-bond-rise mt-7 max-w-4xl font-display text-5xl font-semibold leading-[1.02] sm:text-7xl lg:text-8xl">The bond is yours when the shares exist.</h1>
        <p className="animate-bond-rise mt-6 max-w-2xl text-base leading-7 text-hero-muted sm:text-lg">BOND checks the mandate, sends the deposit, and keeps the position pending until the vault proves finality.</p>
        <div className="animate-bond-rise mt-8 flex flex-col gap-3 sm:flex-row"><ButtonLink to="/dashboard" className="min-w-36 bg-hero-foreground text-hero hover:bg-hero-foreground/90">Open demo</ButtonLink><ButtonLink to="/how-it-works" variant="secondary" className="min-w-36 border-hero-foreground/30 bg-hero-foreground/10 text-hero-foreground hover:bg-hero-foreground/20">See the flow</ButtonLink></div>
      </div>
    </section>
    <section className="bg-background text-foreground"><div className="mx-auto max-w-7xl px-5 py-20 lg:px-8"><p className="text-xs font-bold uppercase text-primary">One rule changes everything</p><div className="mt-6 grid gap-12 lg:grid-cols-2"><h2 className="font-display text-4xl font-semibold leading-tight sm:text-5xl">A deposit is an instruction.<br />Shares are ownership.</h2><p className="max-w-xl text-lg leading-8 text-muted-foreground">Async vaults do not settle instantly. BOND makes that interval visible instead of turning uncertainty into a polished but false balance.</p></div><div className="mt-16 grid gap-8 md:grid-cols-3">{[[ShieldCheck,"Mandate first","Every subscription is checked against amount, network, and asset rules."],[Clock3,"Pending means pending","Submitted deposits stay separate from owned positions and yield."],[CheckCircle2,"Shares prove finality","Only a confirmed vault share balance moves value into the books."]].map(([Icon,title,text]) => <div key={String(title)} className="border-t border-border pt-6"><Icon size={22} className="text-primary" /><h3 className="mt-5 text-lg font-semibold">{String(title)}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{String(text)}</p></div>)}</div></div></section>
    <section className="bg-surface-soft text-foreground"><div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 lg:grid-cols-[1fr_1.2fr] lg:px-8"><div><p className="text-xs font-bold uppercase text-primary">The eight-second truth</p><h2 className="mt-5 font-display text-4xl font-semibold">Allow. Deposit. Wait. Verify.</h2></div><ol className="grid gap-px overflow-hidden rounded-md border border-border bg-border sm:grid-cols-2">{["Mandate allows $100","USDC deposit lands","Status remains Pending","Vault shares appear"].map((item,i)=><li key={item} className="bg-background p-7"><span className="text-xs text-muted-foreground">0{i+1}</span><p className="mt-8 font-semibold">{item}</p></li>)}</ol></div></section>
    <SiteFooter />
  </div>;
}
