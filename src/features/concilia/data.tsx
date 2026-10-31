import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { demoData } from "./demo";
import type {
  Client,
  Data,
  Organization,
  Plan,
  BankItem,
  BankAccount,
  Transaction,
  Member,
  Usage,
} from "./domain";

// The native Lovable Cloud SDK remains the only backend connection.
export const cloud = supabase as unknown as SupabaseClient;
const empty: Data = {
  organizations: [],
  plans: [],
  clients: [],
  items: [],
  accounts: [],
  transactions: [],
  members: [],
  usage: [],
  costPerItem: 4,
};
type Context = {
  data: Data;
  demo: boolean;
  loading: boolean;
  error: string;
  user: User | null;
  organizationId: string;
  setOrganizationId: (id: string) => void;
  superAdmin: boolean;
  refresh: () => Promise<void>;
  saveClient: (value: Omit<Client, "id" | "organization_id">, id?: string) => Promise<void>;
  saveOrganization: (id: string, value: Partial<Organization>) => Promise<void>;
  createOrganization: (value: Omit<Organization, "id">) => Promise<void>;
  savePlan: (plan: Plan) => Promise<void>;
  review: (ids: string[], category?: string) => Promise<void>;
  suggest: () => Promise<void>;
  invite: (clientId: string, itemId?: string) => Promise<string>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  enterDemo: () => void;
};
const Store = createContext<Context | null>(null);
export function useConcilia() {
  const value = useContext(Store);
  if (!value) throw new Error("Provider ausente");
  return value;
}
async function rows<T>(table: string): Promise<T[]> {
  const result: T[] = [];
  const order =
    table === "system_settings" ? "key" : table === "billing_item_usage" ? "bank_item_id" : "id";
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await cloud
      .from(table)
      .select("*")
      .order(order)
      .range(offset, offset + 999);
    if (error) throw new Error(error.message);
    result.push(...((data ?? []) as T[]));
    if (!data || data.length < 1000) break;
  }
  return result;
}
export function ConciliaProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Data>(empty);
  const [user, setUser] = useState<User | null>(null);
  const [demo, setDemo] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [organizationId, setOrganizationId] = useState("");
  async function load() {
    setLoading(true);
    setError("");
    try {
      const {
        data: { user: verified },
        error: authError,
      } = await cloud.auth.getUser();
      if (authError && authError.name !== "AuthSessionMissingError") throw authError;
      setUser(verified);
      if (!verified) {
        setData(empty);
        return;
      }
      const [
        organizations,
        plans,
        clients,
        items,
        accounts,
        transactions,
        members,
        usage,
        settings,
      ] = await Promise.all([
        rows<Organization>("organizations"),
        rows<Plan>("plans"),
        rows<Client>("clients"),
        rows<BankItem>("bank_items"),
        rows<BankAccount>("bank_accounts"),
        rows<Transaction>("transactions"),
        rows<Member>("organization_members"),
        rows<Usage>("billing_item_usage"),
        rows<{ key: string; value: unknown }>("system_settings"),
      ]);
      const next = {
        organizations,
        plans,
        clients,
        items,
        accounts,
        transactions,
        members,
        usage,
        costPerItem: Number(
          settings?.find((s) => s.key === "pluggy_cost_per_item_brl")?.value ?? 4,
        ),
      } satisfies Data;
      setData(next);
      setDemo(false);
      setOrganizationId((old) =>
        next.organizations.some((o) => o.id === old) ? old : (next.organizations[0]?.id ?? ""),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao carregar o Cloud.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
    const {
      data: { subscription },
    } = cloud.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        setUser(null);
        setData(empty);
        setDemo(false);
      }
      if (event === "SIGNED_IN") setTimeout(() => void load(), 0);
    });
    return () => subscription.unsubscribe();
  }, []);
  const refresh = async () => {
    if (!demo) await load();
  };
  async function mutate(table: string, value: object, id?: string) {
    const request = id
      ? cloud.from(table).update(value).eq("id", id).select()
      : cloud.from(table).insert(value).select();
    const { data: changed, error } = await request;
    if (error) throw new Error(error.message);
    if (!changed?.length) throw new Error("Operação não permitida ou registro não encontrado.");
    await load();
  }
  const context: Context = {
    data,
    demo,
    loading,
    error,
    user,
    organizationId,
    setOrganizationId,
    superAdmin:
      demo || data.members.some((m) => m.user_id === user?.id && m.role === "super_admin"),
    refresh,
    enterDemo() {
      setDemo(true);
      setUser(null);
      setData(demoData());
      setOrganizationId("demo");
      setError("");
      setLoading(false);
    },
    async saveClient(value, id) {
      if (demo) {
        setData((d) => ({
          ...d,
          clients: id
            ? d.clients.map((c) => (c.id === id ? { ...c, ...value } : c))
            : [
                ...d.clients,
                { ...value, id: crypto.randomUUID(), organization_id: organizationId },
              ],
        }));
        return;
      }
      await mutate("clients", { ...value, organization_id: organizationId }, id);
    },
    async saveOrganization(id, value) {
      if (demo) {
        setData((d) => ({
          ...d,
          organizations: d.organizations.map((o) => (o.id === id ? { ...o, ...value } : o)),
        }));
        return;
      }
      await mutate("organizations", value, id);
    },
    async createOrganization(value) {
      if (demo) {
        setData((d) => ({
          ...d,
          organizations: [...d.organizations, { ...value, id: crypto.randomUUID() }],
        }));
        return;
      }
      await mutate("organizations", value);
    },
    async savePlan(plan) {
      if (demo) {
        setData((d) => ({ ...d, plans: d.plans.map((p) => (p.id === plan.id ? plan : p)) }));
        return;
      }
      await mutate("plans", plan, plan.id);
    },
    async review(ids, category) {
      if (demo) {
        setData((d) => ({
          ...d,
          transactions: d.transactions.map((t) =>
            ids.includes(t.id)
              ? {
                  ...t,
                  category: category ?? t.ai_category_suggested ?? t.category,
                  reconciliation_status: "reviewed",
                }
              : t,
          ),
        }));
        return;
      }
      const { error } = await cloud.rpc("review_transactions", {
        transaction_ids: ids,
        approved_category: category ?? null,
      });
      if (error) throw error;
      await load();
    },
    async suggest() {
      if (demo) {
        const { suggestCategory } = await import("./domain");
        setData((d) => ({
          ...d,
          transactions: d.transactions.map((t) => ({
            ...t,
            ai_category_suggested: suggestCategory(t.description),
          })),
        }));
        return;
      }
      const { data: result, error } = await cloud.functions.invoke("categorize-transactions", {
        body: { organizationId },
      });
      if (error) throw error;
      if (result?.error) throw new Error(result.error);
      await load();
    },
    async invite(clientId, itemId) {
      if (demo) return `${location.origin}/conectar/demo-${clientId}`;
      const { data: result, error } = await cloud.rpc("create_bank_invite", {
        target_client: clientId,
        target_item: itemId ?? null,
      });
      if (error) throw error;
      return `${location.origin}/conectar/${result}`;
    },
    async login(email, password) {
      setDemo(false);
      const { error } = await cloud.auth.signInWithPassword({ email, password });
      if (error) throw error;
      await load();
    },
    async logout() {
      if (!demo) {
        const { error } = await cloud.auth.signOut();
        if (error) throw error;
      }
      setUser(null);
      setDemo(false);
      setData(empty);
    },
  };
  return <Store.Provider value={context}>{children}</Store.Provider>;
}
