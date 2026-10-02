import React, { useState, useEffect, useMemo, useRef } from "react";
import { createRoot } from "react-dom/client";
import Papa from "papaparse";

/* S4 Connect: Time and Profitability
   Internal management tool. Time entry, hours reporting, client profitability.
   Data lives in the artifact's shared storage so everyone on the link sees the same book. */

const BRAND = {
  navy: "#1C243A",
  slate: "#4A566E",
  line: "#E2E6EE",
  wash: "#F5F7FA",
  teal: "#0E8F8F",
  amber: "#C8811F",
  red: "#B3402F",
  paper: "#FFFFFF",
};

const PREFIX = "s4tt:";
const CONFIG_KEY = PREFIX + "config";
const ME_KEY = PREFIX + "me";
const entriesKey = (ym) => `${PREFIX}entries:${ym}`;
const financeKey = (ym) => `${PREFIX}finance:${ym}`;

const DEFAULT_SERVICES = [
  "COS-Client Website Creation",
  "COS-Client Website Maintenance",
  "COS-Direct Mail",
  "COS-Display",
  "COS-Event",
  "COS-General Management",
  "COS-Marketing Consulting",
  "COS-Merchandise",
  "COS-OOH",
  "COS-Photo/Video",
  "COS-PPC",
  "COS-Radio/Digital Audio",
  "Internal Admin",
  "Operations",
  "Tech",
  "Sales Support",
  "Research",
];

/* Client wall from the S4 Connect site. Set anyone no longer active to hidden in Setup
   so the time entry dropdown stays short. */
const DEFAULT_CLIENTS = [
  { id: "jet-s-pizza", name: "Jet's Pizza", active: true },
  { id: "whenevergolf", name: "WheneverGolf", active: true },
  { id: "schaeffler", name: "Schaeffler", active: true },
  { id: "tailored-real-estate-solutions", name: "Tailored Real Estate Solutions", active: true },
  { id: "ann-arbor-comedy-showcase", name: "Ann Arbor Comedy Showcase", active: true },
  { id: "arcadia-lending", name: "Arcadia Lending", active: true },
  { id: "cutting-edge-computers", name: "Cutting Edge Computers", active: true },
  { id: "celebrity-catering", name: "Celebrity Catering", active: true },
  { id: "cadillac", name: "Cadillac", active: true },
  { id: "cottage-inn-pizza", name: "Cottage Inn Pizza", active: true },
  { id: "rocking-mobility", name: "Rocking Mobility", active: true },
  { id: "custom-kitchen-solutions", name: "Custom Kitchen Solutions", active: true },
  { id: "golf-stream-group", name: "Golf Stream Group", active: true },
  { id: "house-of-barbecue", name: "House of Barbecue", active: true },
  { id: "jerry-buys-houses", name: "Jerry Buys Houses", active: true },
  { id: "members-home-and-auto", name: "Members Home and Auto", active: true },
  { id: "men-of-the-sacred-hearts", name: "Men of the Sacred Hearts", active: true },
  { id: "saxon-incorporated", name: "Saxon Incorporated", active: true },
  { id: "prestige-auto-body", name: "Prestige Auto Body", active: true },
  { id: "general-motors", name: "General Motors", active: true },
  { id: "office-express", name: "Office Express", active: true },
  { id: "4-your-benefit", name: "4 Your Benefit", active: true },
  { id: "wealth-management-institute", name: "Wealth Management Institute", active: true },
  { id: "purple-power", name: "Purple Power", active: true },
  { id: "hershey-insurance-agency", name: "Hershey Insurance Agency", active: true },
  { id: "rock-harbor", name: "Rock Harbor", active: true },
  { id: "victory-real-estate-investments", name: "Victory Real Estate Investments", active: true },
  { id: "padilla-law-group", name: "Padilla Law Group", active: true },
  { id: "c-e-gleeson-construction", name: "C.E. Gleeson Construction", active: true },
  { id: "apex-laboratory-equipment", name: "APEX Laboratory Equipment", active: true },
  { id: "fougnie-professional-lawn-maintenance", name: "Fougnie Professional Lawn Maintenance", active: true },
  { id: "champu-auto-spa", name: "Champu Auto Spa", active: true },
  { id: "air-wizards-hvac", name: "Air Wizards HVAC", active: true },
  { id: "north-american-industrial-supply", name: "North American Industrial Supply", active: true },
  { id: "blessed-pest-solutions", name: "Blessed Pest Solutions", active: true },
  { id: "dentapup", name: "Dentapup", active: true },
  { id: "rogow-property-management", name: "Rogow Property Management", active: true },
  { id: "jmrh-group-dock-and-door", name: "JMRH Group Dock and Door", active: true },
  { id: "everyday-process-counseling-center", name: "Everyday Process Counseling Center", active: true },
  { id: "a-a-pro-paint", name: "A&A Pro Paint", active: true },
  { id: "construction-clean", name: "Construction Clean", active: true },
  { id: "great-lakes-maintenance", name: "Great Lakes Maintenance", active: true },
  { id: "masonry-cleaning-solutions", name: "Masonry Cleaning Solutions", active: true },
  { id: "phoenix-contractors", name: "Phoenix Contractors", active: true },
  { id: "concierge-flooring", name: "Concierge Flooring", active: true },
  { id: "certified-flooring-installation", name: "Certified Flooring Installation", active: true },
  { id: "roof-shampoo", name: "Roof Shampoo", active: true },
  { id: "perfecting-lifestyles", name: "Perfecting Lifestyles", active: true },
];

/* Team as listed on the S4 Connect site. Hourly cost starts at zero and has to be
   filled in under Setup before any labor or profitability number means anything. */
const DEFAULT_EMPLOYEES = [
  { id: "lance-docken", name: "Lance Docken", role: "Co-founder, CEO", rate: 0 },
  { id: "dan-woodford", name: "Dan Woodford", role: "Co-founder, Chief Marketing Officer", rate: 0 },
  { id: "phil-foster", name: "Phil Foster", role: "Creative Director", rate: 0 },
  { id: "tammy-migliore", name: "Tammy Migliore", role: "SVP, Information Technology", rate: 0 },
  { id: "mo-hamid", name: "Mo Hamid", role: "Managing Director of Strategic Growth", rate: 0 },
  { id: "bella-crociata", name: "Bella Crociata", role: "Marketing Operations Manager", rate: 0 },
  { id: "dan-blondin", name: "Dan Blondin", role: "Business Development Manager", rate: 0 },
  { id: "maria-eusebio", name: "Maria Eusebio", role: "Marketing Specialist", rate: 0 },
  { id: "mary-blondin", name: "Mary Blondin", role: "Accounting Specialist", rate: 0 },
  { id: "mitchell-woodford", name: "Mitchell Woodford", role: "Marketing Intern", rate: 0 },
];

const isBillable = (s) => typeof s === "string" && s.startsWith("COS-");

/* S4 Connect mark, vector traced from the supplied logo artwork.
   The CONNECT wordmark is dropped because it stops being legible below about 60px tall,
   so the brand name is set in type beside the mark instead. */
const S4_MARK = {
  viewBox: "0 0 1920 1593",
  transform: "translate(-0.236616,1593.855576) scale(0.100000,-0.100000)",
  d: "M15070 15929 c-1278 -62 -3258 -317 -5160 -665 -236 -43 -961 -186 -1105 -218 -38 -8 -124 -27 -190 -41 -213 -47 -573 -134 -764 -184 -102 -28 -474 -122 -826 -211 -352 -89 -701 -177 -775 -196 -2537 -662 -3942 -1179 -4376 -1609 -99 -98 -129 -148 -144 -241 -24 -142 29 -229 164 -270 157 -47 332 -67 606 -68 267 -1 344 2 655 29 388 34 1007 116 1500 200 568 96 1365 198 2000 255 127 11 250 22 275 25 48 5 573 40 730 49 863 49 1833 22 2550 -69 1328 -170 2261 -584 2680 -1191 55 -80 142 -243 135 -255 -3 -3 -31 -9 -64 -13 -71 -8 -362 -63 -556 -105 -1138 -245 -2840 -766 -3931 -1201 -2241 -896 -4391 -2182 -6256 -3742 -852 -714 -1443 -1355 -1807 -1962 -741 -1233 -465 -2081 749 -2300 410 -74 1062 -71 1625 9 827 116 1695 385 2670 827 1902 863 4122 2426 5741 4043 581 580 1006 1088 1393 1664 630 939 871 1697 787 2476 -7 66 -10 123 -7 127 13 14 656 114 1021 158 332 40 966 97 975 88 8 -8 -296 -342 -499 -548 -272 -276 -532 -558 -522 -567 6 -6 443 353 566 466 58 53 234 224 393 381 l288 284 262 8 c1151 32 1958 -121 2478 -471 350 -235 548 -532 552 -828 2 -109 3 -114 30 -140 39 -40 123 -38 204 3 75 38 85 59 79 157 -18 270 -261 651 -554 872 -206 155 -409 245 -722 319 -569 136 -1187 210 -1872 224 l-316 7 128 137 c1051 1124 1782 2104 1995 2673 119 320 134 570 45 792 -181 452 -798 726 -1840 818 -189 16 -692 18 -990 4z m770 -243 c825 -92 1300 -377 1464 -877 64 -197 70 -335 22 -534 -127 -524 -682 -1399 -1585 -2499 -108 -131 -203 -247 -212 -258 -14 -18 -34 -20 -255 -29 -131 -4 -266 -11 -299 -14 -33 -3 -141 -12 -241 -20 -232 -19 -484 -48 -749 -85 -198 -29 -602 -95 -635 -105 -12 -4 -23 17 -45 87 -158 498 -613 891 -1446 1249 -829 356 -2236 545 -4474 600 -411 10 -2175 6 -2335 -6 -98 -7 -465 -16 -460 -12 20 20 542 191 1080 354 1851 561 4189 1188 6200 1663 1317 311 2098 440 3050 504 146 10 783 -3 920 -18z m-2826 -4697 c24 -120 -6 -350 -69 -534 -545 -1596 -3888 -4673 -7050 -6487 -2519 -1446 -4356 -1797 -5126 -981 -109 115 -135 195 -126 388 26 600 683 1576 1702 2528 841 786 2376 1875 3765 2672 2234 1282 4438 2070 6805 2433 93 15 92 15 99 -19z M13525 9793 c-11 -64 -120 -382 -170 -498 -391 -914 -1228 -1997 -2345 -3035 -1717 -1595 -3807 -2999 -5610 -3768 -799 -340 -1595 -582 -2250 -684 -71 -11 778 -13 5147 -16 l5233 -2 2 -893 3 -892 1170 0 1170 0 3 892 2 893 605 0 605 0 0 1045 0 1045 -605 0 -605 0 0 2975 0 2975 -1174 0 -1174 0 -7 -37z m5 -4398 l0 -1515 -1285 0 c-707 0 -1285 2 -1285 5 0 8 2560 3025 2567 3025 2 0 3 -682 3 -1515z",
};

const S4Mark = ({ height = 46, color = "#FFFFFF" }) => (
  <svg
    viewBox={S4_MARK.viewBox}
    role="img"
    aria-label="S4 Connect"
    style={{ height, width: "auto", color, display: "block" }}
  >
    <g transform={S4_MARK.transform} fill="currentColor" stroke="none">
      <path d={S4_MARK.d} />
    </g>
  </svg>
);

/* ---------- storage ---------- */

const LOCAL_PREFIX = "s4tt.local.";
const SYNC_URL_KEY = "s4tt.sync.url";

const mem = {};

const ls = {
  get(k) {
    try {
      const v = window.localStorage.getItem(LOCAL_PREFIX + k);
      return v == null ? null : JSON.parse(v);
    } catch {
      return mem[k] ?? null;
    }
  },
  set(k, v) {
    try {
      window.localStorage.setItem(LOCAL_PREFIX + k, JSON.stringify(v));
      return true;
    } catch {
      mem[k] = v;
      return true;
    }
  },
  keys(prefix) {
    try {
      const out = [];
      for (let i = 0; i < window.localStorage.length; i++) {
        const k = window.localStorage.key(i);
        if (k && k.startsWith(LOCAL_PREFIX + prefix)) out.push(k.slice(LOCAL_PREFIX.length));
      }
      return out;
    } catch {
      return Object.keys(mem).filter((k) => k.startsWith(prefix));
    }
  },
};

/* Two ways to run.
   Local only: everything sits in this browser, which is fine for one person or a trial.
   Synced: point the app at a Google Apps Script endpoint and the whole team shares one book.
   Either way a local copy is always written, so a sync outage never costs anyone their week. */
const S = {
  mode: "local",
  url: "",
  online: true,
  onStatus: null,

  setUrl(url) {
    this.url = (url || "").trim();
    this.mode = this.url ? "remote" : "local";
    this.online = true;
    try {
      if (this.url) window.localStorage.setItem(SYNC_URL_KEY, this.url);
      else window.localStorage.removeItem(SYNC_URL_KEY);
    } catch {}
  },

  loadUrl() {
    try {
      const u = window.localStorage.getItem(SYNC_URL_KEY);
      if (u) this.setUrl(u);
    } catch {}
    return this.url;
  },

  async call(action, payload) {
    const res = await fetch(this.url, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action, ...payload }),
    });
    if (!res.ok) throw new Error("Sync endpoint returned " + res.status);
    const json = await res.json();
    if (json.error) throw new Error(json.error);
    return json;
  },

  flag(ok, err) {
    if (this.online !== ok) {
      this.online = ok;
      if (this.onStatus) this.onStatus(ok, err);
    } else if (!ok && this.onStatus) {
      this.onStatus(ok, err);
    }
  },

  async ping(url) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "ping" }),
    });
    if (!res.ok) throw new Error("Endpoint returned " + res.status);
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || "Endpoint did not answer as expected");
    return true;
  },

  async get(key) {
    if (this.mode === "remote") {
      try {
        const r = await this.call("get", { key });
        this.flag(true);
        const val = r.value == null ? null : JSON.parse(r.value);
        if (val !== null) ls.set(key, val);
        return val;
      } catch (e) {
        this.flag(false, e.message);
      }
    }
    return ls.get(key);
  },

  async set(key, value) {
    ls.set(key, value);
    if (this.mode === "remote") {
      try {
        await this.call("set", { key, value: JSON.stringify(value) });
        this.flag(true);
        return true;
      } catch (e) {
        this.flag(false, e.message);
        return false;
      }
    }
    return true;
  },

  async list(prefix) {
    if (this.mode === "remote") {
      try {
        const r = await this.call("list", { prefix });
        this.flag(true);
        return r.keys || [];
      } catch (e) {
        this.flag(false, e.message);
      }
    }
    return ls.keys(prefix);
  },

  async getPersonal(key) {
    return ls.get("personal." + key);
  },

  async setPersonal(key, value) {
    return ls.set("personal." + key, value);
  },
};

/* ---------- helpers ---------- */

const uid = () => Math.random().toString(36).slice(2, 10);
const pad = (n) => String(n).padStart(2, "0");
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const ymOf = (dateStr) => dateStr.slice(0, 7);
const todayISO = () => iso(new Date());

const parseISO = (s) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};

const mondayOf = (dateStr) => {
  const d = parseISO(dateStr);
  const shift = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - shift);
  return iso(d);
};

const addDays = (dateStr, n) => {
  const d = parseISO(dateStr);
  d.setDate(d.getDate() + n);
  return iso(d);
};

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const monthLabel = (ym) => {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "short", year: "numeric" });
};

const num = (n, dp = 0) =>
  (Number(n) || 0).toLocaleString("en-US", { minimumFractionDigits: dp, maximumFractionDigits: dp });

const money = (n) => {
  const v = Number(n) || 0;
  const s = Math.abs(v).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  return (v < 0 ? "-$" : "$") + s;
};

const hrs = (n) => (Number(n) || 0).toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 2 });

const clean = (s) => String(s ?? "").trim();
const norm = (s) => clean(s).toLowerCase().replace(/[^a-z0-9]/g, "");

function pickCol(row, candidates) {
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

const toNumber = (v) => {
  const n = parseFloat(String(v ?? "").replace(/[$,()\s]/g, ""));
  if (isNaN(n)) return 0;
  return /^\s*\(/.test(String(v)) ? -n : n;
};

function downloadCSV(filename, rows) {
  const csv = Papa.unparse(rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* ---------- small UI pieces ---------- */

const Label = ({ children }) => (
  <div className="text-xs uppercase tracking-widest mb-1" style={{ color: BRAND.slate }}>
    {children}
  </div>
);

const Card = ({ title, note, right, children }) => (
  <section className="mb-6 border" style={{ borderColor: BRAND.line, background: BRAND.paper }}>
    {(title || right) && (
      <header
        className="flex items-baseline justify-between gap-4 px-4 py-3 border-b"
        style={{ borderColor: BRAND.line }}
      >
        <div>
          <h2 className="text-sm font-semibold tracking-wide" style={{ color: BRAND.navy }}>
            {title}
          </h2>
          {note && (
            <p className="text-xs mt-1" style={{ color: BRAND.slate }}>
              {note}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">{right}</div>
      </header>
    )}
    <div className="p-4">{children}</div>
  </section>
);

const Btn = ({ kind = "ghost", onClick, children, disabled, title }) => {
  const base = "text-xs px-3 py-2 border transition-colors";
  const styles =
    kind === "solid"
      ? { background: BRAND.navy, color: "#fff", borderColor: BRAND.navy }
      : kind === "teal"
      ? { background: BRAND.teal, color: "#fff", borderColor: BRAND.teal }
      : kind === "danger"
      ? { background: "#fff", color: BRAND.red, borderColor: BRAND.line }
      : { background: "#fff", color: BRAND.navy, borderColor: BRAND.line };
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={base}
      style={{ ...styles, opacity: disabled ? 0.45 : 1 }}
    >
      {children}
    </button>
  );
};

const Field = ({ value, onChange, type = "text", placeholder, mono, width, step }) => (
  <input
    type={type}
    step={step}
    value={value}
    placeholder={placeholder}
    onChange={(e) => onChange(e.target.value)}
    className={`px-2 py-1 border text-sm ${mono ? "font-mono text-right" : ""}`}
    style={{ borderColor: BRAND.line, color: BRAND.navy, width: width || "100%" }}
  />
);

const Select = ({ value, onChange, options, placeholder, width }) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className="px-2 py-1 border text-sm bg-white"
    style={{ borderColor: BRAND.line, color: BRAND.navy, width: width || "100%" }}
  >
    {placeholder && <option value="">{placeholder}</option>}
    {options.map((o) => (
      <option key={o.value ?? o} value={o.value ?? o}>
        {o.label ?? o}
      </option>
    ))}
  </select>
);

const Th = ({ children, align = "left", w }) => (
  <th
    className="px-3 py-2 text-xs font-semibold uppercase tracking-wider border-b"
    style={{ color: BRAND.slate, borderColor: BRAND.line, textAlign: align, width: w }}
  >
    {children}
  </th>
);

const Td = ({ children, align = "left", mono, strong }) => (
  <td
    className={`px-3 py-2 text-sm border-b ${mono ? "font-mono" : ""} ${strong ? "font-semibold" : ""}`}
    style={{ borderColor: BRAND.line, color: BRAND.navy, textAlign: align }}
  >
    {children}
  </td>
);

const Bar = ({ pct, color }) => (
  <div className="h-1" style={{ background: BRAND.line }}>
    <div className="h-1" style={{ width: `${Math.max(0, Math.min(100, pct))}%`, background: color }} />
  </div>
);

/* ---------- csv drop ---------- */

function CsvInput({ label, onRows }) {
  const ref = useRef(null);
  const [paste, setPaste] = useState("");
  const handleFile = (file) => {
    if (!file) return;
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => onRows(res.data),
    });
  };
  const handlePaste = () => {
    if (!paste.trim()) return;
    const res = Papa.parse(paste.trim(), { header: true, skipEmptyLines: true });
    onRows(res.data);
    setPaste("");
  };
  return (
    <div className="border p-3" style={{ borderColor: BRAND.line, background: BRAND.wash }}>
      <Label>{label}</Label>
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <input
          ref={ref}
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => handleFile(e.target.files?.[0])}
          className="text-xs"
          style={{ color: BRAND.slate }}
        />
      </div>
      <textarea
        value={paste}
        onChange={(e) => setPaste(e.target.value)}
        placeholder="or paste rows straight out of Excel, including the header row"
        rows={3}
        className="w-full px-2 py-1 border text-xs font-mono"
        style={{ borderColor: BRAND.line, color: BRAND.navy }}
      />
      <div className="mt-2">
        <Btn onClick={handlePaste} disabled={!paste.trim()}>
          Load pasted rows
        </Btn>
      </div>
    </div>
  );
}

/* ================= app ================= */

function App() {
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState("entry");
  const [cfg, setCfg] = useState({ employees: [], clients: [], services: DEFAULT_SERVICES });
  const [entries, setEntries] = useState({});
  const [finance, setFinance] = useState({});
  const [me, setMe] = useState("");
  const [status, setStatus] = useState("");
  const [sync, setSync] = useState({ url: "", online: true, error: "" });
  const [busy, setBusy] = useState(false);

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
        });
      } else {
        const seeded = { employees: DEFAULT_EMPLOYEES, clients: DEFAULT_CLIENTS, services: DEFAULT_SERVICES };
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
    const url = S.loadUrl();
    setSync({ url, online: true, error: "" });
    loadAll();
  }, []);

  const connectSync = async (url) => {
    const trimmed = (url || "").trim();
    if (!trimmed) {
      S.setUrl("");
      setSync({ url: "", online: true, error: "" });
      flash("Sync turned off, this browser only");
      return { ok: true };
    }
    try {
      await S.ping(trimmed);
    } catch (e) {
      setSync((p) => ({ ...p, error: e.message }));
      return { ok: false, error: e.message };
    }
    S.setUrl(trimmed);
    setSync({ url: trimmed, online: true, error: "" });
    await loadAll();
    flash("Connected, everyone on this endpoint shares one book");
    return { ok: true };
  };

  const pushLocalToSync = async () => {
    if (S.mode !== "remote") return;
    setBusy(true);
    await S.set(CONFIG_KEY, cfg);
    for (const [ym, rows] of Object.entries(entries)) await S.set(entriesKey(ym), rows);
    for (const [ym, rows] of Object.entries(finance)) await S.set(financeKey(ym), rows);
    setBusy(false);
    flash("This browser's data was pushed to the shared book");
  };

  const saveCfg = async (next) => {
    setCfg(next);
    const ok = await S.set(CONFIG_KEY, next);
    flash(ok ? "Saved" : "Saved on this device only, the shared book is unreachable");
  };

  /* Everyone only ever edits their own rows, so a save keeps whatever the shared book
     holds for other people and replaces only this person's lines for the month. */
  const saveMonth = async (ym, rows) => {
    let merged = rows;
    if (S.mode === "remote" && me) {
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
    flash(ok ? "Saved" : "Saved on this device only, the shared book is unreachable");
  };

  const pickMe = async (empId) => {
    setMe(empId);
    await S.setPersonal(ME_KEY, { emp: empId });
  };

  const allEntries = useMemo(() => Object.values(entries).flat(), [entries]);
  const empById = useMemo(() => Object.fromEntries(cfg.employees.map((e) => [e.id, e])), [cfg.employees]);
  const clientById = useMemo(() => Object.fromEntries(cfg.clients.map((c) => [c.id, c])), [cfg.clients]);
  const empName = (id) => empById[id]?.name || "Unassigned";
  const clientName = (id) => clientById[id]?.name || "Unassigned";
  const rateOf = (id) => Number(empById[id]?.rate) || 0;

  const months = useMemo(() => {
    const set = new Set([...Object.keys(entries), ...Object.keys(finance), todayISO().slice(0, 7)]);
    return [...set].filter(Boolean).sort();
  }, [entries, finance]);

  if (!ready) {
    return (
      <div className="p-8 text-sm" style={{ color: BRAND.slate }}>
        Loading the book.
      </div>
    );
  }

  const noClients = cfg.clients.length === 0;
  const noRate = cfg.employees.filter((e) => !Number(e.rate)).length;

  const TABS = [
    ["entry", "Enter time"],
    ["reports", "Hours reports"],
    ["profit", "Profitability"],
    ["setup", "Setup"],
  ];

  return (
    <div className="min-h-screen" style={{ background: BRAND.wash, color: BRAND.navy }}>
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
          <div className="flex items-center gap-3">
            {status && (
              <span className="text-xs" style={{ color: "#9AA6BF" }}>
                {status}
              </span>
            )}
            <button
              onClick={loadAll}
              className="text-xs px-2 py-1 border"
              style={{
                borderColor: sync.url && !sync.online ? BRAND.amber : "#3A4560",
                color: sync.url && !sync.online ? BRAND.amber : "#9AA6BF",
                background: "transparent",
              }}
              title={sync.url ? sync.error || "Shared book, click to refresh" : "This browser only, set up sync under Setup"}
            >
              {busy ? "Working" : !sync.url ? "This browser only" : sync.online ? "Shared, refresh" : "Sync offline"}
            </button>
            <div>
              <div className="uppercase tracking-widest mb-1" style={{ color: "#9AA6BF", fontSize: 10 }}>
                Entering time as
              </div>
              <select
                value={me}
                onChange={(e) => pickMe(e.target.value)}
                className="px-2 py-1 text-sm border bg-white"
                style={{ borderColor: "#3A4560", color: BRAND.navy, minWidth: 180 }}
              >
                <option value="">Pick your name</option>
                {cfg.employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <nav className="max-w-6xl mx-auto px-5 flex gap-1">
          {TABS.map(([k, lbl]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className="px-4 py-2 text-xs uppercase tracking-widest"
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
          <EnterTime
            cfg={cfg}
            me={me}
            entries={entries}
            saveMonth={saveMonth}
            clientById={clientById}
          />
        )}
        {tab === "reports" && (
          <Reports
            cfg={cfg}
            allEntries={allEntries}
            months={months}
            empName={empName}
            clientName={clientName}
            rateOf={rateOf}
          />
        )}
        {tab === "profit" && (
          <Profitability
            cfg={cfg}
            entries={entries}
            finance={finance}
            months={months}
            saveFinance={saveFinance}
            clientById={clientById}
            clientName={clientName}
            rateOf={rateOf}
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
            connectSync={connectSync}
            pushLocalToSync={pushLocalToSync}
            busy={busy}
          />
        )}
      </main>

      <footer className="max-w-6xl mx-auto px-5 pb-10 pt-2">
        <p className="text-xs" style={{ color: BRAND.slate }}>
          S4 Connect internal tool. Everyone with the link shares one set of data and can see every entry.
        </p>
      </footer>
    </div>
  );
}

/* ================= enter time ================= */

function EnterTime({ cfg, me, entries, saveMonth, clientById }) {
  const [weekStart, setWeekStart] = useState(mondayOf(todayISO()));
  const [newClient, setNewClient] = useState("");
  const [newService, setNewService] = useState("");
  const [extraLines, setExtraLines] = useState([]);

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const weekMonths = useMemo(() => [...new Set(days.map(ymOf))], [days]);

  const weekEntries = useMemo(() => {
    const all = weekMonths.flatMap((ym) => entries[ym] || []);
    return all.filter((e) => e.emp === me && days.includes(e.date));
  }, [entries, weekMonths, me, days]);

  const lines = useMemo(() => {
    const map = new Map();
    weekEntries.forEach((e) => {
      const k = `${e.client}||${e.svc}`;
      if (!map.has(k)) map.set(k, { client: e.client, svc: e.svc });
    });
    extraLines.forEach((l) => {
      const k = `${l.client}||${l.svc}`;
      if (!map.has(k)) map.set(k, l);
    });
    return [...map.entries()].map(([k, v]) => ({ key: k, ...v }));
  }, [weekEntries, extraLines]);

  const hoursAt = (client, svc, date) => {
    const hit = weekEntries.find((e) => e.client === client && e.svc === svc && e.date === date);
    return hit ? hit.hours : "";
  };

  const commit = async (client, svc, date, raw) => {
    const ym = ymOf(date);
    const value = raw === "" ? null : Math.max(0, toNumber(raw));
    const rows = [...(entries[ym] || [])];
    const idx = rows.findIndex((e) => e.emp === me && e.client === client && e.svc === svc && e.date === date);
    if (value === null || value === 0) {
      if (idx >= 0) rows.splice(idx, 1);
      else return;
    } else if (idx >= 0) {
      rows[idx] = { ...rows[idx], hours: value };
    } else {
      rows.push({ id: uid(), emp: me, client, svc, date, hours: value, ts: Date.now() });
    }
    await saveMonth(ym, rows);
  };

  const addLine = () => {
    if (!newClient || !newService) return;
    setExtraLines((prev) => [...prev, { client: newClient, svc: newService }]);
    setNewClient("");
    setNewService("");
  };

  const dayTotal = (date) => weekEntries.filter((e) => e.date === date).reduce((s, e) => s + Number(e.hours || 0), 0);
  const rowTotal = (client, svc) =>
    weekEntries.filter((e) => e.client === client && e.svc === svc).reduce((s, e) => s + Number(e.hours || 0), 0);
  const weekTotal = weekEntries.reduce((s, e) => s + Number(e.hours || 0), 0);

  if (!me) {
    return (
      <Card title="Pick your name to start" note="Your choice is remembered on this device, so you only do it once.">
        <p className="text-sm" style={{ color: BRAND.slate }}>
          Use the selector at the top right. Everyone uses the same link, and the name you pick decides whose timesheet
          you are filling in.
        </p>
      </Card>
    );
  }

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
                <Th w="26%">Client</Th>
                <Th w="24%">Service type</Th>
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
                  <td colSpan={10} className="px-3 py-6 text-sm" style={{ color: BRAND.slate }}>
                    No lines yet this week. Add a client and service type below and the grid opens up.
                  </td>
                </tr>
              )}
              {lines.map((l) => (
                <tr key={l.key}>
                  <Td>{clientById[l.client]?.name || l.client}</Td>
                  <Td>
                    <span style={{ color: isBillable(l.svc) ? BRAND.navy : BRAND.amber }}>{l.svc}</span>
                  </Td>
                  {days.map((d) => (
                    <td key={d} className="px-1 py-1 border-b" style={{ borderColor: BRAND.line }}>
                      <HourCell value={hoursAt(l.client, l.svc, d)} onCommit={(v) => commit(l.client, l.svc, d, v)} />
                    </td>
                  ))}
                  <Td align="right" mono strong>
                    {rowTotal(l.client, l.svc) ? hrs(rowTotal(l.client, l.svc)) : ""}
                  </Td>
                </tr>
              ))}
              <tr style={{ background: BRAND.wash }}>
                <Td strong>Daily total</Td>
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
          <div style={{ width: 240 }}>
            <Label>Add a client line</Label>
            <Select
              value={newClient}
              onChange={setNewClient}
              placeholder="Select client"
              options={cfg.clients
                .filter((c) => c.active !== false)
                .slice()
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((c) => ({ value: c.id, label: c.name }))}
            />
          </div>
          <div style={{ width: 260 }}>
            <Label>Service type</Label>
            <Select
              value={newService}
              onChange={setNewService}
              placeholder="Select service type"
              options={cfg.services}
            />
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

const Stat = ({ label, value, color }) => (
  <div>
    <div className="text-xs uppercase tracking-widest" style={{ color: BRAND.slate }}>
      {label}
    </div>
    <div className="text-2xl font-mono font-semibold" style={{ color: color || BRAND.navy }}>
      {value}
    </div>
  </div>
);

/* ================= profitability ================= */

function Profitability({ cfg, entries, finance, months, saveFinance, clientById, clientName, rateOf }) {
  const thisMonth = todayISO().slice(0, 7);
  const [ym, setYm] = useState(months.includes(thisMonth) ? thisMonth : months[months.length - 1] || thisMonth);
  const [view, setView] = useState("client");

  const finRows = finance[ym] || [];
  const monthEntries = entries[ym] || [];

  const importFinance = (raw) => {
    const rows = raw
      .map((r) => ({
        id: uid(),
        client: clean(pickCol(r, ["client", "client name", "customer", "account"])),
        svc: clean(pickCol(r, ["service type", "service", "servicetype", "category"])),
        revenue: toNumber(pickCol(r, ["revenue", "rev", "income", "sales"])),
        cogs: toNumber(pickCol(r, ["cogs", "expense", "cost", "direct cost", "pass through"])),
      }))
      .filter((r) => r.client);
    saveFinance(ym, rows);
  };

  const matchClientId = (name) => {
    const hit = cfg.clients.find((c) => norm(c.name) === norm(name));
    return hit?.id || null;
  };

  const laborFor = (clientId, svc) =>
    monthEntries
      .filter((e) => e.client === clientId && (svc == null || e.svc === svc))
      .reduce((s, e) => s + Number(e.hours || 0) * rateOf(e.emp), 0);

  const hoursFor = (clientId, svc) =>
    monthEntries
      .filter((e) => e.client === clientId && (svc == null || e.svc === svc))
      .reduce((s, e) => s + Number(e.hours || 0), 0);

  const lines = useMemo(() => {
    const map = new Map();
    const seen = new Set();

    finRows.forEach((f) => {
      const cid = matchClientId(f.client);
      const key = view === "client" ? f.client : f.svc || "Unassigned service";
      if (!map.has(key)) map.set(key, { key, revenue: 0, cogs: 0, labor: 0, hours: 0, matched: !!cid });
      const row = map.get(key);
      row.revenue += f.revenue;
      row.cogs += f.cogs;
      if (cid) {
        const svc = f.svc || null;
        row.labor += laborFor(cid, svc);
        row.hours += hoursFor(cid, svc);
        seen.add(`${cid}||${f.svc || ""}`);
        row.matched = true;
      }
    });

    // billable time with no revenue line attached
    monthEntries
      .filter((e) => isBillable(e.svc))
      .forEach((e) => {
        const cid = e.client;
        const combo = `${cid}||${e.svc}`;
        if (seen.has(combo)) return;
        const key = view === "client" ? clientName(cid) : e.svc;
        if (!map.has(key)) map.set(key, { key, revenue: 0, cogs: 0, labor: 0, hours: 0, matched: false, orphan: true });
        const row = map.get(key);
        row.labor += Number(e.hours || 0) * rateOf(e.emp);
        row.hours += Number(e.hours || 0);
        row.orphan = true;
      });

    return [...map.values()]
      .map((r) => ({ ...r, gp: r.revenue - r.cogs - r.labor, margin: r.revenue ? (r.revenue - r.cogs - r.labor) / r.revenue : null }))
      .sort((a, b) => b.gp - a.gp);
  }, [finRows, monthEntries, view, cfg.clients, cfg.employees]);

  const internal = useMemo(() => {
    const map = new Map();
    monthEntries
      .filter((e) => !isBillable(e.svc))
      .forEach((e) => {
        if (!map.has(e.svc)) map.set(e.svc, { key: e.svc, hours: 0, cost: 0 });
        const r = map.get(e.svc);
        r.hours += Number(e.hours || 0);
        r.cost += Number(e.hours || 0) * rateOf(e.emp);
      });
    return [...map.values()].sort((a, b) => b.cost - a.cost);
  }, [monthEntries, cfg.employees]);

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
  const unmatched = finRows.filter((f) => !matchClientId(f.client));

  return (
    <>
      <Card
        title="Monthly revenue and cost import"
        note="One row per client and service type. Columns can be named loosely, the import looks for client, service type, revenue and COGS."
        right={
          <div style={{ width: 170 }}>
            <Select value={ym} onChange={setYm} options={months.map((m) => ({ value: m, label: monthLabel(m) }))} />
          </div>
        }
      >
        <CsvInput label={`Load the ${monthLabel(ym)} file`} onRows={importFinance} />
        {finRows.length > 0 && (
          <p className="text-sm mt-3" style={{ color: BRAND.slate }}>
            {num(finRows.length)} rows loaded for {monthLabel(ym)}, {money(finRows.reduce((s, f) => s + f.revenue, 0))} of
            revenue. Loading again replaces the month.
          </p>
        )}
        {unmatched.length > 0 && (
          <div className="mt-3 border-l-4 p-3" style={{ borderColor: BRAND.amber, background: "#FFF8EC" }}>
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
        title={`Profitability, ${monthLabel(ym)}`}
        note="Gross profit is revenue less COGS less the labor cost of time booked to that client or service type."
        right={
          <>
            <Btn kind={view === "client" ? "solid" : "ghost"} onClick={() => setView("client")}>
              By client
            </Btn>
            <Btn kind={view === "service" ? "solid" : "ghost"} onClick={() => setView("service")}>
              By service type
            </Btn>
            <Btn
              onClick={() =>
                downloadCSV(
                  `s4_profitability_${ym}_by_${view}.csv`,
                  lines.map((r) => ({
                    [view]: r.key,
                    revenue: Math.round(r.revenue),
                    cogs: Math.round(r.cogs),
                    hours: r.hours,
                    labor_cost: Math.round(r.labor),
                    gross_profit: Math.round(r.gp),
                    margin_pct: r.margin === null ? "" : Math.round(r.margin * 100),
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
          <Stat label="Client labor" value={money(totals.labor)} />
          <Stat label="Gross profit" value={money(totals.gp)} color={totals.gp < 0 ? BRAND.red : BRAND.teal} />
          <Stat
            label="Margin"
            value={totals.revenue ? `${num((totals.gp / totals.revenue) * 100, 0)}%` : "n/a"}
            color={totals.gp < 0 ? BRAND.red : BRAND.navy}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <Th>{view === "client" ? "Client" : "Service type"}</Th>
                <Th align="right">Revenue</Th>
                <Th align="right">COGS</Th>
                <Th align="right">Hours</Th>
                <Th align="right">Labor</Th>
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
                    {money(r.cogs)}
                  </Td>
                  <Td align="right" mono>
                    {hrs(r.hours)}
                  </Td>
                  <Td align="right" mono>
                    {money(r.labor)}
                  </Td>
                  <Td align="right" mono strong>
                    <span style={{ color: r.gp < 0 ? BRAND.red : BRAND.navy }}>{money(r.gp)}</span>
                  </Td>
                  <Td align="right" mono>
                    {r.margin === null ? "n/a" : `${num(r.margin * 100, 0)}%`}
                  </Td>
                </tr>
              ))}
              {!lines.length && (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-sm" style={{ color: BRAND.slate }}>
                    Load a revenue file for this month, or book some client time, and the analysis fills in.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
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
          <Stat
            label="Internal share of hours"
            value={
              totals.hours + internal.reduce((s, r) => s + r.hours, 0)
                ? `${num(
                    (internal.reduce((s, r) => s + r.hours, 0) /
                      (totals.hours + internal.reduce((s, r) => s + r.hours, 0))) *
                      100,
                    0
                  )}%`
                : "0%"
            }
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
                  No internal time booked this month.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </>
  );
}

/* ================= setup ================= */

function Setup({ cfg, saveCfg, entries, finance, allEntries, sync, connectSync, pushLocalToSync, busy }) {
  const [syncUrl, setSyncUrl] = useState(sync.url);
  const [syncMsg, setSyncMsg] = useState("");
  const [newEmp, setNewEmp] = useState({ name: "", role: "", rate: "" });
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
      }))
      .filter((r) => r.name);
    const next = cfg.employees.map((e) => ({ ...e }));
    parsed.forEach((p) => {
      const hit = next.find((e) => norm(e.name) === norm(p.name));
      if (hit) {
        hit.rate = p.rate || hit.rate;
        hit.role = p.role || hit.role;
      } else next.push({ id: uid(), name: p.name, role: p.role, rate: p.rate });
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

  return (
    <>
      <Card
        title="Where the data lives"
        note="Left empty, this file keeps everything in your own browser and nobody else sees it. Paste the shared endpoint and the whole team writes to one book."
      >
        <div className="flex flex-wrap items-end gap-3">
          <div style={{ width: 420 }}>
            <Label>Shared endpoint</Label>
            <Field
              value={syncUrl}
              onChange={setSyncUrl}
              placeholder="https://script.google.com/macros/s/..../exec"
            />
          </div>
          <Btn
            kind="solid"
            disabled={busy}
            onClick={async () => {
              setSyncMsg("Checking");
              const r = await connectSync(syncUrl);
              setSyncMsg(r.ok ? (syncUrl.trim() ? "Connected" : "Sync off") : `Could not connect. ${r.error}`);
            }}
          >
            {syncUrl.trim() ? "Connect" : "Turn sync off"}
          </Btn>
          <Btn onClick={pushLocalToSync} disabled={!sync.url || busy}>
            Push this browser's data up
          </Btn>
        </div>
        <p className="text-sm mt-3" style={{ color: sync.error ? BRAND.red : BRAND.slate }}>
          {syncMsg ||
            (!sync.url
              ? "Running on this browser only. Time entered here stays here."
              : sync.online
              ? "Connected to the shared book. A local copy is still written every time, so an outage never costs anyone their week."
              : `Shared book unreachable. ${sync.error} Entries are still saving locally.`)}
        </p>
      </Card>

      <Card
        title="People and hourly cost"
        note="Loaded from the S4 Connect site. Hourly cost drives every labor number in the reports, and fully loaded cost is the right figure here, not billing rate."
      >
        <div className="grid gap-4" style={{ gridTemplateColumns: "minmax(0,1fr) minmax(0,320px)" }}>
          <div>
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <Th>Name</Th>
                  <Th>Role</Th>
                  <Th align="right" w="140px">Hourly cost</Th>
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
                        value={e.role || ""}
                        placeholder="Role"
                        onChange={(v) =>
                          saveCfg({ ...cfg, employees: cfg.employees.map((x) => (x.id === e.id ? { ...x, role: v } : x)) })
                        }
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
            <div className="flex gap-2 mt-3">
              <Field value={newEmp.name} onChange={(v) => setNewEmp({ ...newEmp, name: v })} placeholder="Name" />
              <Field value={newEmp.role} onChange={(v) => setNewEmp({ ...newEmp, role: v })} placeholder="Role" />
              <Field
                mono
                width="140px"
                value={newEmp.rate}
                onChange={(v) => setNewEmp({ ...newEmp, rate: v })}
                placeholder="Cost"
              />
              <Btn
                kind="solid"
                disabled={!newEmp.name.trim()}
                onClick={() => {
                  saveCfg({
                    ...cfg,
                    employees: [
                      ...cfg.employees,
                      { id: uid(), name: newEmp.name.trim(), role: newEmp.role.trim(), rate: toNumber(newEmp.rate) },
                    ],
                  });
                  setNewEmp({ name: "", role: "", rate: "" });
                }}
              >
                Add
              </Btn>
            </div>
          </div>
          <CsvInput label="Import or update costs, columns Name, Role and Hourly Cost" onRows={importEmployees} />
        </div>
      </Card>

      <Card
        title="Clients"
        note="Loaded from the client wall on the site. Names here have to match the client names in your monthly revenue file for profitability to line up. Anything set to hidden stays in the reports but drops out of the time entry dropdown."
      >
        <div className="grid gap-4" style={{ gridTemplateColumns: "minmax(0,1fr) minmax(0,320px)" }}>
          <div>
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <Th>Client</Th>
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
                    <Td align="center">
                      <Btn
                        kind={c.active === false ? "ghost" : "teal"}
                        onClick={() =>
                          saveCfg({
                            ...cfg,
                            clients: cfg.clients.map((x) =>
                              x.id === c.id ? { ...x, active: x.active === false } : x
                            ),
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

/* mount */
const rootEl = typeof document !== "undefined" && document.getElementById("root");
if (rootEl) createRoot(rootEl).render(<App />);
