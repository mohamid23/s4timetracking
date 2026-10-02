import React, { useEffect, useState } from "react";
import { BRAND } from "../lib/constants";
import { S4Mark, Btn, Field } from "../components/ui";
import { findByEmail, isValidEmail } from "../lib/auth";
import { KpiTile, RankedBarChart } from "../components/charts";
import { money, hrs } from "../lib/helpers";
import { S } from "../lib/storage";

const PREVIEW_RESOURCES = [
  { key: "Sofia Reyes", value: 18400 },
  { key: "Jordan Pike", value: 14200 },
  { key: "Elena Cho", value: 11900 },
  { key: "Tyler Brooks", value: 8100 },
];

function Shell({ children }) {
  return (
    <div className="min-h-screen" style={{ background: BRAND.wash }}>
      <header style={{ background: BRAND.navy }}>
        <div className="max-w-6xl mx-auto px-5 py-4 flex items-center gap-4">
          <S4Mark height={40} />
          <div className="pl-4 border-l" style={{ borderColor: "#3A4560" }}>
            <div className="text-white text-lg font-semibold leading-tight">Time and Profitability</div>
            <div className="text-xs" style={{ color: "#9AA6BF" }}>
              S4 Connect internal reporting
            </div>
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}

/* Reached via the emailed setup link: ?setpw=<token>. Verifies the token,
   then lets the person pick a password — proving they control the inbox is
   the whole point of emailing this link rather than letting anyone type an
   address and go. */
function SetPasswordScreen({ token, cfg, onSignIn }) {
  const [state, setState] = useState("checking"); // checking | ready | invalid | done
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    S.verifySetupToken(token).then((r) => {
      if (r.ok) {
        setEmail(r.email);
        setState("ready");
      } else {
        setError(r.error || "This link isn't valid.");
        setState("invalid");
      }
    });
  }, [token]);

  const submit = async () => {
    if (password.length < 8) {
      setError("Password needs to be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setBusy(true);
    const r = await S.setPassword(token, password);
    setBusy(false);
    if (!r.ok) {
      setError(r.error || "Couldn't set that password.");
      return;
    }
    const hit = findByEmail(cfg.employees, r.email);
    window.history.replaceState({}, "", window.location.pathname);
    if (hit) onSignIn(hit.id);
    else setState("done");
  };

  return (
    <Shell>
      <main className="max-w-md mx-auto px-5 py-12">
        <h1 className="text-2xl font-semibold mb-2" style={{ color: BRAND.navy }}>
          Set your password
        </h1>
        {state === "checking" && (
          <p className="text-sm" style={{ color: BRAND.slate }}>
            Checking your link…
          </p>
        )}
        {state === "invalid" && (
          <p className="text-sm" style={{ color: BRAND.red }}>
            {error}
          </p>
        )}
        {state === "done" && (
          <p className="text-sm" style={{ color: BRAND.slate }}>
            Password set. Go back to the sign-in page and sign in with {email}.
          </p>
        )}
        {state === "ready" && (
          <div className="border p-4" style={{ borderColor: BRAND.line, background: BRAND.paper }}>
            <p className="text-sm mb-4" style={{ color: BRAND.slate }}>
              Setting a password for <strong>{email}</strong>.
            </p>
            <label className="text-xs uppercase tracking-widest mb-1 block" style={{ color: BRAND.slate }}>
              New password
            </label>
            <Field value={password} onChange={setPassword} type="password" placeholder="At least 8 characters" autoFocus />
            <label className="text-xs uppercase tracking-widest mb-1 mt-3 block" style={{ color: BRAND.slate }}>
              Confirm password
            </label>
            <Field
              value={confirm}
              onChange={setConfirm}
              type="password"
              onKeyDown={(e) => e.key === "Enter" && submit()}
            />
            {error && (
              <p className="text-xs mt-2" style={{ color: BRAND.red }}>
                {error}
              </p>
            )}
            <div className="mt-3">
              <Btn kind="solid" onClick={submit} disabled={busy}>
                {busy ? "Setting…" : "Set password and sign in"}
              </Btn>
            </div>
          </div>
        )}
      </main>
    </Shell>
  );
}

export default function SignIn({ cfg, onSignIn, onDemo }) {
  const [setpwToken] = useState(() => new URLSearchParams(window.location.search).get("setpw"));
  const [mode, setMode] = useState("email"); // email | password | sent
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [matched, setMatched] = useState(null);

  if (setpwToken) {
    return <SetPasswordScreen token={setpwToken} cfg={cfg} onSignIn={onSignIn} />;
  }

  const submitEmail = async () => {
    const trimmed = email.trim();
    if (!isValidEmail(trimmed)) {
      setError("Enter a full email address.");
      return;
    }
    const hit = findByEmail(cfg.employees, trimmed);
    if (!hit) {
      setError("That email isn't on the team list yet. Ask your admin to add it under Setup.");
      return;
    }
    setError("");
    setBusy(true);
    const has = await S.hasPassword(trimmed);
    setBusy(false);
    setMatched(hit);
    if (has) {
      setMode("password");
    } else {
      await sendSetupLink(hit, trimmed);
    }
  };

  const sendSetupLink = async (hit, trimmedEmail) => {
    setBusy(true);
    const r = await S.requestSetup({ email: trimmedEmail, name: hit.name, inviter: "S4 Connect" });
    setBusy(false);
    if (!r.ok) {
      setError(r.error || "Couldn't send a setup email.");
      return;
    }
    setMode("sent");
  };

  const submitPassword = async () => {
    setError("");
    setBusy(true);
    const r = await S.login(email.trim(), password);
    setBusy(false);
    if (!r.ok) {
      setError(r.error || "Wrong email or password.");
      return;
    }
    onSignIn(matched.id);
  };

  return (
    <Shell>
      <main className="max-w-6xl mx-auto px-5 py-12 grid gap-10" style={{ gridTemplateColumns: "minmax(0,380px) minmax(0,1fr)" }}>
        <div>
          <h1 className="text-2xl font-semibold mb-2" style={{ color: BRAND.navy }}>
            Sign in
          </h1>
          <p className="text-sm mb-6" style={{ color: BRAND.slate }}>
            Use your S4 Connect email. What you see after signing in — your own timesheet, a client book, or the full
            agency view — depends on your role.
          </p>
          <div className="border p-4" style={{ borderColor: BRAND.line, background: BRAND.paper }}>
            {mode === "email" && (
              <>
                <label className="text-xs uppercase tracking-widest mb-1 block" style={{ color: BRAND.slate }}>
                  Work email
                </label>
                <Field
                  value={email}
                  onChange={setEmail}
                  placeholder="you@s4connect.com"
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && submitEmail()}
                />
                <div className="mt-3">
                  <Btn kind="solid" onClick={submitEmail} disabled={busy}>
                    {busy ? "Checking…" : "Continue"}
                  </Btn>
                </div>
              </>
            )}
            {mode === "password" && (
              <>
                <p className="text-sm mb-3" style={{ color: BRAND.slate }}>
                  Signing in as <strong>{matched?.name}</strong>
                </p>
                <label className="text-xs uppercase tracking-widest mb-1 block" style={{ color: BRAND.slate }}>
                  Password
                </label>
                <Field
                  value={password}
                  onChange={setPassword}
                  type="password"
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && submitPassword()}
                />
                <div className="mt-3 flex items-center gap-3">
                  <Btn kind="solid" onClick={submitPassword} disabled={busy}>
                    {busy ? "Signing in…" : "Sign in"}
                  </Btn>
                  <button
                    className="text-xs underline"
                    style={{ color: BRAND.slate }}
                    onClick={() => sendSetupLink(matched, email.trim())}
                  >
                    Forgot password?
                  </button>
                </div>
              </>
            )}
            {mode === "sent" && (
              <p className="text-sm" style={{ color: BRAND.slate }}>
                We emailed a link to <strong>{email.trim()}</strong> to set a password. Check your inbox — the link
                works for 24 hours.
              </p>
            )}
            {error && (
              <p className="text-xs mt-2" style={{ color: BRAND.red }}>
                {error}
              </p>
            )}
          </div>
          <div className="mt-6 pt-6 border-t" style={{ borderColor: BRAND.line }}>
            <p className="text-sm mb-2" style={{ color: BRAND.slate }}>
              Not signed up yet, or just want to look around first?
            </p>
            <Btn onClick={onDemo}>Explore with sample data</Btn>
          </div>
        </div>

        <div>
          <div className="text-xs uppercase tracking-widest mb-3" style={{ color: BRAND.slate }}>
            What this tool covers
          </div>
          <div className="border" style={{ borderColor: BRAND.line, background: BRAND.paper }}>
            <div className="p-4 flex flex-wrap gap-8 border-b" style={{ borderColor: BRAND.line }}>
              <KpiTile label="Gross profit, trailing quarter" value={money(214300)} delta={6.2} trend={[150, 162, 158, 171, 180, 196]} />
              <KpiTile label="Billable hours" value={hrs(3120)} delta={3.4} trend={[420, 460, 455, 500, 510, 540]} />
              <KpiTile label="Average margin" value="41%" delta={-1.1} deltaGood="up" trend={[44, 43, 42, 41, 42, 41]} />
            </div>
            <div className="p-4">
              <div className="text-xs font-semibold mb-3" style={{ color: BRAND.navy }}>
                Gross profit by resource (sample)
              </div>
              <RankedBarChart data={PREVIEW_RESOURCES} />
            </div>
          </div>
          <p className="text-xs mt-3" style={{ color: BRAND.slate }}>
            Time entry, client and project profitability, QuickBooks P&amp;L import, and role-based reporting for
            contributors, account managers, and admins.
          </p>
        </div>
      </main>
    </Shell>
  );
}
