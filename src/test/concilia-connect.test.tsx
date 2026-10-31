import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Connect } from "@/features/concilia/connect";
const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { functions: { invoke } } }));
afterEach(() => { cleanup(); vi.resetAllMocks(); delete window.PluggyConnect; });
const identity = { organizationName: "Escritório Contábil", clientName: "Empresa Exemplo", clientDocument: "12345678000190" };
describe("Public bank invitation", () => {
  it("loads company identity before issuing a token and requires explicit consent", async () => {
    invoke.mockResolvedValueOnce({ data: identity, error: null })
      .mockResolvedValueOnce({ data: { connectToken: "temporary-token" }, error: null });
    const init = vi.fn();
    window.PluggyConnect = vi.fn(function () { return { init }; });
    render(<Connect token="11111111-1111-4111-8111-111111111111" />);
    const button = screen.getByRole("button", { name: "Autorizar conexão bancária" });
    expect(button).toBeDisabled();
    expect(await screen.findByText("Empresa Exemplo")).toBeInTheDocument();
    expect(screen.getByText(/12.345.678\/0001-90/)).toBeInTheDocument();
    expect(invoke).toHaveBeenCalledTimes(1);
    expect(invoke.mock.calls[0]?.[1].body.action).toBe("info");
    expect(button).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox"));
    expect(button).toBeEnabled();
    fireEvent.click(button);
    await waitFor(() => expect(init).toHaveBeenCalledOnce());
    expect(invoke.mock.calls[1]?.[1].body.action).toBe("connect");
  });
  it("keeps expired invitations blocked without opening the widget", async () => {
    invoke.mockResolvedValue({ data: null, error: new Error("expired") });
    render(<Connect token="expired" />);
    expect(await screen.findByRole("alert")).toHaveTextContent(/Convite indisponível/);
    expect(screen.getByRole("checkbox")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Autorizar conexão bancária" })).toBeDisabled();
    expect(invoke).toHaveBeenCalledTimes(1);
  });
  it("never requests a real connection for a demo invitation", async () => {
    render(<Connect token="demo-company" />);
    expect(await screen.findByRole("alert")).toHaveTextContent(/demonstração/);
    expect(invoke).not.toHaveBeenCalled();
  });
});
