// Shared by browser mailto/WhatsApp and the native Cloud email function.
export interface InviteMessage {
  organizationName: string;
  clientName: string;
  contactName: string;
  url: string;
  expiresAt?: string;
}
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
export function inviteMessage(input: InviteMessage) {
  const { organizationName, clientName, contactName, url, expiresAt } = input;
  const parsed = new URL(url);
  if (!["https:", "http:"].includes(parsed.protocol)) throw new Error("Link de convite inválido.");
  const greeting = `Olá, ${contactName || clientName}!`;
  const purpose = `O escritório ${organizationName} convida você a conectar as contas de ${clientName} para um fechamento contábil e financeiro mais ágil, sem retrabalho de enviar extratos todo mês.`;
  const validity = `Convite válido por 48 horas a partir da emissão.${expiresAt ? ` Expira em ${new Date(expiresAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })} (horário de Brasília).` : ""}`;
  const security = "A conexão é destinada à leitura de saldos e extratos. Não autoriza transferências, pagamentos ou contratação de crédito. A transmissão utiliza HTTPS. Informe credenciais somente no ambiente seguro de autorização apresentado pela integração, nunca por e-mail ou WhatsApp.";
  return {
    subject: `${organizationName} • Autorização segura de extratos bancários - ${clientName}`,
    text: `${greeting}\n\n${purpose}\n\nAutorizar Conexão Bancária: ${url}\n\n${validity}\n\n${security}`,
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;color:#172b4d"><h2>${escapeHtml(organizationName)}</h2><p>${escapeHtml(greeting)}</p><p>${escapeHtml(purpose)}</p><p style="margin:28px 0"><a style="background:#174ea6;color:#fff;padding:14px 20px;border-radius:6px;display:inline-block" href="${escapeHtml(url)}">Autorizar Conexão Bancária</a></p><p>${escapeHtml(validity)}</p><div style="background:#f1f5f9;padding:16px"><strong>Segurança da conexão</strong><p>${escapeHtml(security)}</p></div><p>Se o botão não abrir, copie este link: ${escapeHtml(url)}</p></div>`,
    whatsapp: `${greeting} Aqui é do escritório *${organizationName}*.\n\nPara automatizar a conciliação mensal da sua empresa (*${clientName}*) e evitar o envio manual de arquivos de extrato todo mês, disponibilizamos este link seguro para conexão bancária:\n\n🔗 ${url}\n\n(${validity} Acesso destinado à leitura de saldos e extratos, sem permissão de movimentação de valores. Nunca envie senhas por mensagem.)`,
  };
}
