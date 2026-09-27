import { createFileRoute } from "@tanstack/react-router";
import { MandatesPage } from "@/components/DashboardPages";
export const Route = createFileRoute("/dashboard/mandates")({
  head: () => ({
    meta: [
      { title: "Mandates — BOND Demo" },
      { name: "description", content: "Create and review treasury subscription mandates." },
      { property: "og:title", content: "BOND Mandates" },
      { property: "og:description", content: "Create and review treasury subscription mandates." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MandatesPage,
});
