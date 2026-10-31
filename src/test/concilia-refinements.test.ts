import { describe, expect, it } from "vitest";
import { inviteMessage } from "../../supabase/functions/_shared/invite-message";
import { formatDocument, statementTotals } from "@/features/concilia/domain";
import { demoData } from "@/features/concilia/demo";
describe("Invitation content and printed statements", () => {
  it("personalizes all channels and escapes dynamic HTML and URL attributes", () => {
    const message = inviteMessage({ organizationName: '<img src=x onerror="alert(1)">', clientName: "Empresa & Filhos", contactName: "Ana", url: "https://example.com/conectar/token?x=1&y=2", expiresAt: "2026-11-01T15:00:00Z" });
    expect(message.subject).toContain("Autorização segura de extratos bancários - Empresa & Filhos");
    expect(message.text).toContain("Olá, Ana!");
    expect(message.whatsapp).toContain("48 horas");
    expect(message.html).toContain("Autorizar Conexão Bancária");
    expect(message.html).toContain("Empresa &amp; Filhos");
    expect(message.html).not.toContain("<img");
    expect(message.html).toContain("?x=1&amp;y=2");
    expect(message.text).toContain("01/11/2026, 12:00:00");
    expect(() => inviteMessage({ organizationName: "A", clientName: "B", contactName: "", url: "javascript:alert(1)" })).toThrow();
  });
  it("formats document numbers without inventing missing digits", () => {
    expect(formatDocument("12345678901")).toBe("123.456.789-01");
    expect(formatDocument("12345678000190")).toBe("12.345.678/0001-90");
    expect(formatDocument("12.345.678/0001-90")).toBe("12.345.678/0001-90");
    expect(formatDocument("")).toBe("Não informado");
  });
  it("includes internal transfers in statement totals even before reconciliation", () => {
    const tx = demoData().transactions[0]!;
    expect(statementTotals([{ ...tx, amount: 500 }, { ...tx, amount: -200 }, { ...tx, amount: 1000, category: "Transferências Internas" }])).toEqual({ inflow: 1500, outflow: 200, net: 1300 });
    expect(statementTotals([])).toEqual({ inflow: 0, outflow: -0, net: 0 });
  });
});
