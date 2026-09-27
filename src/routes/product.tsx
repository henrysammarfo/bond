import { createFileRoute } from "@tanstack/react-router";
import { ProductPage } from "@/components/PublicContent";
export const Route = createFileRoute("/product")({
  head: () => ({
    meta: [
      { title: "Product — BOND" },
      {
        name: "description",
        content: "Mandate-controlled RWA subscriptions with verifiable settlement.",
      },
      { property: "og:title", content: "BOND Product" },
      {
        property: "og:description",
        content: "Mandate-controlled RWA subscriptions with verifiable settlement.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProductPage,
});
