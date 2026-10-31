import { plans, cycleNow, type Data } from "./domain";
export function demoData(): Data {
  const cycle = cycleNow();
  const organizations: Data["organizations"] = [
    {
      id: "demo",
      name: "Horizonte Contabilidade",
      cnpj: "00.000.000/0001-00",
      plan_id: "essencial",
      status: "active",
      billing_email: "financeiro@example.com",
      phone: "5545999990000",
    },
    {
      id: "demo2",
      name: "Atlas Assessoria Contábil",
      cnpj: "00.000.000/0002-00",
      plan_id: "crescimento",
      status: "past_due",
      billing_email: "atlas@example.com",
      phone: "",
    },
    {
      id: "demo3",
      name: "Prisma Contabilidade",
      cnpj: "00.000.000/0003-00",
      plan_id: "escala",
      status: "suspended",
      billing_email: "prisma@example.com",
      phone: "",
    },
  ];
  const clients = [
    "Aurora Clínica Integrada",
    "Vértice Engenharia",
    "Casa Verde Comércio",
    "Studio Forma",
    "Órbita Tecnologia",
    "Café da Praça",
  ].map((name, i) => ({
    id: `client${i}`,
    organization_id: "demo",
    name,
    cnpj_cpf: `00.000.00${i}/0001-00`,
    contact_name: "Contato de demonstração",
    contact_email: "cliente@example.com",
    contact_whatsapp: "5545999990000",
  }));
  const items = Array.from({ length: 23 }, (_, i) => ({
    id: `item${i}`,
    organization_id: "demo",
    client_id: `client${i % 6}`,
    pluggy_item_id: `demo${i}`,
    connector_name: ["Itaú", "Banco do Brasil", "Sicredi", "Santander"][i % 4]!,
    connector_id: i % 4,
    status: i === 3 ? "LOGIN_ERROR" : i === 8 ? "WAITING_USER_INPUT" : "UPDATED",
    last_synced_at: `${cycle}-15T12:00:00Z`,
    error_details: i === 3 ? "Credenciais precisam ser atualizadas." : null,
  }));
  const accounts = items.map((item, i) => ({
    id: `account${i}`,
    organization_id: "demo",
    client_id: item.client_id,
    bank_item_id: item.id,
    pluggy_account_id: `demo${i}`,
    type: "BANK",
    subtype: "CHECKING_ACCOUNT",
    name: item.connector_name,
    agency: "0001",
    number: `${10000 + i}-0`,
    balance: 12500 + i * 317,
    currency_code: "BRL",
  }));
  const descriptions = [
    "PIX RECEBIMENTO CLIENTE",
    "PAGTO FORNECEDOR DISTRIBUIDORA",
    "TARIFA MANUTENÇÃO CONTA",
    "PAGTO ALUGUEL",
    "DARF TRIBUTOS FEDERAIS",
    "RECEBIMENTO VENDAS",
    "FOLHA SALÁRIO",
    "PIX TRANSFERÊNCIA",
  ];
  const transactions: Data["transactions"] = Array.from({ length: 96 }, (_, i) => ({
    id: `transaction${i}`,
    organization_id: "demo",
    client_id: `client${i % 6}`,
    bank_account_id: `account${i % 23}`,
    pluggy_transaction_id: `demo${i}`,
    description: descriptions[i % 8]!,
    amount: i % 8 === 0 || i % 8 === 5 ? 1800 + i * 37 : -(85 + i * 13),
    date: `${cycle}-${String((i % 28) + 1).padStart(2, "0")}T12:00:00Z`,
    type: i % 8 === 0 || i % 8 === 5 ? "CREDIT" : "DEBIT",
    category: i % 3 === 0 ? "Receitas Operacionais" : null,
    ai_category_suggested: null,
    reconciliation_status: i % 3 === 0 ? "reviewed" : "pending",
  }));
  const usage = [
    ...items.map((i) => ({ organization_id: "demo", cycle: `${cycle}-01`, bank_item_id: i.id })),
    ...Array.from({ length: 88 }, (_, i) => ({
      organization_id: "demo2",
      cycle: `${cycle}-01`,
      bank_item_id: `atlas${i}`,
    })),
    ...Array.from({ length: 207 }, (_, i) => ({
      organization_id: "demo3",
      cycle: `${cycle}-01`,
      bank_item_id: `prisma${i}`,
    })),
  ];
  return {
    organizations,
    plans,
    clients,
    items,
    accounts,
    transactions,
    usage,
    members: [],
    costPerItem: 4,
  };
}
