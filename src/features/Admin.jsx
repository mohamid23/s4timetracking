import React, { useEffect, useState } from "react";
import { BRAND, ROLES, ROLE_LABEL } from "../lib/constants";
import { uid, clean, downloadCSV } from "../lib/helpers";
import { S } from "../lib/storage";
import { Btn, Card, Field, Label, Select, Td, Th } from "../components/ui";

const ROLE_OPTIONS = [
  { value: ROLES.CONTRIBUTOR, label: ROLE_LABEL[ROLES.CONTRIBUTOR] },
  { value: ROLES.ACCOUNT_MANAGER, label: ROLE_LABEL[ROLES.ACCOUNT_MANAGER] },
  { value: ROLES.ADMIN, label: ROLE_LABEL[ROLES.ADMIN] },
  { value: ROLES.SUPER_ADMIN, label: ROLE_LABEL[ROLES.SUPER_ADMIN] },
];

function fmtTime(ts) {
  if (!ts) return "";
  return new Date(Number(ts)).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

const ACTION_LABEL = {
  settings_changed: "Settings",
  hours_changed: "Hours",
  revenue_imported: "Revenue import",
  signed_in: "Sign in",
  signed_out: "Sign out",
  login_failed: "Failed sign-in",
  password_created: "Password set",
  password_set_via_link: "Password set",
  setup_link_created: "Setup link",
  config_saved: "Settings (older entry)",
  finance_imported: "Revenue import (older entry)",
  invite_sent: "Invite (older entry)",
};
const actionLabel = (a) => ACTION_LABEL[a] || a || "Event";

const whoOf = (r, people) => r.actorName || people[r.actor] || r.actor || "—";

function LogTable({ rows, empty, people, kind }) {
  if (!rows.length) {
    return (
      <p className="text-sm" style={{ color: BRAND.slate }}>
        {empty}
      </p>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <Th w="170px">When</Th>
            <Th w="150px">Who</Th>
            <Th w="130px">Type</Th>
            <Th>What changed</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} style={{ verticalAlign: "top" }}>
              <Td mono>{fmtTime(r.ts)}</Td>
              <Td>{whoOf(r, people)}</Td>
              <Td>
                <span style={{ color: r.action === "login_failed" || kind === "error" ? BRAND.red : BRAND.slate }}>
                  {kind === "error" ? "Error" : actionLabel(r.action)}
                </span>
              </Td>
              <Td>
                <div className="font-medium">
                  {r.summary || r.message || actionLabel(r.action)}
                  {r.synced === false && (
                    <span className="text-xs ml-2" style={{ color: BRAND.amber }}>
                      not yet in shared storage when logged
                    </span>
                  )}
                </div>
                {Array.isArray(r.changes) && r.changes.length > 1 && (
                  <ul className="text-xs mt-1 list-disc pl-4" style={{ color: BRAND.slate }}>
                    {r.changes.map((c, j) => (
                      <li key={j}>{c}</li>
                    ))}
                  </ul>
                )}
                {kind === "error" && r.source && (
                  <div className="text-xs mt-0.5 font-mono" style={{ color: BRAND.slate }}>
                    {r.source}
                    {r.line ? `:${r.line}` : ""}
                  </div>
                )}
              </Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Admin({ cfg, saveCfg, sync, meRecord }) {
  const [form, setForm] = useState({ name: "", email: "", role: ROLES.CONTRIBUTOR });
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [activity, setActivity] = useState([]);
  const [errors, setErrors] = useState([]);
  const [rowStatus, setRowStatus] = useState({});
  const [sendingId, setSendingId] = useState(null);
  const [fWho, setFWho] = useState("");
  const [fType, setFType] = useState("");
  const [fText, setFText] = useState("");
  const people = Object.fromEntries(cfg.employees.map((e) => [e.id, e.name]));

  const refreshLogs = async () => {
    setActivity(await S.listLogs("activity", 200));
    setErrors(await S.listLogs("error", 200));
  };

  useEffect(() => {
    refreshLogs();
  }, []);

  const copyLinkForEmail = async (email, id) => {
    const r = await S.createSetupLink(email);
    if (!r.ok) return { ok: false, error: r.error };
    const link = `${window.location.origin}/?setpw=${r.token}`;
    S.log("activity", {
      actor: meRecord?.id || "",
      actorName: meRecord?.name || "",
      action: "setup_link_created",
      summary: `Created a setup link for ${email}`,
    });
    try {
      await navigator.clipboard.writeText(link);
      return { ok: true, copied: true, link };
    } catch {
      return { ok: true, copied: false, link };
    }
  };

  const inviteTeammate = async () => {
    const name = clean(form.name);
    const email = clean(form.email);
    if (!name || !email) {
      setStatus("Name and email are both required.");
      return;
    }
    setBusy(true);
    const existing = cfg.employees.find((e) => clean(e.email).toLowerCase() === email.toLowerCase());
    const next = existing
      ? cfg.employees.map((e) => (e === existing ? { ...e, name, accessLevel: form.role } : e))
      : [...cfg.employees, { id: uid(), name, email, role: "", rate: 0, accessLevel: form.role, managedClients: [] }];
    await saveCfg({ ...cfg, employees: next });

    const r = await copyLinkForEmail(email);
    setStatus(
      !r.ok
        ? `${name} was added, but the setup link couldn't be created: ${r.error}`
        : r.copied
        ? `${name} was added. Setup link copied — paste it to them (Slack, text, etc.).`
        : `${name} was added. Couldn't copy automatically — here's the link: ${r.link}`
    );
    setBusy(false);
    setForm({ name: "", email: "", role: ROLES.CONTRIBUTOR });
    refreshLogs();
  };

  const sendInviteToExisting = async (emp) => {
    const email = clean(emp.email);
    if (!email) {
      setRowStatus((p) => ({ ...p, [emp.id]: "No email on file — add one under Setup first." }));
      return;
    }
    setSendingId(emp.id);
    const r = await copyLinkForEmail(email, emp.id);
    setRowStatus((p) => ({
      ...p,
      [emp.id]: !r.ok
        ? `Couldn't create a link: ${r.error}`
        : r.copied
        ? "Setup link copied — paste it to them."
        : `Couldn't copy automatically — here's the link: ${r.link}`,
    }));
    setSendingId(null);
    refreshLogs();
  };

  const whoOptions = [...new Set(activity.map((r) => whoOf(r, people)))].filter((x) => x && x !== "—").sort().map((n) => ({ value: n, label: n }));
  const typeOptions = [...new Set(activity.map((r) => r.action).filter(Boolean))];
  const filteredActivity = activity.filter((r) => {
    if (fWho && whoOf(r, people) !== fWho) return false;
    if (fType && r.action !== fType) return false;
    if (fText) {
      const hay = `${r.summary || ""} ${(r.changes || []).join(" ")} ${whoOf(r, people)}`.toLowerCase();
      if (!hay.includes(fText.toLowerCase())) return false;
    }
    return true;
  });

  return (
    <>
      <Card
        title="Invite a teammate"
        note="Adds them to the team list with a role, and copies a one-time setup link to your clipboard to send them yourself."
      >
        <div className="flex flex-wrap items-end gap-3">
          <div style={{ width: 200 }}>
            <Label>Name</Label>
            <Field value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="Full name" />
          </div>
          <div style={{ width: 240 }}>
            <Label>Email</Label>
            <Field value={form.email} onChange={(v) => setForm({ ...form, email: v })} placeholder="name@s4connect.com" />
          </div>
          <div style={{ width: 180 }}>
            <Label>Role</Label>
            <Select value={form.role} onChange={(v) => setForm({ ...form, role: v })} options={ROLE_OPTIONS} />
          </div>
          <Btn kind="solid" onClick={inviteTeammate} disabled={busy || !form.name.trim() || !form.email.trim()}>
            Add &amp; copy setup link
          </Btn>
        </div>
        {status && (
          <p className="text-sm mt-3" style={{ color: BRAND.slate }}>
            {status}
          </p>
        )}
        {!sync.online && (
          <p className="text-xs mt-2" style={{ color: BRAND.amber }}>
            Shared storage is unreachable right now — this teammate was added on this device only and will sync once
            it's back. See Setup for details.
          </p>
        )}
      </Card>

      <Card
        title="Send a setup link to an existing teammate"
        note="Everyone already on the team list. Copies a one-time link to set a password — paste it to them however you'd like."
      >
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <Th>Name</Th>
                <Th>Email</Th>
                <Th w="150px">Access</Th>
                <Th w="260px"></Th>
              </tr>
            </thead>
            <tbody>
              {cfg.employees.map((e) => (
                <tr key={e.id}>
                  <Td>{e.name}</Td>
                  <Td>{e.email || <span style={{ color: BRAND.amber }}>no email on file</span>}</Td>
                  <Td>{ROLE_LABEL[e.accessLevel || ROLES.CONTRIBUTOR]}</Td>
                  <Td align="right">
                    <Btn onClick={() => sendInviteToExisting(e)} disabled={sendingId === e.id}>
                      {sendingId === e.id ? "Creating…" : "Copy setup link"}
                    </Btn>
                    {rowStatus[e.id] && (
                      <div className="text-xs mt-1" style={{ color: BRAND.slate }}>
                        {rowStatus[e.id]}
                      </div>
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card
        title="Activity log"
        note="Every sign-in, setting change, hours entry and revenue import, with what it was before and after. Kept on this device and in shared storage."
        right={
          <>
            <Btn
              onClick={() =>
                downloadCSV(
                  "s4_activity_log.csv",
                  filteredActivity.map((r) => ({
                    when: fmtTime(r.ts),
                    who: whoOf(r, people),
                    type: actionLabel(r.action),
                    summary: r.summary || "",
                    details: Array.isArray(r.changes) ? r.changes.join(" | ") : "",
                  }))
                )
              }
              disabled={!filteredActivity.length}
            >
              Download CSV
            </Btn>
            <Btn onClick={refreshLogs} disabled={busy}>
              Refresh
            </Btn>
          </>
        }
      >
        <div className="flex flex-wrap gap-3 mb-4">
          <div style={{ width: 190 }}>
            <Label>Person</Label>
            <Select value={fWho} onChange={setFWho} placeholder="Everyone" options={whoOptions} />
          </div>
          <div style={{ width: 190 }}>
            <Label>Type</Label>
            <Select
              value={fType}
              onChange={setFType}
              placeholder="All types"
              options={typeOptions.map((a) => ({ value: a, label: actionLabel(a) }))}
            />
          </div>
          <div style={{ width: 260 }}>
            <Label>Search</Label>
            <Field value={fText} onChange={setFText} placeholder="Client, person, amount…" />
          </div>
        </div>
        <LogTable rows={filteredActivity} empty={activity.length ? "Nothing matches those filters." : "Nothing logged yet."} people={people} kind="activity" />
      </Card>

      <Card title="Error log" note="Problems the app ran into, client and server side, for troubleshooting.">
        <LogTable rows={errors} empty="No errors logged. That's good." people={people} kind="error" />
      </Card>
    </>
  );
}
