-- Execute somente no SQL administrativo do Lovable Cloud, após confirmar a identidade.
-- Proprietário explicitamente definido no procedimento de ativação. Não existe promoção por user_metadata, primeiro login ou cadastro público.
do $$
declare owner_id uuid;
begin
 select id into strict owner_id from auth.users
 where lower(email)=lower('thiago@zanattaemota.com.br')
   and email_confirmed_at is not null;
 insert into public.organization_members(user_id,organization_id,role)
 values(owner_id,null,'super_admin') on conflict do nothing;
end;$$;
