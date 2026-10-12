import { addDays, iso, mondayOf, monthLabel, pad, parseISO, ymOf } from "./helpers";
import { isBillable } from "./constants";

/* ---------- date ranges ---------- */

const endOfMonth = (y, m) => iso(new Date(y, m, 0)); // m is 1-12
const monthStart = (y, m) => `${y}-${pad(m)}-01`;

export function presetRange(name, today) {
  const [y, m] = today.split("-").map(Number);
  const prev = m === 1 ? [y - 1, 12] : [y, m - 1];
  switch (name) {
    case "thisWeek": {
      const s = mondayOf(today);
      return [s, addDays(s, 6)];
    }
    case "lastWeek": {
      const s = addDays(mondayOf(today), -7);
      return [s, addDays(s, 6)];
    }
    case "thisMonth":
      return [monthStart(y, m), endOfMonth(y, m)];
    case "lastMonth":
      return [monthStart(...prev), endOfMonth(...prev)];
    case "firstHalf":
      return [monthStart(y, m), `${y}-${pad(m)}-15`];
    case "secondHalf":
      return [`${y}-${pad(m)}-16`, endOfMonth(y, m)];
    default:
      return [today, today];
  }
}

/* Steps a range forward or backward the way payroll cycles actually move: a whole month
   goes to the neighbouring month, 1st-15th and 16th-end swap halves, and anything else
   (a week, two weeks, an odd stretch) moves by its own length. */
export function shiftRange(from, to, dir) {
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);
  const sameMonth = fy === ty && fm === tm;
  const next = (y, m, step) => {
    const d = new Date(y, m - 1 + step, 1);
    return [d.getFullYear(), d.getMonth() + 1];
  };
  if (sameMonth && fd === 1 && to === endOfMonth(fy, fm)) {
    const [y, m] = next(fy, fm, dir);
    return [monthStart(y, m), endOfMonth(y, m)];
  }
  if (sameMonth && fd === 1 && td === 15) {
    if (dir > 0) return [`${fy}-${pad(fm)}-16`, endOfMonth(fy, fm)];
    const [y, m] = next(fy, fm, -1);
    return [`${y}-${pad(m)}-16`, endOfMonth(y, m)];
  }
  if (sameMonth && fd === 16 && to === endOfMonth(fy, fm)) {
    if (dir < 0) return [monthStart(fy, fm), `${fy}-${pad(fm)}-15`];
    const [y, m] = next(fy, fm, 1);
    return [monthStart(y, m), `${y}-${pad(m)}-15`];
  }
  const span = Math.round((parseISO(to) - parseISO(from)) / 86400000) + 1;
  return [addDays(from, dir * span), addDays(to, dir * span)];
}

/* ---------- grouping ---------- */

const dayLong = (d) => parseISO(d).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
const dayShort = (d) => {
  const dt = parseISO(d);
  return `${dt.toLocaleDateString("en-US", { weekday: "short" })} ${dt.getMonth() + 1}/${dt.getDate()}`;
};

/* A label to show plus a key to sort by, so dates and months order chronologically
   instead of alphabetically. */
function dimOf(e, dim, ctx, short) {
  if (dim === "person") {
    const l = ctx.empName(e.emp);
    return { label: l, sort: l.toLowerCase() };
  }
  if (dim === "client") {
    const l = ctx.clientName(e.client);
    return { label: l, sort: l.toLowerCase() };
  }
  if (dim === "service") return { label: e.svc, sort: e.svc.toLowerCase() };
  if (dim === "month") return { label: monthLabel(ymOf(e.date)), sort: ymOf(e.date) };
  return { label: short ? dayShort(e.date) : dayLong(e.date), sort: e.date };
}

export function filterEntries(entries, { from, to, scope }) {
  const [a, b] = from <= to ? [from, to] : [to, from];
  return entries.filter((e) => {
    if (e.date < a || e.date > b) return false;
    if (scope === "billable" && !isBillable(e.svc)) return false;
    if (scope === "internal" && isBillable(e.svc)) return false;
    return true;
  });
}

export function aggregate(filtered, { group, split, ctx }) {
  const rowMap = new Map();
  const colMap = new Map();
  const totals = { hours: 0, cost: 0 };
  const colTotals = {};
  filtered.forEach((e) => {
    const g = dimOf(e, group, ctx, false);
    const c = split === "none" ? { label: "Total", sort: "" } : dimOf(e, split, ctx, true);
    const h = Number(e.hours) || 0;
    const cost = h * ctx.rateOf(e.emp);
    if (!rowMap.has(g.label)) rowMap.set(g.label, { key: g.label, sort: g.sort, hours: 0, cost: 0, cells: {} });
    const r = rowMap.get(g.label);
    r.hours += h;
    r.cost += cost;
    r.cells[c.label] = (r.cells[c.label] || 0) + h;
    colMap.set(c.label, c.sort);
    colTotals[c.label] = (colTotals[c.label] || 0) + h;
    totals.hours += h;
    totals.cost += cost;
  });
  const chronological = group === "day" || group === "month";
  const rows = [...rowMap.values()].sort((a, b) =>
    chronological || split !== "none" ? a.sort.localeCompare(b.sort) : b.hours - a.hours
  );
  const cols = [...colMap.entries()].sort((a, b) => a[1].localeCompare(b[1])).map(([label]) => label);
  return { rows, cols, totals, colTotals };
}

/* One line per time entry, for payroll to check against. */
export function lineDetail(filtered, ctx) {
  return [...filtered]
    .sort((a, b) => a.date.localeCompare(b.date) || ctx.empName(a.emp).localeCompare(ctx.empName(b.emp)))
    .map((e) => ({
      date: e.date,
      day: parseISO(e.date).toLocaleDateString("en-US", { weekday: "long" }),
      person: ctx.empName(e.emp),
      client: ctx.clientName(e.client),
      project: e.project ? ctx.projectName(e.project) : "",
      service_type: e.svc,
      hours: Number(e.hours) || 0,
    }));
}
