export type LicenseStatus = "active" | "past_due" | "suspended";
export interface Plan {
  id: string;
  name: string;
  included_items: number;
  monthly_price: number;
  extra_item_price: number;
  is_active: boolean;
}
export interface Organization {
  id: string;
  name: string;
  cnpj: string;
  plan_id: string;
  status: LicenseStatus;
  billing_email: string;
  phone: string;
  past_due_since?: string | null;
}
export interface Member {
  id: string;
  organization_id: string | null;
  user_id: string;
  role: "admin" | "staff" | "super_admin";
}
export interface Client {
  id: string;
  organization_id: string;
  name: string;
  cnpj_cpf: string;
  contact_name: string;
  contact_email: string;
  contact_whatsapp: string;
}
export interface BankItem {
  id: string;
  organization_id: string;
  client_id: string;
  pluggy_item_id: string;
  connector_name: string;
  connector_id: number;
  status: string;
  last_synced_at: string | null;
  error_details: string | null;
}
export interface BankAccount {
  id: string;
  organization_id: string;
  client_id: string;
  bank_item_id: string;
  pluggy_account_id: string;
  type: string;
  subtype: string;
  name: string;
  agency: string;
  number: string;
  balance: number;
  currency_code: string;
  bank_code?: string;
}
export interface Transaction {
  id: string;
  organization_id: string;
  client_id: string;
  bank_account_id: string;
  pluggy_transaction_id: string;
  description: string;
  amount: number;
  date: string;
  type: "DEBIT" | "CREDIT";
  category: string | null;
  ai_category_suggested: string | null;
  reconciliation_status: "pending" | "reviewed";
}
export interface Usage {
  organization_id: string;
  cycle: string;
  bank_item_id: string;
}
export interface Data {
  organizations: Organization[];
  plans: Plan[];
  clients: Client[];
  items: BankItem[];
  accounts: BankAccount[];
  transactions: Transaction[];
  members: Member[];
  usage: Usage[];
  costPerItem: number;
}
export const plans: Plan[] = [
  {
    id: "essencial",
    name: "Essencial",
    included_items: 25,
    monthly_price: 249,
    extra_item_price: 13.9,
    is_active: true,
  },
  {
    id: "crescimento",
    name: "Crescimento",
    included_items: 75,
    monthly_price: 549,
    extra_item_price: 10.9,
    is_active: true,
  },
  {
    id: "escala",
    name: "Escala",
    included_items: 200,
    monthly_price: 1290,
    extra_item_price: 8.9,
    is_active: true,
  },
];
export const categories = [
  "Receitas Operacionais",
  "Despesas Fixas",
  "Fornecedores",
  "Tributos",
  "Folha de Pagamento",
  "Tarifas Bancárias",
  "Transferências Internas",
  "Outros",
];
export const money = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export function billing(plan: Plan, count: number) {
  const extraItems = Math.max(0, count - plan.included_items);
  const extra = Math.round(extraItems * plan.extra_item_price * 100) / 100;
  return {
    count,
    extraItems,
    extra,
    total: Math.round((plan.monthly_price + extra) * 100) / 100,
    ratio: count / plan.included_items,
  };
}
export function upgrade(plan: Plan, count: number, available: Plan[]) {
  return available
    .filter(
      (p) =>
        p.is_active &&
        p.included_items > plan.included_items &&
        billing(p, count).total < billing(plan, count).total,
    )
    .sort((a, b) => billing(a, count).total - billing(b, count).total)[0];
}
export function suggestCategory(description: string): string | null {
  const text = description
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
  const rules: [RegExp, string][] = [
    [/DARF|DAS SIMPLES|TRIBUTO|FGTS|INSS/, "Tributos"],
    [/SALARIO|FOLHA|PRO LABORE/, "Folha de Pagamento"],
    [/TARIFA|CESTA|MANUTENCAO CONTA/, "Tarifas Bancárias"],
    [/FORNECEDOR|DISTRIBUIDORA/, "Fornecedores"],
    [/ALUGUEL|ENERGIA|INTERNET|CONDOMINIO/, "Despesas Fixas"],
    [/RECEBIMENTO|VENDA|RECEBIVEIS/, "Receitas Operacionais"],
  ];
  return rules.find(([pattern]) => pattern.test(text))?.[1] ?? null;
}
export function cashFlow(rows: Transaction[]) {
  const operational = rows.filter((t) => t.category !== "Transferências Internas");
  const inflow = operational.filter((t) => t.amount > 0).reduce((a, t) => a + t.amount, 0);
  const outflow = -operational.filter((t) => t.amount < 0).reduce((a, t) => a + t.amount, 0);
  return {
    inflow,
    outflow,
    net: inflow - outflow,
    pending: rows.filter((t) => t.reconciliation_status !== "reviewed").length,
  };
}
export const cycleNow = () =>
  new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" }).slice(0, 7);
export function billableCount(data: Data, organizationId: string, cycle: string) {
  return new Set(
    data.usage
      .filter((u) => u.organization_id === organizationId && u.cycle.slice(0, 7) === cycle)
      .map((u) => u.bank_item_id),
  ).size;
}
