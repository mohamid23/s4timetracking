import React, { useState, useId } from "react";
import { CHART_SERIES, CHART_STATUS, BRAND } from "../lib/constants";
import { money, num, hrs } from "../lib/helpers";

const INK = { primary: "#0b0b0b", secondary: "#52514e", muted: "#898781", grid: "#e1e0d9", surface: "#fcfcfb" };

function Tooltip({ x, y, children }) {
  return (
    <div
      className="pointer-events-none absolute z-10 text-xs px-2.5 py-2 rounded shadow-lg"
      style={{
        left: x,
        top: y,
        transform: "translate(-50%, -110%)",
        background: BRAND.navy,
        color: "#fff",
        minWidth: 140,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </div>
  );
}

/* Ranked horizontal bars: one metric across many categories (resources, projects,
   capabilities, industries...). Single series so no legend; sign carries color
   (blue = positive, red = negative) since gross profit and margin can go either way. */
export function RankedBarChart({ data, labelKey = "key", valueKey = "value", valueFmt = money, height }) {
  const [hover, setHover] = useState(null);
  const max = Math.max(1, ...data.map((d) => Math.abs(d[valueKey] || 0)));
  const rowH = 30;
  const h = height || data.length * rowH + 8;

  if (!data.length) {
    return (
      <div className="text-sm py-6" style={{ color: BRAND.slate }}>
        Nothing to chart yet.
      </div>
    );
  }

  return (
    <div className="relative" style={{ height: h }}>
      <div className="flex flex-col gap-1">
        {data.map((d, i) => {
          const v = Number(d[valueKey]) || 0;
          const pct = (Math.abs(v) / max) * 100;
          const color = v < 0 ? CHART_STATUS.critical : CHART_SERIES[0];
          return (
            <div key={d[labelKey] + i} className="flex items-center gap-2" style={{ height: rowH }}>
              <div className="text-xs truncate text-right" style={{ width: 140, color: INK.secondary }} title={d[labelKey]}>
                {d[labelKey]}
              </div>
              <div
                className="relative flex-1"
                style={{ height: 22 }}
                onPointerMove={(e) => {
                  const r = e.currentTarget.getBoundingClientRect();
                  setHover({ i, x: e.clientX - r.left, y: 0 });
                }}
                onPointerLeave={() => setHover(null)}
              >
                <div
                  className="absolute top-0 rounded transition-opacity"
                  style={{
                    left: 0,
                    width: `${Math.max(pct, 1.5)}%`,
                    height: 22,
                    background: color,
                    borderRadius: 4,
                    opacity: hover && hover.i === i ? 0.85 : 1,
                  }}
                />
                <div
                  className="absolute top-0 h-full flex items-center text-xs font-mono font-semibold"
                  style={{ left: `calc(${Math.max(pct, 1.5)}% + 8px)`, color: INK.primary }}
                >
                  {valueFmt(v)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {hover !== null && (
        <Tooltip x={hover.x + 148} y={hover.i * (rowH + 4) + 10}>
          <div className="font-semibold">{data[hover.i][labelKey]}</div>
          <div style={{ color: "#C7CEDD" }}>{valueFmt(data[hover.i][valueKey])}</div>
        </Tooltip>
      )}
    </div>
  );
}

/* Multi-series trend across ordered periods (months or quarters). Fixed categorical
   order per series name so color always means the same thing across the app. */
export function TrendChart({ periods, series, width = 640, height = 220, valueFmt = money }) {
  const id = useId();
  const [hoverIdx, setHoverIdx] = useState(null);
  const pad = { l: 56, r: 16, t: 16, b: 28 };
  const innerW = width - pad.l - pad.r;
  const innerH = height - pad.t - pad.b;
  const allVals = series.flatMap((s) => s.values);
  const maxV = Math.max(1, ...allVals.map(Math.abs));
  const minV = Math.min(0, ...allVals);
  const span = maxV - minV || 1;

  const xAt = (i) => pad.l + (periods.length <= 1 ? innerW / 2 : (i / (periods.length - 1)) * innerW);
  const yAt = (v) => pad.t + innerH - ((v - minV) / span) * innerH;
  const zeroY = yAt(0);

  if (!periods.length) {
    return (
      <div className="text-sm py-6" style={{ color: BRAND.slate }}>
        Nothing to chart yet.
      </div>
    );
  }

  return (
    <div className="relative" style={{ width: "100%", maxWidth: width }}>
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" style={{ display: "block", overflow: "visible" }}>
        {[0, 0.25, 0.5, 0.75, 1].map((f) => {
          const v = minV + span * f;
          const y = yAt(v);
          return (
            <g key={f}>
              <line x1={pad.l} x2={width - pad.r} y1={y} y2={y} stroke={INK.grid} strokeWidth={1} />
              <text x={pad.l - 8} y={y + 3} fontSize="10" textAnchor="end" fill={INK.muted}>
                {valueFmt(v).replace("$", "$")}
              </text>
            </g>
          );
        })}
        <line x1={pad.l} x2={width - pad.r} y1={zeroY} y2={zeroY} stroke={INK.grid} strokeWidth={1} />

        {series.map((s, si) => {
          const color = CHART_SERIES[si % CHART_SERIES.length];
          const pts = s.values.map((v, i) => [xAt(i), yAt(v)]);
          const d = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0]},${p[1]}`).join(" ");
          return (
            <g key={s.name}>
              <path d={d} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              {pts.map(([x, y], i) => (
                <circle key={i} cx={x} cy={y} r={4} fill={color} stroke={INK.surface} strokeWidth={2} />
              ))}
              <text x={pts[pts.length - 1][0] + 6} y={pts[pts.length - 1][1] + 3} fontSize="11" fontWeight="600" fill={color}>
                {s.name}
              </text>
            </g>
          );
        })}

        {periods.map((p, i) => (
          <text key={p} x={xAt(i)} y={height - 8} fontSize="10" textAnchor="middle" fill={INK.muted}>
            {p}
          </text>
        ))}

        {periods.map((p, i) => (
          <rect
            key={`hit-${p}`}
            x={xAt(i) - innerW / periods.length / 2}
            y={pad.t}
            width={innerW / periods.length}
            height={innerH}
            fill="transparent"
            onPointerEnter={() => setHoverIdx(i)}
            onPointerLeave={() => setHoverIdx(null)}
          />
        ))}
        {hoverIdx !== null && (
          <line x1={xAt(hoverIdx)} x2={xAt(hoverIdx)} y1={pad.t} y2={pad.t + innerH} stroke={INK.muted} strokeWidth={1} />
        )}
      </svg>
      {hoverIdx !== null && (
        <Tooltip x={xAt(hoverIdx)} y={20}>
          <div className="font-semibold mb-1">{periods[hoverIdx]}</div>
          {series.map((s, si) => (
            <div key={s.name} className="flex items-center gap-2">
              <span style={{ width: 10, height: 2, background: CHART_SERIES[si % CHART_SERIES.length], display: "inline-block" }} />
              <span style={{ color: "#C7CEDD" }}>{s.name}</span>
              <strong className="ml-auto">{valueFmt(s.values[hoverIdx])}</strong>
            </div>
          ))}
        </Tooltip>
      )}
    </div>
  );
}

/* Revenue/hours mix donut: categorical identity across a handful of slices
   (capability or industry). Caps at the first seven slots plus "Other" so color
   never has to stretch past the validated palette. */
export function MixDonut({ data, labelKey = "key", valueKey = "value", size = 180, valueFmt = money }) {
  const [hover, setHover] = useState(null);
  const capped = capToSlots(data, labelKey, valueKey, CHART_SERIES.length - 1);
  const total = capped.reduce((s, d) => s + Math.max(0, d[valueKey]), 0) || 1;
  const r = size / 2;
  const stroke = size * 0.26;
  const radius = r - stroke / 2;
  const circumference = 2 * Math.PI * radius;
  let acc = 0;

  return (
    <div className="flex items-center gap-5 flex-wrap">
      <div className="relative" style={{ width: size, height: size }}>
        <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
          <circle cx={r} cy={r} r={radius} fill="none" stroke={INK.grid} strokeWidth={stroke} />
          {capped.map((d, i) => {
            const frac = Math.max(0, d[valueKey]) / total;
            const dash = frac * circumference;
            const gap = circumference - dash;
            const offset = -acc * circumference;
            acc += frac;
            const color = CHART_SERIES[i % CHART_SERIES.length];
            return (
              <circle
                key={d[labelKey]}
                cx={r}
                cy={r}
                r={radius}
                fill="none"
                stroke={color}
                strokeWidth={hover === i ? stroke + 4 : stroke}
                strokeDasharray={`${dash} ${gap}`}
                strokeDashoffset={offset}
                style={{ transition: "stroke-width 120ms" }}
                onPointerEnter={() => setHover(i)}
                onPointerLeave={() => setHover(null)}
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-xs" style={{ color: INK.muted }}>
            {hover !== null ? capped[hover][labelKey] : "Total"}
          </div>
          <div className="text-sm font-mono font-semibold" style={{ color: INK.primary }}>
            {valueFmt(hover !== null ? capped[hover][valueKey] : total)}
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        {capped.map((d, i) => (
          <div
            key={d[labelKey]}
            className="flex items-center gap-2 text-xs cursor-default"
            style={{ color: hover === i ? INK.primary : INK.secondary }}
            onPointerEnter={() => setHover(i)}
            onPointerLeave={() => setHover(null)}
          >
            <span style={{ width: 9, height: 9, borderRadius: 2, background: CHART_SERIES[i % CHART_SERIES.length] }} />
            <span>{d[labelKey]}</span>
            <span className="font-mono ml-auto" style={{ color: INK.muted }}>
              {num((Math.max(0, d[valueKey]) / total) * 100, 0)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function capToSlots(data, labelKey, valueKey, maxSlots) {
  const sorted = [...data].sort((a, b) => b[valueKey] - a[valueKey]);
  if (sorted.length <= maxSlots + 1) return sorted;
  const head = sorted.slice(0, maxSlots);
  const rest = sorted.slice(maxSlots);
  const otherVal = rest.reduce((s, d) => s + d[valueKey], 0);
  return [...head, { [labelKey]: "Other", [valueKey]: otherVal }];
}

/* Stat tile: label, headline value, optional signed delta, optional 12-point sparkline. */
export function KpiTile({ label, value, delta, deltaGood = "up", trend, color }) {
  const deltaUp = typeof delta === "number" ? delta >= 0 : null;
  const good = deltaGood === "up" ? deltaUp : deltaUp === null ? null : !deltaUp;
  const deltaColor = good === null ? INK.muted : good ? CHART_STATUS.good : CHART_STATUS.critical;
  return (
    <div className="flex flex-col gap-1">
      <div className="text-xs uppercase tracking-widest" style={{ color: BRAND.slate }}>
        {label}
      </div>
      <div className="flex items-end gap-2">
        <div className="text-2xl font-semibold" style={{ color: color || BRAND.navy }}>
          {value}
        </div>
        {typeof delta === "number" && (
          <div className="text-xs font-mono font-semibold mb-1" style={{ color: deltaColor }}>
            {delta >= 0 ? "+" : ""}
            {num(delta, 0)}%
          </div>
        )}
      </div>
      {trend && trend.length > 1 && <Sparkline values={trend} color={color || CHART_SERIES[0]} />}
    </div>
  );
}

function Sparkline({ values, color, width = 120, height = 28 }) {
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => [
    (i / (values.length - 1)) * width,
    height - ((v - min) / span) * height,
  ]);
  const d = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0]},${p[1]}`).join(" ");
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height}>
      <path d={d} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" opacity={0.55} />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r={3} fill={color} />
    </svg>
  );
}
