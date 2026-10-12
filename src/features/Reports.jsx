import React, { useMemo, useState } from "react";
import { BRAND } from "../lib/constants";
import { isBillable } from "../lib/constants";
import { downloadCSV, hrs, money, num, todayISO } from "../lib/helpers";
import { aggregate, filterEntries, lineDetail, presetRange, shiftRange } from "../lib/reports";
import { Bar, Btn, Card, Field, Label, Select, Stat, Td, Th } from "../components/ui";
import { RankedBarChart } from "../components/charts";

const DIMS = [
  { value: "person", label: "Person" },
  { value: "day", label: "Day" },
  { value: "client", label: "Client" },
  { value: "service", label: "Service type" },
  { value: "month", label: "Month" },
];
const dimName = (v) => DIMS.find((d) => d.value === v)?.label || v;

const PRESETS = [
  ["thisWeek", "This week"],
  ["lastWeek", "Last week"],
  ["firstHalf", "1st–15th"],
  ["secondHalf", "16th–end"],
  ["thisMonth", "This month"],
  ["lastMonth", "Last month"],
];

/* `showCost` is false for people who can see hours but not what anyone costs
   (payroll), so no labor cost appears on screen or in either download. */
export default function Reports({ cfg, allEntries, empName, clientName, rateOf, showCost }) {
  const today = todayISO();
  const [initFrom, initTo] = presetRange("thisMonth", today);
  const [from, setFrom] = useState(initFrom);
  const [to, setTo] = useState(initTo);
  const [group, setGroup] = useState("person");
  const [split, setSplit] = useState("day");
  const [scope, setScope] = useState("all");

  const ctx = useMemo(
    () => ({
      empName,
      clientName,
      rateOf,
      projectName: (id) => (cfg.projects || []).find((p) => p.id === id)?.name || "",
    }),
    [empName, clientName, rateOf, cfg.projects]
  );

  const reversed = from > to;
  const [a, b] = reversed ? [to, from] : [from, to];
  const filtered = useMemo(() => filterEntries(allEntries, { from, to, scope }), [allEntries, from, to, scope]);
  const { rows, cols, totals, colTotals } = useMemo(() => aggregate(filtered, { group, split, ctx }), [filtered, group, split, ctx]);
  const clientHours = filtered.filter((e) => isBillable(e.svc)).reduce((s, e) => s + (Number(e.hours) || 0), 0);

  const setRange = ([f, t]) => {
    setFrom(f);
    setTo(t);
  };
  const step = (dir) => setRange(shiftRange(a, b, dir));

  const exportGrid = () =>
    downloadCSV(
      `s4_hours_${a}_to_${b}.csv`,
      rows.map((r) => {
        const base = { [dimName(group).toLowerCase()]: r.key, hours: r.hours };
        if (showCost) base.labor_cost = Math.round(r.cost);
        if (split !== "none") cols.forEach((c) => (base[c] = r.cells[c] || 0));
        return base;
      })
    );
  const exportDetail = () => downloadCSV(`s4_time_entries_${a}_to_${b}.csv`, lineDetail(filtered, ctx));

  // The chart ranks the biggest rows; days and months read better in date order, all shown.
  const chronological = group === "day" || group === "month";
  const chartRows = chronological ? rows : [...rows].sort((x, y) => y.hours - x.hours);
  const chartShown = chronological ? chartRows : chartRows.slice(0, 12);

  const colSpan = 1 + (split !== "none" ? cols.length : 0) + 1 + (showCost ? 1 : 0) + 1;

  return (
    <Card
      title="Hours"
      note={
        showCost
          ? "Pick any start and end date. Labor cost is hours multiplied by the hourly cost on each person's record."
          : "Pick any start and end date. Switch Group by to Person and Break out by to Day for a daily grid per person."
      }
      right={
        <>
          <Btn onClick={exportDetail} disabled={!filtered.length}>
            Download every entry
          </Btn>
          <Btn kind="solid" onClick={exportGrid} disabled={!rows.length}>
            Download this table
          </Btn>
        </>
      }
    >
      <div className="flex flex-wrap items-end gap-4 mb-3">
        <div style={{ width: 160 }}>
          <Label>Start date</Label>
          <Field type="date" value={from} onChange={setFrom} />
        </div>
        <div style={{ width: 160 }}>
          <Label>End date</Label>
          <Field type="date" value={to} onChange={setTo} />
        </div>
        <div className="flex gap-2 pb-0.5">
          <Btn onClick={() => step(-1)} title="Move back by the same period">
            ← Previous
          </Btn>
          <Btn onClick={() => step(1)} title="Move forward by the same period">
            Next →
          </Btn>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="text-xs uppercase tracking-widest mr-1" style={{ color: BRAND.slate }}>
          Quick pick
        </span>
        {PRESETS.map(([k, label]) => (
          <Btn key={k} onClick={() => setRange(presetRange(k, today))}>
            {label}
          </Btn>
        ))}
      </div>
      {reversed && (
        <p className="text-xs mb-3" style={{ color: BRAND.amber }}>
          The start date is after the end date, so this is showing {a} to {b}.
        </p>
      )}

      <div className="flex flex-wrap gap-4 mb-4">
        <div style={{ width: 170 }}>
          <Label>Group by</Label>
          <Select value={group} onChange={setGroup} options={DIMS} />
        </div>
        <div style={{ width: 170 }}>
          <Label>Break out by</Label>
          <Select value={split} onChange={setSplit} options={[{ value: "none", label: "No breakout" }, ...DIMS]} />
        </div>
        <div style={{ width: 170 }}>
          <Label>Include</Label>
          <Select
            value={scope}
            onChange={setScope}
            options={[
              { value: "all", label: "All work" },
              { value: "billable", label: "Client work only" },
              { value: "internal", label: "Internal only" },
            ]}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-8 mb-4 pb-4 border-b" style={{ borderColor: BRAND.line }}>
        <Stat label="Hours" value={hrs(totals.hours)} />
        {showCost && <Stat label="Labor cost" value={money(totals.cost)} />}
        <Stat label="Client work share" value={totals.hours ? `${num((clientHours / totals.hours) * 100, 0)}%` : "0%"} />
      </div>

      {rows.length > 0 && split === "none" && (
        <div className="mb-6 pb-6 border-b" style={{ borderColor: BRAND.line }}>
          <div className="text-xs font-semibold mb-3" style={{ color: BRAND.navy }}>
            Hours by {dimName(group).toLowerCase()}
          </div>
          <RankedBarChart data={chartShown} labelKey="key" valueKey="hours" valueFmt={hrs} />
          {!chronological && rows.length > 12 && (
            <p className="text-xs mt-2" style={{ color: BRAND.slate }}>
              Showing the top 12 of {num(rows.length)}. The table below has every row.
            </p>
          )}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <Th>{dimName(group)}</Th>
              {split !== "none" &&
                cols.map((c) => (
                  <Th key={c} align="right">
                    {c}
                  </Th>
                ))}
              <Th align="right">Hours</Th>
              {showCost && <Th align="right">Labor cost</Th>}
              <Th w="14%">Share</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key}>
                <Td>{r.key}</Td>
                {split !== "none" &&
                  cols.map((c) => (
                    <Td key={c} align="right" mono>
                      {r.cells[c] ? hrs(r.cells[c]) : ""}
                    </Td>
                  ))}
                <Td align="right" mono strong>
                  {hrs(r.hours)}
                </Td>
                {showCost && (
                  <Td align="right" mono>
                    {money(r.cost)}
                  </Td>
                )}
                <Td>
                  <Bar pct={totals.hours ? (r.hours / totals.hours) * 100 : 0} color={BRAND.teal} />
                </Td>
              </tr>
            ))}
            {rows.length > 0 && (
              <tr style={{ background: BRAND.wash }}>
                <Td strong>Total</Td>
                {split !== "none" &&
                  cols.map((c) => (
                    <Td key={c} align="right" mono strong>
                      {hrs(colTotals[c] || 0)}
                    </Td>
                  ))}
                <Td align="right" mono strong>
                  {hrs(totals.hours)}
                </Td>
                {showCost && (
                  <Td align="right" mono strong>
                    {money(totals.cost)}
                  </Td>
                )}
                <Td></Td>
              </tr>
            )}
            {!rows.length && (
              <tr>
                <td colSpan={colSpan} className="px-3 py-6 text-sm" style={{ color: BRAND.slate }}>
                  No hours between {a} and {b}.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
