import { createFileRoute } from "@tanstack/react-router";
import { App } from "@/features/concilia/app";
export const Route = createFileRoute("/app/$page")({ component: Page });
function Page() {
  const { page } = Route.useParams();
  return <App page={page} />;
}
