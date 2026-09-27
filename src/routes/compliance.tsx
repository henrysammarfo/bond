import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/PublicContent";
export const Route = createFileRoute("/compliance")({
  head: () => ({
    meta: [
      { title: "Compliance — BOND" },
      { name: "description", content: "The production compliance boundary for BOND." },
      { property: "og:title", content: "BOND Compliance" },
      { property: "og:description", content: "The production compliance boundary for BOND." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <LegalPage type="compliance" />,
});
