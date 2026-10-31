import { env } from "./cloud.ts";
export interface PluggyItem {
  id: string;
  clientUserId: string | null;
  connector: { id: number; name: string };
  status: string;
  executionStatus?: string;
  lastUpdatedAt?: string;
  error?: { message?: string };
}
export interface PluggyAccount {
  id: string;
  type: string;
  subtype?: string;
  name: string;
  number?: string;
  balance?: number;
  currencyCode?: string;
  bankData?: { branch?: string; transferNumber?: string };
}
export interface PluggyTransaction {
  id: string;
  description?: string;
  amount: number;
  date: string;
  type: "DEBIT" | "CREDIT";
  status?: string;
}
interface Page<T> {
  results: T[];
  totalPages?: number;
  next?: string | null;
}
let cached: { key: string; until: number } | null = null;
async function apiKey() {
  if (cached && cached.until > Date.now()) return cached.key;
  const response = await fetch("https://api.pluggy.ai/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      clientId: env("PLUGGY_CLIENT_ID"),
      clientSecret: env("PLUGGY_CLIENT_SECRET"),
    }),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`Falha de autenticação Pluggy (${response.status}).`);
  const { apiKey } = await response.json();
  cached = { key: apiKey, until: Date.now() + 90 * 60 * 1000 };
  return apiKey;
}
export async function pluggy<T = unknown>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  if (!path.startsWith("/") || path.startsWith("//")) throw new Error("Caminho Pluggy inválido.");
  const response = await fetch(`https://api.pluggy.ai${path}`, {
    method,
    headers: { "X-API-KEY": await apiKey(), "Content-Type": "application/json" },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(25000),
  });
  if (response.status === 401) cached = null;
  if (!response.ok) throw new Error(`Pluggy respondeu ${response.status}.`);
  return response.status === 204 ? (null as T) : response.json();
}
export function nextPath(next: string, expectedPath: string, accountId?: string) {
  const url = new URL(next, `https://api.pluggy.ai${expectedPath}`);
  if (url.origin !== "https://api.pluggy.ai" || url.pathname !== expectedPath)
    throw new Error("Paginação inválida.");
  if (accountId && url.searchParams.get("accountId") !== accountId)
    throw new Error("Conta divergente na paginação.");
  return url.pathname + url.search;
}
export async function listAccounts(itemId: string) {
  const result: PluggyAccount[] = [];
  for (let page = 1; page <= 1000; page++) {
    const response = await pluggy<Page<PluggyAccount>>(
      `/accounts?itemId=${encodeURIComponent(itemId)}&page=${page}&pageSize=500`,
    );
    result.push(...response.results);
    if (page >= (response.totalPages ?? 1)) return result;
  }
  throw new Error("Limite de páginas de contas excedido.");
}
export async function* transactionPages(accountId: string, from: string, to: string) {
  let path = `/v2/transactions?accountId=${encodeURIComponent(accountId)}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
  const visited = new Set<string>();
  while (path) {
    if (visited.has(path) || visited.size > 10000)
      throw new Error("Ciclo na paginação de transações.");
    visited.add(path);
    const response = await pluggy<Page<PluggyTransaction>>(path);
    yield response.results;
    path = response.next ? nextPath(response.next, "/v2/transactions", accountId) : "";
  }
}
