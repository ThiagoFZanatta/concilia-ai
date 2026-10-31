import { inviteMessage } from "../_shared/invite-message.ts";
import { actor, check, enabled, env, json } from "../_shared/cloud.ts";
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return json(req, {});
  if (req.method !== "POST") return json(req, {}, 405);
  try {
    const { db, user } = await actor(req);
    const { token } = await req.json();
    if (typeof token !== "string" || !/^[a-f0-9-]{36}$/i.test(token))
      return json(req, { error: "Convite inválido." }, 400);
    const invite = check(
      await db.from("invite_links").select("*").eq("token", token).eq("status", "pending").single(),
    );
    if (!invite || new Date(invite.expires_at) <= new Date()) throw new Error("Convite expirado.");
    const membership = check(
      await db
        .from("organization_members")
        .select("id")
        .eq("user_id", user.id)
        .eq("organization_id", invite.organization_id)
        .maybeSingle(),
    );
    if (!membership) return json(req, { error: "Acesso negado." }, 403);
    const org = await enabled(db, invite.organization_id);
    const client = check(
      await db
        .from("clients")
        .select("contact_email,contact_name,name")
        .eq("id", invite.client_id)
        .eq("organization_id", invite.organization_id)
        .single(),
    );
    if (!client?.contact_email) throw new Error("Cliente sem e-mail cadastrado.");
    const base = env("APP_BASE_URL");
    if (!base.startsWith("https://")) throw new Error("Domínio de convites não configurado.");
    const url = new URL(`/conectar/${token}`, base).href;
    const { subject, text, html } = inviteMessage({
      organizationName: org.name,
      clientName: client.name,
      contactName: client.contact_name,
      url,
      expiresAt: invite.expires_at,
    });
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env("RESEND_API_KEY")}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `invite-${invite.id}`,
      },
      body: JSON.stringify({
        from: env("EMAIL_FROM"),
        to: client.contact_email,
        subject, text, html,
      }),
    });
    if (!response.ok) throw new Error("Provedor de e-mail indisponível.");
    return json(req, { sent: true });
  } catch (e) {
    console.error("send-invite-email:", e instanceof Error ? e.message : "Falha");
    return json(
      req,
      {
        error:
          "Não foi possível enviar o convite. Verifique o e-mail do cliente e a configuração do provedor.",
      },
      400,
    );
  }
});
