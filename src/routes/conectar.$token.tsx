import { createFileRoute } from "@tanstack/react-router";
import { Connect } from "@/features/concilia/connect";
export const Route = createFileRoute("/conectar/$token")({
  head: () => ({
    meta: [
      { title: "Conexão segura | Concilia AI" },
      { name: "referrer", content: "no-referrer" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: Page,
});
function Page() {
  const { token } = Route.useParams();
  return <Connect token={token} />;
}
