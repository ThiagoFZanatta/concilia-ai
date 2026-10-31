import { describe, expect, it } from "vitest";
import {
  billing,
  billableCount,
  cashFlow,
  plans,
  suggestCategory,
  upgrade,
} from "@/features/concilia/domain";
import { demoData } from "@/features/concilia/demo";
import { delimited, ofx } from "@/features/concilia/exports";
describe("Concilia business rules", () => {
  it("bills contracted limits and excess in cents", () => {
    expect(billing(plans[0]!, 25).total).toBe(249);
    expect(billing(plans[0]!, 26).total).toBe(262.9);
    expect(billing(plans[1]!, 88).total).toBe(690.7);
    expect(billing(plans[2]!, 207).total).toBe(1352.3);
  });
  it("recommends upgrade only when total is cheaper", () => {
    expect(upgrade(plans[0]!, 26, plans)).toBeUndefined();
    expect(upgrade(plans[0]!, 50, plans)?.name).toBe("Crescimento");
  });
  it("counts an item once across multiple bank accounts and synchronizations", () => {
    const d = demoData();
    const u = d.usage[0]!;
    d.usage.push(u);
    expect(billableCount(d, "demo", u.cycle.slice(0, 7))).toBe(23);
  });
  it("handles recurring descriptions and leaves ambiguous PIX for review", () => {
    expect(suggestCategory("DÁRF TRIBUTOS")).toBe("Tributos");
    expect(suggestCategory("PIX JOÃO")).toBeNull();
  });
  it("excludes internal transfers and flags incomplete review", () => {
    const sample = demoData().transactions[0]!;
    expect(
      cashFlow([
        {
          ...sample,
          amount: 500,
          category: "Receitas Operacionais",
          reconciliation_status: "reviewed",
        },
        { ...sample, amount: -200, category: "Despesas Fixas", reconciliation_status: "pending" },
        {
          ...sample,
          amount: 1000,
          category: "Transferências Internas",
          reconciliation_status: "reviewed",
        },
      ]),
    ).toEqual({ inflow: 500, outflow: 200, net: 300, pending: 1 });
  });
  it("exports escaped OFX with stable FITIDs and refuses consolidated accounts", () => {
    const d = demoData();
    const tx = { ...d.transactions[0]!, description: "PIX A&B <teste>" };
    const result = ofx([tx], d.accounts[0]!, tx.date, tx.date);
    expect(result).toContain("A&amp;B &lt;teste&gt;");
    expect(result).toContain(`<FITID>${tx.pluggy_transaction_id}</FITID>`);
    expect(() =>
      ofx([{ ...tx, bank_account_id: "other" }], d.accounts[0]!, tx.date, tx.date),
    ).toThrow("única conta");
  });
  it("quotes delimited values and prevents spreadsheet formula execution", () => {
    const tx = demoData().transactions[0]!;
    expect(delimited([{ ...tx, description: '=HYPERLINK("bad")' }])).toContain(
      '"\'=HYPERLINK(""bad"")"',
    );
  });
});
