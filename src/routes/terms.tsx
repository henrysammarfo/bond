import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/PublicContent";
export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms — BOND" },
      { name: "description", content: "Terms for the BOND interactive demonstration." },
      { property: "og:title", content: "BOND Terms" },
      { property: "og:description", content: "Terms for the BOND interactive demonstration." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <LegalPage type="terms" />,
});
