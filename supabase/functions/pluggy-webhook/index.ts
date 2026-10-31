import { check, env, json, safeEqual, service } from "../_shared/cloud.ts";
import { processEvent } from "../_shared/sync.ts";
declare const EdgeRuntime: { waitUntil: (promise: Promise<unknown>) => void };
Deno.serve(async (req) => {
  if (req.method !== "POST") return json(req, { error: "Método inválido." }, 405);
  try {
    if (!(await safeEqual(req.headers.get("x-webhook-secret") ?? "", env("PLUGGY_WEBHOOK_SECRET"))))
      return json(req, { error: "Não autorizado." }, 401);
    const payload = await req.json();
    const allowed = [
      "item/created",
      "item/updated",
      "item/error",
      "item/waiting_user_input",
      "item/waiting_user_action",
      "item/deleted",
      "transactions/created",
      "transactions/updated",
      "transactions/deleted",
    ];
    if (!allowed.includes(payload.event)) return json(req, { ignored: true });
    if (typeof payload.eventId !== "string" || payload.eventId.length > 150)
      return json(req, { error: "Evento inválido." }, 400);
    check(
      await service()
        .from("webhook_events")
        .upsert(
          { event_id: payload.eventId, payload },
          { onConflict: "event_id", ignoreDuplicates: true },
        ),
    );
    EdgeRuntime.waitUntil(processEvent(payload.eventId));
    return json(req, { accepted: true }, 202);
  } catch (e) {
    console.error("Webhook persistence failed");
    return json(req, { error: "Não foi possível persistir o evento." }, 500);
  }
});
