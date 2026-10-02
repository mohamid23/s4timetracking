import { uid, todayISO, pad } from "./helpers";
import { DEFAULT_SERVICES, DEFAULT_CAPABILITY_MAP, ROLES, isBillable } from "./constants";

/* Sample book for people kicking the tires before real data exists. Nothing here
   is persisted — it lives only in memory for the session and never touches the
   shared store, so there's no cleanup step once someone signs in for real. */

const DEMO_CLIENTS = [
  { id: "d-northfield-auto", name: "Northfield Auto Group", industry: "Automotive" },
  { id: "d-harbor-home", name: "Harbor Home Services", industry: "Home Services" },
  { id: "d-meridian-industrial", name: "Meridian Industrial Supply", industry: "Industrial & Manufacturing" },
  { id: "d-crestline-law", name: "Crestline Law Partners", industry: "Professional Services" },
  { id: "d-bayview-dental", name: "Bayview Dental Group", industry: "Healthcare" },
  { id: "d-union-realty", name: "Union Realty Partners", industry: "Real Estate & Construction" },
];

const DEMO_PROJECTS = [
  { client: "d-northfield-auto", names: ["Always-On Paid Search", "Spring Sales Event Campaign"] },
  { client: "d-harbor-home", names: ["Brand Refresh", "Local Service Ads Program"] },
  { client: "d-meridian-industrial", names: ["Website Rebuild", "Trade Show Collateral"] },
  { client: "d-crestline-law", names: ["Reputation & SEO"] },
  { client: "d-bayview-dental", names: ["Social & Content Retainer"] },
  { client: "d-union-realty", names: ["Listing Campaign Management"] },
];

const DEMO_EMPLOYEES = [
  { id: "d-super", name: "You (Super Admin preview)", role: "Super Admin", rate: 95, accessLevel: ROLES.SUPER_ADMIN, managedClients: [], email: "demo-super@s4connect.com" },
  { id: "d-admin1", name: "Avery Lang", role: "Co-founder, CEO", rate: 110, accessLevel: ROLES.ADMIN, managedClients: [], email: "" },
  { id: "d-am1", name: "Priya Nair", role: "Account Manager", rate: 62, accessLevel: ROLES.ACCOUNT_MANAGER, managedClients: ["d-northfield-auto", "d-harbor-home"], email: "" },
  { id: "d-am2", name: "Marcus Webb", role: "Account Manager", rate: 58, accessLevel: ROLES.ACCOUNT_MANAGER, managedClients: ["d-meridian-industrial", "d-union-realty"], email: "" },
  { id: "d-c1", name: "Sofia Reyes", role: "Paid Media Specialist", rate: 48, accessLevel: ROLES.CONTRIBUTOR, managedClients: [], email: "" },
  { id: "d-c2", name: "Jordan Pike", role: "Creative Director", rate: 64, accessLevel: ROLES.CONTRIBUTOR, managedClients: [], email: "" },
  { id: "d-c3", name: "Elena Cho", role: "SEO Strategist", rate: 52, accessLevel: ROLES.CONTRIBUTOR, managedClients: [], email: "" },
  { id: "d-c4", name: "Tyler Brooks", role: "Web Developer", rate: 55, accessLevel: ROLES.CONTRIBUTOR, managedClients: [], email: "" },
];

function monthsBack(n) {
  const [y, m] = todayISO().slice(0, 7).split("-").map(Number);
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(y, m - 1 - i, 1);
    out.push(`${d.getFullYear()}-${pad(d.getMonth() + 1)}`);
  }
  return out;
}

function seededRand(seed) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

export function buildDemoBook() {
  const projects = [];
  DEMO_PROJECTS.forEach((p) => {
    p.names.forEach((name, i) => projects.push({ id: `${p.client}-proj-${i}`, clientId: p.client, name, active: true }));
  });

  const cfg = {
    employees: DEMO_EMPLOYEES,
    clients: DEMO_CLIENTS.map((c) => ({ ...c, active: true })),
    services: DEFAULT_SERVICES,
    projects,
    capabilityMap: DEFAULT_CAPABILITY_MAP,
    industries: [...new Set(DEMO_CLIENTS.map((c) => c.industry))],
  };

  const billableServices = DEFAULT_SERVICES.filter(isBillable);
  const months = monthsBack(6);
  const entries = {};
  const finance = {};
  const rand = seededRand(42);

  months.forEach((ym, mi) => {
    const ent = [];
    const fin = [];
    const daysInMonth = new Date(...ym.split("-").map(Number).map((n, i) => (i === 1 ? n - 1 : n)), 0).getDate();

    DEMO_CLIENTS.forEach((client, ci) => {
      const clientProjects = projects.filter((p) => p.clientId === client.id);
      const growth = 1 + mi * 0.04 + (ci % 2 === 0 ? 0.02 : -0.01);
      let clientRevenue = 0;
      let clientCogs = 0;

      clientProjects.forEach((proj, pi) => {
        const svcPicks = billableServices.filter((_, si) => (si + ci + pi) % 4 !== 3).slice(0, 3);
        svcPicks.forEach((svc) => {
          const staff = DEMO_EMPLOYEES.filter((e) => e.accessLevel === ROLES.CONTRIBUTOR);
          const worker = staff[(ci + pi + svc.length) % staff.length];
          const hoursThisMonth = Math.round((8 + rand() * 14) * growth * 10) / 10;
          for (let d = 1; d <= daysInMonth; d += 4) {
            const dateStr = `${ym}-${pad(Math.min(d, daysInMonth))}`;
            const h = Math.round((hoursThisMonth / 7) * (0.6 + rand() * 0.8) * 10) / 10;
            if (h <= 0) continue;
            ent.push({ id: uid(), emp: worker.id, client: client.id, project: proj.id, svc, date: dateStr, hours: h, ts: Date.now() });
          }
        });
        const projRevenue = Math.round((3200 + rand() * 4200) * growth);
        const projCogs = Math.round(projRevenue * (0.08 + rand() * 0.1));
        clientRevenue += projRevenue;
        clientCogs += projCogs;
        fin.push({ id: uid(), client: client.name, project: proj.id, svc: svcPicks[0] || "", revenue: projRevenue, cogs: projCogs });
      });

      // a little internal time too, so the overhead pool isn't empty
      const internalSvcs = DEFAULT_SERVICES.filter((s) => !isBillable(s));
      const am = DEMO_EMPLOYEES.find((e) => e.accessLevel === ROLES.ACCOUNT_MANAGER && e.managedClients.includes(client.id));
      if (am) {
        ent.push({
          id: uid(),
          emp: am.id,
          client: client.id,
          project: null,
          svc: internalSvcs[ci % internalSvcs.length],
          date: `${ym}-10`,
          hours: 3,
          ts: Date.now(),
        });
      }
    });

    entries[ym] = ent;
    finance[ym] = fin;
  });

  return { cfg, entries, finance, months };
}
