import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { getPublicEvidenceFn } from "@/backend/fns/allocate";
import { PublicPage, Section } from "./PublicPage";
import { ButtonLink } from "./Button";

export function EvidencePage() {
  const q = useQuery({
    queryKey: ["public-evidence"],
    queryFn: () => getPublicEvidenceFn(),
    refetchInterval: 30_000,
  });

  return (
    <PublicPage
      eyebrow="Evidence"
      title="Every fact behind a BOND decision."
      intro="SERV inputs and outputs, IXS MCP probes, and on-chain reads with block numbers. Public, redacted, and ephemeral per server instance — no invented greens."
    >
      <Section>
        <div className="mb-8 flex flex-wrap items-center gap-3">
          <ButtonLink to="/dashboard/scan">Run a live vault scan</ButtonLink>
          <Link to="/vaults" className="text-sm text-primary underline">
            Browse vaults
          </Link>
          <p className="text-xs text-muted-foreground">
            Generated {q.data?.generatedAt ? new Date(q.data.generatedAt).toLocaleString() : "…"}
          </p>
        </div>
        <p className="mb-10 max-w-3xl text-sm leading-7 text-muted-foreground">
          {q.data?.doctrine}
        </p>

        {q.data?.lastScan != null && (
          <article className="mb-12 rounded-md border border-border p-6">
            <h2 className="text-lg font-semibold">Last allocation scan</h2>
            <pre className="mt-4 max-h-96 overflow-auto rounded-md bg-muted p-4 text-xs leading-5">
              {JSON.stringify(q.data.lastScan, null, 2)}
            </pre>
          </article>
        )}

        <h2 className="text-lg font-semibold">Call log</h2>
        {q.isLoading && <p className="mt-4 text-sm text-muted-foreground">Loading evidence…</p>}
        <div className="mt-4 space-y-4">
          {(q.data?.entries ?? []).map((e) => (
            <article key={e.id} className="rounded-md border border-border p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-bold uppercase text-primary">{e.kind}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(e.at).toLocaleString()}
                  {e.blockNumber != null ? ` · block ${e.blockNumber}` : ""}
                  {e.chainId != null ? ` · chain ${e.chainId}` : ""}
                </p>
              </div>
              <h3 className="mt-2 font-semibold">{e.label}</h3>
              <p className={`mt-1 text-xs font-semibold ${e.ok ? "text-success" : "text-danger"}`}>
                {e.ok ? "ok" : "failed"}
              </p>
              <details className="mt-3">
                <summary className="cursor-pointer text-xs text-muted-foreground">
                  Request / response
                </summary>
                <pre className="mt-2 max-h-64 overflow-auto rounded-md bg-muted p-3 text-[11px] leading-4">
                  {JSON.stringify({ request: e.request, response: e.response }, null, 2)}
                </pre>
              </details>
            </article>
          ))}
          {q.data && q.data.entries.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No scans yet. Open the dashboard → Scan vaults to publish the first evidence bundle.
            </p>
          )}
        </div>
      </Section>
    </PublicPage>
  );
}
