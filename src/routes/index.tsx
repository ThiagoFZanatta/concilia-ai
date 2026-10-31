import { createFileRoute } from "@tanstack/react-router";
import { App } from "@/features/concilia/app";
export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Concilia AI | Inteligência financeira para contadores" }] }),
  component: () => <App />,
});
