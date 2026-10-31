-- Execute somente no SQL administrativo do Lovable Cloud, após confirmar a identidade.
-- Substitua o endereço abaixo. Não existe promoção por user_metadata, primeiro login ou cadastro público.
do $$
declare owner_id uuid;
begin
 select id into strict owner_id from auth.users
 where lower(email)=lower('SUBSTITUA_PELO_EMAIL_CONFIRMADO_DO_PROPRIETARIO')
   and email_confirmed_at is not null;
 insert into public.organization_members(user_id,organization_id,role)
 values(owner_id,null,'super_admin') on conflict do nothing;
end;$$;
