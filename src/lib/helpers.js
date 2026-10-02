import Papa from "papaparse";

export const uid = () => Math.random().toString(36).slice(2, 10);
export const pad = (n) => String(n).padStart(2, "0");
export const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const ymOf = (dateStr) => dateStr.slice(0, 7);
export const todayISO = () => iso(new Date());

export const parseISO = (s) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};

export const mondayOf = (dateStr) => {
  const d = parseISO(dateStr);
  const shift = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - shift);
  return iso(d);
};

export const addDays = (dateStr, n) => {
  const d = parseISO(dateStr);
  d.setDate(d.getDate() + n);
  return iso(d);
};

export const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export const monthLabel = (ym) => {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "short", year: "numeric" });
};

/* Quarter helpers: a "quarter key" is "YYYY-Q1".."YYYY-Q4", derived from a YYYY-MM month key. */
export const quarterOf = (ym) => {
  const [y, m] = ym.split("-").map(Number);
  return `${y}-Q${Math.floor((m - 1) / 3) + 1}`;
};

export const quarterLabel = (qk) => qk.replace("-", " ");

export const monthsInQuarter = (qk) => {
  const [y, q] = qk.split("-Q").map(Number);
  const startMonth = (q - 1) * 3 + 1;
  return [0, 1, 2].map((i) => `${y}-${pad(startMonth + i)}`);
};

export const num = (n, dp = 0) =>
  (Number(n) || 0).toLocaleString("en-US", { minimumFractionDigits: dp, maximumFractionDigits: dp });

export const money = (n) => {
  const v = Number(n) || 0;
  const s = Math.abs(v).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  return (v < 0 ? "-$" : "$") + s;
};

export const hrs = (n) => (Number(n) || 0).toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 2 });

export const clean = (s) => String(s ?? "").trim();
export const norm = (s) => clean(s).toLowerCase().replace(/[^a-z0-9]/g, "");

export function pickCol(row, candidates) {
  const keys = Object.keys(row);
  for (const cand of candidates) {
    const hit = keys.find((k) => norm(k) === norm(cand));
    if (hit) return row[hit];
  }
  for (const cand of candidates) {
    const hit = keys.find((k) => norm(k).includes(norm(cand)));
    if (hit) return row[hit];
  }
  return "";
}

export const toNumber = (v) => {
  const n = parseFloat(String(v ?? "").replace(/[$,()\s]/g, ""));
  if (isNaN(n)) return 0;
  return /^\s*\(/.test(String(v)) ? -n : n;
};

/* Simple least-squares trend over a short recent history. Used only for a
   directional "projected next period" cue, never shown as a firm number with
   fewer than 3 data points behind it. */
export function linearForecast(values) {
  const n = values.length;
  if (n < 2) return { slope: 0, next: values[0] || 0 };
  const xs = values.map((_, i) => i);
  const xMean = xs.reduce((a, b) => a + b, 0) / n;
  const yMean = values.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - xMean) * (values[i] - yMean);
    den += (xs[i] - xMean) ** 2;
  }
  const slope = den === 0 ? 0 : num / den;
  const intercept = yMean - slope * xMean;
  const next = slope * n + intercept;
  return { slope, next };
}

export function downloadCSV(filename, rows) {
  const csv = Papa.unparse(rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
