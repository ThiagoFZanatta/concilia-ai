-- Read-only checks for the native Lovable Cloud SQL runner.
-- Run after the initial migration; do not replay the initial migration on an initialized database.
select 'public_tables_rls' as check_name,
  count(*)=13 and bool_and(rowsecurity) as passed
from pg_tables where schemaname='public'
union all select 'official_plans', count(*)=3 from public.plans
where (name,included_items,monthly_price,extra_item_price) in
 (('Essencial',25,249,13.90),('Crescimento',75,549,10.90),('Escala',200,1290,8.90))
union all select 'pluggy_cost', value='4'::jsonb from public.system_settings where key='pluggy_cost_per_item_brl'
union all select 'no_anon_invites',not has_table_privilege('anon','public.invite_links','SELECT')
union all select 'no_browser_usage_writes',not has_table_privilege('authenticated','public.billing_item_usage','INSERT,UPDATE,DELETE')
union all select 'no_browser_membership_writes',not has_table_privilege('authenticated','public.organization_members','INSERT,UPDATE,DELETE')
union all select 'no_anon_invite_rpc',not has_function_privilege('anon','public.create_bank_invite(uuid,uuid)','EXECUTE')
union all select 'no_browser_worker_rpc',not has_function_privilege('authenticated','public.claim_bank_event(text)','EXECUTE')
union all select 'owner_confirmed',exists(select 1 from auth.users where lower(email)='thiago@zanattaemota.com.br' and email_confirmed_at is not null)
union all select 'owner_super_admin',exists(select 1 from public.organization_members m join auth.users u on u.id=m.user_id where lower(u.email)='thiago@zanattaemota.com.br' and m.role='super_admin' and m.organization_id is null);
