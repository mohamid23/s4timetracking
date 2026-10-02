import React, { useState, useEffect, useMemo, useRef } from "react";
import { createRoot } from "react-dom/client";

import {
  BRAND,
  PREFIX,
  CONFIG_KEY,
  ME_KEY,
  entriesKey,
  financeKey,
  DEFAULT_SERVICES,
  DEFAULT_CLIENTS,
  DEFAULT_EMPLOYEES,
  DEFAULT_CAPABILITY_MAP,
  DEFAULT_INDUSTRIES,
  ROLES,
  isBillable,
} from "./lib/constants";
import {
  uid,
  ymOf,
  todayISO,
  parseISO,
  mondayOf,
  addDays,
  DAY_LABELS,
  monthLabel,
  num,
  money,
  hrs,
  clean,
  norm,
  pickCol,
  toNumber,
  downloadCSV,
} from "./lib/helpers";
import { S } from "./lib/storage";
import { canSeeTab, landingTab, isAdminLevel } from "./lib/roles";
import { buildDemoBook } from "./lib/demoData";
import { S4Mark, Label, Card, Btn, Field, Select, Th, Td, Bar, Stat, CsvInput, Pill } from "./components/ui";
import { RankedBarChart } from "./components/charts";
import SignIn from "./features/SignIn";
import Profitability from "./features/Profitability";
import Admin from "./features/Admin";

/* ================= app ================= */

function App() {
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState("entry");
  const [cfg, setCfg] = useState({ employees: [], clients: [], services: DEFAULT_SERVICES });
  const [entries, setEntries] = useState({});
  const [finance, setFinance] = useState({});
  const [me, setMe] = useState("");
  const [status, setStatus] = useState("");
  const [sync, setSync] = useState({ online: true, error: "" });
  const [busy, setBusy] = useState(false);
  const [demo, setDemo] = useState(false);

  const flash = (msg) => {
    setStatus(msg);
    setTimeout(() => setStatus(""), 2500);
  };

  const loadAll = async () => {
    setBusy(true);
    try {
      const c = await S.get(CONFIG_KEY);
      if (c) {
        setCfg({
          employees: c.employees?.length ? c.employees : DEFAULT_EMPLOYEES,
          clients: c.clients?.length ? c.clients : DEFAULT_CLIENTS,
          services: c.services?.length ? c.services : DEFAULT_SERVICES,
          projects: c.projects || [],
          capabilityMap: c.capabilityMap || DEFAULT_CAPABILITY_MAP,
          industries: c.industries?.length ? c.industries : DEFAULT_INDUSTRIES,
        });
      } else {
        const seeded = {
          employees: DEFAULT_EMPLOYEES,
          clients: DEFAULT_CLIENTS,
          services: DEFAULT_SERVICES,
          projects: [],
          capabilityMap: DEFAULT_CAPABILITY_MAP,
          industries: DEFAULT_INDUSTRIES,
        };
        setCfg(seeded);
        await S.set(CONFIG_KEY, seeded);
      }
      const keys = await S.list(PREFIX);
      const ent = {};
      const fin = {};
      for (const k of keys) {
        if (k.startsWith(PREFIX + "entries:")) {
          const ym = k.split(":").pop();
          ent[ym] = (await S.get(k)) || [];
        } else if (k.startsWith(PREFIX + "finance:")) {
          const ym = k.split(":").pop();
          fin[ym] = (await S.get(k)) || [];
        }
      }
      setEntries(ent);
      setFinance(fin);
      const m = await S.getPersonal(ME_KEY);
      if (m?.emp) setMe(m.emp);
    } finally {
      setBusy(false);
      setReady(true);
    }
  };

  useEffect(() => {
    S.onStatus = (ok, err) => setSync((p) => ({ ...p, online: ok, error: ok ? "" : err || "" }));
    loadAll();

    const onError = (e) => S.log("error", { message: e.message, source: e.filename, line: e.lineno });
    const onRejection = (e) => S.log("error", { message: String(e.reason?.message || e.reason) });
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  const pushLocalToSync = async () => {
    setBusy(true);
    await S.set(CONFIG_KEY, cfg);
    for (const [ym, rows] of Object.entries(entries)) await S.set(entriesKey(ym), rows);
    for (const [ym, rows] of Object.entries(finance)) await S.set(financeKey(ym), rows);
    setBusy(false);
    flash("This browser's data was pushed to shared storage");
  };

  const saveCfg = async (next) => {
    setCfg(next);
    const ok = await S.set(CONFIG_KEY, next);
    S.log("activity", { actor: me, action: "config_saved" });
    flash(ok ? "Saved" : "Saved on this device only, the shared book is unreachable");
  };

  /* Everyone only ever edits their own rows, so a save keeps whatever the shared book
     holds for other people and replaces only this person's lines for the month. */
  const saveMonth = async (ym, rows) => {
    let merged = rows;
    if (me) {
      const remote = await S.get(entriesKey(ym));
      if (Array.isArray(remote)) merged = [...remote.filter((e) => e.emp !== me), ...rows.filter((e) => e.emp === me)];
    }
    setEntries((prev) => ({ ...prev, [ym]: merged }));
    const ok = await S.set(entriesKey(ym), merged);
    flash(ok ? "Saved" : "Saved on this device only, the shared book is unreachable");
  };

  const saveFinance = async (ym, rows) => {
    setFinance((prev) => ({ ...prev, [ym]: rows }));
    const ok = await S.set(financeKey(ym), rows);
    S.log("activity", { actor: me, action: "finance_imported", month: ym, rows: rows.length });
    flash(ok ? "Saved" : "Saved on this device only, the shared book is unreachable");
  };

  const pickMe = async (empId) => {
    setMe(empId);
    await S.setPersonal(ME_KEY, { emp: empId });
    S.log("activity", { actor: empId, action: "signed_in" });
  };

  const signOut = async () => {
    setMe("");
    setDemo(false);
    await S.setPersonal(ME_KEY, { emp: "" });
    setTab("entry");
  };

  const enterDemo = () => {
    const book = buildDemoBook();
    setCfg(book.cfg);
    setEntries(book.entries);
    setFinance(book.finance);
    setDemo(true);
    setMe(book.cfg.employees[0].id);
    setTab(landingTab(book.cfg.employees[0]));
  };

  const allEntries = useMemo(() => Object.values(entries).flat(), [entries]);
  const empById = useMemo(() => Object.fromEntries(cfg.employees.map((e) => [e.id, e])), [cfg.employees]);
  const clientById = useMemo(() => Object.fromEntries(cfg.clients.map((c) => [c.id, c])), [cfg.clients]);
  const empName = (id) => empById[id]?.name || "Unassigned";
  const clientName = (id) => clientById[id]?.name || "Unassigned";
  const rateOf = (id) => Number(empById[id]?.rate) || 0;
  const meRecord = empById[me] || null;

  const months = useMemo(() => {
    const set = new Set([...Object.keys(entries), ...Object.keys(finance), todayISO().slice(0, 7)]);
    return [...set].filter(Boolean).sort();
  }, [entries, finance]);

  useEffect(() => {
    if (me && !canSeeTab(meRecord, tab)) setTab(landingTab(meRecord));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me]);

  if (!ready) {
    return (
      <div className="p-8 text-sm" style={{ color: BRAND.slate }}>
        Loading the book.
      </div>
    );
  }

  if (!me) {
    return <SignIn cfg={cfg} onSignIn={pickMe} onDemo={enterDemo} />;
  }

  const noClients = cfg.clients.length === 0;
  const noRate = cfg.employees.filter((e) => !Number(e.rate)).length;

  const ALL_TABS = [
    ["entry", "Enter time"],
    ["reports", "Hours reports"],
    ["profit", "Profitability"],
    ["setup", "Setup"],
    ["admin", "Admin"],
  ];
  const TABS = ALL_TABS.filter(([k]) => canSeeTab(meRecord, k));

  return (
    <div className="min-h-screen" style={{ background: BRAND.wash, color: BRAND.navy }}>
      {demo && (
        <div className="text-center text-xs py-1.5 font-medium" style={{ background: BRAND.amber, color: "#fff" }}>
          You're viewing sample data. Nothing here is saved.{" "}
          <button className="underline ml-1" onClick={signOut}>
            Exit demo
          </button>
        </div>
      )}
      <header style={{ background: BRAND.navy }}>
        <div className="max-w-6xl mx-auto px-5 py-4 flex items-center justify-between gap-6 flex-wrap">
          <div className="flex items-center gap-4">
            <S4Mark height={46} />
            <div className="pl-4 border-l" style={{ borderColor: "#3A4560" }}>
              <div className="text-white text-lg font-semibold leading-tight">Time and Profitability</div>
              <div className="text-xs" style={{ color: "#9AA6BF" }}>
                S4 Connect internal reporting
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {status && (
              <span className="text-xs" style={{ color: "#9AA6BF" }}>
                {status}
              </span>
            )}
            {!demo && (
              <button
                onClick={loadAll}
                className="text-xs px-2 py-1 border"
                style={{
                  borderColor: sync.online ? "#3A4560" : BRAND.amber,
                  color: sync.online ? "#9AA6BF" : BRAND.amber,
                  background: "transparent",
                }}
                title={sync.online ? "Shared with your team, click to refresh" : sync.error || "Shared storage unreachable"}
              >
                {busy ? "Working" : sync.online ? "Shared, refresh" : "Shared storage offline"}
              </button>
            )}
            <div className="text-right">
              <div className="uppercase tracking-widest mb-1" style={{ color: "#9AA6BF", fontSize: 10 }}>
                Signed in as
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-white font-medium">{empName(me)}</span>
                <button onClick={signOut} className="text-xs underline" style={{ color: "#9AA6BF" }}>
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </div>
        <nav className="max-w-6xl mx-auto px-5 flex gap-1 flex-wrap">
          {TABS.map(([k, lbl]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className="px-4 py-2 text-xs uppercase tracking-widest whitespace-nowrap"
              style={{
                color: tab === k ? "#fff" : "#9AA6BF",
                borderBottom: `2px solid ${tab === k ? BRAND.teal : "transparent"}`,
              }}
            >
              {lbl}
            </button>
          ))}
        </nav>
      </header>

      <main className="max-w-6xl mx-auto px-5 py-6">
        {noClients && tab !== "setup" && (
          <div className="mb-6 border-l-4 p-4" style={{ borderColor: BRAND.amber, background: "#FFF8EC" }}>
            <div className="text-sm font-semibold">Add your clients before anyone enters time</div>
            <p className="text-sm mt-1" style={{ color: BRAND.slate }}>
              The team is already loaded. The client list is the one thing missing, and nothing can be booked without
              it. Go to Setup.
            </p>
          </div>
        )}
        {noRate > 0 && (tab === "reports" || tab === "profit") && (
          <div className="mb-6 border-l-4 p-4" style={{ borderColor: BRAND.amber, background: "#FFF8EC" }}>
            <div className="text-sm font-semibold">
              {num(noRate)} of {num(cfg.employees.length)} people have no hourly cost set
            </div>
            <p className="text-sm mt-1" style={{ color: BRAND.slate }}>
              Their time costs nothing in these numbers, which makes every client they touch look more profitable than
              it is. Set fully loaded cost per hour under Setup.
            </p>
          </div>
        )}

        {tab === "entry" && (
          <EnterTime cfg={cfg} me={me} entries={entries} saveMonth={saveMonth} clientById={clientById} />
        )}
        {tab === "reports" && (
          <Reports cfg={cfg} allEntries={allEntries} months={months} empName={empName} clientName={clientName} rateOf={rateOf} />
        )}
        {tab === "profit" && (
          <Profitability
            cfg={cfg}
            saveCfg={saveCfg}
            entries={entries}
            finance={finance}
            months={months}
            saveFinance={saveFinance}
            clientById={clientById}
            clientName={clientName}
            empName={empName}
            rateOf={rateOf}
            meRecord={meRecord}
          />
        )}
        {tab === "setup" && (
          <Setup
            cfg={cfg}
            saveCfg={saveCfg}
            entries={entries}
            finance={finance}
            allEntries={allEntries}
            sync={sync}
            pushLocalToSync={pushLocalToSync}
            refresh={loadAll}
            busy={busy}
          />
        )}
        {tab === "admin" && <Admin cfg={cfg} saveCfg={saveCfg} sync={sync} meRecord={meRecord} />}
      </main>

      <footer className="max-w-6xl mx-auto px-5 pb-10 pt-2">
        <p className="text-xs" style={{ color: BRAND.slate }}>
          S4 Connect internal tool. What you can see here depends on your role.
        </p>
      </footer>
    </div>
  );
}

/* ================= enter time ================= */

function EnterTime({ cfg, me, entries, saveMonth, clientById }) {
  const [weekStart, setWeekStart] = useState(mondayOf(todayISO()));
  const [newClient, setNewClient] = useState("");
  const [newProject, setNewProject] = useState("");
  const [newService, setNewService] = useState("");
  const [extraLines, setExtraLines] = useState([]);

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const weekMonths = useMemo(() => [...new Set(days.map(ymOf))], [days]);
  const projectsByClient = (clientId) => (cfg.projects || []).filter((p) => p.clientId === clientId && p.active !== false);
  const projectName = (projectId) => (cfg.projects || []).find((p) => p.id === projectId)?.name || "";

  const weekEntries = useMemo(() => {
    const all = weekMonths.flatMap((ym) => entries[ym] || []);
    return all.filter((e) => e.emp === me && days.includes(e.date));
  }, [entries, weekMonths, me, days]);

  const lines = useMemo(() => {
    const map = new Map();
    weekEntries.forEach((e) => {
      const k = `${e.client}||${e.project || ""}||${e.svc}`;
      if (!map.has(k)) map.set(k, { client: e.client, project: e.project || "", svc: e.svc });
    });
    extraLines.forEach((l) => {
      const k = `${l.client}||${l.project || ""}||${l.svc}`;
      if (!map.has(k)) map.set(k, l);
    });
    return [...map.entries()].map(([k, v]) => ({ key: k, ...v }));
  }, [weekEntries, extraLines]);

  const hoursAt = (client, project, svc, date) => {
    const hit = weekEntries.find((e) => e.client === client && (e.project || "") === project && e.svc === svc && e.date === date);
    return hit ? hit.hours : "";
  };

  const commit = async (client, project, svc, date, raw) => {
    const ym = ymOf(date);
    const value = raw === "" ? null : Math.max(0, toNumber(raw));
    const rows = [...(entries[ym] || [])];
    const idx = rows.findIndex(
      (e) => e.emp === me && e.client === client && (e.project || "") === project && e.svc === svc && e.date === date
    );
    if (value === null || value === 0) {
      if (idx >= 0) rows.splice(idx, 1);
      else return;
    } else if (idx >= 0) {
      rows[idx] = { ...rows[idx], hours: value };
    } else {
      rows.push({ id: uid(), emp: me, client, project: project || null, svc, date, hours: value, ts: Date.now() });
    }
    await saveMonth(ym, rows);
  };

  const addLine = () => {
    if (!newClient || !newService) return;
    setExtraLines((prev) => [...prev, { client: newClient, project: newProject, svc: newService }]);
    setNewClient("");
    setNewProject("");
    setNewService("");
  };

  const dayTotal = (date) => weekEntries.filter((e) => e.date === date).reduce((s, e) => s + Number(e.hours || 0), 0);
  const rowTotal = (client, project, svc) =>
    weekEntries
      .filter((e) => e.client === client && (e.project || "") === project && e.svc === svc)
      .reduce((s, e) => s + Number(e.hours || 0), 0);
  const weekTotal = weekEntries.reduce((s, e) => s + Number(e.hours || 0), 0);

  if (!me) return null;

  return (
    <>
      <Card
        title={`Week of ${parseISO(weekStart).toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        })}`}
        note="Type hours into the grid. Each cell saves when you click away. Leave a cell blank or enter 0 to remove it."
        right={
          <>
            <Btn onClick={() => setWeekStart(addDays(weekStart, -7))}>Previous week</Btn>
            <Btn onClick={() => setWeekStart(mondayOf(todayISO()))}>This week</Btn>
            <Btn onClick={() => setWeekStart(addDays(weekStart, 7))}>Next week</Btn>
          </>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full border-collapse" style={{ minWidth: 860 }}>
            <thead>
              <tr>
                <Th w="22%">Client</Th>
                <Th w="16%">Project</Th>
                <Th w="20%">Service type</Th>
                {days.map((d, i) => (
                  <Th key={d} align="center">
                    <div>{DAY_LABELS[i]}</div>
                    <div className="font-mono font-normal normal-case tracking-normal">
                      {parseISO(d).getMonth() + 1}/{parseISO(d).getDate()}
                    </div>
                  </Th>
                ))}
                <Th align="right">Total</Th>
              </tr>
            </thead>
            <tbody>
              {lines.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-3 py-6 text-sm" style={{ color: BRAND.slate }}>
                    No lines yet this week. Add a client and service type below and the grid opens up.
                  </td>
                </tr>
              )}
              {lines.map((l) => (
                <tr key={l.key}>
                  <Td>{clientById[l.client]?.name || l.client}</Td>
                  <Td>
                    <span style={{ color: BRAND.slate }}>{l.project ? projectName(l.project) : "—"}</span>
                  </Td>
                  <Td>
                    <span style={{ color: isBillable(l.svc) ? BRAND.navy : BRAND.amber }}>{l.svc}</span>
                  </Td>
                  {days.map((d) => (
                    <td key={d} className="px-1 py-1 border-b" style={{ borderColor: BRAND.line }}>
                      <HourCell value={hoursAt(l.client, l.project, l.svc, d)} onCommit={(v) => commit(l.client, l.project, l.svc, d, v)} />
                    </td>
                  ))}
                  <Td align="right" mono strong>
                    {rowTotal(l.client, l.project, l.svc) ? hrs(rowTotal(l.client, l.project, l.svc)) : ""}
                  </Td>
                </tr>
              ))}
              <tr style={{ background: BRAND.wash }}>
                <Td strong>Daily total</Td>
                <Td></Td>
                <Td></Td>
                {days.map((d) => (
                  <Td key={d} align="center" mono strong>
                    {dayTotal(d) ? hrs(dayTotal(d)) : ""}
                  </Td>
                ))}
                <Td align="right" mono strong>
                  {hrs(weekTotal)}
                </Td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div style={{ width: 220 }}>
            <Label>Add a client line</Label>
            <Select
              value={newClient}
              onChange={(v) => {
                setNewClient(v);
                setNewProject("");
              }}
              placeholder="Select client"
              options={cfg.clients
                .filter((c) => c.active !== false)
                .slice()
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((c) => ({ value: c.id, label: c.name }))}
            />
          </div>
          {newClient && projectsByClient(newClient).length > 0 && (
            <div style={{ width: 200 }}>
              <Label>Project</Label>
              <Select
                value={newProject}
                onChange={setNewProject}
                placeholder="General (no project)"
                options={projectsByClient(newClient).map((p) => ({ value: p.id, label: p.name }))}
              />
            </div>
          )}
          <div style={{ width: 240 }}>
            <Label>Service type</Label>
            <Select value={newService} onChange={setNewService} placeholder="Select service type" options={cfg.services} />
          </div>
          <Btn kind="solid" onClick={addLine} disabled={!newClient || !newService}>
            Add line
          </Btn>
        </div>
      </Card>

      <Card title="Your recent entries" note="Last twenty lines you saved, newest first.">
        <RecentEntries me={me} entries={entries} clientById={clientById} />
      </Card>
    </>
  );
}

function HourCell({ value, onCommit }) {
  const [draft, setDraft] = useState(value === "" ? "" : String(value));
  useEffect(() => {
    setDraft(value === "" ? "" : String(value));
  }, [value]);
  return (
    <input
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        if (String(draft) !== String(value)) onCommit(draft);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
      }}
      inputMode="decimal"
      className="w-full px-1 py-1 text-sm font-mono text-center border"
      style={{ borderColor: BRAND.line, color: BRAND.navy }}
    />
  );
}

function RecentEntries({ me, entries, clientById }) {
  const rows = useMemo(
    () =>
      Object.values(entries)
        .flat()
        .filter((e) => e.emp === me)
        .sort((a, b) => (b.ts || 0) - (a.ts || 0))
        .slice(0, 20),
    [entries, me]
  );
  if (!rows.length)
    return (
      <p className="text-sm" style={{ color: BRAND.slate }}>
        Nothing entered yet.
      </p>
    );
  return (
    <table className="w-full border-collapse">
      <thead>
        <tr>
          <Th>Date</Th>
          <Th>Client</Th>
          <Th>Service type</Th>
          <Th align="right">Hours</Th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id}>
            <Td mono>{r.date}</Td>
            <Td>{clientById[r.client]?.name || r.client}</Td>
            <Td>{r.svc}</Td>
            <Td align="right" mono>
              {hrs(r.hours)}
            </Td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/* ================= reports ================= */

function Reports({ cfg, allEntries, months, empName, clientName, rateOf }) {
  const thisMonth = todayISO().slice(0, 7);
  const [from, setFrom] = useState(months[0] || thisMonth);
  const [to, setTo] = useState(thisMonth);
  const [group, setGroup] = useState("person");
  const [split, setSplit] = useState("none");
  const [scope, setScope] = useState("all");

  const opts = months.map((m) => ({ value: m, label: monthLabel(m) }));

  const dimValue = (e, dim) =>
    dim === "person" ? empName(e.emp) : dim === "client" ? clientName(e.client) : dim === "service" ? e.svc : monthLabel(ymOf(e.date));

  const filtered = useMemo(
    () =>
      allEntries.filter((e) => {
        const ym = ymOf(e.date);
        if (ym < from || ym > to) return false;
        if (scope === "billable" && !isBillable(e.svc)) return false;
        if (scope === "internal" && isBillable(e.svc)) return false;
        return true;
      }),
    [allEntries, from, to, scope]
  );

  const { rows, cols, totalHours, totalCost } = useMemo(() => {
    const map = new Map();
    const colSet = new Set();
    let th = 0;
    let tc = 0;
    filtered.forEach((e) => {
      const key = dimValue(e, group);
      const col = split === "none" ? "Total" : dimValue(e, split);
      colSet.add(col);
      if (!map.has(key)) map.set(key, { key, hours: 0, cost: 0, cells: {} });
      const r = map.get(key);
      const h = Number(e.hours) || 0;
      const c = h * rateOf(e.emp);
      r.hours += h;
      r.cost += c;
      r.cells[col] = (r.cells[col] || 0) + h;
      th += h;
      tc += c;
    });
    return {
      rows: [...map.values()].sort((a, b) => b.hours - a.hours),
      cols: [...colSet].sort(),
      totalHours: th,
      totalCost: tc,
    };
  }, [filtered, group, split, rateOf]);

  const exportRows = () =>
    rows.map((r) => {
      const base = { [group]: r.key, hours: r.hours, labor_cost: Math.round(r.cost) };
      if (split !== "none") cols.forEach((c) => (base[c] = r.cells[c] || 0));
      return base;
    });

  return (
    <>
      <Card
        title="Hours and labor cost"
        note="Labor cost is hours multiplied by the hourly cost on the employee record."
        right={
          <Btn kind="solid" onClick={() => downloadCSV(`s4_hours_${from}_to_${to}.csv`, exportRows())} disabled={!rows.length}>
            Download CSV
          </Btn>
        }
      >
        <div className="flex flex-wrap gap-4 mb-4">
          <div style={{ width: 160 }}>
            <Label>From month</Label>
            <Select value={from} onChange={setFrom} options={opts} />
          </div>
          <div style={{ width: 160 }}>
            <Label>To month</Label>
            <Select value={to} onChange={setTo} options={opts} />
          </div>
          <div style={{ width: 170 }}>
            <Label>Group by</Label>
            <Select
              value={group}
              onChange={setGroup}
              options={[
                { value: "person", label: "Person" },
                { value: "client", label: "Client" },
                { value: "service", label: "Service type" },
                { value: "month", label: "Month" },
              ]}
            />
          </div>
          <div style={{ width: 170 }}>
            <Label>Break out by</Label>
            <Select
              value={split}
              onChange={setSplit}
              options={[
                { value: "none", label: "No breakout" },
                { value: "person", label: "Person" },
                { value: "client", label: "Client" },
                { value: "service", label: "Service type" },
                { value: "month", label: "Month" },
              ]}
            />
          </div>
          <div style={{ width: 170 }}>
            <Label>Include</Label>
            <Select
              value={scope}
              onChange={setScope}
              options={[
                { value: "all", label: "All time" },
                { value: "billable", label: "Client work only" },
                { value: "internal", label: "Internal only" },
              ]}
            />
          </div>
        </div>

        <div className="flex gap-8 mb-4 pb-4 border-b" style={{ borderColor: BRAND.line }}>
          <Stat label="Hours" value={hrs(totalHours)} />
          <Stat label="Labor cost" value={money(totalCost)} />
          <Stat
            label="Client work share"
            value={
              totalHours
                ? `${num((filtered.filter((e) => isBillable(e.svc)).reduce((s, e) => s + e.hours, 0) / totalHours) * 100, 0)}%`
                : "0%"
            }
          />
        </div>

        {rows.length > 0 && split === "none" && (
          <div className="mb-6 pb-6 border-b" style={{ borderColor: BRAND.line }}>
            <div className="text-xs font-semibold mb-3" style={{ color: BRAND.navy }}>
              Hours by {group === "person" ? "person" : group === "client" ? "client" : group === "service" ? "service type" : "month"}
            </div>
            <RankedBarChart data={rows.slice(0, 12)} labelKey="key" valueKey="hours" valueFmt={hrs} />
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <Th>{group === "person" ? "Person" : group === "client" ? "Client" : group === "service" ? "Service type" : "Month"}</Th>
                {split !== "none" && cols.map((c) => <Th key={c} align="right">{c}</Th>)}
                <Th align="right">Hours</Th>
                <Th align="right">Labor cost</Th>
                <Th w="18%">Share</Th>
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
                  <Td align="right" mono>
                    {money(r.cost)}
                  </Td>
                  <Td>
                    <Bar pct={totalHours ? (r.hours / totalHours) * 100 : 0} color={BRAND.teal} />
                  </Td>
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-sm" style={{ color: BRAND.slate }}>
                    No hours in this range.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}

/* ================= setup ================= */

function Setup({ cfg, saveCfg, entries, finance, allEntries, sync, pushLocalToSync, refresh, busy }) {
  const [newEmp, setNewEmp] = useState({ name: "", role: "", rate: "", email: "" });
  const [newClient, setNewClient] = useState("");
  const [newSvc, setNewSvc] = useState("");

  const usedEmp = (id) => allEntries.some((e) => e.emp === id);
  const usedClient = (id) => allEntries.some((e) => e.client === id);

  const importEmployees = (rows) => {
    const parsed = rows
      .map((r) => ({
        name: clean(pickCol(r, ["name", "employee", "employee name", "person"])),
        role: clean(pickCol(r, ["role", "title", "position"])),
        rate: toNumber(pickCol(r, ["rate", "hourly", "hourly cost", "cost", "hourly expense", "expense"])),
        email: clean(pickCol(r, ["email", "email address"])),
      }))
      .filter((r) => r.name);
    const next = cfg.employees.map((e) => ({ ...e }));
    parsed.forEach((p) => {
      const hit = next.find((e) => norm(e.name) === norm(p.name));
      if (hit) {
        hit.rate = p.rate || hit.rate;
        hit.role = p.role || hit.role;
        hit.email = p.email || hit.email;
      } else next.push({ id: uid(), name: p.name, role: p.role, rate: p.rate, email: p.email, accessLevel: ROLES.CONTRIBUTOR, managedClients: [] });
    });
    saveCfg({ ...cfg, employees: next });
  };

  const importClients = (rows) => {
    const parsed = rows
      .map((r) => clean(pickCol(r, ["client", "client name", "name", "customer", "account"])))
      .filter(Boolean);
    const next = [...cfg.clients];
    parsed.forEach((name) => {
      if (!next.some((c) => norm(c.name) === norm(name))) next.push({ id: uid(), name, active: true });
    });
    saveCfg({ ...cfg, clients: next });
  };

  const ROLE_OPTIONS = [
    { value: ROLES.CONTRIBUTOR, label: "Contributor" },
    { value: ROLES.ACCOUNT_MANAGER, label: "Account Manager" },
    { value: ROLES.ADMIN, label: "Admin" },
    { value: ROLES.SUPER_ADMIN, label: "Super Admin" },
  ];

  return (
    <>
      <Card
        title="Where the data lives"
        note="Everyone using this app automatically shares one book — there's nothing to connect. A local copy is still written on every save, so a brief outage never costs anyone their work."
        right={
          <Btn onClick={refresh} disabled={busy}>
            {busy ? "Checking…" : "Check connection"}
          </Btn>
        }
      >
        <p className="text-sm" style={{ color: sync.online ? BRAND.slate : BRAND.red }}>
          {sync.online
            ? "Connected. Everyone signed in sees the same data."
            : `Shared storage unreachable: ${sync.error} Entries are still saving locally on this device.`}
        </p>
        {!sync.online && (
          <p className="text-xs mt-2" style={{ color: BRAND.slate }}>
            If this is a brand-new deployment, the Vercel project likely needs a Redis database connected: Vercel
            dashboard → Storage → Create Database → pick a Redis option (Upstash) → connect it to this project →
            redeploy.
          </p>
        )}
        <div className="mt-3">
          <Btn onClick={pushLocalToSync} disabled={busy}>
            Push this browser's data to shared storage
          </Btn>
        </div>
      </Card>

      <Card
        title="People, roles, and hourly cost"
        note="Hourly cost drives every labor number in the reports; use fully loaded cost, not billing rate. Role decides what each person can see when they sign in: Contributors see only their own timesheet, Account Managers see only their assigned clients, Admins and Super Admin see everything."
      >
        <div className="grid gap-4" style={{ gridTemplateColumns: "minmax(0,1fr) minmax(0,320px)" }}>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <Th>Name</Th>
                  <Th>Email</Th>
                  <Th>Title</Th>
                  <Th w="150px">Access</Th>
                  <Th align="right" w="110px">Hourly cost</Th>
                  <Th w="90px"></Th>
                </tr>
              </thead>
              <tbody>
                {cfg.employees.map((e) => (
                  <tr key={e.id}>
                    <Td>
                      <Field
                        value={e.name}
                        onChange={(v) =>
                          saveCfg({ ...cfg, employees: cfg.employees.map((x) => (x.id === e.id ? { ...x, name: v } : x)) })
                        }
                      />
                    </Td>
                    <Td>
                      <Field
                        value={e.email || ""}
                        placeholder="name@s4connect.com"
                        onChange={(v) =>
                          saveCfg({ ...cfg, employees: cfg.employees.map((x) => (x.id === e.id ? { ...x, email: v } : x)) })
                        }
                      />
                    </Td>
                    <Td>
                      <Field
                        value={e.role || ""}
                        placeholder="Title"
                        onChange={(v) =>
                          saveCfg({ ...cfg, employees: cfg.employees.map((x) => (x.id === e.id ? { ...x, role: v } : x)) })
                        }
                      />
                    </Td>
                    <Td>
                      <Select
                        value={e.accessLevel || ROLES.CONTRIBUTOR}
                        onChange={(v) =>
                          saveCfg({ ...cfg, employees: cfg.employees.map((x) => (x.id === e.id ? { ...x, accessLevel: v } : x)) })
                        }
                        options={ROLE_OPTIONS}
                      />
                    </Td>
                    <Td align="right">
                      <Field
                        mono
                        type="number"
                        step="0.01"
                        value={e.rate}
                        onChange={(v) =>
                          saveCfg({
                            ...cfg,
                            employees: cfg.employees.map((x) => (x.id === e.id ? { ...x, rate: toNumber(v) } : x)),
                          })
                        }
                      />
                    </Td>
                    <Td align="right">
                      <Btn
                        kind="danger"
                        disabled={usedEmp(e.id)}
                        title={usedEmp(e.id) ? "This person has time booked, so the record stays" : "Remove"}
                        onClick={() => saveCfg({ ...cfg, employees: cfg.employees.filter((x) => x.id !== e.id) })}
                      >
                        Remove
                      </Btn>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex flex-wrap gap-2 mt-3">
              <Field value={newEmp.name} onChange={(v) => setNewEmp({ ...newEmp, name: v })} placeholder="Name" />
              <Field value={newEmp.email} onChange={(v) => setNewEmp({ ...newEmp, email: v })} placeholder="Email" />
              <Field value={newEmp.role} onChange={(v) => setNewEmp({ ...newEmp, role: v })} placeholder="Title" />
              <Field mono width="110px" value={newEmp.rate} onChange={(v) => setNewEmp({ ...newEmp, rate: v })} placeholder="Cost" />
              <Btn
                kind="solid"
                disabled={!newEmp.name.trim()}
                onClick={() => {
                  saveCfg({
                    ...cfg,
                    employees: [
                      ...cfg.employees,
                      {
                        id: uid(),
                        name: newEmp.name.trim(),
                        role: newEmp.role.trim(),
                        rate: toNumber(newEmp.rate),
                        email: newEmp.email.trim(),
                        accessLevel: ROLES.CONTRIBUTOR,
                        managedClients: [],
                      },
                    ],
                  });
                  setNewEmp({ name: "", role: "", rate: "", email: "" });
                }}
              >
                Add
              </Btn>
            </div>
          </div>
          <CsvInput label="Import or update people, columns Name, Email, Role and Hourly Cost" onRows={importEmployees} />
        </div>
      </Card>

      <Card
        title="Clients"
        note="Loaded from the client wall on the site. Names here have to match the client names in your monthly revenue file for profitability to line up. Anything set to hidden stays in the reports but drops out of the time entry dropdown."
      >
        <div className="grid gap-4" style={{ gridTemplateColumns: "minmax(0,1fr) minmax(0,320px)" }}>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <Th>Client</Th>
                  <Th w="170px">Industry</Th>
                  <Th align="center" w="110px">In the list</Th>
                  <Th w="90px"></Th>
                </tr>
              </thead>
              <tbody>
                {cfg.clients.map((c) => (
                  <tr key={c.id}>
                    <Td>
                      <Field
                        value={c.name}
                        onChange={(v) =>
                          saveCfg({ ...cfg, clients: cfg.clients.map((x) => (x.id === c.id ? { ...x, name: v } : x)) })
                        }
                      />
                    </Td>
                    <Td>
                      <Select
                        value={c.industry || ""}
                        onChange={(v) =>
                          saveCfg({ ...cfg, clients: cfg.clients.map((x) => (x.id === c.id ? { ...x, industry: v } : x)) })
                        }
                        placeholder="Unset"
                        options={cfg.industries || DEFAULT_INDUSTRIES}
                      />
                    </Td>
                    <Td align="center">
                      <Btn
                        kind={c.active === false ? "ghost" : "teal"}
                        onClick={() =>
                          saveCfg({
                            ...cfg,
                            clients: cfg.clients.map((x) => (x.id === c.id ? { ...x, active: x.active === false } : x)),
                          })
                        }
                      >
                        {c.active === false ? "Hidden" : "Active"}
                      </Btn>
                    </Td>
                    <Td align="right">
                      <Btn
                        kind="danger"
                        disabled={usedClient(c.id)}
                        title={usedClient(c.id) ? "This client has time booked, so the record stays" : "Remove"}
                        onClick={() => saveCfg({ ...cfg, clients: cfg.clients.filter((x) => x.id !== c.id) })}
                      >
                        Remove
                      </Btn>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex gap-2 mt-3">
              <Field value={newClient} onChange={setNewClient} placeholder="Client name" />
              <Btn
                kind="solid"
                disabled={!newClient.trim() || cfg.clients.some((c) => norm(c.name) === norm(newClient))}
                onClick={() => {
                  saveCfg({ ...cfg, clients: [...cfg.clients, { id: uid(), name: newClient.trim(), active: true }] });
                  setNewClient("");
                }}
              >
                Add
              </Btn>
            </div>
          </div>
          <CsvInput label="Import clients, one column of names" onRows={importClients} />
        </div>
      </Card>

      <Card
        title="Projects"
        note="Optional. Add projects under a client to track hours, revenue and cost at a finer grain than the client as a whole. A client with no projects is tracked at the client level only, same as before."
      >
        <ProjectsEditor cfg={cfg} saveCfg={saveCfg} />
      </Card>

      <Card
        title="Capabilities"
        note="Groups service types into the practice-area lens leadership uses for profitability: which kind of work is driving the number, independent of client or channel mix."
      >
        <CapabilityEditor cfg={cfg} saveCfg={saveCfg} />
      </Card>

      <Card title="Industries" note="Tags you can assign to clients under Clients above, used to cut profitability by industry.">
        <IndustryEditor cfg={cfg} saveCfg={saveCfg} />
      </Card>

      <Card title="Service types" note="Anything starting with COS- is treated as client work. Everything else is internal overhead.">
        <div className="flex flex-wrap gap-2 mb-4">
          {cfg.services.map((s) => (
            <span
              key={s}
              className="text-xs px-2 py-1 border flex items-center gap-2"
              style={{ borderColor: BRAND.line, color: isBillable(s) ? BRAND.navy : BRAND.amber, background: "#fff" }}
            >
              {s}
              <button
                onClick={() => saveCfg({ ...cfg, services: cfg.services.filter((x) => x !== s) })}
                style={{ color: BRAND.slate }}
                title="Remove"
              >
                x
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2" style={{ maxWidth: 420 }}>
          <Field value={newSvc} onChange={setNewSvc} placeholder="New service type" />
          <Btn
            kind="solid"
            disabled={!newSvc.trim() || cfg.services.includes(newSvc.trim())}
            onClick={() => {
              saveCfg({ ...cfg, services: [...cfg.services, newSvc.trim()] });
              setNewSvc("");
            }}
          >
            Add
          </Btn>
        </div>
      </Card>

      <Card title="Your data" note="Everything lives in this app's shared storage. Pull a full backup whenever you want one.">
        <div className="flex flex-wrap gap-2">
          <Btn
            onClick={() =>
              downloadCSV(
                "s4_all_time_entries.csv",
                allEntries.map((e) => ({
                  date: e.date,
                  employee: cfg.employees.find((x) => x.id === e.emp)?.name || e.emp,
                  client: cfg.clients.find((x) => x.id === e.client)?.name || e.client,
                  service_type: e.svc,
                  hours: e.hours,
                }))
              )
            }
            disabled={!allEntries.length}
          >
            Export all time entries
          </Btn>
          <Btn
            onClick={() => {
              const blob = new Blob([JSON.stringify({ cfg, entries, finance }, null, 2)], { type: "application/json" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "s4_time_backup.json";
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            Download full backup
          </Btn>
        </div>
        <p className="text-xs mt-3" style={{ color: BRAND.slate }}>
          {num(allEntries.length)} time entries across {num(Object.keys(entries).length)} months.
        </p>
      </Card>
    </>
  );
}

function ProjectsEditor({ cfg, saveCfg }) {
  const [clientId, setClientId] = useState(cfg.clients[0]?.id || "");
  const [newName, setNewName] = useState("");
  const projects = cfg.projects || [];
  const clientProjects = projects.filter((p) => p.clientId === clientId);

  const addProject = () => {
    if (!clientId || !newName.trim()) return;
    saveCfg({ ...cfg, projects: [...projects, { id: uid(), clientId, name: newName.trim(), active: true }] });
    setNewName("");
  };

  return (
    <div>
      <div className="flex flex-wrap items-end gap-3 mb-3">
        <div style={{ width: 260 }}>
          <Label>Client</Label>
          <Select
            value={clientId}
            onChange={setClientId}
            options={cfg.clients.slice().sort((a, b) => a.name.localeCompare(b.name)).map((c) => ({ value: c.id, label: c.name }))}
          />
        </div>
        <div style={{ width: 260 }}>
          <Label>New project name</Label>
          <Field value={newName} onChange={setNewName} placeholder="e.g. Spring Campaign" />
        </div>
        <Btn kind="solid" onClick={addProject} disabled={!clientId || !newName.trim()}>
          Add project
        </Btn>
      </div>
      {clientProjects.length === 0 ? (
        <p className="text-sm" style={{ color: BRAND.slate }}>
          No projects under this client yet.
        </p>
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <Th>Project</Th>
              <Th align="center" w="110px">In the list</Th>
              <Th w="90px"></Th>
            </tr>
          </thead>
          <tbody>
            {clientProjects.map((p) => (
              <tr key={p.id}>
                <Td>
                  <Field
                    value={p.name}
                    onChange={(v) => saveCfg({ ...cfg, projects: projects.map((x) => (x.id === p.id ? { ...x, name: v } : x)) })}
                  />
                </Td>
                <Td align="center">
                  <Btn
                    kind={p.active === false ? "ghost" : "teal"}
                    onClick={() =>
                      saveCfg({ ...cfg, projects: projects.map((x) => (x.id === p.id ? { ...x, active: x.active === false } : x)) })
                    }
                  >
                    {p.active === false ? "Hidden" : "Active"}
                  </Btn>
                </Td>
                <Td align="right">
                  <Btn kind="danger" onClick={() => saveCfg({ ...cfg, projects: projects.filter((x) => x.id !== p.id) })}>
                    Remove
                  </Btn>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function CapabilityEditor({ cfg, saveCfg }) {
  const map = cfg.capabilityMap || DEFAULT_CAPABILITY_MAP;
  const setMapping = (svc, capability) => saveCfg({ ...cfg, capabilityMap: { ...map, [svc]: capability } });
  return (
    <table className="w-full border-collapse">
      <thead>
        <tr>
          <Th>Service type</Th>
          <Th>Capability</Th>
        </tr>
      </thead>
      <tbody>
        {cfg.services.map((s) => (
          <tr key={s}>
            <Td>
              <span style={{ color: isBillable(s) ? BRAND.navy : BRAND.amber }}>{s}</span>
            </Td>
            <Td>
              <Field value={map[s] || ""} onChange={(v) => setMapping(s, v)} placeholder="e.g. Paid Media" />
            </Td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function IndustryEditor({ cfg, saveCfg }) {
  const [newIndustry, setNewIndustry] = useState("");
  const industries = cfg.industries || DEFAULT_INDUSTRIES;
  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4">
        {industries.map((ind) => (
          <span
            key={ind}
            className="text-xs px-2 py-1 border flex items-center gap-2"
            style={{ borderColor: BRAND.line, color: BRAND.navy, background: "#fff" }}
          >
            {ind}
            <button
              onClick={() => saveCfg({ ...cfg, industries: industries.filter((x) => x !== ind) })}
              style={{ color: BRAND.slate }}
              title="Remove"
            >
              x
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2" style={{ maxWidth: 420 }}>
        <Field value={newIndustry} onChange={setNewIndustry} placeholder="New industry" />
        <Btn
          kind="solid"
          disabled={!newIndustry.trim() || industries.includes(newIndustry.trim())}
          onClick={() => {
            saveCfg({ ...cfg, industries: [...industries, newIndustry.trim()] });
            setNewIndustry("");
          }}
        >
          Add
        </Btn>
      </div>
    </div>
  );
}

/* mount */
const rootEl = typeof document !== "undefined" && document.getElementById("root");
if (rootEl) createRoot(rootEl).render(<App />);
