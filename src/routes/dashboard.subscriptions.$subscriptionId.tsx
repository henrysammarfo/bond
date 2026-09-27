import { createFileRoute } from "@tanstack/react-router";
import { SubscriptionDetailPage } from "@/components/DashboardPages";

export const Route = createFileRoute("/dashboard/subscriptions/$subscriptionId")({
  head: () => ({
    meta: [
      { title: "Subscription detail — BOND" },
      {
        name: "description",
        content: "Inspect a subscription's mandate, deposit, pending, and share states.",
      },
      { property: "og:title", content: "BOND Subscription Detail" },
      {
        property: "og:description",
        content: "Inspect a subscription's mandate, deposit, pending, and share states.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SubscriptionDetailRoute,
});

function SubscriptionDetailRoute() {
  const { subscriptionId } = Route.useParams();
  return <SubscriptionDetailPage id={subscriptionId} />;
}
