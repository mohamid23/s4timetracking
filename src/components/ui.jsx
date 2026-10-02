import React, { useRef, useState } from "react";
import Papa from "papaparse";
import { BRAND, S4_MARK } from "../lib/constants";

export const S4Mark = ({ height = 46, color = "#FFFFFF" }) => (
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

export const Label = ({ children }) => (
  <div className="text-xs uppercase tracking-widest mb-1" style={{ color: BRAND.slate }}>
    {children}
  </div>
);

export const Card = ({ title, note, right, children }) => (
  <section className="mb-6 border" style={{ borderColor: BRAND.line, background: BRAND.paper }}>
    {(title || right) && (
      <header
        className="flex items-baseline justify-between gap-4 px-4 py-3 border-b flex-wrap"
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

export const Btn = ({ kind = "ghost", onClick, children, disabled, title, type = "button" }) => {
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
      type={type}
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

export const Field = ({ value, onChange, type = "text", placeholder, mono, width, step, onKeyDown, autoFocus }) => (
  <input
    type={type}
    step={step}
    value={value}
    placeholder={placeholder}
    autoFocus={autoFocus}
    onChange={(e) => onChange(e.target.value)}
    onKeyDown={onKeyDown}
    className={`px-2 py-1 border text-sm ${mono ? "font-mono text-right" : ""}`}
    style={{ borderColor: BRAND.line, color: BRAND.navy, width: width || "100%" }}
  />
);

export const Select = ({ value, onChange, options, placeholder, width }) => (
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

export const Th = ({ children, align = "left", w }) => (
  <th
    className="px-3 py-2 text-xs font-semibold uppercase tracking-wider border-b"
    style={{ color: BRAND.slate, borderColor: BRAND.line, textAlign: align, width: w }}
  >
    {children}
  </th>
);

export const Td = ({ children, align = "left", mono, strong }) => (
  <td
    className={`px-3 py-2 text-sm border-b ${mono ? "font-mono" : ""} ${strong ? "font-semibold" : ""}`}
    style={{ borderColor: BRAND.line, color: BRAND.navy, textAlign: align }}
  >
    {children}
  </td>
);

export const Bar = ({ pct, color }) => (
  <div className="h-1" style={{ background: BRAND.line }}>
    <div className="h-1" style={{ width: `${Math.max(0, Math.min(100, pct))}%`, background: color }} />
  </div>
);

export const Stat = ({ label, value, color }) => (
  <div>
    <div className="text-xs uppercase tracking-widest" style={{ color: BRAND.slate }}>
      {label}
    </div>
    <div className="text-2xl font-mono font-semibold" style={{ color: color || BRAND.navy }}>
      {value}
    </div>
  </div>
);

export const Pill = ({ children, color }) => (
  <span
    className="text-xs px-2 py-0.5 rounded-full border font-medium"
    style={{ borderColor: color || BRAND.line, color: color || BRAND.slate }}
  >
    {children}
  </span>
);

export function CsvInput({ label, onRows }) {
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
