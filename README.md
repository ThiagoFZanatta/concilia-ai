# Concilia AI

Hub de coleta bancária, padronização de extratos e inteligência financeira consultiva para escritórios contábeis. React, TanStack Start, Tailwind, shadcn/ui e **Lovable Cloud nativo**. A integração bancária usa Pluggy; o produto não é ERP ou sistema de escrituração.

## Desenvolvimento direto pelo GitHub

```sh
npm ci
npm run dev
```

A interface permite login com usuário provisionado no Cloud ou demonstração explícita com dados fictícios em memória. Rotas do escritório: `/app/dashboard`, `/app/clientes`, `/app/extratos`, `/app/conciliacao-ia`, `/app/fluxo-de-caixa`, `/app/configuracoes`. Administração: `/admin/dashboard`, `/admin/escritorios`, `/admin/planos`, `/admin/faturamento`. Convite público: `/conectar/<token>`.

## Validação

```sh
npm run typecheck
npm run typecheck:backend
npm test
npm run test:database
npm run build
```

O teste de banco executa a migração em PostgreSQL embarcado (PGlite) e verifica RLS, isolamento entre escritórios, restrições de suspensão, privilégios de escrita, uso mensal único e concorrência no processamento de eventos. Não altera o banco remoto.

## Ativação no Cloud

Leia [o procedimento de ativação](docs/ATIVACAO_LOVABLE_CLOUD.md). A migração SQL, funções, agendamento e segredos precisam ser ativados no backend nativo antes de usar dados reais. Push no GitHub não executa essas etapas automaticamente. Não é necessário pedir ao chat do Lovable para gerar código ou criar um banco externo.

Planos iniciais: Essencial (25 itens, R$ 249 + R$ 13,90/excedente), Crescimento (75 itens, R$ 549 + R$ 10,90/excedente), Escala (200 itens, R$ 1.290 + R$ 8,90/excedente). Contas do mesmo item não são cobradas em duplicidade. Apuração de faturamento é gerencial, sem gateway de cobrança.
