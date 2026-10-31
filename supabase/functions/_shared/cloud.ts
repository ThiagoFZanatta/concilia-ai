import { createClient } from "npm:@supabase/supabase-js@2.118.0";
export function env(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Configuração ausente: ${name}`);
  return value;
}
export const service = () =>
  createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
export function headers(request: Request) {
  const origin = request.headers.get("origin") ?? "";
  const allowed = (Deno.env.get("APP_ORIGINS") ?? "").split(",").map((s) => s.trim());
  return {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
    "Referrer-Policy": "no-referrer",
    "Access-Control-Allow-Origin": allowed.includes(origin) ? origin : "null",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}
export function json(req: Request, value: unknown, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: headers(req) });
}
export function check<T>(result: { data: T; error: unknown }) {
  if (result.error) throw result.error;
  return result.data;
}
export async function actor(req: Request) {
  const token = req.headers.get("authorization")?.replace(/^Bearer /, "");
  if (!token) throw new Error("Não autorizado.");
  const db = service();
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) throw new Error("Não autorizado.");
  return { db, user: data.user };
}
export async function enabled(db: ReturnType<typeof service>, org: string) {
  const row = check(
    await db
      .from("organizations")
      .select("id,name,status,plan_id,billing_email")
      .eq("id", org)
      .single(),
  );
  if (!row) throw new Error("Escritório não encontrado.");
  if (row.status === "suspended") throw new Error("Licença suspensa.");
  return row;
}
export async function safeEqual(a: string, b: string) {
  const encoder = new TextEncoder();
  const [ah, bh] = await Promise.all(
    [a, b].map((s) => crypto.subtle.digest("SHA-256", encoder.encode(s))),
  );
  return new Uint8Array(ah).every((v, i) => v === new Uint8Array(bh)[i]);
}
