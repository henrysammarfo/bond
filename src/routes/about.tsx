import { createFileRoute } from "@tanstack/react-router";
import { AboutPage } from "@/components/PublicContent";
export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — BOND" },
      { name: "description", content: "Why BOND keeps treasury settlement states honest." },
      { property: "og:title", content: "About BOND" },
      { property: "og:description", content: "Why BOND keeps treasury settlement states honest." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AboutPage,
});
