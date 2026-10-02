import React, { useState } from "react";
import { BRAND } from "../lib/constants";
import { S4Mark, Btn, Field } from "../components/ui";
import { findByEmail, isValidEmail } from "../lib/auth";
import { KpiTile, RankedBarChart } from "../components/charts";
import { money, hrs } from "../lib/helpers";

const PREVIEW_RESOURCES = [
  { key: "Sofia Reyes", value: 18400 },
  { key: "Jordan Pike", value: 14200 },
  { key: "Elena Cho", value: 11900 },
  { key: "Tyler Brooks", value: 8100 },
];

export default function SignIn({ cfg, onSignIn, onDemo }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  const submit = () => {
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
    onSignIn(hit.id);
  };

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
            <label className="text-xs uppercase tracking-widest mb-1 block" style={{ color: BRAND.slate }}>
              Work email
            </label>
            <Field
              value={email}
              onChange={setEmail}
              placeholder="you@s4connect.com"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && submit()}
            />
            {error && (
              <p className="text-xs mt-2" style={{ color: BRAND.red }}>
                {error}
              </p>
            )}
            <div className="mt-3">
              <Btn kind="solid" onClick={submit}>
                Continue
              </Btn>
            </div>
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
    </div>
  );
}
