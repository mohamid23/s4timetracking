import React, { useEffect, useState } from "react";
import { BRAND, ROLES, ROLE_LABEL } from "../lib/constants";
import { uid, clean } from "../lib/helpers";
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
  return new Date(Number(ts)).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function LogTable({ rows, empty }) {
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
            <Th w="160px">When</Th>
            <Th w="160px">Who</Th>
            <Th>What</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <Td mono>{fmtTime(r.ts)}</Td>
              <Td>{r.actor || "—"}</Td>
              <Td>
                <span>{r.action || r.kind}</span>
                {r.details && Object.keys(r.details).length > 0 && (
                  <span className="text-xs block mt-0.5" style={{ color: BRAND.slate }}>
                    {Object.entries(r.details)
                      .filter(([k]) => !["ts", "kind", "actor", "action"].includes(k))
                      .map(([k, v]) => `${k}: ${v}`)
                      .join(", ")}
                  </span>
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

  const refreshLogs = async () => {
    setActivity(await S.listLogs("activity", 200));
    setErrors(await S.listLogs("error", 200));
  };

  useEffect(() => {
    refreshLogs();
  }, []);

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

    const r = await S.requestSetup({ email, name, inviter: meRecord?.name || "the team" });
    setStatus(
      r.ok
        ? `${name} was added and emailed at ${email} to set a password.`
        : `${name} was added, but the invitation email failed to send: ${r.error}`
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
    const r = await S.requestSetup({ email, name: emp.name, inviter: meRecord?.name || "the team" });
    setRowStatus((p) => ({
      ...p,
      [emp.id]: r.ok ? `Emailed at ${email} to set a password.` : `Failed to send: ${r.error}`,
    }));
    setSendingId(null);
    refreshLogs();
  };

  return (
    <>
      <Card
        title="Invite a teammate"
        note="Adds them to the team list with a role, and emails them a link to set their own password."
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
            Add &amp; invite
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
        title="Send an invite to an existing teammate"
        note="Everyone already on the team list, with a one-click email to set a password and sign in."
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
                      {sendingId === e.id ? "Sending…" : "Send invite"}
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
        note="Sign-ins, config changes, and revenue imports. Kept locally on this device, and in shared storage once connected."
        right={
          <Btn onClick={refreshLogs} disabled={busy}>
            Refresh
          </Btn>
        }
      >
        <LogTable rows={activity} empty="Nothing logged yet." />
      </Card>

      <Card title="Error log" note="Problems the app ran into, client and server side, for troubleshooting.">
        <LogTable rows={errors} empty="No errors logged. That's good." />
      </Card>
    </>
  );
}
