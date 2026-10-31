# Concilia AI — implementação no projeto existente

## Resultado
Construir um ambiente operacional para escritórios contábeis, com persistência real no Lovable Cloud, isolamento entre escritórios e permissões verificadas no backend. Manter TanStack Start e deixar exclusivamente no preview.

## Decisão necessária antes da autenticação
**Você precisa armazenar dados de perfil dos usuários, como nome de exibição, avatar ou preferências?**

Os papéis serão sempre armazenados separadamente, em estrutura protegida. Os dados do escritório e dos clientes não dependem de um perfil pessoal. Se a resposta for não, usar apenas as contas de autenticação, sem criar perfis desnecessários.

## Entregas
1. **Base e acesso:** login, logout, recuperação de senha, cadastro de escritório e equipe; autorização por papel e isolamento rigoroso. Bootstrap administrativo por procedimento privilegiado para uma conta explicitamente escolhida, nunca pelo primeiro cadastro. Registrar ações administrativas.
2. **Escritório:** painel de consumo e pendências; cadastro de clientes; convites expirantes e revogáveis; copiar link e WhatsApp; extratos com filtros e paginação; OFX, PDF e TXT; revisão de categorias e fluxo de caixa consultivo. Sem gerar documentos contábeis oficiais.
3. **Plataforma:** painel executivo, escritórios com filtros e alterações de licença/plano, planos e simulador, fechamento mensal e CSV. Separar `past_due` de `suspended` nos indicadores.
4. **Cobrança:** Essencial 25 itens / R$ 249 / R$ 13,90 excedente; Crescimento 75 / R$ 549 / R$ 10,90; Escala 200 / R$ 1.290 / R$ 8,90. Contabilizar itens distintos com sincronização válida durante o mês, mesmo se um item tiver várias contas. Guardar evidência mensal para não recalcular o passado com o estado atual. Alertas em 80% e 100%, com recomendação de upgrade conforme o custo.
5. **Conexão bancária:** página pública `/conectar/$token`, validação no backend, emissão de autorização temporária, Pluggy Connect e vínculo do item somente após consultar a Pluggy e validar o `clientUserId` confiável. Consumo do convite de forma atômica. Sincronização paginada, reprocessamento idempotente e erros de reconexão.
6. **Suspensão:** impedir novas conexões e exportações e pausar sincronizações no backend; preservar acesso de consulta e regularização. Em carência, manter sincronizações e exportações.

## Integrações e pendências externas
- Verificar conexões e segredos disponíveis antes de solicitar configuração. Credenciais Pluggy ficam apenas no backend; nunca colocar chaves privadas no navegador.
- E-mail: registrar entrega/erro e oferecer copiar/WhatsApp independentemente da configuração. Não apresentar um e-mail como enviado se o serviço não estiver ativo.
- IA: usar Lovable AI para sugestões, sujeitas a revisão humana; não apresentar regras locais como inferência de IA. Consultar o guia de integração antes de implementá-la.
- Não criar dados financeiros fictícios na base real. A primeira entrada mostrará estados vazios úteis; qualquer demonstração será separada e explicitamente marcada.
- A sincronização do código utiliza a conexão GitHub existente do Lovable. Não executar `git push` nem alterar a conexão. O agente não consegue confirmar o estado dessa conexão; reportar essa limitação sem alegar sincronização concluída.

## Detalhes técnicos
- Migrações aplicadas pelo mecanismo nativo do Cloud, com GRANTs, RLS, índices e integridade referencial composta para impedir vínculos cruzados entre escritórios.
- Tabelas solicitadas, mais papéis de plataforma protegidos, uso mensal de itens, fechamento de faturamento, auditoria e registros de integração. IDs de usuários nas tabelas de negócio como UUID; referências à autenticação apenas nas estruturas permitidas de perfil/papel.
- Funções internas com `createServerFn` e middleware de autenticação. Páginas privadas sob a proteção nativa `_authenticated`; páginas de login, recuperação e convite públicas. Cada página com metadados próprios.
- Webhooks sob `/api/public/`, validação do mecanismo autenticador efetivamente suportado pela Pluggy e confirmação dos dados junto à API antes de persistir. Nenhuma escrita externa sem verificação. Segredos compartilhados configurados por canal seguro.
- Permissões no banco e handlers: super admin lê globalmente e administra licenças/planos; admin gerencia sua equipe; staff não altera licenças nem concede privilégios. Nenhuma atribuição de papel a partir de metadados editáveis.
- UI com componentes existentes, português brasileiro, valores em BRL, azul corporativo, estados esmeralda/âmbar/vermelho e tabelas financeiras densas.

## Verificação e relatório
- Testes concretos dos três planos, limite e excedente, contagem distinta mensal, alertas, upgrade e carência/suspensão.
- Testes de acesso cruzado, privilégio indevido, bootstrap, convite expirado/revogado/reutilizado, item de outro titular, webhook inválido e idempotência.
- Verificar cadastro e leitura real de cliente em sessão autenticada, geração de convite, exportação e restrições de licença. Verificar desktop e celular.
- As verificações automáticas do projeto executam compilação e checagem de tipos; consultar os resultados e corrigir falhas. Rodar testes explicitamente, sem executar uma compilação manual paralela ao processo do Lovable.
- Relatar separadamente o que foi implementado, o que foi efetivamente testado e o que aguarda Pluggy, e-mail ou uma conta administrativa escolhida. Não declarar verificada uma conexão bancária real sem credenciais e autorização bancária.