# Ativação do Concilia AI no Lovable Cloud

O backend é o **Lovable Cloud nativo já vinculado ao projeto**. Não crie um projeto Supabase externo. Os caminhos `supabase/` e o SDK `@supabase/supabase-js` são convenções técnicas da infraestrutura nativa existente; não representam mudança de fornecedor.

## O que este commit faz

Implementa as telas, autenticação de usuários existentes, cadastro/edição de clientes, convites de 48 horas, conexão e reconexão Pluggy, extratos com filtros/paginação e exportações, revisão manual ou de sugestões por IA, fluxo de caixa consultivo e administração dos planos/organizações. A demonstração é opt-in, usa dados fictícios em memória e nunca escreve no Cloud. A cobrança é uma apuração gerencial por item distinto no mês; não existe gateway de pagamentos, débito automático ou emissão fiscal.

O código foi preparado diretamente no GitHub. **Enviar código ao GitHub não executa migrações nem publica Edge Functions automaticamente.** Estas etapas operacionais devem ser feitas nos recursos administrativos do Cloud, sem enviar prompts ao chat do Lovable.

## 1. Banco nativo

Antes de aplicar, confirme no Cloud que o banco não possui tabelas homônimas implementadas por outra alteração. A migração inicial destina-se a um banco sem essas tabelas.

Execute `supabase/migrations/20261031130000_concilia_cloud.sql` no executor SQL administrativo do banco nativo. O arquivo contém tabelas, índices, políticas RLS, funções e os planos oficiais. Não execute as migrações contra outro projeto. O `project_id` de `supabase/config.toml` permanece o do projeto existente.

Todas as tabelas públicas têm RLS. Convites não são legíveis anonimamente. As relações cliente → item → conta → transação incluem o identificador do escritório para impedir referências cruzadas. O histórico mensal de uso não pode ser alterado pelo navegador. Transações e contas de um escritório suspenso ficam inacessíveis para seus membros pelo Data API.

## 2. Primeiro administrador e equipe

Crie ou convide o usuário na administração de autenticação do Cloud, confirme o e-mail e execute `docs/bootstrap-admin.sql`, substituindo o endereço indicado pelo e-mail do proprietário. Nenhum cadastro recebe poderes de Super Admin automaticamente.

O Super Admin pode cadastrar escritórios e definir seus planos na interface. Para vincular uma equipe a um escritório existente, execute no SQL administrativo (UUIDs devem ser copiados das linhas reais):

```sql
insert into public.organization_members(organization_id,user_id,role)
select '<UUID_DO_ESCRITORIO>'::uuid, u.id, 'admin'
from auth.users u
where lower(u.email)=lower('<EMAIL_CONFIRMADO>')
  and u.email_confirmed_at is not null;
```

Use `staff` para operadores. Somente o proprietário administrativo do banco pode conceder os papéis iniciais. Usuários sem vínculo visualizam uma orientação para contatar o administrador, sem acesso a dados de terceiros. A interface lista os membros; provisionamento/convite de usuários da equipe é administrativo nesta versão.

## 3. Funções e segredos

Publique o conteúdo de `supabase/functions/` no runtime de funções do próprio Lovable Cloud. Respeite `verify_jwt` em `supabase/config.toml`: as rotas públicas validam o convite ou segredo próprio; `categorize-transactions` e `send-invite-email` exigem JWT e verifica o usuário novamente.

Cadastre os valores no cofre de segredos do backend, nunca em `VITE_*`, arquivos versionados ou no chat:

| Segredo                                    | Uso                                                                                        |
| ------------------------------------------ | ------------------------------------------------------------------------------------------ |
| `PLUGGY_CLIENT_ID`, `PLUGGY_CLIENT_SECRET` | Autenticação da Pluggy                                                                     |
| `PLUGGY_WEBHOOK_SECRET`                    | Segredo aleatório de alta entropia, mínimo recomendado de 32 bytes                         |
| `BANK_WORKER_SECRET`                       | Outro segredo para o processador agendado                                                  |
| `APP_ORIGINS`                              | Origens permitidas separadas por vírgula, incluindo o preview e depois o domínio publicado |
| `APP_BASE_URL`                             | Origem HTTPS usada nos links de convite enviados por e-mail                                |
| `OPENAI_API_KEY`                           | Categorização por IA acionada pelo operador                                                |
| `AI_MODEL`                                 | Opcional; padrão `gpt-4.1-mini`                                                            |
| `RESEND_API_KEY`, `EMAIL_FROM`             | Notificações automáticas de consumo; remetente precisa ser validado                        |

`SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` são credenciais internas fornecidas pelo runtime nativo. Se a implantação usar chaves novas, configure o segredo administrativo compatível no runtime, mantendo-o exclusivamente no backend.

O envio de convite por e-mail é acionado explicitamente pelo operador e usa o endereço cadastrado do cliente, com deduplicação por convite. A alternativa “Preparar e-mail” somente abre o correio local.

A interface de login reutiliza as variáveis públicas e o cliente do scaffold original. Não substitua a conexão nativa.

## 4. Webhook Pluggy e agendamento

Na API da Pluggy, registre um webhook global com `event: "all"`, URL HTTPS da função `pluggy-webhook` e cabeçalho `X-Webhook-Secret` contendo o valor de `PLUGGY_WEBHOOK_SECRET`. Cabeçalhos personalizados são configurados pela API da Pluggy; não coloque o segredo no link do cliente. Registre apenas os eventos necessários se preferir restringir a assinatura.

O endpoint grava cada `eventId` antes de responder 202. O processamento verifica os dados do item na API oficial, sem confiar no cliente para informar o escritório. O convite usado em `options.clientUserId` fica associado a um único item. Repetições de webhook não duplicam itens, contas, transações ou consumo mensal. Eventos em falha podem ser tentados até 10 vezes e devem ser monitorados após esse limite.

Agende `POST bank-worker` a cada 5 minutos com o cabeçalho `X-Worker-Secret`. Ele recupera eventos pendentes, aplica a carência configurada (5 dias), pausa auto-sync na Pluggy para escritórios suspensos e restaura após reativação, além de enviar alertas pendentes. Sem esse agendamento as tarefas automáticas não acontecem. A pausa na Pluggy é eventual, no próximo processamento; requisições já em andamento não podem ser canceladas retroativamente.

A sincronização lê contas paginadas e transações pelo endpoint por cursor `/v2/transactions`, pois o endpoint antigo citado no prompt tem descontinuação anunciada para 31/12/2026. Não seguimos links arbitrários recebidos em webhooks. Sincronizações válidas registram o item no ciclo do horário de São Paulo. Transações `PENDING` não entram no extrato realizado.

## 5. Exportações e inteligência

OFX exige uma única conta bancária, usa identificadores estáveis da Pluggy e normalização ASCII para compatibilidade com OFX 1.02. O código bancário vem de `bankData.transferNumber`; se não fornecido pelo banco, é usado `000` e pode ser necessário adaptar no importador contábil. Não foi homologado em Domínio, Questor, Alterdata ou Fortes. Valide um arquivo real no sistema usado pelo escritório antes da operação.

TXT usa ponto e vírgula com escape de aspas e proteção contra fórmulas de planilha. PDF usa a impressão formatada do navegador: selecione “Salvar como PDF”. A versão impressa inclui todas as linhas filtradas, não apenas a página da tabela.

A licença é conferida novamente antes da exportação e a RLS impede novas consultas de transações por um escritório suspenso. Dados que já foram legitimamente enviados ao navegador não podem ser apagados retroativamente do computador do usuário.

IA real exige a chave do provedor, envia descrição/valor/identificador de transações pendentes em lotes de até 100 e só grava categorias permitidas. Nenhuma sugestão aprova uma transação automaticamente. A demonstração usa regras locais, explicitamente identificadas. Revise contratos e base de tratamento antes de usar dados reais com o provedor escolhido.

O fluxo de caixa é consultivo e preliminar enquanto houver pendências. Exclui transferências internas já categorizadas. Não é ERP, BPO, escrituração ou DRE contábil oficial.

## Verificação antes do uso real

- Aplicar SQL e publicar funções no Cloud nativo.
- Criar usuários confirmados e conceder os vínculos administrativos corretos.
- Cadastrar segredos, webhook e agendamento.
- Conectar um banco de testes, verificar item com múltiplas contas, sincronização, reconexão e exportação.
- Testar duas organizações reais, suspensão/reativação e alertas de consumo.
- Homologar OFX no sistema contábil e entrega de e-mails no remetente aprovado.

As credenciais, sincronização bancária, entrega de e-mail, resposta do provedor de IA e publicação das funções não foram testadas com serviços reais nesta sessão.

## Refinamento de convites e relatório impresso

Publique novamente `bank-connect`, `send-invite-email` e seus módulos compartilhados no Cloud nativo após integrar o refinamento. A página pública chama `bank-connect` com `action: "info"` para obter apenas nome do escritório, nome da empresa e documento, após validar o convite e a licença, sem consumir o convite ou emitir token Pluggy. O aceite explícito na interface antecede a abertura do widget; ele não substitui a autorização bancária da instituição nem constitui um registro persistido de consentimento.

E-mail HTML, texto simples e WhatsApp usam o mesmo modelo. Os textos não afirmam homologação específica pelo Banco Central nem criptografia ponta a ponta sem comprovação; explicam a finalidade de leitura, HTTPS e a ausência de autorização para movimentação financeira.

O relatório impresso inclui todas as linhas filtradas, mesmo fora da página web atual, e soma todos os créditos e débitos, incluindo transferências internas (diferentemente do fluxo de caixa consultivo). A emissão usa o horário de São Paulo. Valide a paginação e as cores na prévia de impressão do navegador; a opção de imprimir cores/fundos depende da configuração do usuário.

## Estado da aplicação do esquema

A migração inicial já foi aplicada ao banco nativo em 31/10/2026. Não a execute novamente. Consulte `docs/STATUS_ATIVACAO_CLOUD.md` para evidências, limitações e pendências reais; use `docs/VERIFICACAO_CLOUD.sql` para checagens de leitura. A aplicação do esquema não implica bootstrap de usuário, publicação de funções ou configuração de segredos.
