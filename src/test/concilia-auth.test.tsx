import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router";
import { App, ResetPassword } from "@/features/concilia/app";
import { ConciliaProvider } from "@/features/concilia/data";

const cloudMock = vi.hoisted(() => ({
  getUser: vi.fn(),
  onAuthStateChange: vi.fn(),
  signUp: vi.fn(),
  signInWithPassword: vi.fn(),
  resetPasswordForEmail: vi.fn(),
  updateUser: vi.fn(),
  signOut: vi.fn(),
}));
const lovableMock = vi.hoisted(() => ({ signInWithOAuth: vi.fn() }));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getUser: cloudMock.getUser,
      onAuthStateChange: cloudMock.onAuthStateChange,
      signUp: cloudMock.signUp,
      signInWithPassword: cloudMock.signInWithPassword,
      resetPasswordForEmail: cloudMock.resetPasswordForEmail,
      updateUser: cloudMock.updateUser,
      signOut: cloudMock.signOut,
    },
  },
}));
vi.mock("@/integrations/lovable/index", () => ({
  lovable: { auth: { signInWithOAuth: lovableMock.signInWithOAuth } },
}));

function mount(path = "/") {
  const root = createRootRoute({
    component: () => (
      <ConciliaProvider>
        <Outlet />
      </ConciliaProvider>
    ),
  });
  const index = createRoute({ getParentRoute: () => root, path: "/", component: () => <App /> });
  const reset = createRoute({
    getParentRoute: () => root,
    path: "/reset-password",
    component: () => <ResetPassword />,
  });
  const router = createRouter({
    routeTree: root.addChildren([index, reset]),
    history: createMemoryHistory({ initialEntries: [path] }),
  });
  render(<RouterProvider router={router} />);
  return router;
}

beforeEach(() => {
  vi.clearAllMocks();
  cloudMock.getUser.mockResolvedValue({ data: { user: null }, error: null });
  cloudMock.onAuthStateChange.mockReturnValue({
    data: { subscription: { unsubscribe: vi.fn() } },
  });
  cloudMock.signUp.mockResolvedValue({ data: { session: null, user: null }, error: null });
  cloudMock.resetPasswordForEmail.mockResolvedValue({ error: null });
  cloudMock.updateUser.mockResolvedValue({ error: null });
  lovableMock.signInWithOAuth.mockResolvedValue({ redirected: false, error: null });
});
afterEach(cleanup);

describe("Sign-up and password recovery", () => {
  it("creates an account and asks for e-mail confirmation without signing in", async () => {
    mount();
    fireEvent.click(await screen.findByRole("button", { name: "Criar conta do escritório" }));
    fireEvent.change(screen.getByLabelText("E-mail"), {
      target: { value: "novo@escritorio.com.br" },
    });
    fireEvent.change(screen.getByLabelText("Senha"), { target: { value: "senha-segura-1" } });
    fireEvent.click(screen.getByRole("button", { name: /Criar conta e confirmar e-mail/ }));
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Abra sua caixa de entrada e confirme o e-mail",
    );
    expect(cloudMock.signUp).toHaveBeenCalledWith({
      email: "novo@escritorio.com.br",
      password: "senha-segura-1",
      options: { emailRedirectTo: "http://localhost:3000" },
    });
    expect(cloudMock.signInWithPassword).not.toHaveBeenCalled();
  });
  it("sends a recovery link that returns to the new-password page", async () => {
    mount();
    fireEvent.click(await screen.findByRole("button", { name: "Esqueci minha senha" }));
    fireEvent.change(screen.getByLabelText("E-mail"), {
      target: { value: "voce@escritorio.com.br" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Enviar link de recuperação" }));
    await waitFor(() =>
      expect(cloudMock.resetPasswordForEmail).toHaveBeenCalledWith("voce@escritorio.com.br", {
        redirectTo: "http://localhost:3000/reset-password",
      }),
    );
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Se o e-mail existir na base, enviaremos um link",
    );
  });
  it("uses the managed Google broker from the sign-in screen", async () => {
    mount();
    fireEvent.click(await screen.findByRole("button", { name: "Entrar com Google" }));
    await waitFor(() =>
      expect(lovableMock.signInWithOAuth).toHaveBeenCalledWith("google", {
        redirect_uri: "http://localhost:3000",
      }),
    );
  });
  it("shows the password form only when the recovery link is present", async () => {
    window.location.hash = "#access_token=abc&type=recovery";
    mount("/reset-password");
    expect(await screen.findByLabelText("Confirmar nova senha")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Nova senha"), { target: { value: "nova-senha-1" } });
    fireEvent.change(screen.getByLabelText("Confirmar nova senha"), {
      target: { value: "nova-senha-1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Salvar nova senha" }));
    await waitFor(() => expect(cloudMock.updateUser).toHaveBeenCalledWith({ password: "nova-senha-1" }));
    await waitFor(() =>
      expect(document.body.textContent).toContain("Senha atualizada. Você já pode acessar a plataforma."),
    );
    await waitFor(() => expect(window.location.pathname).toBe("/"));
    window.location.hash = "";
  });
  it("refuses a recovery page opened without a link", async () => {
    window.location.hash = "";
    mount("/reset-password");
    expect(await screen.findByText(/Abra o link enviado ao seu e-mail/)).toBeInTheDocument();
    expect(cloudMock.updateUser).not.toHaveBeenCalled();
  });
});
