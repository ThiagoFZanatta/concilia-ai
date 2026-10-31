import { createFileRoute } from "@tanstack/react-router";
import { ResetPassword } from "@/features/concilia/app";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Concilia AI | Definir nova senha" },
      {
        name: "description",
        content: "Defina uma nova senha de acesso ao Concilia AI.",
      },
    ],
  }),
  component: () => <ResetPassword />,
});
