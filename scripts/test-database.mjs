import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
const db = new PGlite();
await db.exec(
  `create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated,service_role;grant execute on function auth.uid() to authenticated,service_role;`,
);
await db.exec(
  await readFile(
    new URL("../supabase/migrations/20261031130000_concilia_cloud.sql", import.meta.url),
    "utf8",
  ),
);
const userA = "11111111-1111-4111-8111-111111111111",
  userB = "22222222-2222-4222-8222-222222222222",
  superUser = "33333333-3333-4333-8333-333333333333";
await db.query("insert into auth.users(id) values ($1),($2),($3)", [userA, userB, superUser]);
const {
  rows: [plan],
} = await db.query("select id from plans where name='Essencial'");
const {
  rows: [orgA],
} = await db.query(
  "insert into organizations(name,cnpj,plan_id) values ('A','A',$1) returning id",
  [plan.id],
);
const {
  rows: [orgB],
} = await db.query(
  "insert into organizations(name,cnpj,plan_id) values ('B','B',$1) returning id",
  [plan.id],
);
await db.query(
  "insert into organization_members(user_id,organization_id,role) values ($1,$2,'admin'),($3,$4,'staff'),($5,null,'super_admin')",
  [userA, orgA.id, userB, orgB.id, superUser],
);
const {
  rows: [clientA],
} = await db.query(
  "insert into clients(organization_id,name,cnpj_cpf) values ($1,'Cliente A','A') returning id",
  [orgA.id],
);
const {
  rows: [clientB],
} = await db.query(
  "insert into clients(organization_id,name,cnpj_cpf) values ($1,'Cliente B','B') returning id",
  [orgB.id],
);
const {
  rows: [item],
} = await db.query(
  "insert into bank_items(organization_id,client_id,pluggy_item_id,connector_name,connector_id) values ($1,$2,'item-a','Banco',1) returning id",
  [orgA.id, clientA.id],
);
const {
  rows: [account],
} = await db.query(
  "insert into bank_accounts(organization_id,client_id,bank_item_id,pluggy_account_id,type,name) values ($1,$2,$3,'account-a','BANK','Banco') returning id",
  [orgA.id, clientA.id, item.id],
);
const {
  rows: [tx],
} = await db.query(
  "insert into transactions(organization_id,client_id,bank_account_id,pluggy_transaction_id,description,amount,date,type,ai_category_suggested) values ($1,$2,$3,'tx-a','TEST',100,now(),'CREDIT','Receitas Operacionais') returning id",
  [orgA.id, clientA.id, account.id],
);
async function asUser(user) {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [user]);
  await db.exec("set role authenticated");
}
await asUser(userA);
assert.equal(
  (await db.query("select * from clients")).rows.length,
  1,
  "Tenant reads only its clients",
);
assert.equal(
  (await db.query("select * from organizations")).rows.length,
  1,
  "Tenant reads only its office",
);
assert.equal((await db.query("select * from transactions")).rows.length, 1);
await assert.rejects(
  () =>
    db.query(
      "insert into clients(organization_id,name,cnpj_cpf) values ($1,'Intruder','intruder')",
      [orgB.id],
    ),
  /row-level security/,
);
await assert.rejects(
  () =>
    db.query("insert into clients(organization_id,name,cnpj_cpf) values ($1,'Bad FK','bad')", [
      "99999999-9999-4999-8999-999999999999",
    ]),
  /row-level security/,
);
await assert.rejects(
  () =>
    db.query("update organizations set status='active',plan_id=gen_random_uuid() where id=$1", [
      orgA.id,
    ]),
  /super administrador/,
);
await assert.rejects(
  () =>
    db.query(
      "insert into organization_members(user_id,organization_id,role) values ($1,null,'super_admin')",
      [userA],
    ),
  /permission denied/,
);
await assert.rejects(
  () => db.query("update transactions set amount=1 where id=$1", [tx.id]),
  /permission denied/,
);
const {
  rows: [review],
} = await db.query("select review_transactions(array[$1::uuid],null) as count", [tx.id]);
assert.equal(review.count, 1);
assert.equal(
  (await db.query("select category from transactions")).rows[0].category,
  "Receitas Operacionais",
);
const invite = await db.query("select create_bank_invite($1) token", [clientA.id]);
assert.ok(invite.rows[0].token);
await assert.rejects(
  () => db.query("select create_bank_invite($1)", [clientB.id]),
  /Cliente indisponível/,
);
await db.exec("reset role");
await assert.rejects(
  () =>
    db.query(
      "insert into bank_accounts(organization_id,client_id,bank_item_id,pluggy_account_id,type,name) values ($1,$2,$3,'bad-cross','BANK','Bad')",
      [orgB.id, clientB.id, item.id],
    ),
  /foreign key/,
);
await db.query(
  "insert into billing_item_usage(organization_id,bank_item_id,cycle) values ($1,$2,'2026-10-01') on conflict do nothing",
  [orgA.id, item.id],
);
await db.query(
  "insert into billing_item_usage(organization_id,bank_item_id,cycle) values ($1,$2,'2026-10-01') on conflict do nothing",
  [orgA.id, item.id],
);
assert.equal(
  (await db.query("select count(*)::int n from billing_item_usage")).rows[0].n,
  1,
  "Bill each item once per cycle",
);
await db.query("update organizations set status='past_due' where id=$1", [orgA.id]);
await asUser(userA);
assert.equal(
  (await db.query("select * from transactions")).rows.length,
  1,
  "Grace preserves exports",
);
await db.exec("reset role");
await db.query("update organizations set status='suspended' where id=$1", [orgA.id]);
await asUser(userA);
assert.equal(
  (await db.query("select * from transactions")).rows.length,
  0,
  "Suspended office cannot read/export transactions",
);
assert.equal((await db.query("select * from bank_accounts")).rows.length, 0);
await assert.rejects(
  () => db.query("select create_bank_invite($1)", [clientA.id]),
  /row-level security/,
);
await assert.rejects(
  () => db.query("select review_transactions(array[$1::uuid],null)", [tx.id]),
  /não estão disponíveis/,
);
await asUser(userB);
assert.equal((await db.query("select * from transactions")).rows.length, 0);
await asUser(superUser);
assert.equal((await db.query("select * from organizations")).rows.length, 2);
assert.equal((await db.query("select * from transactions")).rows.length, 1);
await db.exec("reset role;set role anon");
await assert.rejects(() => db.query("select * from invite_links"), /permission denied/);
await assert.rejects(
  () => db.query("select create_bank_invite($1)", [clientA.id]),
  /permission denied/,
);
await db.exec("reset role");
const tables = await db.query(
  "select tablename from pg_tables where schemaname='public' and not rowsecurity",
);
assert.equal(tables.rows.length, 0, "Every exposed table enables RLS");
await db.exec(
  "insert into webhook_events(event_id,payload) values ('one','{}');set role service_role",
);
assert.equal((await db.query("select * from claim_bank_event('one')")).rows.length, 1);
assert.equal(
  (await db.query("select * from claim_bank_event('one')")).rows.length,
  0,
  "Concurrent workers cannot claim the same event twice",
);
await db.close();
console.log(
  "PASS: PostgreSQL migration, RLS isolation, license restrictions, invitation access, immutable banking data, usage deduplication and event claiming.",
);
