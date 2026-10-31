-- Concilia AI: Lovable Cloud PostgreSQL. Apply through the native Cloud SQL runner.
-- No external Supabase project is required. Never bootstrap a super admin from signup metadata.
begin;
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;
create table public.plans (
 id uuid primary key default gen_random_uuid(), name text unique not null,
 included_items integer not null check(included_items>0), monthly_price numeric(12,2) not null check(monthly_price>=0),
 extra_item_price numeric(12,2) not null check(extra_item_price>=0), is_active boolean not null default true
);
create table public.system_settings (key text primary key, value jsonb not null);
create table public.organizations (
 id uuid primary key default gen_random_uuid(), name text not null, cnpj text not null unique,
 plan_id uuid not null references public.plans(id), status text not null default 'active' check(status in ('active','past_due','suspended')),
 billing_email text not null default '', phone text not null default '', past_due_since timestamptz, created_at timestamptz not null default now()
);
create table public.organization_members (
 id uuid primary key default gen_random_uuid(), organization_id uuid references public.organizations(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade, role text not null check(role in ('admin','staff','super_admin')),
 check((role='super_admin' and organization_id is null) or (role<>'super_admin' and organization_id is not null)),
 unique(user_id,organization_id)
);
create unique index one_global_super_membership on public.organization_members(user_id) where role='super_admin';
create index member_by_user on public.organization_members(user_id,organization_id);
create table public.clients (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id),
 name text not null, cnpj_cpf text not null, contact_name text not null default '', contact_email text not null default '', contact_whatsapp text not null default '', created_at timestamptz not null default now(),
 unique(id,organization_id), unique(organization_id,cnpj_cpf)
);
create table public.invite_links (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id), client_id uuid not null,
 token uuid not null unique default gen_random_uuid(), expires_at timestamptz not null default now()+interval '48 hours',
 status text not null default 'pending' check(status in ('pending','completed','expired','revoked')),
 connect_issued_at timestamptz, pluggy_item_id text, created_at timestamptz not null default now(),
 foreign key(client_id,organization_id) references public.clients(id,organization_id),unique(id,organization_id)
);
create table public.bank_items (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id), client_id uuid not null,
 pluggy_item_id text not null unique, connector_name text not null, connector_id integer not null,
 status text not null default 'UPDATING', last_synced_at timestamptz, error_details text, deleted_at timestamptz,
 foreign key(client_id,organization_id) references public.clients(id,organization_id), unique(id,organization_id,client_id)
);
create table public.bank_accounts (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null, client_id uuid not null, bank_item_id uuid not null,
 pluggy_account_id text not null unique, type text not null, subtype text, name text not null,
 agency text not null default '', number text not null default '', balance numeric(18,2) not null default 0, currency_code text not null default 'BRL', bank_code text not null default '',
 foreign key(bank_item_id,organization_id,client_id) references public.bank_items(id,organization_id,client_id),unique(id,organization_id,client_id)
);
create table public.transaction_categories (name text primary key);
create table public.transactions (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null, client_id uuid not null, bank_account_id uuid not null,
 pluggy_transaction_id text not null unique, description text not null, amount numeric(18,2) not null, date timestamptz not null,
 type text not null check(type in ('DEBIT','CREDIT')), category text references public.transaction_categories(name),
 ai_category_suggested text references public.transaction_categories(name), reconciliation_status text not null default 'pending' check(reconciliation_status in ('pending','reviewed')),
 raw_data jsonb, foreign key(bank_account_id,organization_id,client_id) references public.bank_accounts(id,organization_id,client_id)
);
-- Immutable per-cycle usage survives reconnection errors and prevents counting accounts as items.
create table public.billing_item_usage (
 organization_id uuid not null references public.organizations(id), bank_item_id uuid not null references public.bank_items(id), cycle date not null,
 first_synced_at timestamptz not null default now(), primary key(organization_id,bank_item_id,cycle), check(extract(day from cycle)=1)
);
create table public.webhook_events (
 event_id text primary key, payload jsonb not null, status text not null default 'pending' check(status in ('pending','processing','processed','failed')),
 attempts integer not null default 0, error text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.notification_outbox (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id), cycle date not null,
 threshold integer not null check(threshold in (80,100)), status text not null default 'pending', last_error text, sent_at timestamptz,
 unique(organization_id,cycle,threshold)
);
create index clients_by_org on public.clients(organization_id);
create index invites_by_client on public.invite_links(organization_id,client_id);
create index items_by_org on public.bank_items(organization_id,client_id);
create index accounts_by_org on public.bank_accounts(organization_id,client_id,bank_item_id);
create index transactions_period on public.transactions(organization_id,date desc);
create index transactions_by_account on public.transactions(bank_account_id,date desc);
create index transactions_by_client on public.transactions(organization_id,client_id,date desc);
create index transactions_pending on public.transactions(organization_id,reconciliation_status);
create index usage_cycle on public.billing_item_usage(organization_id,cycle);
create index queued_events on public.webhook_events(status,created_at);

-- Private, narrowly scoped lookup functions avoid recursive RLS on membership.
-- Membership is never derived from user_metadata or an unverified client claim.
create function private.is_super_admin() returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.organization_members m where m.user_id=auth.uid() and m.role='super_admin');
$$;
create function private.is_member(org uuid) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.organization_members m where m.user_id=auth.uid() and m.organization_id=org);
$$;
create function private.is_org_admin(org uuid) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.organization_members m where m.user_id=auth.uid() and m.organization_id=org and m.role='admin');
$$;
create function private.org_enabled(org uuid) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.organizations o where o.id=org and o.status<>'suspended');
$$;
revoke all on all functions in schema private from public,anon;
grant execute on all functions in schema private to authenticated;

alter table public.plans enable row level security;
alter table public.system_settings enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.clients enable row level security;
alter table public.invite_links enable row level security;
alter table public.bank_items enable row level security;
alter table public.bank_accounts enable row level security;
alter table public.transactions enable row level security;
alter table public.transaction_categories enable row level security;
alter table public.billing_item_usage enable row level security;
alter table public.webhook_events enable row level security;
alter table public.notification_outbox enable row level security;
revoke all on all tables in schema public from anon,authenticated;
grant select on public.plans,public.transaction_categories,public.system_settings,public.organizations,public.organization_members,public.clients,public.invite_links,public.bank_items,public.bank_accounts,public.transactions,public.billing_item_usage to authenticated;
grant insert,update on public.plans,public.system_settings,public.organizations,public.clients to authenticated;
grant insert on public.invite_links to authenticated;
grant update(category,reconciliation_status) on public.transactions to authenticated;
grant all on all tables in schema public to service_role;
create policy plans_read on public.plans for select to authenticated using(true);
create policy plans_insert on public.plans for insert to authenticated with check(private.is_super_admin());
create policy plans_update on public.plans for update to authenticated using(private.is_super_admin()) with check(private.is_super_admin());
create policy settings_read on public.system_settings for select to authenticated using(private.is_super_admin() or key='pluggy_cost_per_item_brl');
create policy settings_insert on public.system_settings for insert to authenticated with check(private.is_super_admin());
create policy settings_update on public.system_settings for update to authenticated using(private.is_super_admin()) with check(private.is_super_admin());
create policy organizations_read on public.organizations for select to authenticated using(private.is_super_admin() or private.is_member(id));
create policy organizations_insert on public.organizations for insert to authenticated with check(private.is_super_admin());
create policy organizations_update on public.organizations for update to authenticated using(private.is_super_admin() or private.is_org_admin(id)) with check(private.is_super_admin() or private.is_org_admin(id));
-- Protect administrative columns even when the office admin can update contact data.
create function private.protect_license() returns trigger language plpgsql set search_path='' as $$
begin
 if current_user in ('authenticated','anon') and not private.is_super_admin() and
 (new.id is distinct from old.id or new.plan_id is distinct from old.plan_id or new.status is distinct from old.status or new.cnpj is distinct from old.cnpj or new.past_due_since is distinct from old.past_due_since or new.created_at is distinct from old.created_at) then
 raise exception 'Somente o super administrador pode alterar a licença.'; end if;
 if new.status='past_due' and old.status<>'past_due' then new.past_due_since:=now(); end if;
 if new.status='active' then new.past_due_since:=null; end if;
 return new;
end;$$;
create trigger protect_license before update on public.organizations for each row execute function private.protect_license();
create policy members_read on public.organization_members for select to authenticated using(private.is_super_admin() or private.is_member(organization_id) or user_id=auth.uid());
create policy clients_read on public.clients for select to authenticated using(private.is_super_admin() or private.is_member(organization_id));
create policy clients_insert on public.clients for insert to authenticated with check(private.is_member(organization_id) and private.org_enabled(organization_id));
create policy clients_update on public.clients for update to authenticated using(private.is_member(organization_id) and private.org_enabled(organization_id)) with check(private.is_member(organization_id) and private.org_enabled(organization_id));
create policy invites_read on public.invite_links for select to authenticated using(private.is_super_admin() or private.is_member(organization_id));
create policy invites_insert on public.invite_links for insert to authenticated with check(private.is_member(organization_id) and private.org_enabled(organization_id) and status='pending' and expires_at<=now()+interval '48 hours' and pluggy_item_id is null and connect_issued_at is null);
create policy items_read on public.bank_items for select to authenticated using(private.is_super_admin() or private.is_member(organization_id));
create policy accounts_read on public.bank_accounts for select to authenticated using(private.is_super_admin() or (private.is_member(organization_id) and private.org_enabled(organization_id)));
create policy transactions_read on public.transactions for select to authenticated using(private.is_super_admin() or (private.is_member(organization_id) and private.org_enabled(organization_id)));
create policy transactions_update on public.transactions for update to authenticated using(private.is_member(organization_id) and private.org_enabled(organization_id)) with check(private.is_member(organization_id) and private.org_enabled(organization_id));
create policy categories_read on public.transaction_categories for select to authenticated using(true);
create policy usage_read on public.billing_item_usage for select to authenticated using(private.is_super_admin() or private.is_member(organization_id));
-- No anon access to invite rows; the public Edge Function returns only the safe projection.
-- No authenticated writes to membership, synced banking data, usage, event queue or outbox.
create function public.create_bank_invite(target_client uuid) returns uuid language plpgsql security invoker set search_path='' as $$
declare result uuid;
begin
 insert into public.invite_links(organization_id,client_id)
 select c.organization_id,c.id from public.clients c where c.id=target_client returning token into result;
 if result is null then raise exception 'Cliente indisponível.'; end if; return result;
end;$$;
create function public.review_transactions(transaction_ids uuid[], approved_category text default null) returns integer language plpgsql security invoker set search_path='' as $$
declare changed integer;
begin
 if cardinality(transaction_ids)>1000 then raise exception 'Limite de 1000 transações por lote.'; end if;
 update public.transactions set category=coalesce(approved_category,ai_category_suggested),reconciliation_status='reviewed'
 where id=any(transaction_ids) and coalesce(approved_category,ai_category_suggested) is not null;
 get diagnostics changed=row_count;
 if changed<>cardinality(transaction_ids) then raise exception 'Uma ou mais transações não estão disponíveis para revisão.';end if;
 return changed;
end;$$;
revoke all on function public.create_bank_invite(uuid), public.review_transactions(uuid[],text) from public,anon;
grant execute on function public.create_bank_invite(uuid), public.review_transactions(uuid[],text) to authenticated;
insert into public.plans(name,included_items,monthly_price,extra_item_price) values ('Essencial',25,249,13.90),('Crescimento',75,549,10.90),('Escala',200,1290,8.90);
insert into public.system_settings(key,value) values ('pluggy_cost_per_item_brl','4.00'),('grace_days','5');
insert into public.transaction_categories(name) values ('Receitas Operacionais'),('Despesas Fixas'),('Fornecedores'),('Tributos'),('Folha de Pagamento'),('Tarifas Bancárias'),('Transferências Internas'),('Outros');
commit;

-- Provider pause state and atomic event claiming are service-only.
alter table public.bank_items add column auto_sync_paused boolean not null default false;
create function public.claim_bank_event(target_id text) returns setof public.webhook_events language sql security invoker set search_path='' as $$
 update public.webhook_events set status='processing',attempts=attempts+1,updated_at=now()
 where event_id=target_id and status in ('pending','failed') and attempts<10 returning *;
$$;
revoke all on function public.claim_bank_event(text) from public,anon,authenticated;
grant execute on function public.claim_bank_event(text) to service_role;

-- Reconnection invitations are bound to an existing local item, never to a browser-supplied ID.
alter table public.invite_links add column bank_item_id uuid;
alter table public.invite_links add constraint invite_item_same_client foreign key(bank_item_id,organization_id,client_id) references public.bank_items(id,organization_id,client_id);
drop function public.create_bank_invite(uuid);
create function public.create_bank_invite(target_client uuid,target_item uuid default null) returns uuid language plpgsql security invoker set search_path='' as $$
declare result uuid;
begin
 if target_item is not null and not exists(select 1 from public.bank_items where id=target_item and client_id=target_client and deleted_at is null) then raise exception 'Item indisponível.';end if;
 insert into public.invite_links(organization_id,client_id,bank_item_id)
 select c.organization_id,c.id,target_item from public.clients c where c.id=target_client returning token into result;
 if result is null then raise exception 'Cliente indisponível.';end if;return result;
end;$$;
revoke all on function public.create_bank_invite(uuid,uuid) from public,anon;
grant execute on function public.create_bank_invite(uuid,uuid) to authenticated;
