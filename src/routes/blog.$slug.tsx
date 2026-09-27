import { createFileRoute } from "@tanstack/react-router";
import { ArticlePage } from "@/components/PublicContent";

export const Route = createFileRoute("/blog/$slug")({
  head: () => ({
    meta: [
      { title: "Journal note — BOND" },
      { name: "description", content: "A BOND note on treasury control and settlement." },
      { property: "og:title", content: "BOND Journal note" },
      { property: "og:description", content: "A BOND note on treasury control and settlement." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BlogArticleRoute,
});

function BlogArticleRoute() {
  const { slug } = Route.useParams();
  return <ArticlePage slug={slug} />;
}
