import { createFileRoute } from "@tanstack/react-router";
import { VaultDetailPage } from "@/components/DashboardPages";

export const Route = createFileRoute("/dashboard/vaults/$vaultId")({
  head: () => ({
    meta: [
      { title: "Vault detail — BOND" },
      {
        name: "description",
        content: "Inspect a mandate-controlled live vault subscription.",
      },
      { property: "og:title", content: "BOND Vault Detail" },
      {
        property: "og:description",
        content: "Inspect a mandate-controlled live vault subscription.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: VaultDetailRoute,
});

function VaultDetailRoute() {
  const { vaultId } = Route.useParams();
  return <VaultDetailPage vaultId={vaultId} />;
}
