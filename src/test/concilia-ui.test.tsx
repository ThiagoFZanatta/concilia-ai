import { demoData } from "@/features/concilia/demo";
import { statementTotals, money } from "@/features/concilia/domain";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router";
import { App } from "@/features/concilia/app";
import { ConciliaProvider } from "@/features/concilia/data";
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getUser: vi.fn(async () => ({ data: { user: null }, error: null })),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
  },
}));
afterEach(cleanup);
function mount() {
  const root = createRootRoute({
    component: () => (
      <ConciliaProvider>
        <Outlet />
      </ConciliaProvider>
    ),
  });
  const index = createRoute({ getParentRoute: () => root, path: "/", component: () => <App /> });
  const office = createRoute({
    getParentRoute: () => root,
    path: "/app/$page",
    component: () => <App page={office.useParams().page} />,
  });
  const admin = createRoute({
    getParentRoute: () => root,
    path: "/admin/$page",
    component: () => <App page={admin.useParams().page} admin />,
  });
  const router = createRouter({
    routeTree: root.addChildren([index, office, admin]),
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });
  render(<RouterProvider router={router} />);
  return router;
}
describe("Office workflows", () => {
  it("opens an explicit demo, preserves its session across routes and registers a client", async () => {
    mount();
    fireEvent.click(await screen.findByRole("button", { name: "Explorar demonstração" }));
    expect(await screen.findByText(/Todos os dados são fictícios/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("link", { name: "Clientes" }));
    fireEvent.click(await screen.findByRole("button", { name: "Novo cliente" }));
    fireEvent.change(screen.getByLabelText("Razão social / nome"), {
      target: { value: "Empresa de teste" },
    });
    fireEvent.change(screen.getByLabelText("CNPJ / CPF"), {
      target: { value: "00.000.000/0001-01" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Salvar cliente" }));
    await waitFor(() => expect(screen.getByText("Empresa de teste")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("link", { name: "Extratos bancários" }));
    expect(await screen.findByText("Extrato de movimentações")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Filtrar cliente"), { target: { value: "client0" } });
    expect(screen.getByText(/16 transações/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("link", { name: "Administração" }));
    expect(await screen.findByText("Faturamento projetado")).toBeInTheDocument();
  });
});

describe("Statement print report", () => {
  it("prints the entire filtered result, company identity and exact emission time", async () => {
    const print = vi.spyOn(window, "print").mockImplementation(() => {});
    try {
      mount();
      fireEvent.click(await screen.findByRole("button", { name: "Explorar demonstração" }));
      fireEvent.click(await screen.findByRole("link", { name: "Extratos bancários" }));
      await screen.findByText("Extrato de movimentações");
      const table = screen.getByRole("table");
      expect(table.querySelectorAll("tbody tr")).toHaveLength(96);
      expect(table.querySelectorAll("tbody tr.ca-print-row")).toHaveLength(76);
      const report = document.querySelector(".ca-report-header")!;
      const totals = statementTotals(demoData().transactions);
      expect(within(report as HTMLElement).getByText(money(totals.net))).toBeInTheDocument();
      fireEvent.change(screen.getByLabelText("Filtrar cliente"), { target: { value: "client0" } });
      expect(table.querySelectorAll("tbody tr")).toHaveLength(16);
      expect(report).toHaveTextContent("Aurora Clínica Integrada");
      expect(report).toHaveTextContent("00.000.000/0001-00");
      fireEvent.change(screen.getByLabelText("Filtrar conta"), { target: { value: "account0" } });
      expect(report).toHaveTextContent("Agência: 0001 · Conta: 10000-0");
      fireEvent.click(screen.getByRole("button", { name: "PDF" }));
      await waitFor(() => expect(print).toHaveBeenCalledOnce());
      expect(report).toHaveTextContent(/Emissão:.*horário de Brasília/);
      expect(report).toHaveTextContent(/Período: 01\//);
    } finally { print.mockRestore(); }
  });
});
