import { createFileRoute } from "@tanstack/react-router";
import { DocsPage } from "@/components/PublicContent";
export const Route = createFileRoute("/docs")({
  head: () => ({
    meta: [
      { title: "Documentation — BOND" },
      { name: "description", content: "Guide to BOND's demo, state model, and vault references." },
      { property: "og:title", content: "BOND Documentation" },
      {
        property: "og:description",
        content: "Guide to BOND's demo, state model, and vault references.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DocsPage,
});
