import { Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  Check,
  CircleAlert,
  Copy,
  ExternalLink,
  Filter,
  Plus,
  Search,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PRIMARY_VAULT_ID, BNB_VAULT_ID } from "@/lib/bond-data";
import { listLiveVaultsFn, getLiveVaultFn } from "@/backend/fns/vaults";
import { listMandatesFn, createMandateFn } from "@/backend/fns/mandates";
import {
  getDashboardOverviewFn,
  listSubscriptionsFn,
  getSubscriptionFn,
  listActivityFn,
  getWalletFn,
  getSettingsFn,
  updateSettingsFn,
  subscribeVaultFn,
  refreshSubscriptionFn,
  claimSubscriptionFn,
} from "@/backend/fns/dashboard";
import {
  getIntegrationsFn,
  saveIntegrationsFn,
  rotateAgentWalletFn,
} from "@/backend/fns/integrations";
import {
  scanVaultsFn,
  simulateVaultDepositFn,
  preflightVaultFn,
} from "@/backend/fns/allocate";
import { Button, ButtonLink } from "./Button";
import { PageTitle, Panel, Status } from "./DashboardUI";

function errMessage(e: unknown): string {
  return e instanceof Error ? e.message : "Request failed";
}

function snowscanTx(hash: string | null | undefined) {
  if (!hash) return null;
  return `https://snowscan.xyz/tx/${hash}`;
}

function snowscanAddress(address: string | null | undefined) {
  if (!address) return null;
  return `https://snowscan.xyz/address/${address}`;
}

export function DashboardOverview() {
  const q = useQuery({ queryKey: ["overview"], queryFn: () => getDashboardOverviewFn() });
  if (q.isLoading) return <Panel>Loading live overview…</Panel>;
  if (q.error) return <Panel className="text-danger">{errMessage(q.error)}</Panel>;
  const d = q.data!;
  return (
    <>
      <PageTitle
        eyebrow={d.orgName}
        title="Overview"
        action={
          <ButtonLink to="/dashboard/vaults">
            <Plus size={16} />
            New subscription
          </ButtonLink>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {(
          [
            ["Owned positions", `$${d.owned}`, "Finalized shares only"],
            ["Pending deposits", `$${d.pending}`, "Excluded from ownership"],
            [
              "Available USDC",
              d.availableUsdc === "—" ? "Wallet unavailable" : `$${d.availableUsdc}`,
              "AgentKit · Avalanche + BNB",
            ],
            ["Active mandate", `$${d.mandateRemaining}`, `of $${d.mandateLimit} remaining`],
          ] as const
        ).map(([l, v, detail]) => (
          <Panel key={l}>
            <p className="text-xs text-dashboard-muted">{l}</p>
            <p className="mt-5 font-display text-3xl font-semibold">{v}</p>
            <p className="mt-2 text-xs text-dashboard-muted">{detail}</p>
          </Panel>
        ))}
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.25fr_.75fr]">
        <Panel>
          <h2 className="font-semibold">Position state</h2>
          <p className="mt-1 text-xs text-dashboard-muted">
            Ownership and instructions remain separate.
          </p>
          <div className="mt-8 grid gap-3 text-sm">
            <div className="flex justify-between border-b border-dashboard-border py-3">
              <span className="text-dashboard-muted">Owned</span>
              <span>${d.owned}</span>
            </div>
            <div className="flex justify-between border-b border-dashboard-border py-3">
              <span className="text-dashboard-muted">Pending (not earning)</span>
              <span className="text-warning">${d.pending}</span>
            </div>
            <div className="flex justify-between py-3">
              <span className="text-dashboard-muted">Wallet USDC</span>
              <span>{d.availableUsdc}</span>
            </div>
          </div>
        </Panel>
        <Panel>
          <h2 className="font-semibold">Recent activity</h2>
          <div className="mt-5 divide-y divide-dashboard-border">
            {d.activity.length === 0 && (
              <p className="py-4 text-sm text-dashboard-muted">No events yet.</p>
            )}
            {d.activity.map((a) => (
              <div key={a.event + a.time} className="flex gap-3 py-4">
                <span
                  className={`mt-1 size-2 rounded-full ${a.tone === "good" ? "bg-success" : a.tone === "bad" ? "bg-danger" : "bg-warning"}`}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{a.event}</p>
                  <p className="mt-1 truncate text-xs text-dashboard-muted">{a.detail}</p>
                </div>
                <span className="text-[11px] text-dashboard-muted">
                  {new Date(a.time).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </>
  );
}

export function MandatesPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [limit, setLimit] = useState("500");
  const [name, setName] = useState("RWA allocation");
  const [network, setNetwork] = useState<"Avalanche" | "BNB Chain">("Avalanche");
  const q = useQuery({ queryKey: ["mandates"], queryFn: () => listMandatesFn() });
  const create = useMutation({
    mutationFn: () =>
      createMandateFn({
        data: {
          name,
          monthlyLimitDollars: Number(limit),
          asset: "USDC",
          network,
        },
      }),
    onSuccess: () => {
      setOpen(false);
      void qc.invalidateQueries({ queryKey: ["mandates"] });
    },
  });
  return (
    <>
      <PageTitle
        eyebrow="Policy controls"
        title="Mandates"
        action={
          <Button onClick={() => setOpen(!open)}>
            <Plus size={16} />
            New mandate
          </Button>
        }
      />
      {open && (
        <Panel className="mb-6">
          <h2 className="font-semibold">Create mandate</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <label className="text-xs text-dashboard-muted">
              Name
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-2 h-10 w-full rounded-md border border-dashboard-border bg-dashboard px-3 text-dashboard-foreground"
              />
            </label>
            <label className="text-xs text-dashboard-muted">
              Monthly limit
              <input
                value={limit}
                onChange={(e) => setLimit(e.target.value)}
                className="mt-2 h-10 w-full rounded-md border border-dashboard-border bg-dashboard px-3 text-dashboard-foreground"
              />
            </label>
            <label className="text-xs text-dashboard-muted">
              Network
              <select
                value={network}
                onChange={(e) => setNetwork(e.target.value as "Avalanche" | "BNB Chain")}
                className="mt-2 h-10 w-full rounded-md border border-dashboard-border bg-dashboard px-3 text-dashboard-foreground"
              >
                <option value="Avalanche">Avalanche · USDC</option>
                <option value="BNB Chain">BNB Chain · USDC</option>
              </select>
            </label>
          </div>
          {create.error && <p className="mt-3 text-xs text-danger">{errMessage(create.error)}</p>}
          <div className="mt-5 flex gap-2">
            <Button disabled={create.isPending} onClick={() => create.mutate()}>
              Save mandate
            </Button>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </Panel>
      )}
      {q.isLoading && <Panel>Loading mandates…</Panel>}
      {q.error && <Panel className="text-danger">{errMessage(q.error)}</Panel>}
      <div className="grid gap-5 lg:grid-cols-2">
        {q.data?.map((m) => (
          <Panel key={m.id}>
            <div className="flex justify-between">
              {m.status === "active" ? (
                <ShieldCheck className="text-success" />
              ) : (
                <CircleAlert className="text-dashboard-muted" />
              )}
              <Status value={m.status === "active" ? "Active" : m.status} />
            </div>
            <h2 className="mt-7 text-xl font-semibold">{m.name}</h2>
            <p className="mt-2 text-sm text-dashboard-muted">
              Allows {m.asset} on {m.network} up to ${m.monthlyLimit} monthly. SERV denies deposits
              under $100, wrong network, inactive mandates, or over remaining limit.
            </p>
            <div className="mt-6 h-2 overflow-hidden rounded-full bg-dashboard-accent">
              <div
                className="h-full bg-success"
                style={{
                  width: `${Math.min(100, (Number(m.used) / Math.max(Number(m.monthlyLimit), 1)) * 100)}%`,
                }}
              />
            </div>
            <div className="mt-3 flex justify-between text-xs text-dashboard-muted">
              <span>${m.used} used</span>
              <span>${m.monthlyLimit} limit</span>
            </div>
          </Panel>
        ))}
        {q.data?.length === 0 && (
          <Panel>No mandates yet. Create an Avalanche or BNB Chain USDC mandate to subscribe.</Panel>
        )}
      </div>
    </>
  );
}

export function DashboardVaultsPage() {
  const [query, setQuery] = useState("");
  const q = useQuery({ queryKey: ["vaults"], queryFn: () => listLiveVaultsFn() });
  if (q.isLoading) return <Panel>Loading live vaults from IXS…</Panel>;
  if (q.error) return <Panel className="text-danger">{errMessage(q.error)}</Panel>;
  const matches =
    q.data?.vaults.filter(
      (v) =>
        v.name.toLowerCase().includes(query.toLowerCase()) ||
        v.network.toLowerCase().includes(query.toLowerCase()),
    ) ?? [];
  return (
    <>
      <PageTitle eyebrow="Discover" title="Vaults" />
      <p className="mb-4 text-sm text-dashboard-muted">
        Live from IXS. Avalanche primary · BNB companion · whitelist browse.
      </p>
      <div className="mb-6 flex max-w-md items-center gap-2 rounded-md border border-dashboard-border bg-dashboard-panel px-3">
        <Search size={16} className="text-dashboard-muted" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search vaults"
          className="h-10 flex-1 bg-transparent text-sm outline-none"
        />
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        {matches.map((v) => {
          const role = (v as { role?: string }).role;
          const depositable = Boolean((v as { depositable?: boolean }).depositable);
          return (
            <Panel key={v.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="grid size-10 place-items-center rounded-md bg-dashboard-accent">
                  <WalletCards size={19} />
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  {role === "primary" && (
                    <span className="text-[11px] font-semibold uppercase text-primary">Primary</span>
                  )}
                  {role === "secondary" && (
                    <span className="text-[11px] font-semibold uppercase text-primary">BNB lane</span>
                  )}
                  {role === "whitelist" && (
                    <span className="text-[11px] font-semibold uppercase text-warning">Whitelist</span>
                  )}
                  {depositable ? (
                    <span className="text-[11px] font-semibold text-success">Subscribe open</span>
                  ) : null}
                  <Status value={v.status} />
                </div>
              </div>
              <h2 className="mt-6 text-xl font-semibold">{v.name}</h2>
              <p className="mt-2 text-sm leading-6 text-dashboard-muted">{v.description}</p>
              <div className="mt-6 grid grid-cols-3 border-y border-dashboard-border py-4 text-sm">
                <div>
                  <p className="text-xs text-dashboard-muted">Network</p>
                  <p className="mt-1">{v.network}</p>
                </div>
                <div>
                  <p className="text-xs text-dashboard-muted">Asset</p>
                  <p className="mt-1">{v.asset}</p>
                </div>
                <div>
                  <p className="text-xs text-dashboard-muted">Minimum</p>
                  <p className="mt-1">{v.minimum}</p>
                </div>
              </div>
              <ButtonLink
                to="/dashboard/vaults/$vaultId"
                params={{ vaultId: v.id }}
                variant="secondary"
                className="mt-5"
              >
                {depositable ? "Subscribe" : "Inspect"} <ArrowRight size={15} />
              </ButtonLink>
            </Panel>
          );
        })}
      </div>
    </>
  );
}

export function VaultDetailPage({ vaultId }: { vaultId: string }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [amount, setAmount] = useState("104");
  const vaultQ = useQuery({
    queryKey: ["vault", vaultId],
    queryFn: () => getLiveVaultFn({ data: { vaultId } }),
  });
  const mandatesQ = useQuery({ queryKey: ["mandates"], queryFn: () => listMandatesFn() });
  const activeMandate = mandatesQ.data?.find((m) => m.status === "active");
  const subscribe = useMutation({
    mutationFn: () => {
      if (!activeMandate) throw new Error("Create an active Avalanche or BNB Chain mandate first.");
      return subscribeVaultFn({
        data: {
          vaultId,
          amountDollars: Number(amount),
          mandateId: activeMandate.id,
        },
      });
    },
    onSuccess: (res) => {
      void navigate({
        to: "/dashboard/subscriptions/$subscriptionId",
        params: { subscriptionId: res.subscriptionId },
      });
    },
  });

  if (vaultQ.isLoading) return <Panel>Loading vault…</Panel>;
  if (vaultQ.error) return <Panel className="text-danger">{errMessage(vaultQ.error)}</Panel>;
  const vault = vaultQ.data!;
  const canDeposit =
    Boolean((vault as { depositable?: boolean }).depositable) ||
    vault.id === PRIMARY_VAULT_ID ||
    vault.id === BNB_VAULT_ID ||
    vaultId === PRIMARY_VAULT_ID ||
    vaultId === BNB_VAULT_ID;
  const isBnb = vault.id === BNB_VAULT_ID || vaultId === BNB_VAULT_ID || vault.chainId === 56;

  return (
    <>
      <PageTitle
        eyebrow={vault.network}
        title={vault.name}
        action={<Status value={vault.status} />}
      />
      <div className="grid gap-6 xl:grid-cols-[1.25fr_.75fr]">
        <div className="space-y-6">
          <Panel>
            <h2 className="font-semibold">Vault overview</h2>
            <p className="mt-4 text-sm leading-7 text-dashboard-muted">{vault.description}</p>
            <dl className="mt-6 grid gap-5 border-t border-dashboard-border pt-5 sm:grid-cols-3">
              <div>
                <dt className="text-xs text-dashboard-muted">Minimum</dt>
                <dd className="mt-1 font-semibold">{vault.minimum} USDC</dd>
              </div>
              <div>
                <dt className="text-xs text-dashboard-muted">Settlement</dt>
                <dd className="mt-1 font-semibold">
                  {String((vault as { settlement?: string }).settlement ?? "ERC-7540 async")}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-dashboard-muted">Whitelist</dt>
                <dd className="mt-1 font-semibold">
                  {vault.requiresWhitelist ? "Required" : "Open"}
                </dd>
              </div>
            </dl>
          </Panel>
          <Panel>
            <h2 className="font-semibold">Contract</h2>
            <div className="mt-4 flex items-center gap-2 rounded-md bg-dashboard px-3 py-3">
              <code className="min-w-0 flex-1 truncate text-xs text-dashboard-muted">
                {vault.address}
              </code>
              <Copy size={15} />
              <a
                href={`${vault.explorerUrl}/address/${vault.address}`}
                target="_blank"
                rel="noreferrer"
              >
                <ExternalLink size={15} />
              </a>
            </div>
          </Panel>
        </div>
        <Panel>
          {!canDeposit && (
            <p className="text-sm text-warning">
              Whitelist or unsupported lane — browse and compare live from IXS. Subscribe on the open
              Avalanche or BNB permissionless vaults.
            </p>
          )}
          {canDeposit && step === 0 && (
            <>
              <p className="text-xs font-semibold uppercase text-dashboard-muted">
                New instruction
              </p>
              <h2 className="mt-2 text-xl font-semibold">Subscribe to vault</h2>
              <label className="mt-6 block text-xs text-dashboard-muted">
                Amount in USDC
                <input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="mt-2 h-12 w-full rounded-md border border-dashboard-border bg-dashboard px-3 text-lg text-dashboard-foreground"
                />
              </label>
              {Number(amount) < 104 && (
                <p className="mt-2 text-xs text-danger">
                  Live minimum is $104 USDC (redeemable after 0.5% fee + NAV buffer).
                </p>
              )}
              <div className="mt-5 rounded-md bg-dashboard-accent/60 p-4 text-xs leading-5 text-dashboard-muted">
                Mandate:{" "}
                {activeMandate
                  ? `$${activeMandate.remaining} remaining · ${activeMandate.network}`
                  : "No active mandate"}
              </div>
              <Button
                disabled={Number(amount) < 104 || !activeMandate}
                className="mt-5 w-full"
                onClick={() => setStep(1)}
              >
                Review instruction
              </Button>
            </>
          )}
          {canDeposit && step === 1 && (
            <>
              <p className="text-xs font-semibold uppercase text-dashboard-muted">Review</p>
              <h2 className="mt-2 text-xl font-semibold">Confirm ${amount} USDC</h2>
              <div className="mt-6 space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-dashboard-muted">Destination</span>
                  <span>{vault.network}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dashboard-muted">SERV mandate gate</span>
                  <span className="text-success">Live allow/deny before sign</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dashboard-muted">Initial status</span>
                  <span className="text-warning">Pending — not earning</span>
                </div>
              </div>
              <div className="mt-6 rounded-md border border-warning/40 bg-warning/10 p-4 text-xs leading-5 text-warning">
                Real {isBnb ? "BNB Chain" : "Avalanche"} mainnet deposit via AgentKit. SERV evaluates
                the mandate first. Until IXS shares exist, status stays Pending — not owned, not
                earning. Fund USDC + {isBnb ? "BNB" : "AVAX"} gas on this chain.
              </div>
              {Number(amount) < 104 && (
                <p className="mt-3 text-xs text-danger">
                  SERV / preflight will deny: live redeemable minimum is $104 USDC.
                </p>
              )}
              {!activeMandate && (
                <p className="mt-3 text-xs text-danger">
                  SERV will deny: create an active Avalanche or BNB Chain mandate first.
                </p>
              )}
              {subscribe.error && (
                <p className="mt-3 text-xs text-danger">{errMessage(subscribe.error)}</p>
              )}
              <Button
                className="mt-5 w-full"
                disabled={subscribe.isPending}
                onClick={() => subscribe.mutate()}
              >
                {subscribe.isPending ? "Submitting…" : "Confirm live deposit"}
              </Button>
              <Button variant="ghost" className="mt-2 w-full" onClick={() => setStep(0)}>
                Back
              </Button>
            </>
          )}
        </Panel>
      </div>
    </>
  );
}

export function SubscriptionsPage() {
  const [filter, setFilter] = useState<"All" | "Pending" | "Finalized" | "Rejected" | "Claimable">(
    "All",
  );
  const q = useQuery({
    queryKey: ["subscriptions", filter],
    queryFn: () => listSubscriptionsFn({ data: { status: filter } }),
  });
  return (
    <>
      <PageTitle eyebrow="Settlement ledger" title="Subscriptions" />
      <div className="mb-5 flex flex-wrap gap-2">
        {(["All", "Pending", "Finalized", "Rejected", "Claimable"] as const).map((f) => (
          <Button
            key={f}
            variant={filter === f ? "secondary" : "ghost"}
            onClick={() => setFilter(f)}
          >
            <Filter size={14} />
            {f}
          </Button>
        ))}
      </div>
      {q.error && <Panel className="mb-4 text-danger">{errMessage(q.error)}</Panel>}
      <Panel className="overflow-x-auto p-0">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-dashboard-border text-xs text-dashboard-muted">
            <tr>
              <th className="p-4">Vault</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Shares</th>
              <th>Date</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {q.data?.map((s) => (
              <tr key={s.id} className="border-b border-dashboard-border last:border-0">
                <td className="p-4 font-medium">{s.vault}</td>
                <td>{s.amount}</td>
                <td>
                  <Status value={s.status} />
                </td>
                <td>{s.shares}</td>
                <td className="text-dashboard-muted">{s.date}</td>
                <td>
                  <Link
                    to="/dashboard/subscriptions/$subscriptionId"
                    params={{ subscriptionId: s.id }}
                    className="text-primary hover:underline"
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {q.data?.length === 0 && (
          <p className="p-6 text-sm text-dashboard-muted">No subscriptions yet.</p>
        )}
      </Panel>
    </>
  );
}

export function SubscriptionDetailPage({ id }: { id: string }) {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["subscription", id],
    queryFn: () => getSubscriptionFn({ data: { subscriptionId: id } }),
    refetchInterval: (query) =>
      query.state.data?.status === "Pending" || query.state.data?.status === "Claimable"
        ? 15_000
        : false,
  });
  const refresh = useMutation({
    mutationFn: () => refreshSubscriptionFn({ data: { subscriptionId: id } }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["subscription", id] }),
  });
  const claim = useMutation({
    mutationFn: () => claimSubscriptionFn({ data: { subscriptionId: id } }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["subscription", id] }),
  });

  if (q.isLoading) return <Panel>Loading subscription…</Panel>;
  if (q.error) return <Panel className="text-danger">{errMessage(q.error)}</Panel>;
  const s = q.data!;
  const status = s.status;

  return (
    <>
      <PageTitle eyebrow={s.id} title="Subscription detail" action={<Status value={status} />} />
      {(status === "Pending" || status === "Claimable") && (
        <Panel className="mb-6 border border-warning/40 bg-warning/10">
          <p className="text-sm font-semibold text-warning">Pending — not owned, not earning</p>
          <p className="mt-2 text-xs leading-5 text-dashboard-muted">
            Deposit is on Avalanche or BNB Chain. Owned balance and yield stay blank until IXS finalizes shares.
            Same honesty bar as a live ERC-7540 vault — not a spinner.
          </p>
        </Panel>
      )}
      <div className="grid gap-6 xl:grid-cols-[1fr_.7fr]">
        <Panel>
          <h2 className="font-semibold">Lifecycle</h2>
          <div className="mt-6 space-y-0">
            {(
              [
                [
                  "Mandate approved",
                  s.serv
                    ? `${s.serv.source}: ${s.serv.reason || "allowed"}`
                    : "Amount and destination allowed via SERV",
                  true,
                ],
                [
                  "Deposit submitted",
                  s.requestTxHash ?? "Wallet instruction recorded",
                  Boolean(s.requestTxHash),
                ],
                [
                  "Vault processing",
                  "Awaiting IXS finalization — Pending not earning",
                  status !== "Pending",
                ],
                [
                  "Shares confirmed",
                  status === "Finalized" ? `${s.shares} shares issued` : "No share balance yet",
                  status === "Finalized",
                ],
              ] as const
            ).map(([t, d, done], i) => (
              <div key={String(t)} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <span
                    className={`grid size-7 place-items-center rounded-full ${done ? "bg-success text-dashboard" : "bg-dashboard-accent text-dashboard-muted"}`}
                  >
                    {done ? <Check size={14} /> : i + 1}
                  </span>
                  {i < 3 && <span className="h-14 w-px bg-dashboard-border" />}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium">{t}</p>
                  <p className="mt-1 break-all text-xs text-dashboard-muted">{d}</p>
                </div>
              </div>
            ))}
          </div>
        </Panel>
        <Panel>
          <h2 className="font-semibold">On-chain proof</h2>
          <dl className="mt-6 space-y-4 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-dashboard-muted">Owner</dt>
              <dd className="min-w-0 text-right">
                {snowscanAddress(s.ownerAddress) ? (
                  <a
                    className="break-all text-primary hover:underline"
                    href={snowscanAddress(s.ownerAddress)!}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {s.ownerAddress}
                  </a>
                ) : (
                  "—"
                )}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-dashboard-muted">Approve tx</dt>
              <dd className="min-w-0 text-right">
                {snowscanTx(s.approveTxHash) ? (
                  <a
                    className="inline-flex items-center gap-1 break-all text-primary hover:underline"
                    href={snowscanTx(s.approveTxHash)!}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {s.approveTxHash!.slice(0, 10)}… <ExternalLink size={12} />
                  </a>
                ) : (
                  "—"
                )}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-dashboard-muted">requestDeposit tx</dt>
              <dd className="min-w-0 text-right">
                {snowscanTx(s.requestTxHash) ? (
                  <a
                    className="inline-flex items-center gap-1 break-all text-primary hover:underline"
                    href={snowscanTx(s.requestTxHash)!}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {s.requestTxHash!.slice(0, 10)}… <ExternalLink size={12} />
                  </a>
                ) : (
                  "—"
                )}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-dashboard-muted">Owned value</dt>
              <dd>{s.ownedValue}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-dashboard-muted">Shares</dt>
              <dd>{s.shares}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-dashboard-muted">Deposit</dt>
              <dd>{s.amount}</dd>
            </div>
          </dl>
          {s.serv && (
            <div className="mt-6 rounded-md bg-dashboard p-4 text-xs leading-5">
              <p className="font-semibold">SERV gate · {s.serv.source}</p>
              <p className="mt-2 text-dashboard-muted">{s.serv.reason || "Allowed"}</p>
            </div>
          )}
          {(status === "Pending" || status === "Claimable") && (
            <div className="mt-6 rounded-md bg-warning/10 p-4 text-xs leading-5 text-warning">
              Pending value is excluded from positions and yield until shares are proven on IXS.
            </div>
          )}
          {(refresh.error || claim.error) && (
            <p className="mt-3 text-xs text-danger">{errMessage(refresh.error || claim.error)}</p>
          )}
          {status === "Pending" && (
            <Button
              className="mt-5 w-full"
              disabled={refresh.isPending}
              onClick={() => refresh.mutate()}
            >
              {refresh.isPending ? "Checking IXS…" : "Refresh live status"}
            </Button>
          )}
          {status === "Claimable" && (
            <Button
              className="mt-5 w-full"
              disabled={claim.isPending}
              onClick={() => claim.mutate()}
            >
              {claim.isPending ? "Claiming…" : "Claim shares"}
            </Button>
          )}
        </Panel>
      </div>
    </>
  );
}

export function ActivityPage() {
  const q = useQuery({ queryKey: ["activity"], queryFn: () => listActivityFn() });
  return (
    <>
      <PageTitle eyebrow="Audit trail" title="Activity" />
      <Panel>
        {q.error && <p className="text-danger">{errMessage(q.error)}</p>}
        <div className="divide-y divide-dashboard-border">
          {q.data?.map((a) => (
            <div key={a.event + a.time} className="flex items-center gap-4 py-5">
              <span
                className={`size-2 rounded-full ${a.tone === "good" ? "bg-success" : a.tone === "bad" ? "bg-danger" : "bg-warning"}`}
              />
              <div className="flex-1">
                <p className="text-sm font-medium">{a.event}</p>
                <p className="mt-1 text-xs text-dashboard-muted">{a.detail}</p>
              </div>
              <time className="text-xs text-dashboard-muted">
                {new Date(a.time).toLocaleString()}
              </time>
            </div>
          ))}
          {q.data?.length === 0 && (
            <p className="py-6 text-sm text-dashboard-muted">No audit events yet.</p>
          )}
        </div>
      </Panel>
    </>
  );
}

export function WalletPage() {
  const q = useQuery({ queryKey: ["wallet"], queryFn: () => getWalletFn() });
  const avaxFunded = q.data && Number(q.data.usdc) >= 100 && Number(q.data.avax) > 0;
  const bnbFunded =
    q.data && Number(q.data.bnbUsdc ?? 0) >= 100 && Number(q.data.bnbNative ?? 0) > 0;
  return (
    <>
      <PageTitle eyebrow="AgentKit · Avalanche + BNB" title="Wallet" />
      {q.isLoading && <Panel>Loading AgentKit wallet…</Panel>}
      {q.error && <Panel className="text-danger">{errMessage(q.error)}</Panel>}
      {q.data && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Panel>
            <WalletCards size={24} className="text-primary" />
            <h2 className="mt-6 break-all text-lg font-semibold">{q.data.address}</h2>
            <p className="mt-1 text-sm text-dashboard-muted">
              Same EVM address on Avalanche C-Chain and BNB Chain
            </p>
            <div className="mt-3 flex flex-wrap gap-3 text-xs">
              <a
                className="inline-flex items-center gap-1 text-primary hover:underline"
                href={snowscanAddress(q.data.address)!}
                target="_blank"
                rel="noreferrer"
              >
                Snowscan <ExternalLink size={12} />
              </a>
              <a
                className="inline-flex items-center gap-1 text-primary hover:underline"
                href={`https://bscscan.com/address/${q.data.address}`}
                target="_blank"
                rel="noreferrer"
              >
                BscScan <ExternalLink size={12} />
              </a>
            </div>
            <div className="mt-7 grid grid-cols-2 gap-4">
              <div className="rounded-md bg-dashboard p-4">
                <p className="text-xs text-dashboard-muted">Avalanche USDC</p>
                <p className="mt-2 text-xl font-semibold">{q.data.usdc}</p>
                <p className="mt-1 text-xs text-dashboard-muted">{q.data.avax} AVAX</p>
              </div>
              <div className="rounded-md bg-dashboard p-4">
                <p className="text-xs text-dashboard-muted">BNB Chain USDC</p>
                <p className="mt-2 text-xl font-semibold">{q.data.bnbUsdc ?? "0"}</p>
                <p className="mt-1 text-xs text-dashboard-muted">{q.data.bnbNative ?? "0"} BNB</p>
              </div>
            </div>
            {!avaxFunded && (
              <p className="mt-5 text-xs leading-5 text-warning">
                Avalanche: fund ≥100 USDC + AVAX gas before Avalanche subscribe.
              </p>
            )}
            {!bnbFunded && (
              <p className="mt-2 text-xs leading-5 text-warning">
                BNB Chain: fund ≥100 USDC + BNB gas before BNB subscribe.
              </p>
            )}
          </Panel>
          <Panel>
            <h2 className="font-semibold">Networks</h2>
            <p className="mt-4 text-sm text-dashboard-muted">
              Live AgentKit signer. Balances are read from Avalanche and BSC RPC — never simulated.
            </p>
            <div className="mt-5 space-y-3 text-sm">
              <div className="rounded-md border border-dashboard-border p-4">
                Avalanche · chainId 43114
                <Check size={15} className="ml-2 inline text-success" />
              </div>
              <div className="rounded-md border border-dashboard-border p-4">
                BNB Chain · chainId 56
                <Check size={15} className="ml-2 inline text-success" />
              </div>
            </div>
          </Panel>
        </div>
      )}
    </>
  );
}


export function ScanPage() {
  const scan = useMutation({ mutationFn: () => scanVaultsFn({}) });
  const [simVault, setSimVault] = useState(PRIMARY_VAULT_ID);
  const [simAmt, setSimAmt] = useState("104");
  const simulate = useMutation({
    mutationFn: () =>
      simulateVaultDepositFn({ data: { vaultId: simVault, amountUsd: Number(simAmt) } }),
  });
  const preflight = useMutation({
    mutationFn: () =>
      preflightVaultFn({ data: { vaultId: simVault, amountUsd: Number(simAmt), live: true } }),
  });

  return (
    <>
      <PageTitle
        eyebrow="SERV · Guardrails"
        title="Scan vaults"
        action={
          <Button disabled={scan.isPending} onClick={() => scan.mutate()}>
            {scan.isPending ? "Scanning…" : "Run analysis"}
          </Button>
        }
      />
      <Panel className="mb-6">
        <p className="text-sm leading-7 text-dashboard-muted">
          Deterministic preflight on every live IXS vault (status, whitelist, NAV / deposit limit,
          MCP build, redeemable floor ≥$104, ≤25% TVL). SERV returns ALLOCATE / DEFER / REJECT with
          reasons. Evidence is published to{" "}
          <Link to="/evidence" className="text-primary underline">
            /evidence
          </Link>
          .
        </p>
      </Panel>
      {scan.error && <Panel className="mb-6 text-danger">{errMessage(scan.error)}</Panel>}
      {scan.data && (
        <div className="mb-8 space-y-5">
          <Panel>
            <p className="text-xs font-semibold uppercase text-dashboard-muted">
              Source · {scan.data.source}
            </p>
            <p className="mt-3 text-sm leading-7">{scan.data.memo}</p>
            <p className="mt-2 text-xs text-dashboard-muted">
              Wallet {scan.data.wallet} · {new Date(scan.data.checkedAt).toLocaleString()}
            </p>
          </Panel>
          <div className="grid gap-5 lg:grid-cols-2">
            {scan.data.verdicts.map((v) => (
              <Panel key={v.vaultId}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase text-primary">{v.network}</p>
                    <h2 className="mt-2 text-lg font-semibold">{v.name}</h2>
                  </div>
                  <span
                    className={`text-xs font-bold ${
                      v.verdict === "ALLOCATE"
                        ? "text-success"
                        : v.verdict === "DEFER"
                          ? "text-warning"
                          : "text-danger"
                    }`}
                  >
                    {v.verdict}
                  </span>
                </div>
                <p className="mt-4 text-sm leading-6 text-dashboard-muted">{v.reason}</p>
                {v.amountUsd != null && (
                  <p className="mt-3 text-sm font-semibold">{v.amountUsd} USDC suggested</p>
                )}
                <details className="mt-4">
                  <summary className="cursor-pointer text-xs text-dashboard-muted">
                    Preflight checks ({v.preflight.checks.length}) · block{" "}
                    {v.preflight.blockNumber ?? "?"}
                  </summary>
                  <ul className="mt-3 space-y-2 text-xs leading-5 text-dashboard-muted">
                    {v.preflight.checks.map((c) => (
                      <li key={c.key}>
                        <span className={c.ok ? "text-success" : "text-danger"}>
                          {c.ok ? "✓" : "✗"}
                        </span>{" "}
                        <strong>{c.label}</strong> — {c.value}. {c.detail}
                      </li>
                    ))}
                  </ul>
                </details>
                {v.verdict === "ALLOCATE" && (
                  <ButtonLink
                    to="/dashboard/vaults/$vaultId"
                    params={{ vaultId: v.vaultId }}
                    className="mt-5"
                  >
                    Subscribe <ArrowRight size={15} />
                  </ButtonLink>
                )}
              </Panel>
            ))}
          </div>
        </div>
      )}
      <Panel>
        <h2 className="font-semibold">Simulate deposit (eth_call · no broadcast)</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <label className="text-xs text-dashboard-muted">
            Vault
            <select
              value={simVault}
              onChange={(e) => setSimVault(e.target.value)}
              className="mt-2 h-10 w-full rounded-md border border-dashboard-border bg-dashboard px-3 text-dashboard-foreground"
            >
              <option value={PRIMARY_VAULT_ID}>Avalanche primary</option>
              <option value={BNB_VAULT_ID}>BNB companion</option>
            </select>
          </label>
          <label className="text-xs text-dashboard-muted">
            Amount USDC
            <input
              value={simAmt}
              onChange={(e) => setSimAmt(e.target.value)}
              className="mt-2 h-10 w-full rounded-md border border-dashboard-border bg-dashboard px-3 text-dashboard-foreground"
            />
          </label>
          <div className="flex items-end gap-2">
            <Button
              variant="secondary"
              disabled={preflight.isPending}
              onClick={() => preflight.mutate()}
            >
              Preflight
            </Button>
            <Button disabled={simulate.isPending} onClick={() => simulate.mutate()}>
              eth_call
            </Button>
          </div>
        </div>
        {preflight.data && (
          <pre className="mt-4 max-h-48 overflow-auto rounded-md bg-dashboard p-3 text-[11px]">
            {JSON.stringify(
              {
                verdict: preflight.data.verdict,
                tvlCapUsd: preflight.data.tvlCapUsd,
                depositLimitUsd: preflight.data.depositLimitUsd,
                navAgeHours: preflight.data.navAgeHours,
                blockNumber: preflight.data.blockNumber,
              },
              null,
              2,
            )}
          </pre>
        )}
        {simulate.data && (
          <pre className="mt-4 max-h-48 overflow-auto rounded-md bg-dashboard p-3 text-[11px]">
            {JSON.stringify(simulate.data, null, 2)}
          </pre>
        )}
        {(simulate.error || preflight.error) && (
          <p className="mt-3 text-xs text-danger">
            {errMessage(simulate.error || preflight.error)}
          </p>
        )}
      </Panel>
    </>
  );
}

export function SettingsPage() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["settings"], queryFn: () => getSettingsFn() });
  const integ = useQuery({ queryKey: ["integrations"], queryFn: () => getIntegrationsFn() });
  const [orgName, setOrgName] = useState("");
  const [notifications, setNotifications] = useState(true);
  const [openserv, setOpenserv] = useState("");
  const [agentrouter, setAgentrouter] = useState("");
  const [agentPk, setAgentPk] = useState("");
  const [platformFallback, setPlatformFallback] = useState(true);
  useEffect(() => {
    if (q.data) {
      setOrgName(q.data.orgName);
      setNotifications(q.data.notificationsEnabled);
    }
  }, [q.data]);
  useEffect(() => {
    if (integ.data) setPlatformFallback(integ.data.usePlatformFallback);
  }, [integ.data]);
  const save = useMutation({
    mutationFn: () => updateSettingsFn({ data: { orgName, notificationsEnabled: notifications } }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["settings"] }),
  });
  const saveInteg = useMutation({
    mutationFn: () =>
      saveIntegrationsFn({
        data: {
          openservApiKey: openserv || null,
          agentrouterApiKey: agentrouter || null,
          agentPrivateKey: agentPk || null,
          usePlatformFallback: platformFallback,
        },
      }),
    onSuccess: () => {
      setOpenserv("");
      setAgentrouter("");
      setAgentPk("");
      void qc.invalidateQueries({ queryKey: ["integrations"] });
      void qc.invalidateQueries({ queryKey: ["wallet"] });
      void qc.invalidateQueries({ queryKey: ["overview"] });
    },
  });
  const rotate = useMutation({
    mutationFn: () => rotateAgentWalletFn(),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["integrations"] });
      void qc.invalidateQueries({ queryKey: ["wallet"] });
    },
  });
  return (
    <>
      <PageTitle eyebrow="Workspace" title="Settings" />
      {q.error && <Panel className="mb-4 text-danger">{errMessage(q.error)}</Panel>}
      <div className="space-y-6">
        <Panel>
          <h2 className="font-semibold">Treasury profile</h2>
          <p className="mt-1 text-xs text-dashboard-muted">
            {q.data?.email ? `Signed in as ${q.data.displayName} · ${q.data.email}` : "Session"}
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="text-xs text-dashboard-muted">
              Workspace
              <input
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                className="mt-2 h-10 w-full rounded-md border border-dashboard-border bg-dashboard px-3 text-dashboard-foreground"
              />
            </label>
            <label className="text-xs text-dashboard-muted">
              Reporting currency
              <input
                disabled
                value={q.data?.reportingCurrency ?? "USD"}
                className="mt-2 h-10 w-full rounded-md border border-dashboard-border bg-dashboard px-3 text-dashboard-foreground"
              />
            </label>
          </div>
          <Button className="mt-5" disabled={save.isPending} onClick={() => save.mutate()}>
            Save changes
          </Button>
        </Panel>

        <Panel>
          <h2 className="font-semibold">Integrations — bring your own keys</h2>
          <p className="mt-2 text-xs leading-5 text-dashboard-muted">
            Each org gets its own AgentKit EVM signer for Avalanche + BNB (encrypted at rest). Connect your own
            SERV / AgentRouter keys for mandate reasoning, or keep platform fallback for judges.
            Secrets never leave the server or appear in the client bundle.
          </p>
          {integ.error && <p className="mt-3 text-xs text-danger">{errMessage(integ.error)}</p>}
          {integ.data && (
            <div className="mt-5 space-y-4 text-sm">
              <div className="rounded-md bg-dashboard p-4">
                <p className="text-xs text-dashboard-muted">Your AgentKit address (Avalanche)</p>
                <p className="mt-2 break-all font-mono text-xs">{integ.data.agentWalletAddress}</p>
                <a
                  className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  href={`https://snowscan.xyz/address/${integ.data.agentWalletAddress}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Snowscan <ExternalLink size={12} />
                </a>
                {integ.data.balances && (
                  <p className="mt-3 text-xs text-dashboard-muted">
                    Live · {integ.data.balances.usdc} USDC · {integ.data.balances.avax} AVAX · signer
                    source {integ.data.sources.agent}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap gap-2 text-[11px] text-dashboard-muted">
                <span>SERV: {integ.data.sources.openserv}</span>
                <span>·</span>
                <span>AgentRouter: {integ.data.sources.agentrouter}</span>
                <span>·</span>
                <span>{integ.data.hasOpenserv ? `stored ${integ.data.openservMasked}` : "no BYO SERV"}</span>
              </div>
              <label className="block text-xs text-dashboard-muted">
                OpenServ SERV API key
                <input
                  type="password"
                  value={openserv}
                  placeholder="serv_… (leave blank to keep)"
                  onChange={(e) => setOpenserv(e.target.value)}
                  className="mt-2 h-10 w-full rounded-md border border-dashboard-border bg-dashboard px-3 text-dashboard-foreground"
                />
              </label>
              <label className="block text-xs text-dashboard-muted">
                AgentRouter API key
                <input
                  type="password"
                  value={agentrouter}
                  placeholder="sk-… (leave blank to keep)"
                  onChange={(e) => setAgentrouter(e.target.value)}
                  className="mt-2 h-10 w-full rounded-md border border-dashboard-border bg-dashboard px-3 text-dashboard-foreground"
                />
              </label>
              <label className="block text-xs text-dashboard-muted">
                Import AgentKit private key (optional)
                <input
                  type="password"
                  value={agentPk}
                  placeholder="0x… replaces generated signer"
                  onChange={(e) => setAgentPk(e.target.value)}
                  className="mt-2 h-10 w-full rounded-md border border-dashboard-border bg-dashboard px-3 text-dashboard-foreground"
                />
              </label>
              <label className="flex items-center gap-3 text-xs text-dashboard-muted">
                <input
                  type="checkbox"
                  checked={platformFallback}
                  onChange={(e) => setPlatformFallback(e.target.checked)}
                />
                Allow platform fallback keys when BYO not set (demo / judges)
              </label>
              {saveInteg.error && (
                <p className="text-xs text-danger">{errMessage(saveInteg.error)}</p>
              )}
              <div className="flex flex-wrap gap-2">
                <Button disabled={saveInteg.isPending} onClick={() => saveInteg.mutate()}>
                  {saveInteg.isPending ? "Saving…" : "Save integrations"}
                </Button>
                <Button
                  variant="ghost"
                  disabled={rotate.isPending}
                  onClick={() => {
                    if (
                      typeof window !== "undefined" &&
                      window.confirm(
                        "Rotate AgentKit wallet? The old address keeps any funds — back up first.",
                      )
                    ) {
                      rotate.mutate();
                    }
                  }}
                >
                  Rotate agent wallet
                </Button>
              </div>
            </div>
          )}
        </Panel>

        <Panel>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-semibold">Settlement notifications</h2>
              <p className="mt-1 text-xs text-dashboard-muted">
                Notify the workspace when pending shares finalize.
              </p>
            </div>
            <button
              aria-label="Toggle settlement notifications"
              aria-pressed={notifications}
              onClick={() => setNotifications(!notifications)}
              className={`relative h-7 w-12 rounded-full transition-colors ${notifications ? "bg-success" : "bg-dashboard-accent"}`}
            >
              <span
                className={`absolute top-1 size-5 rounded-full bg-dashboard-foreground transition-transform ${notifications ? "left-6" : "left-1"}`}
              />
            </button>
          </div>
        </Panel>
      </div>
    </>
  );
}
