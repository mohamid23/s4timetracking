import { DEFAULT_SERVICES, DEFAULT_CLIENTS, DEFAULT_EMPLOYEES, DEFAULT_CAPABILITY_MAP, DEFAULT_INDUSTRIES } from "./constants";

export const sameJson = (a, b) => JSON.stringify(a) === JSON.stringify(b);

export function normalizeCfg(c) {
  return {
    employees: c.employees?.length ? c.employees : DEFAULT_EMPLOYEES,
    clients: c.clients?.length ? c.clients : DEFAULT_CLIENTS,
    services: c.services?.length ? c.services : DEFAULT_SERVICES,
    projects: c.projects || [],
    capabilityMap: c.capabilityMap || DEFAULT_CAPABILITY_MAP,
    industries: c.industries?.length ? c.industries : DEFAULT_INDUSTRIES,
  };
}

/* Three-way merge of a list of records keyed by id. `prev` is what this browser
   last saw from the shared book, `next` is what this person just changed it to,
   `remote` is what's in the shared book now. Anything this person didn't touch
   follows the shared book (including other people's edits and deletions);
   anything they added, changed or removed wins; records other people added are kept. */
export function mergeList(prev = [], next = [], remote = []) {
  const prevMap = new Map(prev.map((x) => [x.id, x]));
  const remoteMap = new Map(remote.map((x) => [x.id, x]));
  const nextIds = new Set(next.map((x) => x.id));
  const out = [];
  next.forEach((item) => {
    const p = prevMap.get(item.id);
    if (p && sameJson(item, p)) {
      const r = remoteMap.get(item.id);
      if (r) out.push(r);
    } else out.push(item);
  });
  remote.forEach((r) => {
    if (!prevMap.has(r.id) && !nextIds.has(r.id)) out.push(r);
  });
  return out;
}

export function mergeCfg(prev, next, remote) {
  const out = { ...next };
  ["clients", "employees", "projects"].forEach((k) => {
    out[k] = mergeList(prev[k], next[k], remote[k]);
  });
  ["services", "industries", "capabilityMap"].forEach((k) => {
    if (sameJson(next[k], prev[k]) && remote[k] !== undefined) out[k] = remote[k];
  });
  return out;
}
