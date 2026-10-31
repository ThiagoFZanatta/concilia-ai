import { act, cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ConciliaProvider, useConcilia } from "@/features/concilia/data";
const cloudMock = vi.hoisted(() => ({
  getUser: vi.fn(), from: vi.fn(), rpc: vi.fn(), invoke: vi.fn(), signOut: vi.fn(),
  emit: (_event: string) => {},
}));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {
  from: cloudMock.from, rpc: cloudMock.rpc, functions: { invoke: cloudMock.invoke },
  auth: {
    getUser: cloudMock.getUser, signOut: cloudMock.signOut,
    onAuthStateChange: (callback: (event: string) => void) => {
      cloudMock.emit = callback;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    },
  },
} }));
let store: ReturnType<typeof useConcilia>;
function Probe() { store = useConcilia(); return null; }
function mount() { render(<ConciliaProvider><Probe /></ConciliaProvider>); }
beforeEach(() => {
  vi.clearAllMocks();
  cloudMock.getUser.mockResolvedValue({ data: { user: null }, error: null });
  for (const mock of [cloudMock.from, cloudMock.rpc, cloudMock.invoke, cloudMock.signOut])
    mock.mockImplementation(() => { throw new Error("Unexpected Cloud operation in demo"); });
});
afterEach(cleanup);
describe("Demo never writes to the real backend", () => {
  it("keeps all mutations, reviews, suggestions and invitation generation in memory", async () => {
    mount();
    await waitFor(() => expect(store.loading).toBe(false));
    act(() => store.enterDemo());
    const client = store.data.clients[0]!;
    const organization = store.data.organizations[0]!;
    const plan = store.data.plans[0]!;
    await act(async () => {
      await store.saveClient({ name: "Simulado", cnpj_cpf: "000", contact_name: "Ana", contact_email: "", contact_whatsapp: "" });
      await store.saveClient({ ...client, name: "Editado" }, client.id);
      await store.saveOrganization(organization.id, { name: "Escritório simulado" });
      await store.createOrganization({ ...organization, name: "Novo escritório simulado" });
      await store.savePlan({ ...plan, monthly_price: 999 });
      await store.review([store.data.transactions[0]!.id], "Outros");
      await store.suggest();
      await store.refresh();
    });
    expect(store.data.clients.some((c) => c.name === "Simulado")).toBe(true);
    expect(store.data.clients[0]!.name).toBe("Editado");
    expect(store.data.organizations).toHaveLength(4);
    expect(store.data.plans[0]!.monthly_price).toBe(999);
    expect(store.data.transactions[0]!.reconciliation_status).toBe("reviewed");
    expect(await store.invite(client.id)).toContain(`/conectar/demo-${client.id}`);
    await act(async () => { await store.logout(); });
    expect(store.demo).toBe(false);
    expect(store.data.clients).toEqual([]);
    for (const mock of [cloudMock.from, cloudMock.rpc, cloudMock.invoke, cloudMock.signOut])
      expect(mock).not.toHaveBeenCalled();
  });
  it("ignores a late authentication load and background auth events after entering demo", async () => {
    let finish!: (value: unknown) => void;
    cloudMock.getUser.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    mount();
    const beforeDemo = store;
    act(() => store.enterDemo());
    await act(async () => {
      finish({ data: { user: { id: "real-user" } }, error: null });
      await Promise.resolve();
      cloudMock.emit("SIGNED_IN");
      cloudMock.emit("SIGNED_OUT");
    });
    expect(store.demo).toBe(true);
    expect(store.organizationId).toBe("demo");
    expect(store.user).toBeNull();
    expect(store.data.clients).toHaveLength(6);
    // Even an action retained by a previous render must not issue a real RPC.
    expect(await beforeDemo.invite("client0")).toContain("/conectar/demo-client0");
    expect(cloudMock.from).not.toHaveBeenCalled();
    expect(cloudMock.rpc).not.toHaveBeenCalled();
    expect(cloudMock.getUser).toHaveBeenCalledTimes(1);
  });
});
