# Especificação aprovada — Concilia AI

Backend: Lovable Cloud nativo do projeto. Implementação diretamente pelo GitHub, sem solicitações ao chat do Lovable.

# Prompt de Criação: SaaS de Captura Bancária e Inteligência Financeira para Escritórios Contábeis (Pluggy + Lovable Cloud)

Utilize este prompt completo para inicializar e construir o projeto no Lovable com toda a arquitetura, regras de negócio, modelo de dados e telas aprovadas.

---

## 1. Visão Geral do Produto e Escopo

Crie um SaaS B2B multi-tenant voltado para escritórios contábeis que automatiza a captura de extratos bancários de clientes via API da Pluggy (Open Finance), centraliza a gestão de contas correntes, oferece exportação padronizada (OFX, PDF e TXT) e disponibiliza ferramentas consultivas de conciliação categorizada por IA e fluxo de caixa pós-fechamento mensal.

### Escopo Negativo Explícito

- **NÃO** é um ERP ou sistema contábil completo.
- **NÃO** gera DRE contábil oficial, balancetes societários, escriturações fiscais ou arquivos SPED.
- O foco é ser um **Hub de Coleta Bancária, Padronização de Extratos e Inteligência Financeira Consultiva**.

---

## 2. Perfis de Usuário e Níveis de Acesso

1. **Super Admin (Dono da Plataforma):**
   - Gestão de escritórios contábeis cadastrados (licenças e status).
   - Controle de planos, limites de itens bancários e cobrança de excedentes.
   - Visão executiva de faturamento, inadimplência segregada (`past_due` em carência vs. `suspended` crítico).
   - Monitoramento de custos da API Pluggy (custo efetivo total vs. custo em risco) e ranking dos escritórios com maiores excedentes.

2. **Administrador / Operador do Escritório Contábil (Tenant):**
   - Gestão de CNPJs da carteira de clientes do escritório.
   - Emissão e envio de links seguros de conexão bancária (WhatsApp via link direto `wa.me` e e-mail).
   - Acompanhamento do status de sincronização das contas bancárias conectadas.
   - Visualização e download de extratos unificados e filtrados em OFX, PDF e TXT.
   - Copiloto de IA para sugestão de categorização de transações.
   - Painel de Fluxo de Caixa consultivo para análise mensal com o cliente.

3. **Cliente do Escritório (Empresário / Titular da Conta):**
   - Acesso restrito e sem login tradicional: acessa apenas via link seguro tokenizado (`/conectar/[token]`).
   - Interface limpa com instruções claras e acionamento seguro do **Pluggy Connect Widget**.
   - Autorização do compartilhamento bancário via Open Finance.

---

## 3. Modelo Comercial e Regras de Licenciamento

A unidade de limite e cobrança é o **Item Bancário da Pluggy** (instituição conectada com credenciais válidas, mesmo que traga múltiplas contas correntes ou poupanças vinculadas).

### Planos Oficiais Aprovados

1. **Essencial:**
   - Limite incluído: até **25 Itens Bancários**
   - Mensalidade: **R$ 249,00 / mês**
   - Valor por Item excedente: **R$ 13,90 / mês**
2. **Crescimento:**
   - Limite incluído: até **75 Itens Bancários**
   - Mensalidade: **R$ 549,00 / mês**
   - Valor por Item excedente: **R$ 10,90 / mês**
3. **Escala:**
   - Limite incluído: até **200 Itens Bancários**
   - Mensalidade: **R$ 1.290,00 / mês**
   - Valor por Item excedente: **R$ 8,90 / mês**

### Regras de Faturamento e Inadimplência

- **Cálculo de Excedente:** `Faturamento = Mensalidade + (MAX(0, Itens_Ativos - Limite_Plano) * Preco_Excedente)`.
- **Item Ativo/Cobrável:** Qualquer item bancário com sincronização válida no ciclo de faturamento.
- **Alertas de Consumo:** Notificações em tela e e-mail aos 80% e 100% da franquia, sugerindo upgrade para o plano seguinte caso o custo de excedente seja superior à diferença de mensalidade.
- **Régua de Inadimplência:**
  - `active`: Pagamento em dia, acesso irrestrito.
  - `past_due`: Atraso em período de carência (ex: 5 dias). Alerta visual no topo do painel do escritório, sincronizações mantidas, exportações liberadas.
  - `suspended`: Bloqueio de novas conexões, bloqueio de exportações e pausa das sincronizações automáticas até regularização.

---

## 4. Arquitetura de Dados (Lovable Cloud / PostgreSQL com RLS)

Implemente as seguintes tabelas com integridade referencial, índices para consultas frequentes e Row Level Security (RLS) estrito:

1. **`system_settings`**:
   - Chave/valor para parâmetros globais do Super Admin (ex: `pluggy_cost_per_item_brl = 4.00`, tolerância de carência).
2. **`plans`**:
   - `id`, `name`, `included_items` (25, 75, 200), `monthly_price` (249, 549, 1290), `extra_item_price` (13.90, 10.90, 8.90), `is_active`.
3. **`organizations`** (Tenants / Escritórios Contábeis):
   - `id`, `name`, `cnpj`, `plan_id`, `status` (`active`, `past_due`, `suspended`), `billing_email`, `phone`, `created_at`.
4. **`organization_members`**:
   - `id`, `organization_id`, `user_id` (vinculado a `auth.users`), `role` (`admin`, `staff`, `super_admin`).
5. **`clients`** (CNPJs clientes do escritório):
   - `id`, `organization_id`, `name`, `cnpj_cpf`, `contact_name`, `contact_email`, `contact_whatsapp`, `created_at`.
6. **`invite_links`** (Links seguros de convite para conexão):
   - `id`, `organization_id`, `client_id`, `token` (UUID seguro/aleatório), `expires_at`, `status` (`pending`, `completed`, `expired`, `revoked`), `created_at`.
7. **`bank_items`** (Itens da Pluggy conectados):
   - `id`, `organization_id`, `client_id`, `pluggy_item_id`, `connector_name`, `connector_id`, `status` (`UPDATED`, `UPDATING`, `LOGIN_ERROR`, `WAITING_USER_INPUT`, `OUTDATED`), `last_synced_at`, `error_details`.
8. **`bank_accounts`** (Contas correntes/poupança retornadas pelo Item):
   - `id`, `organization_id`, `client_id`, `bank_item_id`, `pluggy_account_id`, `type` (`BANK`, `CREDIT`), `subtype` (`CHECKING_ACCOUNT`, `SAVINGS_ACCOUNT`), `name`, `agency`, `number`, `balance`, `currency_code`.
9. **`transactions`** (Extratos bancários capturados):
   - `id`, `organization_id`, `client_id`, `bank_account_id`, `pluggy_transaction_id`, `description`, `amount`, `date`, `type` (`DEBIT`, `CREDIT`), `category`, `ai_category_suggested`, `reconciliation_status` (`pending`, `reviewed`), `raw_data`.
10. **`transaction_categories`**:
    - Categorias financeiras padrão para fluxo de caixa (ex: Receitas Operacionais, Despesas Fixas, Fornecedores, Tributos, Folha de Pagamento, Tarifas Bancárias).

### Políticas RLS Obrigatórias

- Membros de um escritório só enxergam registros onde `organization_id = auth.user_organization_id()`.
- O Super Admin (`role = 'super_admin'`) tem permissão de leitura em todas as organizações e escrita em tabelas administrativas (`plans`, `system_settings`, atualização de status de `organizations`).
- Webhooks e rotas da Pluggy utilizam a Service Role Key do Lovable Cloud para atualizar status e persistir extratos com segurança.

---

## 5. Módulos e Telas da Aplicação

### A. Painel do Super Admin (`/admin`)

- **/admin/dashboard (Visão Executiva):**
  - Cards de KPIs: Total de Escritórios, Total de Itens Ativos Conectados, MRR Base, Excedentes Apurados no Mês, Faturamento Projetado.
  - Indicadores de Risco: Taxa de Atraso Corrente (`past_due / total`) e Taxa de Inadimplência Crítica (`suspended / total`).
  - Monitoramento Pluggy: Custo Efetivo Total da Pluggy (R$ 4,00 × total de itens ativos) e Custo em Risco (itens de escritórios inadimplentes).
  - Tabela / Ranking: Top 5 Escritórios geradores de excedentes no ciclo atual.
- **/admin/escritorios:**
  - Listagem com busca, filtros por status e plano, contadores de clientes e itens ativos.
  - Ação rápida para suspender/reativar licença e trocar de plano.
- **/admin/planos:**
  - Visualização e edição dos 3 planos aprovados e simulador de faturamento por volume de itens.
- **/admin/faturamento:**
  - Relatório de fechamento mensal com cálculo de excedentes por escritório e exportação CSV.

### B. Painel do Escritório Contábil (`/app`)

- **/app/dashboard:**
  - Resumo de clientes atendidos, itens bancários ativos vs. limite do plano, barra de progresso de consumo de itens com alerta visual em 80% e 100%.
  - Contas com pendência de reconexão ou erro de MFA.
- **/app/clientes:**
  - Cadastro de CNPJs/Empresas clientes.
  - Visualização de itens e contas conectadas por cliente.
  - Botão de ação: **"Novo Link de Conexão"** com geração imediata de link seguro e botões para copiar link, abrir no WhatsApp (`wa.me`) com mensagem padronizada ou disparar e-mail.
- **/app/extratos:**
  - Visão consolidada ou filtrada por Cliente > Banco > Conta Corrente > Período (Mês/Ano).
  - Tabela rica de transações bancárias com busca, filtros de entrada/saída e paginação.
  - Barra de ações de exportação:
    - **Exportar OFX:** Arquivo OFX padronizado para importação direta no sistema contábil do escritório (Domínio, Questor, Alterdata, Fortes, etc.).
    - **Exportar PDF:** Extrato impresso formatado com cabeçalho do escritório e dados do cliente.
    - **Exportar TXT:** Layout tabular ou CSV/TXT padronizado.
- **/app/conciliacao-ia:**
  - Assistente copiloto que analisa descrições bancárias recorrentes e sugere a categoria financeira correspondente (ex: "PAGTO FORNECEDOR XYZ" -> "Fornecedores").
  - Botões para aprovação em lote das sugestões da IA.
- **/app/fluxo-de-caixa:**
  - Visão consultiva mensal pós-fechamento: Entradas operacionais, Saídas operacionais, Saldo líquido do período e gráfico de evolução diária/semanal para apresentação ao cliente.
- **/app/configuracoes:**
  - Dados do escritório, membros da equipe, status da licença e consumo de itens.

### C. Fluxo Seguro do Cliente Final (`/conectar/[token]`)

- Página pública responsiva e segura.
- Validação do token no backend (verifica se expirou ou já foi usado).
- Cabeçalho personalizado com o nome do escritório contábil ("Seu escritório [Nome] solicita autorização de extrato bancário").
- Acionamento do **Pluggy Connect Widget** carregando o `connectToken` gerado temporariamente pela API.
- Feedback imediato de conexão concluída com sucesso e orientação para fechar a tela.

---

## 6. Integração Técnica Pluggy (Backend / Edge Functions)

1. **Autenticação:**
   - Gerar `apiKey` via `POST https://api.pluggy.ai/auth` usando `CLIENT_ID` e `CLIENT_SECRET` armazenados em variáveis de ambiente seguras.
2. **Connect Token:**
   - Quando o cliente abre a página `/conectar/[token]`, o backend gera um token de uso único via `POST https://api.pluggy.ai/connect_token`.
3. **Webhooks:**
   - Endpoint seguro para escutar eventos:
     - `item/created` e `item/updated`: atualizar status do item no banco e disparar sincronização de contas.
     - `item/error`: registrar necessidade de reconexão do cliente.
     - `transactions/created`: salvar novas transações vinculadas à conta corrente correspondente.
4. **Sincronização de Extratos:**
   - Consulta paginada das transações via `GET https://api.pluggy.ai/transactions?accountId={id}&from={date}&to={date}`.

---

## 7. Diretrizes de UI/UX e Design System

- **Stack:** React, Tailwind CSS, shadcn/ui, Lucide Icons.
- **Estilo:** Visual sóbrio, profissional, focado em alta densidade de informação financeira sem poluição visual.
- **Cores:**
  - Primária: Azul escuro corporativo (confiança contábil e institucional).
  - Acentos: Esmeralda/Verde para conciliação e fluxos positivos; Âmbar para alertas de reconexão e carência (`past_due`); Vermelho para erros e suspensões (`suspended`).
- **Componentes:**
  - Badges de status para itens (`Sincronizado`, `Reconexão Necessária`, `Atualizando`).
  - Barras de progresso para limites de licença.
  - Modais para geração rápida de links de WhatsApp e exportação de arquivos.
