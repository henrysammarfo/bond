import { createFileRoute } from "@tanstack/react-router";
import { WalletPage } from "@/components/DashboardPages";
export const Route = createFileRoute("/dashboard/wallet")({
  head: () => ({
    meta: [
      { title: "Wallet — BOND" },
      {
        name: "description",
        content: "Live AgentKit Avalanche wallet balances — USDC and AVAX for IXS deposits.",
      },
      { property: "og:title", content: "BOND Wallet" },
      {
        property: "og:description",
        content: "Live AgentKit Avalanche wallet balances — USDC and AVAX for IXS deposits.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: WalletPage,
});
