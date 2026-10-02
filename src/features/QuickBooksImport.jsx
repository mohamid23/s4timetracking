import React, { useState } from "react";
import { BRAND } from "../lib/constants";
import { money, norm, num } from "../lib/helpers";
import { classifyRows, parseCsvReport, toFinanceRows } from "../lib/qbParse";
import { Btn, Card, Field, Label, Select, Td, Th } from "../components/ui";

const FORMATS = [
  { value: "by_class", label: "P&L by Class (one column per client)" },
  { value: "by_customer", label: "P&L by Customer (Parent:Child = client:project)" },
  { value: "standard", label: "Standard P&L (company-wide, no client breakdown)" },
];

const COMPANY_WIDE_LABEL = "(Company-wide overhead, not billed to a client)";

export default function QuickBooksImport({ monthLabel, cfg, onCommit }) {
  const [format, setFormat] = useState("by_class");
  const [rows, setRows] = useState(null);
  const [companyWide, setCompanyWide] = useState({ opexTotal: 0, companyRevenue: 0, companyCogs: 0 });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [source, setSource] = useState("");

  const unmatchedCount = (rows || []).filter(
    (r) => !cfg.clients.some((c) => norm(c.name) === norm(r.client))
  ).length;
  const hasCompanyWide = companyWide.opexTotal > 0 || companyWide.companyRevenue > 0 || companyWide.companyCogs > 0;

  const runParse = async (columns, parsedRows, label) => {
    const classified = classifyRows(parsedRows);
    const { rows: financeRows, opexTotal, companyRevenue, companyCogs } = toFinanceRows(columns, classified, format);
    if (!financeRows.length && !opexTotal && !companyRevenue && !companyCogs) {
      setError("Couldn't find any Income or Cost of Goods Sold lines in this file. Check it's a Profit and Loss report.");
      setRows(null);
      return;
    }
    setError("");
    setRows(financeRows.map((r, i) => ({ ...r, _id: i })));
    setCompanyWide({ opexTotal, companyRevenue, companyCogs });
    setSource(label);
  };

  const handleFile = async (file) => {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      if (file.name.toLowerCase().endsWith(".pdf")) {
        const { parsePdfReport } = await import("../lib/qbPdfParse");
        const { columns, rows: parsedRows } = await parsePdfReport(file);
        await runParse(columns, parsedRows, `${file.name} (PDF)`);
      } else {
        const text = await file.text();
        const { columns, rows: parsedRows } = parseCsvReport(text);
        await runParse(columns, parsedRows, `${file.name} (CSV)`);
      }
    } catch (e) {
      setError(`Couldn't read that file: ${e.message}`);
    } finally {
      setBusy(false);
    }
  };

  const updateRow = (id, field, value) => {
    setRows((prev) => prev.map((r) => (r._id === id ? { ...r, [field]: field === "client" || field === "project" ? value : Number(value) || 0 } : r)));
  };
  const removeRow = (id) => setRows((prev) => prev.filter((r) => r._id !== id));

  const commit = () => {
    const cleanRows = rows.map(({ _id, ...r }) => ({ ...r, svc: r.svc || "" }));
    if (hasCompanyWide) {
      cleanRows.push({
        client: COMPANY_WIDE_LABEL,
        project: null,
        svc: "",
        revenue: companyWide.companyRevenue,
        cogs: companyWide.companyCogs + companyWide.opexTotal,
      });
    }
    onCommit(cleanRows);
    setRows(null);
    setCompanyWide({ opexTotal: 0, companyRevenue: 0, companyCogs: 0 });
    setSource("");
  };

  return (
    <Card
      title="Import from QuickBooks"
      note="Export a Profit and Loss report (CSV or PDF) from QuickBooks and load it here. Nothing is saved until you review the parsed rows below and commit."
    >
      <div className="flex flex-wrap items-end gap-3 mb-4">
        <div style={{ width: 320 }}>
          <Label>Report format</Label>
          <Select value={format} onChange={setFormat} options={FORMATS} />
        </div>
        <div>
          <Label>File (.csv or .pdf)</Label>
          <input
            type="file"
            accept=".csv,text/csv,.pdf,application/pdf"
            onChange={(e) => handleFile(e.target.files?.[0])}
            className="text-xs"
            style={{ color: BRAND.slate }}
          />
        </div>
        {busy && (
          <span className="text-xs" style={{ color: BRAND.slate }}>
            Reading file…
          </span>
        )}
      </div>

      {error && (
        <div className="mb-4 border-l-4 p-3" style={{ borderColor: BRAND.red, background: "#FBEAE7" }}>
          <p className="text-sm">{error}</p>
        </div>
      )}

      {rows && (
        <div>
          <p className="text-sm mb-3" style={{ color: BRAND.slate }}>
            Parsed {source} for {monthLabel}. Review every row before committing — {format === "standard" ? "PDF and CSV" : "automatic"}{" "}
            parsing can misread a layout, especially from PDF.
            {unmatchedCount > 0 && (
              <span style={{ color: BRAND.amber }}> {num(unmatchedCount)} client name(s) don't match your client list yet.</span>
            )}
          </p>
          <div className="overflow-x-auto mb-4">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <Th>Client</Th>
                  <Th>Project</Th>
                  <Th align="right" w="140px">Revenue</Th>
                  <Th align="right" w="140px">COGS</Th>
                  <Th w="70px"></Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const matched = cfg.clients.some((c) => norm(c.name) === norm(r.client));
                  return (
                    <tr key={r._id}>
                      <Td>
                        <Field value={r.client} onChange={(v) => updateRow(r._id, "client", v)} />
                        {!matched && (
                          <span className="text-xs block mt-0.5" style={{ color: BRAND.amber }}>
                            no match in client list
                          </span>
                        )}
                      </Td>
                      <Td>
                        <Field value={r.project || ""} onChange={(v) => updateRow(r._id, "project", v)} placeholder="—" />
                      </Td>
                      <Td align="right">
                        <Field mono type="number" value={r.revenue} onChange={(v) => updateRow(r._id, "revenue", v)} />
                      </Td>
                      <Td align="right">
                        <Field mono type="number" value={r.cogs} onChange={(v) => updateRow(r._id, "cogs", v)} />
                      </Td>
                      <Td align="right">
                        <Btn kind="danger" onClick={() => removeRow(r._id)}>
                          Remove
                        </Btn>
                      </Td>
                    </tr>
                  );
                })}
                {hasCompanyWide && (
                  <tr style={{ background: BRAND.wash }}>
                    <Td strong>{COMPANY_WIDE_LABEL}</Td>
                    <Td>—</Td>
                    <Td align="right" mono>
                      {money(companyWide.companyRevenue)}
                    </Td>
                    <Td align="right" mono>
                      {money(companyWide.companyCogs + companyWide.opexTotal)}
                    </Td>
                    <Td></Td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="flex gap-2">
            <Btn kind="solid" onClick={commit}>
              Commit import for {monthLabel}
            </Btn>
            <Btn
              onClick={() => {
                setRows(null);
                setCompanyWide({ opexTotal: 0, companyRevenue: 0, companyCogs: 0 });
              }}
            >
              Discard
            </Btn>
          </div>
        </div>
      )}
    </Card>
  );
}
