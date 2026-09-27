import { createFileRoute } from "@tanstack/react-router";
import { DashboardOverview } from "@/components/DashboardPages";
export const Route = createFileRoute("/dashboard/")({
  head: () => ({
    meta: [
      { title: "Overview — BOND Demo" },
      {
        name: "description",
        content: "Treasury positions, pending deposits, and mandate overview.",
      },
      { property: "og:title", content: "BOND Dashboard" },
      {
        property: "og:description",
        content: "Treasury positions, pending deposits, and mandate overview.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DashboardOverview,
});
