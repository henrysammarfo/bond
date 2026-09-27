import { createFileRoute } from "@tanstack/react-router";
import { SubscriptionsPage } from "@/components/DashboardPages";
export const Route = createFileRoute("/dashboard/subscriptions")({
  head: () => ({
    meta: [
      { title: "Subscriptions — BOND Demo" },
      {
        name: "description",
        content: "Review pending, finalized, and rejected vault subscriptions.",
      },
      { property: "og:title", content: "BOND Subscriptions" },
      {
        property: "og:description",
        content: "Review pending, finalized, and rejected vault subscriptions.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SubscriptionsPage,
});
