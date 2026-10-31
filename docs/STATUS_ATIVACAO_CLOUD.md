# Ativação do Cloud — 31/10/2026

Projeto Lovable: `8009db72-3175-4f75-99ea-58a85172b15b`.
Backend: Lovable Cloud nativo já vinculado; nenhum projeto externo criado.

## Executado e verificado

- Antes da migração, a consulta ao catálogo não encontrou tabelas nos schemas `public` e `private`.
- O SQL oficial `supabase/migrations/20261031130000_concilia_cloud.sql` foi executado no banco nativo pelo executor SQL do conector Lovable, sem acionar o chat. Para manter a execução inteira atômica, o `COMMIT` intermediário foi deslocado para o final da execução, sem alterar as instruções de esquema, políticas ou dados.
- Foram confirmadas 13 tabelas públicas, todas com RLS; os três planos oficiais e seus valores; `pluggy_cost_per_item_brl = 4` e `grace_days = 5`.
- As RPCs `create_bank_invite(uuid,uuid)`, `review_transactions(uuid[],text)` e `claim_bank_event(text)` existem.
- Consultas de privilégios confirmaram: sem leitura anônima dos convites, sem escrita do navegador em membros/consumo, sem RPC de convite anônima e sem RPC do worker para usuários comuns.
- Nenhum escritório, cliente ou membro foi inserido para testes no banco remoto.

Use `docs/VERIFICACAO_CLOUD.sql` para repetir as verificações de catálogo e pré-requisitos. A migração inicial não é idempotente: **não executá-la novamente** neste banco.

## Pendências verificadas

- O usuário `thiago@zanattaemota.com.br` foi criado e teve o e-mail confirmado em 31/10/2026. O bootstrap ainda não foi executado: é preciso rodar `docs/bootstrap-admin.sql` para conceder o papel de Super Admin. Não há promoção por primeiro login ou metadados de cadastro.
- O cadastro por e-mail e senha foi habilitado no Cloud (com confirmação de e-mail obrigatória e bloqueio de senhas vazadas), junto com o acesso por Google e por conta Lovable e a recuperação de senha por link. A tela de acesso passou a oferecer "Criar conta do escritório", "Esqueci minha senha" e os dois botões de acesso externo; a página `/reset-password` define a nova senha a partir do link. O limite de e-mails de autenticação foi elevado para 50 por hora.
- O envio de e-mails de autenticação usa o remetente padrão da plataforma enquanto não houver domínio de e-mail configurado; a entrega ainda não foi verificada com um envio real.
- Login real de Super Admin, criação real de escritório e vínculo de equipe não foram testados por falta dessa conta. Não foi criado um escritório fictício em produção.
- Listagem de funções e advisors pelo conector Supabase retornou falta de permissão. Não foi possível verificar ou publicar as funções nem confirmar segredos. Isso não afeta o SQL aplicado pelo conector Lovable. Não configurar um projeto Supabase externo como alternativa.
- Credenciais Pluggy, OpenAI, remetente de e-mail, origens, URL pública, webhook e agendamento continuam exigindo verificação nos recursos administrativos do Cloud. Não foram lidos nem versionados valores de segredos.

## Correspondência com o prompt

A migração oficial usa `invite_links`, não `bank_connect_tokens`. O uso mensal é registrado pelo backend em `billing_item_usage`, com chave única por escritório/item/ciclo; não existe RPC `record_cycle_item_usage`. O esquema oficial foi preservado, sem adicionar nomes alternativos sem consumidores no código.

A demonstração permanece acessível pelo botão original de login e altera apenas memória. O provider agora invalida carregamentos reais pendentes ao entrar em demonstração e ignora eventos de autenticação em segundo plano. Os testes verificam todas as mutações demo sem chamadas de escrita/RPC/funções ao Cloud, inclusive links `demo-` e retorno ao login. Os testes de RLS com duas organizações executam em PostgreSQL embarcado, sem inserir dados fictícios no Cloud.
