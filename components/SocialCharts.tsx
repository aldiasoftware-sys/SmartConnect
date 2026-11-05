"use client";

import { useState } from "react";
import { fmt, weekLabel, weekNumber } from "@/lib/social";

const niceMax = (v: number) => { if (v <= 0) return 10; const p = Math.pow(10, Math.floor(Math.log10(v))); return Math.ceil(v / p * 1.1) * p; };

type Line = { id: string; label: string; color: string; values: (number | null)[] };

/** Evolución semanal (varias líneas) con línea vertical y tarjeta al pasar el ratón. */
export function LineChart({ weeks, lines, height = 260 }: { weeks: string[]; lines: Line[]; height?: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 800, H = height, L = 52, R = 16, T = 16, B = 34;
  const all = lines.flatMap((l) => l.values.filter((v): v is number => v !== null));
  const max = niceMax(Math.max(...all, 0));
  const x = (i: number) => L + (weeks.length <= 1 ? (W - L - R) / 2 : (i * (W - L - R)) / (weeks.length - 1));
  const y = (v: number) => T + (1 - v / max) * (H - T - B);
  const step = Math.max(1, Math.ceil(weeks.length / 10));

  return (
    <div style={{ position: "relative" }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block", overflow: "visible" }}
        onMouseMove={(e) => { const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect(); const px = ((e.clientX - r.left) / r.width) * W;
          setHover(Math.max(0, Math.min(weeks.length - 1, Math.round(((px - L) / (W - L - R)) * (weeks.length - 1))))); }}
        onMouseLeave={() => setHover(null)}>
        <defs>
          {lines.map((l) => (
            <linearGradient key={l.id} id={`g-${l.id}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor={l.color} stopOpacity="0.16" /><stop offset="1" stopColor={l.color} stopOpacity="0" />
            </linearGradient>
          ))}
        </defs>
        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <g key={f}>
            <line x1={L} x2={W - R} y1={y(max * f)} y2={y(max * f)} stroke="#eef0f3" />
            <text x={L - 10} y={y(max * f) + 4} textAnchor="end" fontSize="11" fill="#9aa0ab">{fmt(Math.round(max * f))}</text>
          </g>
        ))}
        {weeks.map((w, i) => i % step === 0 || i === weeks.length - 1 ? (
          <text key={w} x={x(i)} y={H - 10} textAnchor="middle" fontSize="11" fill="#9aa0ab">S{weekNumber(w)}</text>
        ) : null)}
        {lines.map((l) => {
          const pts = l.values.map((v, i) => (v === null ? null : [x(i), y(v)] as const)).filter(Boolean) as (readonly [number, number])[];
          if (!pts.length) return null;
          const d = pts.map(([a, b], i) => `${i ? "L" : "M"}${a.toFixed(1)},${b.toFixed(1)}`).join(" ");
          return (
            <g key={l.id}>
              {pts.length > 1 && <path d={`${d} L${pts[pts.length - 1][0]},${y(0)} L${pts[0][0]},${y(0)} Z`} fill={`url(#g-${l.id})`} />}
              <path d={d} fill="none" stroke={l.color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
              {pts.map(([a, b], i) => <circle key={i} cx={a} cy={b} r={pts.length > 16 ? 0 : 3} fill="#fff" stroke={l.color} strokeWidth="2" />)}
            </g>
          );
        })}
        {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={T} y2={H - B} stroke="#0e0e0e" strokeOpacity="0.25" strokeDasharray="3 3" />}
        {hover !== null && lines.map((l) => l.values[hover] !== null && <circle key={l.id} cx={x(hover)} cy={y(l.values[hover]!)} r="5" fill={l.color} stroke="#fff" strokeWidth="2" />)}
      </svg>
      {hover !== null && (
        <div style={{ position: "absolute", top: 8, left: `${(x(hover) / W) * 100}%`, transform: `translateX(${hover > weeks.length / 2 ? "calc(-100% - 14px)" : "14px"})`,
          background: "#0e0e0e", color: "#fff", borderRadius: 12, padding: "0.625rem 0.75rem", fontSize: "0.75rem", pointerEvents: "none", minWidth: 170, boxShadow: "var(--shadow-lg)" }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Semana {weekNumber(weeks[hover])} · {weekLabel(weeks[hover])}</div>
          {lines.map((l) => (
            <div key={l.id} style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 6, color: "#c9ccd2" }}><i style={{ width: 7, height: 7, borderRadius: 9, background: l.color, display: "inline-block" }} />{l.label}</span>
              <b>{l.values[hover] === null ? "—" : fmt(l.values[hover]!)}</b>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Mini línea para las tarjetas de cada cuenta. */
export function Sparkline({ values, color, width = 120, height = 36 }: { values: (number | null)[]; color: string; width?: number; height?: number }) {
  const v = values.filter((n): n is number => n !== null);
  if (v.length < 2) return <svg width={width} height={height} />;
  const min = Math.min(...v), max = Math.max(...v), span = max - min || 1;
  const pts = v.map((n, i) => [(i / (v.length - 1)) * width, height - 3 - ((n - min) / span) * (height - 6)]);
  const d = pts.map(([a, b], i) => `${i ? "L" : "M"}${a.toFixed(1)},${b.toFixed(1)}`).join(" ");
  return (
    <svg width={width} height={height} style={{ overflow: "visible" }}>
      <path d={`${d} L${width},${height} L0,${height} Z`} fill={color} opacity="0.1" />
      <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="3" fill={color} />
    </svg>
  );
}

/** Publicaciones planificadas (gris) vs. subidas (negro / rojo si faltaron) por semana. */
export function PostsBars({ rows }: { rows: { week: string; planned: number; published: number; reviewed: boolean; failed: number }[] }) {
  const max = Math.max(...rows.map((r) => Math.max(r.planned, r.published)), 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 12, height: 190, paddingTop: 10 }}>
      {rows.map((r) => (
        <div key={r.week} title={`Semana ${weekNumber(r.week)}: ${r.reviewed ? `${r.published} de ${r.planned}` : `${r.planned} planificadas (sin revisar)`}`}
          style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, height: "100%", justifyContent: "flex-end", minWidth: 0 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: r.failed ? "var(--bad)" : "var(--text-secondary)" }}>{r.reviewed ? `${r.published}/${r.planned}` : r.planned ? `${r.planned}` : ""}</span>
          <div style={{ display: "flex", gap: 3, alignItems: "flex-end", height: 130, width: "100%", justifyContent: "center" }}>
            <div style={{ width: "42%", maxWidth: 22, height: `${(r.planned / max) * 100}%`, minHeight: r.planned ? 4 : 0, background: "#e3e6eb", borderRadius: "6px 6px 2px 2px" }} />
            <div style={{ width: "42%", maxWidth: 22, height: `${(r.published / max) * 100}%`, minHeight: r.published ? 4 : 0,
              background: !r.reviewed ? "transparent" : r.failed ? "var(--bad)" : "var(--ink)", border: r.reviewed ? "none" : "1.5px dashed #c5c9d1", borderRadius: "6px 6px 2px 2px" }} />
          </div>
          <span style={{ fontSize: 10, fontWeight: 600, color: "var(--text-muted)" }}>S{weekNumber(r.week)}</span>
        </div>
      ))}
    </div>
  );
}
