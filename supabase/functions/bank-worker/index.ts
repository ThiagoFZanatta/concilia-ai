import { check, env, json, safeEqual, service } from "../_shared/cloud.ts";
import { pluggy } from "../_shared/pluggy.ts";
import { processEvent } from "../_shared/sync.ts";
Deno.serve(async (req) => {
  if (req.method !== "POST") return json(req, {}, 405);
  try {
    if (!(await safeEqual(req.headers.get("x-worker-secret") ?? "", env("BANK_WORKER_SECRET"))))
      return json(req, {}, 401);
    const db = service();
    const setting = check(
      await db.from("system_settings").select("value").eq("key", "grace_days").single(),
    );
    const cutoff = new Date(Date.now() - Number(setting!.value) * 86400000).toISOString();
    check(
      await db
        .from("organizations")
        .update({ status: "suspended" })
        .eq("status", "past_due")
        .lt("past_due_since", cutoff),
    );
    // Provider-side auto-sync is disabled for suspended offices, and restored only after reactivation.
    const items = check(
      await db
        .from("bank_items")
        .select("id,pluggy_item_id,organization_id,auto_sync_paused")
        .is("deleted_at", null),
    );
    for (const item of items ?? []) {
      const org = check(
        await db.from("organizations").select("status").eq("id", item.organization_id).single(),
      );
      if (org!.status === "suspended" && !item.auto_sync_paused) {
        await pluggy(
          `/items/${encodeURIComponent(item.pluggy_item_id)}/disable-auto-sync`,
          "PATCH",
        );
        check(await db.from("bank_items").update({ auto_sync_paused: true }).eq("id", item.id));
      } else if (org!.status !== "suspended" && item.auto_sync_paused) {
        await pluggy(`/items/${encodeURIComponent(item.pluggy_item_id)}`, "PATCH", {});
        check(await db.from("bank_items").update({ auto_sync_paused: false }).eq("id", item.id));
      }
    }
    const stale = new Date(Date.now() - 15 * 60000).toISOString();
    check(
      await db
        .from("webhook_events")
        .update({ status: "failed" })
        .eq("status", "processing")
        .lt("updated_at", stale),
    );
    const pending = check(
      await db
        .from("webhook_events")
        .select("event_id")
        .in("status", ["pending", "failed"])
        .lt("attempts", 10)
        .order("created_at")
        .limit(10),
    );
    for (const event of pending ?? []) await processEvent(event.event_id);
    // Durable consumption alerts. Delivery occurs only after a provider is configured.
    const notifications = check(
      await db.from("notification_outbox").select("*").eq("status", "pending").limit(20),
    );
    let sent = 0;
    for (const notification of notifications ?? []) {
      const org = check(
        await db
          .from("organizations")
          .select("name,billing_email")
          .eq("id", notification.organization_id)
          .single(),
      );
      if (!Deno.env.get("RESEND_API_KEY") || !Deno.env.get("EMAIL_FROM") || !org!.billing_email)
        continue;
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env("RESEND_API_KEY")}`,
          "Content-Type": "application/json",
          "Idempotency-Key": notification.id,
        },
        body: JSON.stringify({
          from: env("EMAIL_FROM"),
          to: org!.billing_email,
          subject: `Concilia AI: ${notification.threshold}% da franquia de itens`,
          text: `O escritório ${org!.name} atingiu ${notification.threshold}% da franquia no ciclo ${notification.cycle}. Consulte seu painel para avaliar o consumo e as opções de plano.`,
        }),
      });
      if (response.ok) {
        check(
          await db
            .from("notification_outbox")
            .update({ status: "sent", sent_at: new Date().toISOString() })
            .eq("id", notification.id),
        );
        sent++;
      } else {
        check(
          await db
            .from("notification_outbox")
            .update({ last_error: `HTTP ${response.status}` })
            .eq("id", notification.id),
        );
      }
    }
    return json(req, { processed: pending?.length ?? 0, notificationsSent: sent });
  } catch (e) {
    console.error("bank-worker:", e instanceof Error ? e.message : "Falha");
    return json(req, { error: "Falha no processamento. Consulte os logs do backend." }, 500);
  }
});
