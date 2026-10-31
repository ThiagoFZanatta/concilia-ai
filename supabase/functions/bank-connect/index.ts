import { check, enabled, json, service } from "../_shared/cloud.ts";
import { pluggy, type PluggyItem } from "../_shared/pluggy.ts";
import { registerItem } from "../_shared/sync.ts";
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return json(req, {});
  if (req.method !== "POST") return json(req, { error: "Método inválido." }, 405);
  try {
    const { token, action, itemId } = await req.json();
    if (typeof token !== "string" || !/^[a-f0-9-]{36}$/i.test(token))
      return json(req, { error: "Convite inválido." }, 400);
    const db = service();
    const invite = check(
      await db.from("invite_links").select("*").eq("token", token).maybeSingle(),
    );
    if (
      !invite ||
      !["pending", "completed"].includes(invite.status) ||
      new Date(invite.expires_at) <= new Date()
    )
      return json(req, { error: "Convite inválido, expirado ou já utilizado." }, 410);
    const org = await enabled(db, invite.organization_id);
    const existingItem = invite.bank_item_id
      ? check(
          await db
            .from("bank_items")
            .select("*")
            .eq("id", invite.bank_item_id)
            .eq("organization_id", invite.organization_id)
            .eq("client_id", invite.client_id)
            .single(),
        )
      : null;
    if (invite.status === "completed") {
      if (action === "complete" && invite.pluggy_item_id === itemId)
        return json(req, { success: true });
      return json(req, { error: "Convite já utilizado." }, 410);
    }
    if (action === "connect") {
      if (
        invite.connect_issued_at &&
        Date.now() - Date.parse(invite.connect_issued_at) < 30 * 60 * 1000
      )
        return json(
          req,
          {
            error:
              "Uma conexão já foi iniciada. Use a janela aberta ou tente novamente em 30 minutos.",
          },
          429,
        );
      const issuedAt = new Date().toISOString();
      let claim = db
        .from("invite_links")
        .update({ connect_issued_at: issuedAt })
        .eq("id", invite.id)
        .eq("status", "pending");
      claim = invite.connect_issued_at
        ? claim.eq("connect_issued_at", invite.connect_issued_at)
        : claim.is("connect_issued_at", null);
      const claimed = check(await claim.select());
      if (!claimed?.length) return json(req, { error: "Convite em uso." }, 409);
      try {
        const tokenResult = await pluggy<{ accessToken: string }>("/connect_token", "POST", {
          ...(existingItem ? { itemId: existingItem.pluggy_item_id } : {}),
          options: { clientUserId: invite.id, avoidDuplicates: true },
        });
        return json(req, {
          organizationName: org.name,
          connectToken: tokenResult.accessToken,
          updateItem: existingItem?.pluggy_item_id ?? null,
        });
      } catch (e) {
        await db
          .from("invite_links")
          .update({ connect_issued_at: null })
          .eq("id", invite.id)
          .eq("connect_issued_at", issuedAt);
        throw e;
      }
    }
    if (action === "complete") {
      if (typeof itemId !== "string" || itemId.length > 100) throw new Error("Item inválido.");
      const item = await pluggy<PluggyItem>(`/items/${encodeURIComponent(itemId)}`);
      if (existingItem) {
        if (item.id !== existingItem.pluggy_item_id) throw new Error("Item divergente.");
        check(
          await db
            .from("invite_links")
            .update({ status: "completed", pluggy_item_id: item.id })
            .eq("id", invite.id)
            .eq("status", "pending"),
        );
      } else {
        if (item.clientUserId !== invite.id)
          throw new Error("A conexão não pertence a este convite.");
        await registerItem(db, item);
      }
      return json(req, { success: true });
    }
    return json(req, { error: "Ação inválida." }, 400);
  } catch (e) {
    console.error("bank-connect:", e instanceof Error ? e.message : "Falha");
    return json(
      req,
      {
        error:
          "Conexão indisponível. Verifique o convite e a configuração da integração com seu escritório.",
      },
      400,
    );
  }
});
