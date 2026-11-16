"use client";

// Gráficos comunes de Smart Connect: curvas suaves con degradado, barras finas redondeadas que crecen al entrar,
// tooltip oscuro al pasar el ratón y números que cuentan. Sin librerías: SVG + CSS (clases .ch-* en globals.css).
import { useEffect, useId, useRef, useState } from "react";

const fmt = (n: number) => n.toLocaleString("es-ES");
export const niceMax = (v: number) => {
  if (v <= 0) return 4;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  for (const m of [1, 1.25, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) if (m * p >= v * 1.08) return m * p;
  return 10 * p;
};
const ticks = (max: number) => {
  const n = max <= 4 ? max : 4;
  return Array.from({ length: n + 1 }, (_, i) => (max / n) * i);
};

/** Curva suave (monótona: nunca se pasa de los puntos) para una lista de puntos. */
export function smoothPath(pts: [number, number][]) {
  if (pts.length < 2) return pts.length ? `M${pts[0][0]},${pts[0][1]}` : "";
  const n = pts.length, dx: number[] = [], m: number[] = [], t: number[] = [];
  for (let i = 0; i < n - 1; i++) { dx[i] = pts[i + 1][0] - pts[i][0]; m[i] = (pts[i + 1][1] - pts[i][1]) / (dx[i] || 1); }
  t[0] = m[0]; t[n - 1] = m[n - 2];
  for (let i = 1; i < n - 1; i++) t[i] = m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (m[i] === 0) { t[i] = 0; t[i + 1] = 0; continue; }
    const a = t[i] / m[i], b = t[i + 1] / m[i], h = a * a + b * b;
    if (h > 9) { const k = 3 / Math.sqrt(h); t[i] = k * a * m[i]; t[i + 1] = k * b * m[i]; }
  }
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < n - 1; i++) {
    const h = dx[i] / 3;
    d += ` C${(pts[i][0] + h).toFixed(1)},${(pts[i][1] + h * t[i]).toFixed(1)} ${(pts[i + 1][0] - h).toFixed(1)},${(pts[i + 1][1] - h * t[i + 1]).toFixed(1)} ${pts[i + 1][0].toFixed(1)},${pts[i + 1][1].toFixed(1)}`;
  }
  return d;
}

/** Mide el ancho real del contenedor para dibujar a escala 1:1 (textos nítidos, sin estirar). */
function useWidth<T extends HTMLElement>(fallback = 640) {
  const ref = useRef<T>(null); const [w, setW] = useState(fallback);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(160, Math.round(e.contentRect.width))));
    ro.observe(el); return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

export type Series = { id: string; label: string; color: string; values: (number | null)[] };

/** Evolución en el tiempo: una o varias curvas suaves con área en degradado, cruz y tarjeta al pasar el ratón. */
export function AreaChart({ labels, series, height = 240, tipLabel, format = fmt, goal }: {
  labels: string[]; series: Series[]; height?: number; tipLabel?: (i: number) => string; format?: (n: number) => string; goal?: { value: number; label: string };
}) {
  const uid = useId().replace(/:/g, "");
  const [ref, W] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const H = height, L = 40, R = 12, T = 14, B = 28;
  const all = series.flatMap((s) => s.values.filter((v): v is number => v !== null));
  const max = niceMax(Math.max(0, goal?.value || 0, ...all));
  const n = labels.length;
  const x = (i: number) => L + (n <= 1 ? (W - L - R) / 2 : (i * (W - L - R)) / (n - 1));
  const y = (v: number) => T + (1 - v / max) * (H - T - B);
  const step = Math.max(1, Math.ceil(n / Math.max(2, Math.floor((W - L) / 70))));
  const showDots = n <= 14;

  return (
    <div ref={ref} className="ch-wrap" style={{ height: H }}>
      <svg width={W} height={H} className="ch-svg" role="img" aria-label={series.map((s) => s.label).join(", ")}
        onMouseMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); const px = e.clientX - r.left;
          setHover(n ? Math.max(0, Math.min(n - 1, Math.round(((px - L) / (W - L - R)) * (n - 1)))) : null); }}
        onMouseLeave={() => setHover(null)}>
        <defs>
          {series.map((s) => (
            <linearGradient key={s.id} id={`a-${uid}-${s.id}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor={s.color} stopOpacity="0.22" /><stop offset="1" stopColor={s.color} stopOpacity="0" />
            </linearGradient>
          ))}
        </defs>
        {ticks(max).map((v) => (
          <g key={v}>
            <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} className={v === 0 ? "ch-base" : "ch-grid"} />
            <text x={L - 8} y={y(v) + 4} textAnchor="end" className="ch-tick">{format(Math.round(v))}</text>
          </g>
        ))}
        {labels.map((l, i) => i === n - 1 || (i % step === 0 && n - 1 - i >= step * 0.6) ? (
          <text key={i} x={x(i)} y={H - 8} textAnchor="middle" className="ch-tick">{l}</text>
        ) : null)}
        {goal && (
          <g>
            <line x1={L} x2={W - R} y1={y(goal.value)} y2={y(goal.value)} className="ch-goal" />
            <text x={W - R} y={y(goal.value) - 6} textAnchor="end" className="ch-goal-txt">{goal.label}</text>
          </g>
        )}
        {series.map((s) => {
          const pts = s.values.map((v, i) => (v === null ? null : [x(i), y(v)] as [number, number])).filter(Boolean) as [number, number][];
          if (!pts.length) return null;
          const d = smoothPath(pts);
          return (
            <g key={s.id}>
              {pts.length > 1 && <path className="ch-area" d={`${d} L${pts[pts.length - 1][0]},${y(0)} L${pts[0][0]},${y(0)} Z`} fill={`url(#a-${uid}-${s.id})`} />}
              <path className="ch-line" d={d} fill="none" stroke={s.color} strokeWidth="2.25" strokeLinejoin="round" strokeLinecap="round" pathLength={1} />
              {showDots && pts.map(([a, b], i) => <circle key={i} cx={a} cy={b} r="3" fill="var(--bg-card)" stroke={s.color} strokeWidth="2" className="ch-dot" />)}
            </g>
          );
        })}
        {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={T} y2={H - B} className="ch-cross" />}
        {hover !== null && series.map((s) => s.values[hover] !== null && s.values[hover] !== undefined &&
          <circle key={s.id} cx={x(hover)} cy={y(s.values[hover]!)} r="5.5" fill={s.color} stroke="var(--bg-card)" strokeWidth="2.5" />)}
      </svg>
      {hover !== null && (
        <div className="ch-tip" style={{ left: x(hover), transform: `translateX(${x(hover) > W * 0.6 ? "calc(-100% - 14px)" : "14px"})` }}>
          <b>{tipLabel ? tipLabel(hover) : labels[hover]}</b>
          {series.map((s) => (
            <div key={s.id} className="ch-tip-row"><span><i style={{ background: s.color }} />{s.label}</span><b>{s.values[hover] === null ? "—" : format(s.values[hover]!)}</b></div>
          ))}
        </div>
      )}
    </div>
  );
}

export type Bar = { key: string; label: string; value: number; tip?: string };

/** Barras verticales finas y redondeadas que crecen al entrar; la destacada (p. ej. la semana actual) va en color lleno. */
export function ColumnChart({ data, highlight, height = 220, color = "var(--accent)", format = fmt, unit = "" }: {
  data: Bar[]; highlight?: string; height?: number; color?: string; format?: (n: number) => string; unit?: string;
}) {
  const uid = useId().replace(/:/g, "");
  const [ref, W] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const H = height, L = 34, R = 8, T = 22, B = 28;
  const max = niceMax(Math.max(0, ...data.map((d) => d.value)));
  const n = Math.max(1, data.length), slot = (W - L - R) / n;
  const bw = Math.max(6, Math.min(36, slot * 0.46));
  const y = (v: number) => T + (1 - v / max) * (H - T - B);
  const step = Math.max(1, Math.ceil(n / Math.max(2, Math.floor((W - L) / 54))));

  return (
    <div ref={ref} className="ch-wrap" style={{ height: H }}>
      <svg width={W} height={H} className="ch-svg" role="img" aria-label={data.map((d) => `${d.label}: ${d.value}`).join(", ")} onMouseLeave={() => setHover(null)}>
        <defs>
          <linearGradient id={`b-${uid}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor={color} /><stop offset="1" stopColor={color} stopOpacity="0.72" />
          </linearGradient>
        </defs>
        {ticks(max).map((v) => (
          <g key={v}>
            <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} className={v === 0 ? "ch-base" : "ch-grid"} />
            <text x={L - 8} y={y(v) + 4} textAnchor="end" className="ch-tick">{format(Math.round(v))}</text>
          </g>
        ))}
        {data.map((d, i) => {
          const cx = L + slot * i + slot / 2, top = y(d.value), h = Math.max(d.value ? 3 : 0, y(0) - top);
          const on = d.key === highlight, hot = hover === i;
          const r = Math.min(5, bw / 2, h);
          return (
            <g key={d.key} onMouseEnter={() => setHover(i)}>
              <rect x={L + slot * i} y={T} width={slot} height={H - T - B} fill="transparent" />
              {hot && <rect x={cx - bw / 2 - 6} y={T - 4} width={bw + 12} height={H - T - B + 4} rx="10" className="ch-hoverband" />}
              {h > 0 && (
                <path className="ch-bar" style={{ animationDelay: `${i * 35}ms` }}
                  d={`M${cx - bw / 2},${y(0)} V${y(0) - h + r} Q${cx - bw / 2},${y(0) - h} ${cx - bw / 2 + r},${y(0) - h} H${cx + bw / 2 - r} Q${cx + bw / 2},${y(0) - h} ${cx + bw / 2},${y(0) - h + r} V${y(0)} Z`}
                  fill={on || !highlight ? `url(#b-${uid})` : color} fillOpacity={on || !highlight ? 1 : hot ? 0.5 : 0.28} />
              )}
              {(on || hot) && d.value > 0 && <text x={cx} y={top - 7} textAnchor="middle" className="ch-val">{format(d.value)}{unit}</text>}
              {(i % step === 0 || on) && <text x={cx} y={H - 8} textAnchor="middle" className={`ch-tick ${on ? "on" : ""}`}>{d.label}</text>}
            </g>
          );
        })}
      </svg>
      {hover !== null && data[hover] && (
        <div className="ch-tip" style={{ left: L + slot * hover + slot / 2, top: Math.max(4, y(data[hover].value) - 54), transform: "translateX(-50%)" }}>
          <b>{data[hover].tip || data[hover].label}</b><div className="ch-tip-row"><span>{format(data[hover].value)}{unit}</span></div>
        </div>
      )}
    </div>
  );
}

/** Mini curva para tarjetas. */
export function Sparkline({ values, color, width = 120, height = 36 }: { values: (number | null)[]; color: string; width?: number; height?: number }) {
  const uid = useId().replace(/:/g, "");
  const v = values.filter((n): n is number => n !== null);
  if (v.length < 2) return <svg width={width} height={height} />;
  const min = Math.min(...v), max = Math.max(...v), span = max - min || 1;
  const pts = v.map((n, i) => [(i / (v.length - 1)) * (width - 4) + 2, height - 4 - ((n - min) / span) * (height - 8)] as [number, number]);
  const d = smoothPath(pts), last = pts[pts.length - 1];
  return (
    <svg width={width} height={height} style={{ overflow: "visible" }}>
      <defs><linearGradient id={`s-${uid}`} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor={color} stopOpacity="0.25" /><stop offset="1" stopColor={color} stopOpacity="0" /></linearGradient></defs>
      <path d={`${d} L${last[0]},${height} L${pts[0][0]},${height} Z`} fill={`url(#s-${uid})`} />
      <path className="ch-line" d={d} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" pathLength={1} />
      <circle cx={last[0]} cy={last[1]} r="3.5" fill={color} stroke="var(--bg-card)" strokeWidth="2" />
    </svg>
  );
}

/** Número que cuenta hasta su valor (y vuelve a contar cuando cambia). */
export function CountUp({ value, duration = 900, format = fmt }: { value: number; duration?: number; format?: (n: number) => string }) {
  const [shown, setShown] = useState(value);
  const from = useRef(0);
  useEffect(() => {
    const start = performance.now(), a = from.current, b = value; let raf = 0;
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / duration), e = 1 - Math.pow(1 - k, 3);
      setShown(a + (b - a) * e);
      if (k < 1) raf = requestAnimationFrame(tick); else from.current = b;
    };
    raf = requestAnimationFrame(tick); return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return <>{format(Math.round(shown))}</>;
}

/** Anillo de progreso (p. ej. % visto de un vídeo). */
export function Ring({ pct, size = 44, color = "var(--accent)", label }: { pct: number; size?: number; color?: string; label?: string }) {
  const r = size / 2 - 4, c = 2 * Math.PI * r, p = Math.max(0, Math.min(100, pct));
  return (
    <svg width={size} height={size} className="ch-ring" aria-label={label || `${Math.round(p)} %`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--bg-surface)" strokeWidth="5" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="5" strokeLinecap="round"
        strokeDasharray={`${(p / 100) * c} ${c}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} className="ch-ring-arc" />
      <text x="50%" y="50%" dy="0.35em" textAnchor="middle" className="ch-ring-txt">{Math.round(p)}%</text>
    </svg>
  );
}
