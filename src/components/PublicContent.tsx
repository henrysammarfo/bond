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
import { useState } from "react";
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
      title="Both chains. Live from IXS. No pretend testnet."
      intro="BOND reads the full IXS catalog. Avalanche and BNB permissionless vaults accept AgentKit subscribe. Whitelist vaults stay visible for compare."
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
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs font-bold uppercase text-primary">{v.network}</p>
                <div className="flex gap-2 text-[11px] font-semibold">
                  <span className="text-success">{v.status}</span>
                  {(v as { depositable?: boolean }).depositable ? (
                    <span className="text-primary">Subscribe open</span>
                  ) : (
                    <span className="text-warning">Browse</span>
                  )}
                </div>
              </div>
              <h2 className="mt-5 font-display text-2xl font-semibold">{v.name}</h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{v.description}</p>
              <dl className="mt-8 grid grid-cols-2 gap-5 border-t border-border pt-5 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-muted-foreground">Minimum</dt>
                  <dd className="mt-1 font-semibold">
                    {v.minimum} {v.asset}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">TTM (IXS)</dt>
                  <dd className="mt-1 font-semibold">
                    {(v as { ttm?: number | null }).ttm != null
                      ? `${(v as { ttm?: number | null }).ttm}%`
                      : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Lane</dt>
                  <dd className="mt-1 font-semibold capitalize">
                    {(v as { role?: string }).role ?? "listed"}
                  </dd>
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
                {(v as { depositable?: boolean }).depositable ? "Subscribe" : "Inspect"}{" "}
                <ArrowRight size={15} />
              </ButtonLink>
            </article>
          ))}
        </div>
        <div className="mt-10 border-l-2 border-warning pl-5">
          <p className="text-sm leading-6 text-muted-foreground">
            Same AgentKit address works on Avalanche and BNB Chain. Fund the matching USDC + gas on
            the chain you subscribe. Pending is not ownership until IXS shares prove out.
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
            ["Mainnet deposit", "$104+", "Live redeemable floor on Avalanche or BNB Chain, plus gas."],
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
      "Register a workspace, create an Avalanche or BNB USDC mandate, open a permissionless vault, and submit a live $104 deposit when funded.",
    ],
    [
      "State model",
      "Pending never contributes to owned balance or yield. Finalized requires live share proof from IXS.",
    ],
    [
      "Vault references",
      "Avalanche primary 6a952729732c2b84b55ce89d · BNB companion 6a26624ca7d16b245d665475 — both live via IXS REST.",
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
  const [status, setStatus] = useState<"idle" | "ok" | "err">("idle");
  const [err, setErr] = useState("");
  return (
    <PublicPage
      eyebrow="Contact"
      title="Bring a mandate. Leave with a verifiable flow."
      intro="Tell us what your treasury needs to control and where settlement ambiguity appears today."
    >
      <Section>
        <form
          className="grid max-w-2xl gap-5"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            if (String(fd.get("company_website") || "").trim()) {
              setStatus("ok");
              return;
            }
            const email = String(fd.get("email") || "");
            const name = String(fd.get("name") || "");
            const message = String(fd.get("message") || "");
            if (name.trim().length < 2) {
              setErr("Please enter your name.");
              setStatus("err");
              return;
            }
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
              setErr("Please enter a valid work email.");
              setStatus("err");
              return;
            }
            if (message.trim().length < 10) {
              setErr("Please add a short note (at least 10 characters).");
              setStatus("err");
              return;
            }
            setErr("");
            setStatus("ok");
          }}
        >
          {/* Honeypot — leave empty */}
          <input
            type="text"
            name="company_website"
            tabIndex={-1}
            autoComplete="off"
            className="absolute -left-[9999px] h-0 w-0 opacity-0"
            aria-hidden="true"
          />
          <label className="grid gap-2 text-sm font-semibold">
            Name
            <input
              name="name"
              required
              minLength={2}
              className="h-11 rounded-md border border-input bg-background px-3 font-normal outline-none focus:ring-2 focus:ring-ring"
              placeholder="Your name"
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            Work email
            <input
              name="email"
              type="email"
              required
              className="h-11 rounded-md border border-input bg-background px-3 font-normal outline-none focus:ring-2 focus:ring-ring"
              placeholder="you@company.com"
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            Organization
            <input
              name="org"
              className="h-11 rounded-md border border-input bg-background px-3 font-normal outline-none focus:ring-2 focus:ring-ring"
              placeholder="Treasury or protocol"
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            What are you evaluating?
            <textarea
              name="message"
              required
              minLength={10}
              className="min-h-32 rounded-md border border-input bg-background p-3 font-normal outline-none focus:ring-2 focus:ring-ring"
              placeholder="Describe the vault, mandate, and decision flow."
            />
          </label>
          {status === "err" && <p className="text-xs text-danger">{err}</p>}
          {status === "ok" && (
            <p className="text-xs text-success">
              Thanks — your note was validated in-browser. Email delivery is not configured on this
              demo host; reach the team via the OpenServ submission channel.
            </p>
          )}
          <button
            type="submit"
            className="h-11 w-fit rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground"
          >
            Request a walkthrough
          </button>
          <p className="text-xs text-muted-foreground">
            Client-side validation + honeypot only. No SMTP on this deployment.
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
  const blocks: Record<typeof type, { title: string; sections: Array<[string, string]> }> = {
    privacy: {
      title: "Privacy policy",
      sections: [
        [
          "What we collect",
          "When you register, BOND stores your email, display name, password hash, organization name, and session cookies. Integration keys you paste are encrypted at rest and never shown in full again. We do not sell personal data.",
        ],
        [
          "Cookies",
          "We use a single httpOnly session cookie for sign-in. Optional analytics (if enabled by the host) and a cookie-consent preference may be stored locally. You can refuse non-essential cookies via the banner.",
        ],
        [
          "On-chain data",
          "Wallet addresses and transaction hashes you generate are public on Avalanche / BNB explorers. That is how settlement proof works.",
        ],
        [
          "Contact",
          "Privacy questions: use /contact. Operators may rotate keys and delete org rows on request where legally required.",
        ],
      ],
    },
    terms: {
      title: "Terms & conditions",
      sections: [
        [
          "What BOND is",
          "BOND is software for mandate-gated subscriptions to IXS RWA vaults. It is not investment advice, a broker, or a custodian of your funds beyond the AgentKit key your org controls.",
        ],
        [
          "Your keys, your risk",
          "If you import or generate an AgentKit private key, you are responsible for backing it up. Losing it can mean losing access to vault positions. Redeems follow IXS async rules.",
        ],
        [
          "No guarantees",
          "Vault yields, settlement times, RPC uptime, and third-party APIs (IXS, SERV, AgentRouter) can fail. We fail closed. We do not invent balances.",
        ],
        [
          "Acceptable use",
          "Do not abuse rate limits, attempt unauthorized access, or use BOND to violate sanctions or applicable law.",
        ],
      ],
    },
    risk: {
      title: "Risk disclosure",
      sections: [
        [
          "RWA and async settlement",
          "Real-world asset vaults involve issuer, liquidity, smart contract, legal, and network risk. A Pending deposit is not owned and not earning until IXS shares exist.",
        ],
        [
          "Dual-chain funding",
          "Avalanche and BNB vaults need the right USDC and gas on each chain. Sending assets to the wrong network can strand funds.",
        ],
      ],
    },
    compliance: {
      title: "Compliance approach",
      sections: [
        [
          "Production bar",
          "A production deployment requires jurisdiction, eligibility, sanctions, custody, and reporting controls. This build shows the control workflow — not a regulatory approval.",
        ],
      ],
    },
  };
  const page = blocks[type];
  return (
    <PublicPage
      eyebrow="Legal"
      title={page.title}
      intro="Plain-language policy for the BOND product. Have counsel review before production launch."
    >
      <Section>
        <div className="max-w-3xl space-y-10">
          {page.sections.map(([h, p]) => (
            <article key={h}>
              <h2 className="text-xl font-semibold">{h}</h2>
              <p className="mt-3 leading-7 text-muted-foreground">{p}</p>
            </article>
          ))}
        </div>
      </Section>
    </PublicPage>
  );
}
