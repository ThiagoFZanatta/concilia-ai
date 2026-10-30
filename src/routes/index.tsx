import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Novo Projeto" },
      { name: "description", content: "Projeto em branco pronto para começar." },
      { property: "og:title", content: "Novo Projeto" },
      { property: "og:description", content: "Projeto em branco pronto para começar." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

function Index() {
  return <main className="min-h-screen bg-background" />;
}
