import { check, enabled, service } from "./cloud.ts";
import { listAccounts, pluggy, transactionPages, type PluggyItem } from "./pluggy.ts";
export async function registerItem(db: ReturnType<typeof service>, item: PluggyItem) {
  const existing = check(
    await db.from("bank_items").select("*").eq("pluggy_item_id", item.id).maybeSingle(),
  );
  if (existing) return existing;
  const invite = check(
    await db.from("invite_links").select("*").eq("id", item.clientUserId).maybeSingle(),
  );
  if (
    !invite ||
    new Date(invite.expires_at) < new Date() ||
    !invite.connect_issued_at ||
    !["pending", "completed"].includes(invite.status)
  )
    throw new Error("Vínculo bancário inválido.");
  await enabled(db, invite.organization_id);
  if (invite.pluggy_item_id && invite.pluggy_item_id !== item.id)
    throw new Error("Convite já utilizado.");
  if (invite.status === "pending") {
    const claimed = check(
      await db
        .from("invite_links")
        .update({ status: "completed", pluggy_item_id: item.id })
        .eq("id", invite.id)
        .eq("status", "pending")
        .is("pluggy_item_id", null)
        .select(),
    );
    if (!claimed?.length) {
      const current = check(
        await db.from("invite_links").select("pluggy_item_id").eq("id", invite.id).single(),
      );
      if (current?.pluggy_item_id !== item.id) throw new Error("Convite já utilizado.");
    }
  }
  return check(
    await db
      .from("bank_items")
      .upsert(
        {
          organization_id: invite.organization_id,
          client_id: invite.client_id,
          pluggy_item_id: item.id,
          connector_name: item.connector.name,
          connector_id: item.connector.id,
          status: item.status ?? "UPDATING",
        },
        { onConflict: "pluggy_item_id" },
      )
      .select()
      .single(),
  );
}
export async function syncItem(db: ReturnType<typeof service>, pluggyItemId: string) {
  const item = await pluggy<PluggyItem>(`/items/${encodeURIComponent(pluggyItemId)}`);
  const local = await registerItem(db, item);
  await enabled(db, local.organization_id);
  const normalizedStatus =
    item.status === "UPDATED" && item.executionStatus && item.executionStatus !== "SUCCESS"
      ? item.executionStatus
      : item.status;
  check(
    await db
      .from("bank_items")
      .update({
        status: normalizedStatus ?? "OUTDATED",
        error_details: item.error ? String(item.error.message ?? "Erro na conexão.") : null,
      })
      .eq("id", local.id),
  );
  if (item.status !== "UPDATED" || (item.executionStatus && item.executionStatus !== "SUCCESS"))
    return;
  const syncedAt = item.lastUpdatedAt ?? new Date().toISOString();
  // Do not overwrite reviewed categories when a provider changes a description or amount.
  for (const account of await listAccounts(item.id)) {
    await enabled(db, local.organization_id);
    const saved = check(
      await db
        .from("bank_accounts")
        .upsert(
          {
            organization_id: local.organization_id,
            client_id: local.client_id,
            bank_item_id: local.id,
            pluggy_account_id: account.id,
            type: account.type,
            subtype: account.subtype,
            name: account.name,
            agency: account.bankData?.branch ?? "",
            number: account.number ?? "",
            balance: account.balance ?? 0,
            currency_code: account.currencyCode ?? "BRL",
            bank_code: account.bankData?.transferNumber ?? "",
          },
          { onConflict: "pluggy_account_id" },
        )
        .select()
        .single(),
    );
    const from = new Date();
    from.setUTCFullYear(from.getUTCFullYear() - 1);
    for await (const page of transactionPages(
      account.id,
      from.toISOString().slice(0, 10),
      new Date().toISOString().slice(0, 10),
    )) {
      await enabled(db, local.organization_id);
      const transactions = page
        .filter((t) => t.status !== "PENDING")
        .map((t) => ({
          organization_id: local.organization_id,
          client_id: local.client_id,
          bank_account_id: saved.id,
          pluggy_transaction_id: t.id,
          description: t.description ?? "",
          amount: t.type === "DEBIT" ? -Math.abs(t.amount) : Math.abs(t.amount),
          date: t.date,
          type: t.type,
          raw_data: t,
        }));
      if (transactions.length)
        check(
          await db
            .from("transactions")
            .upsert(transactions, { onConflict: "pluggy_transaction_id" }),
        );
    }
  }
  // Billing is based on successful bank synchronization, not number of returned accounts.
  const cycleDate =
    new Date(syncedAt).toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" }).slice(0, 7) +
    "-01";
  check(
    await db
      .from("billing_item_usage")
      .upsert(
        { organization_id: local.organization_id, bank_item_id: local.id, cycle: cycleDate },
        { onConflict: "organization_id,bank_item_id,cycle", ignoreDuplicates: true },
      ),
  );
  check(
    await db
      .from("bank_items")
      .update({ last_synced_at: syncedAt, status: "UPDATED" })
      .eq("id", local.id),
  );
  await consumptionAlerts(db, local.organization_id, cycleDate);
}
export async function consumptionAlerts(
  db: ReturnType<typeof service>,
  orgId: string,
  cycle: string,
) {
  const org = await enabled(db, orgId);
  const plan = check(await db.from("plans").select("*").eq("id", org.plan_id).single());
  const { count, error } = await db
    .from("billing_item_usage")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", orgId)
    .eq("cycle", cycle);
  if (error) throw error;
  for (const threshold of [80, 100])
    if ((count ?? 0) / plan!.included_items >= threshold / 100)
      check(
        await db
          .from("notification_outbox")
          .upsert(
            { organization_id: orgId, cycle, threshold },
            { onConflict: "organization_id,cycle,threshold", ignoreDuplicates: true },
          ),
      );
}
export async function processEvent(eventId: string) {
  const db = service();
  const claim = check(await db.rpc("claim_bank_event", { target_id: eventId }));
  if (!claim?.length) return;
  const event = claim[0];
  try {
    const payload = event.payload;
    if (payload.event === "item/deleted") {
      check(
        await db
          .from("bank_items")
          .update({ deleted_at: new Date().toISOString(), status: "OUTDATED" })
          .eq("pluggy_item_id", payload.itemId),
      );
    } else if (payload.event === "transactions/deleted") {
      const ids = payload.transactionIds ?? [];
      if (ids.length)
        check(await db.from("transactions").delete().in("pluggy_transaction_id", ids));
    } else {
      let itemId = payload.itemId;
      if (!itemId && payload.accountId) {
        const account = check(
          await db
            .from("bank_accounts")
            .select("bank_item_id")
            .eq("pluggy_account_id", payload.accountId)
            .maybeSingle(),
        );
        if (account) {
          const item = check(
            await db
              .from("bank_items")
              .select("pluggy_item_id")
              .eq("id", account.bank_item_id)
              .single(),
          );
          itemId = item!.pluggy_item_id;
        }
      }
      if (itemId) {
        const local = check(
          await db
            .from("bank_items")
            .select("organization_id")
            .eq("pluggy_item_id", itemId)
            .maybeSingle(),
        );
        if (local) {
          const org = check(
            await db
              .from("organizations")
              .select("status")
              .eq("id", local.organization_id)
              .single(),
          );
          if (org?.status === "suspended") {
            await pluggy(`/items/${encodeURIComponent(itemId)}/disable-auto-sync`, "PATCH");
            check(
              await db
                .from("webhook_events")
                .update({ status: "processed", updated_at: new Date().toISOString() })
                .eq("event_id", eventId),
            );
            return;
          }
        }
        await syncItem(db, itemId);
      }
    }
    check(
      await db
        .from("webhook_events")
        .update({ status: "processed", error: null, updated_at: new Date().toISOString() })
        .eq("event_id", eventId),
    );
  } catch (e) {
    check(
      await db
        .from("webhook_events")
        .update({
          status: "failed",
          error: e instanceof Error ? e.message : "Falha ao sincronizar.",
          updated_at: new Date().toISOString(),
        })
        .eq("event_id", eventId),
    );
  }
}
