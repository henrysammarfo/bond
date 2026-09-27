import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BookOpen,
  CircleDollarSign,
  Clock3,
  FileCheck2,
  Fingerprint,
  Gauge,
  LockKeyhole,
  Network,
  Scale,
  ShieldCheck,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { ButtonLink } from "./Button";
import { InfoCard, PublicPage, Section } from "./PublicPage";
import { listLiveVaultsFn } from "@/backend/fns/vaults";

const iconCards = [
  [
    ShieldCheck,
    "Mandate-aware",
    "Amount, asset, and network constraints are resolved before a deposit can be submitted.",
  ],
  [
    Clock3,
    "Asynchronous by design",
    "The interface respects ERC-7540 processing instead of implying instant settlement.",
  ],
  [
    Fingerprint,
    "Verifiable finality",
    "A position appears only when the underlying vault has produced the shares.",
  ],
] as const;

export function ProductPage() {
  return (
    <PublicPage
      eyebrow="Product"
      title="A precise operating layer for real-world asset subscriptions."
      intro="BOND turns a treasury mandate into a controlled vault instruction, then keeps every state honest until final settlement."
    >
      <Section title="One workflow, four hard boundaries">
        <div className="grid gap-8 md:grid-cols-3">
          {iconCards.map(([Icon, title, text]) => (
            <InfoCard key={title} title={title}>
              <Icon size={22} className="mb-5 text-primary" />
              {text}
            </InfoCard>
          ))}
        </div>
      </Section>
      <Section dark title="Built for the space between send and settle">
        <div className="grid gap-px overflow-hidden rounded-md border border-hero-foreground/15 bg-hero-foreground/15 md:grid-cols-4">
          {["Policy check", "Wallet instruction", "Pending record", "Share verification"].map(
            (x, i) => (
              <div key={x} className="bg-surface-dark p-7">
                <span className="text-xs text-hero-muted">0{i + 1}</span>
                <h3 className="mt-12 text-lg font-semibold">{x}</h3>
              </div>
            ),
          )}
        </div>
      </Section>
    </PublicPage>
  );
}

export function VaultsPage() {
  const q = useQuery({ queryKey: ["public-vaults"], queryFn: () => listLiveVaultsFn() });
  return (
    <PublicPage
      eyebrow="Vaults"
      title="Live mainnet routes. No pretend testnet."
      intro="BOND reads IXS vault metadata live. Avalanche is the primary deposit path; BNB is listed for browse/compare."
    >
      <Section>
        {q.isLoading && <p className="text-sm text-muted-foreground">Loading vaults from IXS…</p>}
        {q.error && (
          <p className="text-sm text-danger">
            {q.error instanceof Error ? q.error.message : "IXS unavailable"}
          </p>
        )}
        <div className="grid gap-6 lg:grid-cols-2">
          {q.data?.vaults.map((v) => (
            <article key={v.id} className="rounded-md border border-border p-7">
              <div className="flex justify-between gap-4">
                <p className="text-xs font-bold uppercase text-primary">{v.network}</p>
                <span className="text-xs font-semibold text-success">{v.status}</span>
              </div>
              <h2 className="mt-5 font-display text-2xl font-semibold">{v.name}</h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{v.description}</p>
              <dl className="mt-8 grid grid-cols-2 gap-5 border-t border-border pt-5 text-sm">
                <div>
                  <dt className="text-muted-foreground">Minimum</dt>
                  <dd className="mt-1 font-semibold">
                    {v.minimum} {v.asset}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Standard</dt>
                  <dd className="mt-1 font-semibold">ERC-7540</dd>
                </div>
              </dl>
              <code className="mt-5 block overflow-hidden text-ellipsis rounded-sm bg-muted p-3 text-xs">
                {v.address}
              </code>
              <ButtonLink
                to="/dashboard/vaults/$vaultId"
                params={{ vaultId: v.id }}
                className="mt-6"
              >
                Inspect vault <ArrowRight size={15} />
              </ButtonLink>
            </article>
          ))}
        </div>
        <div className="mt-10 border-l-2 border-warning pl-5">
          <h3 className="font-semibold">Mainnet warning</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Deposits require at least $100 real USDC plus Avalanche gas. Until shares exist, status
            stays Pending — not earning.
          </p>
        </div>
      </Section>
    </PublicPage>
  );
}

export function HowItWorksPage() {
  const steps = [
    [Scale, "Allow", "The mandate authorizes amount, asset, and destination."],
    [Network, "Deposit", "The wallet submits USDC to the selected mainnet vault."],
    [Clock3, "Pending", "BOND records the request, but not a position or yield."],
    [FileCheck2, "Finalize", "When vault shares exist, the position can enter the books."],
  ] as const;
  return (
    <PublicPage
      eyebrow="How it works"
      title="The honest lifecycle of an asynchronous vault."
      intro="BOND gives every treasury operator the same shared truth: what was authorized, what was sent, what remains pending, and what is finally owned."
    >
      <Section>
        <div className="grid gap-10 md:grid-cols-2">
          {steps.map(([Icon, title, text], i) => (
            <div key={title} className="flex gap-5 border-t border-border pt-6">
              <span className="text-xs text-muted-foreground">0{i + 1}</span>
              <div>
                <Icon size={24} className="text-primary" />
                <h2 className="mt-4 text-xl font-semibold">{title}</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>
      <Section dark>
        <blockquote className="max-w-4xl font-display text-3xl leading-tight sm:text-5xl">
          “The agent bought the bond. The vault has not finished. The books do not show it yet.”
        </blockquote>
        <p className="mt-6 text-sm text-hero-muted">The operating principle behind BOND.</p>
      </Section>
    </PublicPage>
  );
}

export function PricingPage() {
  return (
    <PublicPage
      eyebrow="Pricing"
      title="No invented platform fees."
      intro="BOND does not invent yield or SaaS pricing. The hard cost for the RWA track is the IXS minimum deposit."
    >
      <Section>
        <div className="grid gap-6 md:grid-cols-3">
          {[
            ["Explore", "$0", "Create a workspace and inspect live vault state."],
            ["Mainnet deposit", "$100+", "Minimum real USDC on Avalanche, plus network gas."],
            [
              "Enterprise",
              "Custom",
              "Commercial terms require a defined operating and compliance model.",
            ],
          ].map(([name, price, text]) => (
            <article key={name} className="rounded-md border border-border p-7">
              <h2 className="font-semibold">{name}</h2>
              <p className="mt-8 font-display text-4xl font-semibold">{price}</p>
              <p className="mt-4 text-sm leading-6 text-muted-foreground">{text}</p>
              {name === "Explore" && (
                <ButtonLink to="/login" className="mt-8 w-full">
                  Open app
                </ButtonLink>
              )}
            </article>
          ))}
        </div>
      </Section>
    </PublicPage>
  );
}

export function AboutPage() {
  return (
    <PublicPage
      eyebrow="About"
      title="Built for teams that refuse to close the books early."
      intro="BOND is a focused product concept for treasury teams and crypto-native operators working with asynchronous real-world asset vaults."
    >
      <Section title="What we believe">
        <div className="grid gap-8 md:grid-cols-3">
          {[
            [
              "Truth over theatre",
              "A clean interface is valuable only when the state behind it is real.",
            ],
            [
              "Control before action",
              "Mandates belong upstream of a wallet instruction, not after the fact.",
            ],
            [
              "Evidence before ownership",
              "A transaction hash is activity. Shares are the position.",
            ],
          ].map(([t, d]) => (
            <InfoCard key={t} title={t}>
              {d}
            </InfoCard>
          ))}
        </div>
      </Section>
    </PublicPage>
  );
}

export function SecurityPage() {
  return (
    <PublicPage
      eyebrow="Security"
      title="Hardened controls. Not unhackable."
      intro="BOND separates SERV mandate checks, AgentKit signing, and IXS share proof. httpOnly sessions replace localStorage. Residual risk remains — we do not claim otherwise."
    >
      <Section>
        <div className="grid gap-8 md:grid-cols-3">
          {[
            [
              LockKeyhole,
              "Mandate gates",
              "SERV + policy deny out-of-policy subscriptions before signing.",
            ],
            [
              Fingerprint,
              "Independent proof",
              "Final state depends on live vault shares, not application optimism.",
            ],
            [
              Gauge,
              "Visible exceptions",
              "IXS/CDP/SERV failures surface as hard errors — no synthetic success.",
            ],
          ].map(([Icon, t, d]) => (
            <InfoCard key={t} title={t}>
              <Icon size={22} className="mb-5 text-primary" />
              {d}
            </InfoCard>
          ))}
        </div>
      </Section>
      <Section dark title="Security honesty">
        <p className="max-w-3xl text-lg leading-8 text-hero-muted">
          Enterprise hardening includes multitenant isolation, CSRF on server functions, secret env
          vars, and input validation. Audits, incident response, and jurisdictional review remain
          ongoing obligations — not marketing claims.
        </p>
      </Section>
    </PublicPage>
  );
}

export function DocsPage() {
  const items = [
    [
      "Quick start",
      "Register a workspace, create an Avalanche USDC mandate, open the primary vault, and submit a live $100 deposit when funded.",
    ],
    [
      "State model",
      "Pending never contributes to owned balance or yield. Finalized requires live share proof from IXS.",
    ],
    [
      "Vault references",
      "Primary Avalanche vault ID 6a952729732c2b84b55ce89d — read live via IXS REST.",
    ],
    [
      "Sessions",
      "Auth uses httpOnly cookies and Postgres sessions. No localStorage for auth or balances.",
    ],
  ];
  return (
    <PublicPage
      eyebrow="Documentation"
      title="Operate BOND with one shared definition of done."
      intro="A concise guide to mandates, live deposits, and Pending honesty."
    >
      <Section>
        <div className="grid gap-12 lg:grid-cols-[260px_1fr]">
          <aside className="space-y-3 text-sm">
            {items.map(([t]) => (
              <a
                key={t}
                href={`#${t.toLowerCase().replaceAll(" ", "-")}`}
                className="block text-muted-foreground hover:text-foreground"
              >
                {t}
              </a>
            ))}
          </aside>
          <div className="space-y-14">
            {items.map(([t, d]) => (
              <article key={t} id={t.toLowerCase().replaceAll(" ", "-")}>
                <h2 className="font-display text-2xl font-semibold">{t}</h2>
                <p className="mt-3 max-w-2xl leading-7 text-muted-foreground">{d}</p>
              </article>
            ))}
          </div>
        </div>
      </Section>
    </PublicPage>
  );
}

export function ContactPage() {
  return (
    <PublicPage
      eyebrow="Contact"
      title="Bring a mandate. Leave with a verifiable flow."
      intro="Tell us what your treasury needs to control and where settlement ambiguity appears today."
    >
      <Section>
        <form className="grid max-w-2xl gap-5" onSubmit={(e) => e.preventDefault()}>
          {[
            ["Name", "Your name"],
            ["Work email", "you@company.com"],
            ["Organization", "Treasury or protocol"],
          ].map(([l, p]) => (
            <label key={l} className="grid gap-2 text-sm font-semibold">
              {l}
              <input
                className="h-11 rounded-md border border-input bg-background px-3 font-normal outline-none focus:ring-2 focus:ring-ring"
                placeholder={p}
              />
            </label>
          ))}
          <label className="grid gap-2 text-sm font-semibold">
            What are you evaluating?
            <textarea
              className="min-h-32 rounded-md border border-input bg-background p-3 font-normal outline-none focus:ring-2 focus:ring-ring"
              placeholder="Describe the vault, mandate, and decision flow."
            />
          </label>
          <button className="h-11 w-fit rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground">
            Request a walkthrough
          </button>
          <p className="text-xs text-muted-foreground">
            Demo form only. No message is transmitted.
          </p>
        </form>
      </Section>
    </PublicPage>
  );
}

export function BlogPage() {
  const posts = [
    [
      "pending-is-a-financial-state",
      "Pending is a financial state, not a loading spinner",
      "Why asynchronous vaults need a first-class accounting state.",
    ],
    [
      "mandates-before-wallets",
      "Mandates belong before wallets",
      "The control plane for agent-directed treasury action.",
    ],
    [
      "shares-are-the-receipt",
      "Shares are the receipt",
      "What vault finality looks like when interfaces stop guessing.",
    ],
  ];
  return (
    <PublicPage
      eyebrow="Journal"
      title="Notes on treasury control and verifiable settlement."
      intro="Clear thinking for teams operating where regulated assets meet onchain rails."
    >
      <Section>
        <div className="grid gap-6 md:grid-cols-3">
          {posts.map(([slug, title, desc]) => (
            <Link
              key={slug}
              to="/blog/$slug"
              params={{ slug }}
              className="group rounded-md border border-border p-6"
            >
              <BookOpen size={20} className="text-primary" />
              <h2 className="mt-12 text-xl font-semibold group-hover:text-primary">{title}</h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{desc}</p>
              <span className="mt-7 inline-flex items-center gap-2 text-sm font-semibold">
                Read note <ArrowRight size={14} />
              </span>
            </Link>
          ))}
        </div>
      </Section>
    </PublicPage>
  );
}

const articleMap: Record<string, { title: string; intro: string; body: string[] }> = {
  "pending-is-a-financial-state": {
    title: "Pending is a financial state, not a loading spinner",
    intro: "When settlement is asynchronous, waiting is part of the instrument’s truth.",
    body: [
      "A transaction can be valid without creating a position. That distinction matters whenever an allocator, agent, or accounting system acts on what the interface displays.",
      "BOND treats pending as durable information. The amount is visible, the instruction is auditable, and the owned balance remains unchanged until shares arrive.",
    ],
  },
  "mandates-before-wallets": {
    title: "Mandates belong before wallets",
    intro: "A wallet can execute an instruction. A mandate determines whether it should.",
    body: [
      "Policy applied after execution is reporting, not control. Treasury systems need constraints at the point where intent becomes action.",
      "BOND’s demo checks amount, asset, network, and destination before exposing the confirmation step.",
    ],
  },
  "shares-are-the-receipt": {
    title: "Shares are the receipt",
    intro: "A submitted deposit proves activity. Vault shares prove the position.",
    body: [
      "Interfaces often compress a multi-stage process into a single success state. That convenience creates accounting ambiguity.",
      "The final share balance is the evidence BOND uses to move value from pending activity into an owned position.",
    ],
  },
};
export function ArticlePage({ slug }: { slug: string }) {
  const article = articleMap[slug] ?? articleMap["pending-is-a-financial-state"];
  if (!article) return null;
  return (
    <PublicPage eyebrow="BOND Journal" title={article.title} intro={article.intro}>
      <Section>
        <article className="max-w-2xl space-y-6 text-lg leading-8 text-muted-foreground">
          {article.body.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </article>
      </Section>
    </PublicPage>
  );
}

export function LegalPage({ type }: { type: "terms" | "privacy" | "risk" | "compliance" }) {
  const content = {
    terms: [
      "Terms of demonstration",
      "This site is an interactive product demonstration. It does not provide investment advice, execute transactions, create an account, or form a commercial agreement.",
    ],
    privacy: [
      "Privacy notice",
      "The demo does not intentionally transmit or persist form entries, wallet data, or personal account information. Production data practices would require a separate reviewed policy.",
    ],
    risk: [
      "Risk disclosure",
      "Real-world asset vaults involve issuer, liquidity, smart contract, counterparty, legal, network, and settlement risk. A pending deposit is not an owned or yielding position.",
    ],
    compliance: [
      "Compliance approach",
      "A production product would require jurisdiction, investor eligibility, sanctions, asset, custody, and reporting controls. This demo represents workflow intent, not regulatory approval.",
    ],
  } as const;
  const [title, body] = content[type];
  return (
    <PublicPage
      eyebrow="Legal information"
      title={title}
      intro="Demo copy for product evaluation. Professional legal review is required before production use."
    >
      <Section>
        <div className="max-w-3xl">
          <CircleDollarSign size={24} className="text-primary" />
          <p className="mt-6 text-lg leading-8 text-muted-foreground">{body}</p>
          <h2 className="mt-12 text-xl font-semibold">Important boundary</h2>
          <p className="mt-3 leading-7 text-muted-foreground">
            Nothing on this site is an offer, solicitation, recommendation, custody service, broker
            service, or assurance of availability. Network and vault details can change
            independently of this demo.
          </p>
        </div>
      </Section>
    </PublicPage>
  );
}
