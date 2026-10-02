import Papa from "papaparse";
import { clean, toNumber } from "./helpers";

/* QuickBooks P&L reports — by Class, by Customer, or the standard company-wide
   layout — all share one shape once reduced to rows: a label column followed by
   one number per class/customer (or a single "Total" column), grouped under
   section headers (Income, Cost of Goods Sold, Expenses, ...) with a "Total <section>"
   line closing each one out. This file turns either a CSV or a PDF's reconstructed
   text lines into that shape, then classifies each leaf row into revenue, cogs or
   opex so the importer never has to know which file format it came from. */

const SECTION_START = {
  income: /^income\b/i,
  cogs: /^cost of goods sold\b/i,
  expenses: /^expenses\b/i,
  otherIncome: /^other income\b/i,
  otherExpenses: /^other expense/i,
};
const SECTION_SKIP = /^(total\s|gross profit\b|net operating income\b|net income\b|net other income\b|ordinary income\/expense\b)/i;

/* rows: [{ label, values: number[] }]. Returns leaf rows bucketed by what they
   mean for client profitability: income -> revenue, cost of goods sold -> cogs
   (direct, client-attributable cost), expenses -> opex (firm overhead; kept
   separate since labor cost is already tracked through time entries). */
export function classifyRows(rows) {
  let section = "none";
  const income = [];
  const cogs = [];
  const opex = [];
  for (const row of rows) {
    const label = clean(row.label);
    if (!label) continue;
    const startMatch = Object.entries(SECTION_START).find(([, re]) => re.test(label));
    if (startMatch) {
      section = startMatch[0];
      continue;
    }
    if (SECTION_SKIP.test(label)) {
      section = "none";
      continue;
    }
    if (section === "income" || section === "otherIncome") income.push(row);
    else if (section === "cogs") cogs.push(row);
    else if (section === "expenses" || section === "otherExpenses") opex.push(row);
  }
  return { income, cogs, opex };
}

function sumColumn(rows, colIdx) {
  return rows.reduce((s, r) => s + (Number(r.values[colIdx]) || 0), 0);
}

/* Turns a parsed, classified report into the finance rows the app already knows
   how to store (client, project, revenue, cogs) plus whatever can't be attributed
   to a client: Expenses always land here (overhead, kept separate from the labor
   cost the app already computes from time entries), and so do Income and COGS
   when the report never broke revenue out by class or customer in the first
   place — a true standard, company-wide P&L. */
export function toFinanceRows(columns, classified, format) {
  const realCols = columns.map((c, i) => ({ c, i })).filter(({ c }) => c && !/^total$/i.test(c));
  const rows = [];

  if (!realCols.length) {
    const companyRevenue = sumColumn(classified.income, 0);
    const companyCogs = sumColumn(classified.cogs, 0);
    const opexTotal = sumColumn(classified.opex, 0);
    return { rows, opexTotal, companyRevenue, companyCogs };
  }

  realCols.forEach(({ c: colName, i }) => {
    const revenue = sumColumn(classified.income, i);
    const c = sumColumn(classified.cogs, i);
    const r = { client: colName, project: null, svc: "", revenue, cogs: c };
    if (format === "by_customer" && colName.includes(":")) {
      const [parent, child] = colName.split(":").map((s) => s.trim());
      r.client = parent;
      r.project = child || null;
    }
    if (revenue || c) rows.push(r);
  });
  const opexTotal = realCols.reduce((s, { i }) => s + sumColumn(classified.opex, i), 0);
  return { rows, opexTotal, companyRevenue: 0, companyCogs: 0 };
}

/* columns.length === 1 means there was no per-class/per-customer breakdown at
   all — a standard, company-wide P&L. That's handled as one summary, not a
   per-client row, since there is nothing to attribute it to. */
export function parseCsvReport(csvText) {
  const result = Papa.parse(csvText.trim(), { skipEmptyLines: true });
  const grid = result.data;
  if (!grid.length) return { columns: [], rows: [] };

  // The header row is the one with the most non-empty cells after column A —
  // title/date rows above it typically only fill column A.
  let headerIdx = 0;
  let bestCount = -1;
  for (let i = 0; i < Math.min(grid.length, 6); i++) {
    const count = grid[i].slice(1).filter((c) => clean(c)).length;
    if (count > bestCount) {
      bestCount = count;
      headerIdx = i;
    }
  }
  const header = grid[headerIdx].map(clean);
  const columns = header.slice(1).length ? header.slice(1) : ["Total"];

  const rows = grid.slice(headerIdx + 1).map((r) => ({
    label: clean(r[0]),
    values: (columns.length ? r.slice(1, 1 + columns.length) : r.slice(1)).map(toNumber),
  }));

  return { columns, rows };
}
