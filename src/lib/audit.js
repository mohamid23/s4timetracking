import { ROLE_LABEL } from "./constants";
import { money, monthLabel } from "./helpers";

/* Turns a before/after pair into short plain-language lines for the activity log:
   what was added, removed, or changed, with the old and new values. */

const MAX_LINES = 40;

const show = (v) => (v === "" || v === null || v === undefined ? "(blank)" : String(v));
const fmtRate = (n) => `$${Number(n || 0).toFixed(2).replace(/\.00$/, "")}/hr`;
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

function cap(lines) {
  if (lines.length <= MAX_LINES) return lines;
  return [...lines.slice(0, MAX_LINES), `…and ${lines.length - MAX_LINES} more`];
}

function diffById(prev = [], next = []) {
  const pm = new Map(prev.map((x) => [x.id, x]));
  const nm = new Map(next.map((x) => [x.id, x]));
  return {
    added: next.filter((x) => !pm.has(x.id)),
    removed: prev.filter((x) => !nm.has(x.id)),
    changed: next.filter((x) => pm.has(x.id) && !same(x, pm.get(x.id))).map((x) => ({ before: pm.get(x.id), after: x })),
  };
}

function changedKeys(before, after, skip = []) {
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  return [...keys].filter((k) => k !== "id" && !skip.includes(k) && !same(before[k], after[k]));
}

export function diffCfg(prev, next) {
  if (!prev || !next) return [];
  const lines = [];
  const clientNameIn = (cfg, id) => cfg.clients?.find((c) => c.id === id)?.name || id;

  // clients
  const c = diffById(prev.clients, next.clients);
  c.added.forEach((x) => lines.push(`Added client "${x.name}"${x.industry ? ` (${x.industry})` : ""}`));
  c.removed.forEach((x) => lines.push(`Removed client "${x.name}"`));
  c.changed.forEach(({ before, after }) => {
    changedKeys(before, after).forEach((k) => {
      if (k === "name") lines.push(`Renamed client "${before.name}" to "${after.name}"`);
      else if (k === "industry") lines.push(`Client "${after.name}": industry ${show(before.industry)} → ${show(after.industry)}`);
      else if (k === "active") lines.push(`Client "${after.name}": ${after.active === false ? "hidden from time entry" : "shown in time entry"}`);
      else lines.push(`Client "${after.name}": ${k} ${show(before[k])} → ${show(after[k])}`);
    });
  });

  // people
  const e = diffById(prev.employees, next.employees);
  e.added.forEach((x) =>
    lines.push(`Added person "${x.name}"${x.email ? ` <${x.email}>` : ""} as ${ROLE_LABEL[x.accessLevel] || "Contributor"}`)
  );
  e.removed.forEach((x) => lines.push(`Removed person "${x.name}"`));
  e.changed.forEach(({ before, after }) => {
    changedKeys(before, after).forEach((k) => {
      const who = `"${after.name}"`;
      if (k === "name") lines.push(`Renamed person "${before.name}" to "${after.name}"`);
      else if (k === "email") lines.push(`${who}: email ${show(before.email)} → ${show(after.email)}`);
      else if (k === "role") lines.push(`${who}: title ${show(before.role)} → ${show(after.role)}`);
      else if (k === "rate") lines.push(`${who}: hourly cost ${fmtRate(before.rate)} → ${fmtRate(after.rate)}`);
      else if (k === "accessLevel")
        lines.push(`${who}: access ${ROLE_LABEL[before.accessLevel] || show(before.accessLevel)} → ${ROLE_LABEL[after.accessLevel] || show(after.accessLevel)}`);
      else if (k === "managedClients") {
        const b = new Set(before.managedClients || []);
        const a = new Set(after.managedClients || []);
        [...a].filter((id) => !b.has(id)).forEach((id) => lines.push(`${who}: now manages "${clientNameIn(next, id)}"`));
        [...b].filter((id) => !a.has(id)).forEach((id) => lines.push(`${who}: no longer manages "${clientNameIn(prev, id)}"`));
      } else lines.push(`${who}: ${k} ${show(before[k])} → ${show(after[k])}`);
    });
  });

  // projects
  const p = diffById(prev.projects, next.projects);
  p.added.forEach((x) => lines.push(`Added project "${x.name}" under "${clientNameIn(next, x.clientId)}"`));
  p.removed.forEach((x) => lines.push(`Removed project "${x.name}" from "${clientNameIn(prev, x.clientId)}"`));
  p.changed.forEach(({ before, after }) => {
    changedKeys(before, after).forEach((k) => {
      if (k === "name") lines.push(`Renamed project "${before.name}" to "${after.name}"`);
      else if (k === "active") lines.push(`Project "${after.name}": ${after.active === false ? "hidden" : "shown"}`);
      else lines.push(`Project "${after.name}": ${k} ${show(before[k])} → ${show(after[k])}`);
    });
  });

  // plain lists
  const listDiff = (label, a = [], b = []) => {
    b.filter((x) => !a.includes(x)).forEach((x) => lines.push(`Added ${label} "${x}"`));
    a.filter((x) => !b.includes(x)).forEach((x) => lines.push(`Removed ${label} "${x}"`));
  };
  listDiff("service type", prev.services, next.services);
  listDiff("industry", prev.industries, next.industries);

  // capability mapping
  const pm = prev.capabilityMap || {};
  const nm = next.capabilityMap || {};
  new Set([...Object.keys(pm), ...Object.keys(nm)]).forEach((svc) => {
    if (pm[svc] !== nm[svc]) lines.push(`Capability for "${svc}": ${show(pm[svc])} → ${show(nm[svc])}`);
  });

  return cap(lines);
}

/* Compares one person's rows for a month before and after a time-entry edit. */
export function diffHours(before = [], after = [], ctx) {
  const lines = [];
  const bm = new Map(before.map((r) => [r.id, r]));
  const am = new Map(after.map((r) => [r.id, r]));
  const where = (r) => {
    const project = r.project ? ctx.projectName(r.project) : "";
    return `${ctx.clientName(r.client)}${project ? ` / ${project}` : ""} · ${r.svc}`;
  };
  after.forEach((r) => {
    const b = bm.get(r.id);
    if (!b) lines.push(`Logged ${r.hours}h on ${where(r)} for ${r.date}`);
    else if (Number(b.hours) !== Number(r.hours)) lines.push(`Changed ${where(r)} for ${r.date}: ${b.hours}h → ${r.hours}h`);
  });
  before.forEach((r) => {
    if (!am.has(r.id)) lines.push(`Removed ${r.hours}h on ${where(r)} for ${r.date}`);
  });
  return cap(lines);
}

/* Compares a month of revenue/cost rows before and after an import. */
export function diffFinance(before = [], after = [], ym) {
  const lines = [];
  const bm = new Map(before.map((r) => [r.id, r]));
  const am = new Map(after.map((r) => [r.id, r]));
  const row = (r) =>
    `${r.client}${r.project ? ` — ${r.project}` : ""}${r.svc ? ` · ${r.svc}` : ""}: revenue ${money(r.revenue)}, COGS ${money(r.cogs)}`;
  const added = after.filter((r) => !bm.has(r.id));
  const removed = before.filter((r) => !am.has(r.id));
  const sum = (rows, k) => rows.reduce((s, r) => s + (Number(r[k]) || 0), 0);
  if (removed.length) lines.push(`Replaced ${removed.length} existing row${removed.length === 1 ? "" : "s"} (revenue ${money(sum(removed, "revenue"))}, COGS ${money(sum(removed, "cogs"))})`);
  added.forEach((r) => lines.push(`Added ${row(r)}`));
  const summary = added.length
    ? `${removed.length ? "Replaced" : "Imported"} ${monthLabel(ym)}: ${added.length} row${added.length === 1 ? "" : "s"}, revenue ${money(sum(added, "revenue"))}, COGS ${money(sum(added, "cogs"))}`
    : `Removed all revenue rows for ${monthLabel(ym)}`;
  return { summary, changes: cap(lines) };
}
