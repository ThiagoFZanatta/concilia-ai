import { createFileRoute } from "@tanstack/react-router";
import { App } from "@/features/concilia/app";
export const Route = createFileRoute("/admin/$page")({ component: Page });
function Page() {
  const { page } = Route.useParams();
  return <App page={page} admin />;
}
