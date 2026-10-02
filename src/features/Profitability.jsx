import React, { useMemo, useState } from "react";
import { BRAND, DEFAULT_CAPABILITY_MAP, DEFAULT_INDUSTRIES } from "../lib/constants";
import { isBillable } from "../lib/constants";
import {
  clean,
  hrs,
  linearForecast,
  monthLabel,
  monthsInQuarter,
  money,
  norm,
  num,
  pickCol,
  quarterLabel,
  quarterOf,
  todayISO,
  toNumber,
  uid,
  downloadCSV,
} from "../lib/helpers";
import { isAdminLevel } from "../lib/roles";
import { Btn, Card, CsvInput, Label, Select, Stat, Td, Th } from "../components/ui";
import { RankedBarChart, TrendChart } from "../components/charts";
import QuickBooksImport from "./QuickBooksImport";

const DIMENSIONS = [
  { value: "client", label: "By client" },
  { value: "project", label: "By project" },
  { value: "service", label: "By service type" },
  { value: "capability", label: "By capability" },
  { value: "industry", label: "By industry" },
  { value: "resource", label: "By resource" },
];

/* Finance rows carry client + service type as free text from the uploaded file, so
   client/service/capability can group straight off them. Project only groups cleanly
   when the file includes a project column; rows without one fall into a "General"
   bucket for that client rather than being silently dropped. Resource is the one
   dimension finance never names directly, so its revenue is allocated across the
   people who logged billable hours to that client, in proportion to their hours —
   an estimate, and labeled as one in the UI. */
function aggregate({ cfg, periodEntries, periodFinance, dimension, inScope, rateOf, clientName, empName }) {
  const matchClientId = (name) => cfg.clients.find((c) => norm(c.name) === norm(name))?.id || null;
  const projectName = (id) => (cfg.projects || []).find((p) => p.id === id)?.name || "General";
  const capabilityOf = (svc) => (cfg.capabilityMap || DEFAULT_CAPABILITY_MAP)[svc] || "Uncategorized";
  const industryOf = (clientId) => cfg.clients.find((c) => c.id === clientId)?.industry || "Unassigned";

  const finRows = periodFinance.filter((f) => {
    const cid = matchClientId(f.client);
    return !cid || inScope(cid);
  });
  const billable = periodEntries.filter((e) => inScope(e.client) && isBillable(e.svc));
  const internalEntries = periodEntries.filter((e) => inScope(e.client) && !isBillable(e.svc));

  if (dimension === "resource") {
    const map = new Map();
    const hoursByClient = new Map();
    billable.forEach((e) => {
      if (!hoursByClient.has(e.client)) hoursByClient.set(e.client, []);
      hoursByClient.get(e.client).push(e);
    });
    finRows.forEach((f) => {
      const cid = matchClientId(f.client);
      if (!cid) return;
      const clientEntries = hoursByClient.get(cid) || [];
      const totalHours = clientEntries.reduce((s, e) => s + Number(e.hours || 0), 0);
      if (!totalHours) return;
      const byEmp = new Map();
      clientEntries.forEach((e) => byEmp.set(e.emp, (byEmp.get(e.emp) || 0) + Number(e.hours || 0)));
      byEmp.forEach((h, emp) => {
        const share = h / totalHours;
        if (!map.has(emp)) map.set(emp, { key: empName(emp), revenue: 0, cogs: 0, labor: 0, hours: 0 });
        const row = map.get(emp);
        row.revenue += f.revenue * share;
        row.cogs += f.cogs * share;
      });
    });
    billable.forEach((e) => {
      if (!map.has(e.emp)) map.set(e.emp, { key: empName(e.emp), revenue: 0, cogs: 0, labor: 0, hours: 0 });
      const row = map.get(e.emp);
      row.labor += Number(e.hours || 0) * rateOf(e.emp);
      row.hours += Number(e.hours || 0);
    });
    const totalHoursAll = new Map();
    periodEntries.forEach((e) => {
      if (!inScope(e.client)) return;
      totalHoursAll.set(e.emp, (totalHoursAll.get(e.emp) || 0) + Number(e.hours || 0));
    });
    const rows = [...map.entries()].map(([emp, r]) => ({
      ...r,
      gp: r.revenue - r.cogs - r.labor,
      margin: r.revenue ? (r.revenue - r.cogs - r.labor) / r.revenue : null,
      utilization: totalHoursAll.get(emp) ? r.hours / totalHoursAll.get(emp) : null,
    }));
    return { rows: rows.sort((a, b) => b.gp - a.gp), unmatched: [] };
  }

  const keyFor = (f) => {
    if (dimension === "client") return f.client;
    if (dimension === "service") return f.svc || "Unassigned service";
    if (dimension === "capability") return f.svc ? capabilityOf(f.svc) : "Uncategorized";
    if (dimension === "project") {
      const cid = matchClientId(f.client);
      return `${f.client} — ${f.project ? projectName(f.project) : "General"}`;
    }
    if (dimension === "industry") {
      const cid = matchClientId(f.client);
      return cid ? industryOf(cid) : "Unassigned";
    }
    return f.client;
  };

  const map = new Map();
  const seen = new Set();
  finRows.forEach((f) => {
    const cid = matchClientId(f.client);
    const key = keyFor(f);
    if (!map.has(key)) map.set(key, { key, revenue: 0, cogs: 0, labor: 0, hours: 0, matched: !!cid });
    const row = map.get(key);
    row.revenue += f.revenue;
    row.cogs += f.cogs;
    if (cid) {
      // Always match labor at the finance row's own granularity (its client, its project if
      // any, its service type) regardless of which dimension is on screen — the display
      // grouping must never change how much labor a given revenue row is charged with.
      const matching = billable.filter(
        (e) => e.client === cid && e.svc === f.svc && (e.project || null) === (f.project || null)
      );
      row.labor += matching.reduce((s, e) => s + Number(e.hours || 0) * rateOf(e.emp), 0);
      row.hours += matching.reduce((s, e) => s + Number(e.hours || 0), 0);
      seen.add(`${cid}||${f.svc || ""}||${f.project || ""}`);
      row.matched = true;
    }
  });

  // billable time with no matching revenue line
  billable.forEach((e) => {
    const combo = `${e.client}||${e.svc}||${e.project || ""}`;
    if (seen.has(combo)) return;
    let key;
    if (dimension === "client") key = clientName(e.client);
    else if (dimension === "service") key = e.svc;
    else if (dimension === "capability") key = capabilityOf(e.svc);
    else if (dimension === "project") key = `${clientName(e.client)} — ${e.project ? projectName(e.project) : "General"}`;
    else if (dimension === "industry") key = industryOf(e.client);
    else key = clientName(e.client);
    if (!map.has(key)) map.set(key, { key, revenue: 0, cogs: 0, labor: 0, hours: 0, matched: false, orphan: true });
    const row = map.get(key);
    row.labor += Number(e.hours || 0) * rateOf(e.emp);
    row.hours += Number(e.hours || 0);
    row.orphan = true;
  });

  const rows = [...map.values()]
    .map((r) => ({ ...r, gp: r.revenue - r.cogs - r.labor, margin: r.revenue ? (r.revenue - r.cogs - r.labor) / r.revenue : null }))
    .sort((a, b) => b.gp - a.gp);

  const unmatched = finRows.filter((f) => !matchClientId(f.client));
  return { rows, unmatched, internalEntries };
}

export default function Profitability({ cfg, entries, finance, months, saveFinance, clientById, clientName, empName, rateOf, meRecord }) {
  const thisMonth = todayISO().slice(0, 7);
  const [granularity, setGranularity] = useState("month");
  const [ym, setYm] = useState(months.includes(thisMonth) ? thisMonth : months[months.length - 1] || thisMonth);
  const quarters = useMemo(() => [...new Set(months.map(quarterOf))].sort(), [months]);
  const thisQuarter = quarterOf(thisMonth);
  const [qk, setQk] = useState(quarters.includes(thisQuarter) ? thisQuarter : quarters[quarters.length - 1] || thisQuarter);
  const [dimension, setDimension] = useState("client");

  const periodMonths = granularity === "quarter" ? monthsInQuarter(qk).filter((m) => months.includes(m)) : [ym];
  const periodLabel = granularity === "quarter" ? quarterLabel(qk) : monthLabel(ym);

  const scopedClientIds = isAdminLevel(meRecord?.accessLevel) ? null : meRecord?.managedClients || [];
  const inScope = (clientId) => scopedClientIds === null || scopedClientIds.includes(clientId);

  const periodEntries = useMemo(() => periodMonths.flatMap((m) => entries[m] || []), [periodMonths, entries]);
  const periodFinance = useMemo(() => periodMonths.flatMap((m) => finance[m] || []), [periodMonths, finance]);

  const { rows: lines, unmatched = [], internalEntries = [] } = useMemo(
    () => aggregate({ cfg, periodEntries, periodFinance, dimension, inScope, rateOf, clientName, empName }),
    [cfg, periodEntries, periodFinance, dimension, scopedClientIds, rateOf]
  );

  const internal = useMemo(() => {
    const map = new Map();
    (dimension === "resource" ? periodEntries.filter((e) => inScope(e.client) && !isBillable(e.svc)) : internalEntries).forEach((e) => {
      if (!map.has(e.svc)) map.set(e.svc, { key: e.svc, hours: 0, cost: 0 });
      const r = map.get(e.svc);
      r.hours += Number(e.hours || 0);
      r.cost += Number(e.hours || 0) * rateOf(e.emp);
    });
    return [...map.values()].sort((a, b) => b.cost - a.cost);
  }, [internalEntries, periodEntries, dimension, rateOf]);

  const totals = lines.reduce(
    (acc, r) => ({
      revenue: acc.revenue + r.revenue,
      cogs: acc.cogs + r.cogs,
      labor: acc.labor + r.labor,
      hours: acc.hours + r.hours,
      gp: acc.gp + r.gp,
    }),
    { revenue: 0, cogs: 0, labor: 0, hours: 0, gp: 0 }
  );
  const internalCost = internal.reduce((s, r) => s + r.cost, 0);
  const canImport = isAdminLevel(meRecord?.accessLevel);

  // Trend across the last up to 6 periods, at whatever granularity is selected, for the
  // agency total and for the current dimension's top rows — the forward-looking piece.
  const trendPeriods = useMemo(() => {
    const all = granularity === "quarter" ? quarters : months;
    const idx = all.indexOf(granularity === "quarter" ? qk : ym);
    const end = idx >= 0 ? idx + 1 : all.length;
    return all.slice(Math.max(0, end - 6), end);
  }, [granularity, quarters, months, qk, ym]);

  const trendSeries = useMemo(() => {
    const totalsByPeriod = trendPeriods.map((p) => {
      const pm = granularity === "quarter" ? monthsInQuarter(p).filter((m) => months.includes(m)) : [p];
      const pe = pm.flatMap((m) => entries[m] || []);
      const pf = pm.flatMap((m) => finance[m] || []);
      const { rows } = aggregate({ cfg, periodEntries: pe, periodFinance: pf, dimension: "client", inScope, rateOf, clientName, empName });
      return rows.reduce(
        (acc, r) => ({ revenue: acc.revenue + r.revenue, cost: acc.cost + r.cogs + r.labor, gp: acc.gp + r.gp }),
        { revenue: 0, cost: 0, gp: 0 }
      );
    });
    return {
      labels: trendPeriods.map((p) => (granularity === "quarter" ? quarterLabel(p) : monthLabel(p))),
      revenue: totalsByPeriod.map((t) => t.revenue),
      cost: totalsByPeriod.map((t) => t.cost),
      gp: totalsByPeriod.map((t) => t.gp),
    };
  }, [trendPeriods, granularity, months, entries, finance, cfg, scopedClientIds, rateOf]);

  const forecast = linearForecast(trendSeries.gp);
  const canForecast = trendSeries.gp.length >= 3;

  const importFinance = (raw) => {
    const rows = raw
      .map((r) => ({
        id: uid(),
        client: clean(pickCol(r, ["client", "client name", "customer", "account"])),
        project: clean(pickCol(r, ["project", "project name"])) || null,
        svc: clean(pickCol(r, ["service type", "service", "servicetype", "category"])),
        revenue: toNumber(pickCol(r, ["revenue", "rev", "income", "sales"])),
        cogs: toNumber(pickCol(r, ["cogs", "expense", "cost", "direct cost", "pass through"])),
      }))
      .filter((r) => r.client);
    saveFinance(ym, rows);
  };

  const dimLabel = DIMENSIONS.find((d) => d.value === dimension)?.label.replace("By ", "") || dimension;

  return (
    <>
      {canImport && granularity === "month" && (
        <Card
          title="Monthly revenue and cost import"
          note="One row per client (and optionally project) and service type. Columns can be named loosely — the import looks for client, project, service type, revenue and COGS."
          right={
            <div style={{ width: 170 }}>
              <Select value={ym} onChange={setYm} options={months.map((m) => ({ value: m, label: monthLabel(m) }))} />
            </div>
          }
        >
          <CsvInput label={`Load the ${monthLabel(ym)} file`} onRows={importFinance} />
          {(finance[ym] || []).length > 0 && (
            <p className="text-sm mt-3" style={{ color: BRAND.slate }}>
              {num((finance[ym] || []).length)} rows loaded for {monthLabel(ym)}. Loading again replaces the month.
            </p>
          )}
        </Card>
      )}

      {canImport && granularity === "month" && (
        <QuickBooksImport
          monthLabel={monthLabel(ym)}
          cfg={cfg}
          onCommit={(newRows) => saveFinance(ym, [...(finance[ym] || []), ...newRows.map((r) => ({ id: uid(), ...r }))])}
        />
      )}

      <Card
        title={`Profitability, ${periodLabel}`}
        note="Gross profit is revenue less COGS less the labor cost of time booked. Resource figures allocate each client's revenue across the people who logged hours to it, in proportion to their hours — an estimate, not a literal per-person bill."
        right={
          <>
            <Select
              value={granularity}
              onChange={setGranularity}
              options={[
                { value: "month", label: "Monthly" },
                { value: "quarter", label: "Quarterly" },
              ]}
              width={110}
            />
            {granularity === "month" ? (
              <Select value={ym} onChange={setYm} options={months.map((m) => ({ value: m, label: monthLabel(m) }))} width={140} />
            ) : (
              <Select value={qk} onChange={setQk} options={quarters.map((q) => ({ value: q, label: quarterLabel(q) }))} width={140} />
            )}
            <Select value={dimension} onChange={setDimension} options={DIMENSIONS} width={170} />
            <Btn
              onClick={() =>
                downloadCSV(
                  `s4_profitability_${granularity === "quarter" ? qk : ym}_by_${dimension}.csv`,
                  lines.map((r) => ({
                    [dimension]: r.key,
                    revenue: Math.round(r.revenue),
                    cogs: Math.round(r.cogs || 0),
                    hours: r.hours,
                    labor_cost: Math.round(r.labor),
                    gross_profit: Math.round(r.gp),
                    margin_pct: r.margin === null || r.margin === undefined ? "" : Math.round(r.margin * 100),
                  }))
                )
              }
              disabled={!lines.length}
            >
              Download CSV
            </Btn>
          </>
        }
      >
        <div className="flex flex-wrap gap-8 mb-4 pb-4 border-b" style={{ borderColor: BRAND.line }}>
          <Stat label="Revenue" value={money(totals.revenue)} />
          <Stat label="COGS" value={money(totals.cogs)} />
          <Stat label="Labor" value={money(totals.labor)} />
          <Stat label="Gross profit" value={money(totals.gp)} color={totals.gp < 0 ? BRAND.red : BRAND.teal} />
          <Stat
            label="Margin"
            value={totals.revenue ? `${num((totals.gp / totals.revenue) * 100, 0)}%` : "n/a"}
            color={totals.gp < 0 ? BRAND.red : BRAND.navy}
          />
        </div>

        {lines.length > 0 && (
          <div className="mb-6 pb-6 border-b" style={{ borderColor: BRAND.line }}>
            <div className="text-xs font-semibold mb-3" style={{ color: BRAND.navy }}>
              Gross profit by {dimLabel}
            </div>
            <RankedBarChart data={lines.slice(0, 12)} labelKey="key" valueKey="gp" />
            {lines.length > 12 && (
              <p className="text-xs mt-2" style={{ color: BRAND.slate }}>
                Showing the top 12 of {num(lines.length)}. Full detail is in the table below and the CSV export.
              </p>
            )}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <Th>{DIMENSIONS.find((d) => d.value === dimension)?.label.replace("By ", "")}</Th>
                <Th align="right">Revenue</Th>
                <Th align="right">COGS</Th>
                <Th align="right">Hours</Th>
                <Th align="right">Labor</Th>
                {dimension === "resource" && <Th align="right">Utilization</Th>}
                <Th align="right">Gross profit</Th>
                <Th align="right">Margin</Th>
              </tr>
            </thead>
            <tbody>
              {lines.map((r) => (
                <tr key={r.key}>
                  <Td>
                    {r.key}
                    {r.orphan && r.revenue === 0 && (
                      <span className="ml-2 text-xs" style={{ color: BRAND.amber }}>
                        time only, no revenue row
                      </span>
                    )}
                  </Td>
                  <Td align="right" mono>
                    {money(r.revenue)}
                  </Td>
                  <Td align="right" mono>
                    {money(r.cogs || 0)}
                  </Td>
                  <Td align="right" mono>
                    {hrs(r.hours)}
                  </Td>
                  <Td align="right" mono>
                    {money(r.labor)}
                  </Td>
                  {dimension === "resource" && (
                    <Td align="right" mono>
                      {r.utilization === null || r.utilization === undefined ? "n/a" : `${num(r.utilization * 100, 0)}%`}
                    </Td>
                  )}
                  <Td align="right" mono strong>
                    <span style={{ color: r.gp < 0 ? BRAND.red : BRAND.navy }}>{money(r.gp)}</span>
                  </Td>
                  <Td align="right" mono>
                    {r.margin === null || r.margin === undefined ? "n/a" : `${num(r.margin * 100, 0)}%`}
                  </Td>
                </tr>
              ))}
              {!lines.length && (
                <tr>
                  <td colSpan={8} className="px-3 py-6 text-sm" style={{ color: BRAND.slate }}>
                    Load a revenue file for this period, or book some client time, and the analysis fills in.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {unmatched.length > 0 && (
          <div className="mt-4 border-l-4 p-3" style={{ borderColor: BRAND.amber, background: "#FFF8EC" }}>
            <div className="text-sm font-semibold">
              {num(unmatched.length)} rows have a client name that does not match the client list
            </div>
            <p className="text-xs mt-1" style={{ color: BRAND.slate }}>
              Revenue still counts, but no time can be attached to it. Names in question:{" "}
              {[...new Set(unmatched.map((u) => u.client))].slice(0, 8).join(", ")}. Fix the spelling in the file or add
              the client in Setup.
            </p>
          </div>
        )}
      </Card>

      <Card
        title="Trend and outlook"
        note={`Gross profit, revenue and cost across the last ${trendSeries.labels.length} ${granularity === "quarter" ? "quarters" : "months"}.`}
      >
        <TrendChart
          periods={trendSeries.labels}
          series={[
            { name: "Revenue", values: trendSeries.revenue },
            { name: "Cost", values: trendSeries.cost },
            { name: "Gross profit", values: trendSeries.gp },
          ]}
        />
        <div className="mt-4 pt-4 border-t flex flex-wrap gap-8" style={{ borderColor: BRAND.line }}>
          <Stat
            label={`Projected next ${granularity === "quarter" ? "quarter" : "month"} GP`}
            value={canForecast ? money(forecast.next) : "Needs more history"}
            color={canForecast && forecast.next < 0 ? BRAND.red : BRAND.navy}
          />
          <Stat
            label="Direction"
            value={!canForecast ? "n/a" : forecast.slope > 1 ? "Trending up" : forecast.slope < -1 ? "Trending down" : "Flat"}
            color={!canForecast ? BRAND.slate : forecast.slope >= 0 ? BRAND.teal : BRAND.red}
          />
        </div>
        {!canForecast && (
          <p className="text-xs mt-3" style={{ color: BRAND.slate }}>
            Projection needs at least 3 periods of history. Keep importing revenue files and this fills in.
          </p>
        )}
      </Card>

      <Card
        title="Internal time is not in the numbers above"
        note="Internal Admin, Operations, Tech, Sales Support and Research carry no revenue, so they sit here as an overhead pool rather than dragging a client into the red."
      >
        <div className="flex flex-wrap gap-8 mb-4">
          <Stat label="Internal cost" value={money(internalCost)} color={BRAND.amber} />
          <Stat
            label="Gross profit after internal"
            value={money(totals.gp - internalCost)}
            color={totals.gp - internalCost < 0 ? BRAND.red : BRAND.teal}
          />
        </div>
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <Th>Service type</Th>
              <Th align="right">Hours</Th>
              <Th align="right">Cost</Th>
            </tr>
          </thead>
          <tbody>
            {internal.map((r) => (
              <tr key={r.key}>
                <Td>{r.key}</Td>
                <Td align="right" mono>
                  {hrs(r.hours)}
                </Td>
                <Td align="right" mono>
                  {money(r.cost)}
                </Td>
              </tr>
            ))}
            {!internal.length && (
              <tr>
                <td colSpan={3} className="px-3 py-4 text-sm" style={{ color: BRAND.slate }}>
                  No internal time booked this period.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </>
  );
}
