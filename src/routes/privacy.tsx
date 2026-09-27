import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/PublicContent";
export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy — BOND" },
      { name: "description", content: "Privacy information for the BOND demonstration." },
      { property: "og:title", content: "BOND Privacy" },
      { property: "og:description", content: "Privacy information for the BOND demonstration." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <LegalPage type="privacy" />,
});
