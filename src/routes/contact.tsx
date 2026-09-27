import { createFileRoute } from "@tanstack/react-router";
import { ContactPage } from "@/components/PublicContent";
export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — BOND" },
      { name: "description", content: "Request a walkthrough of the BOND product concept." },
      { property: "og:title", content: "Contact BOND" },
      { property: "og:description", content: "Request a walkthrough of the BOND product concept." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ContactPage,
});
