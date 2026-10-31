import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
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
  signup: (email: string, password: string) => Promise<void>;
  recover: (email: string) => Promise<void>;
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
  // Invalidate in-flight real loads when entering demo or changing auth session.
  const demoActive = useRef(false);
  const loadVersion = useRef(0);
  async function load() {
    if (demoActive.current) return;
    const version = ++loadVersion.current;
    const current = () => !demoActive.current && loadVersion.current === version;
    setLoading(true);
    setError("");
    try {
      const {
        data: { user: verified },
        error: authError,
      } = await cloud.auth.getUser();
      if (!current()) return;
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
      if (!current()) return;
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
      if (current()) setError(e instanceof Error ? e.message : "Falha ao carregar o Cloud.");
    } finally {
      if (current()) setLoading(false);
    }
  }
  useEffect(() => {
    void load();
    const {
      data: { subscription },
    } = cloud.auth.onAuthStateChange((event) => {
      if (demoActive.current) return;
      if (event === "SIGNED_OUT") {
        ++loadVersion.current;
        setLoading(false);
        setUser(null);
        setData(empty);
        setDemo(false);
      }
      if (event === "SIGNED_IN" || event === "USER_UPDATED") setTimeout(() => void load(), 0);
    });
    return () => { ++loadVersion.current; subscription.unsubscribe(); };
  }, []);
  const refresh = async () => {
    if (!demoActive.current) await load();
  };
  async function mutate(table: string, value: object, id?: string) {
    if (demoActive.current) throw new Error("Demonstração não permite escrita no Cloud.");
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
      demoActive.current = true;
      ++loadVersion.current;
      setDemo(true);
      setUser(null);
      setData(demoData());
      setOrganizationId("demo");
      setError("");
      setLoading(false);
    },
    async saveClient(value, id) {
      if (demoActive.current) {
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
      if (demoActive.current) {
        setData((d) => ({
          ...d,
          organizations: d.organizations.map((o) => (o.id === id ? { ...o, ...value } : o)),
        }));
        return;
      }
      await mutate("organizations", value, id);
    },
    async createOrganization(value) {
      if (demoActive.current) {
        setData((d) => ({
          ...d,
          organizations: [...d.organizations, { ...value, id: crypto.randomUUID() }],
        }));
        return;
      }
      await mutate("organizations", value);
    },
    async savePlan(plan) {
      if (demoActive.current) {
        setData((d) => ({ ...d, plans: d.plans.map((p) => (p.id === plan.id ? plan : p)) }));
        return;
      }
      await mutate("plans", plan, plan.id);
    },
    async review(ids, category) {
      if (demoActive.current) {
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
      if (demoActive.current) {
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
      if (demoActive.current) return `${location.origin}/conectar/demo-${clientId}`;
      const { data: result, error } = await cloud.rpc("create_bank_invite", {
        target_client: clientId,
        target_item: itemId ?? null,
      });
      if (error) throw error;
      return `${location.origin}/conectar/${result}`;
    },
    async signup(email, password) {
      if (demoActive.current) throw new Error("Demonstração não permite cadastro no Cloud.");
      const { data, error } = await cloud.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin },
      });
      // With email confirmation on, a successful sign-up returns no session:
      // the account only works after the person clicks the link in their e-mail.
      if (error) throw error;
      if (!data.session) return;
      await load();
    },
    async recover(email) {
      if (demoActive.current) throw new Error("Demonstração não envia e-mails.");
      const { error } = await cloud.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
    },
    async login(email, password) {
      demoActive.current = false;
      ++loadVersion.current;
      setDemo(false);
      const { error } = await cloud.auth.signInWithPassword({ email, password });
      if (error) throw error;
      await load();
    },
    async logout() {
      if (!demoActive.current) {
        const { error } = await cloud.auth.signOut();
        if (error) throw error;
      }
      demoActive.current = false;
      ++loadVersion.current;
      setUser(null);
      setDemo(false);
      setData(empty);
    },
  };
  return <Store.Provider value={context}>{children}</Store.Provider>;
}
