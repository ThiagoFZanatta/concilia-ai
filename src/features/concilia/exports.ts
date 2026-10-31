import type { BankAccount, Transaction } from "./domain";
const xml = (s: string) =>
  s.replace(
    /[<>&"']/g,
    (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[c]!,
  );
const cell = (s: string) => `"${(/^[=+@\-\t\r]/.test(s) ? "'" : "") + s.replace(/"/g, '""')}"`;
export function delimited(rows: Transaction[]) {
  return (
    "\uFEFFData;Descrição;Valor;Tipo;Categoria;Conciliação\r\n" +
    rows
      .map((t) =>
        [
          t.date.slice(0, 10),
          t.description,
          t.amount.toFixed(2).replace(".", ","),
          t.type,
          t.category ?? "",
          t.reconciliation_status,
        ]
          .map(cell)
          .join(";"),
      )
      .join("\r\n")
  );
}
export function ofx(rows: Transaction[], account: BankAccount, from: string, to: string) {
  if (rows.some((t) => t.bank_account_id !== account.id))
    throw new Error("Selecione uma única conta para exportar OFX.");
  if (account.type !== "BANK") throw new Error("Exportação OFX disponível para contas bancárias.");
  const stamp = (s: string) => s.slice(0, 10).replace(/-/g, "") + "120000";
  const content = `OFXHEADER:100\nDATA:OFXSGML\nVERSION:102\nSECURITY:NONE\nENCODING:USASCII\nCHARSET:1252\nCOMPRESSION:NONE\nOLDFILEUID:NONE\nNEWFILEUID:NONE\n\n<OFX><SIGNONMSGSRSV1><SONRS><STATUS><CODE>0</CODE><SEVERITY>INFO</SEVERITY></STATUS><DTSERVER>${stamp(new Date().toISOString())}</DTSERVER><LANGUAGE>POR</LANGUAGE></SONRS></SIGNONMSGSRSV1><BANKMSGSRSV1><STMTTRNRS><TRNUID>1</TRNUID><STATUS><CODE>0</CODE><SEVERITY>INFO</SEVERITY></STATUS><STMTRS><CURDEF>${xml(account.currency_code)}</CURDEF><BANKACCTFROM><BANKID>${xml(account.bank_code || "000")}</BANKID><ACCTID>${xml(account.number || account.pluggy_account_id)}</ACCTID><ACCTTYPE>${account.subtype === "SAVINGS_ACCOUNT" ? "SAVINGS" : "CHECKING"}</ACCTTYPE></BANKACCTFROM><BANKTRANLIST><DTSTART>${stamp(from)}</DTSTART><DTEND>${stamp(to)}</DTEND>${rows.map((t) => `<STMTTRN><TRNTYPE>${t.amount < 0 ? "DEBIT" : "CREDIT"}</TRNTYPE><DTPOSTED>${stamp(t.date)}</DTPOSTED><TRNAMT>${t.amount.toFixed(2)}</TRNAMT><FITID>${xml(t.pluggy_transaction_id)}</FITID><MEMO>${xml(t.description)}</MEMO></STMTTRN>`).join("")}</BANKTRANLIST></STMTRS></STMTTRNRS></BANKMSGSRSV1></OFX>`;
  return content
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split("")
    .map((c) => (c.charCodeAt(0) <= 127 ? c : "?"))
    .join("");
}
export function download(name: string, text: string, type = "text/plain;charset=utf-8") {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function billingCsv(
  rows: { name: string; count: number; base: number; extra: number; total: number }[],
) {
  return (
    "\uFEFFEscritório;Itens;Mensalidade;Excedente;Total\r\n" +
    rows
      .map((r) =>
        [cell(r.name), r.count, r.base.toFixed(2), r.extra.toFixed(2), r.total.toFixed(2)].join(
          ";",
        ),
      )
      .join("\r\n")
  );
}
