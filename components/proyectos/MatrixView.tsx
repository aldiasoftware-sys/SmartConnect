"use client";

import { useState } from "react";
import { Matrix } from "@/lib/projects";

// Cada casilla rota entre estos valores al hacer clic.
const CYCLE = ["editar", "ver", "propio", "no", "?"];
const CELL: Record<string, { cls: string; label: string; help: string }> = {
  editar: { cls: "full", label: "Editar", help: "Ve y cambia" },
  ver: { cls: "view", label: "Ver", help: "Solo consulta" },
  propio: { cls: "own", label: "Lo suyo", help: "Solo sus propios datos" },
  no: { cls: "none", label: "—", help: "Sin acceso" },
  "?": { cls: "q", label: "?", help: "Por decidir" },
};

export default function MatrixView({ matrix, onChange }: { matrix: Matrix; onChange: (m: Matrix) => Promise<void> }) {
  const [m, setM] = useState<Matrix>(matrix);
  const [dirty, setDirty] = useState(false);
  const pending = m.rows.reduce((s, r) => s + r.cells.filter((c) => c === "?").length, 0);

  function cycle(ri: number, ci: number) {
    setM((cur) => ({ ...cur, rows: cur.rows.map((r, i) => (i !== ri ? r : { ...r, cells: r.cells.map((c, j) => (j !== ci ? c : CYCLE[(CYCLE.indexOf(c) + 1) % CYCLE.length])) })) }));
    setDirty(true);
  }

  return (
    <div className="animate-in">
      <div className="flex justify-between items-start" style={{ gap: "1rem", flexWrap: "wrap", marginBottom: "1rem" }}>
        <div style={{ maxWidth: 720 }}>
          <h3 className="section-title">{m.title}</h3>
          {m.intro && <p className="section-sub" style={{ marginTop: 4, lineHeight: 1.55 }}>{m.intro}</p>}
        </div>
        <div className="flex gap-2 items-center">
          {pending > 0 && <span className="chip" style={{ background: "var(--warn-soft)", color: "var(--warn)" }}>{pending} casillas por decidir</span>}
          {dirty && <button className="btn-secondary" onClick={() => { setM(matrix); setDirty(false); }}>Deshacer</button>}
          <button className="btn-primary" disabled={!dirty} onClick={async () => { await onChange(m); setDirty(false); }}>{dirty ? "Guardar cambios" : "Guardado"}</button>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflowX: "auto" }}>
        <table className="pj-matrix">
          <thead><tr><th>Sección</th>{m.cols.map((c) => <th key={c}>{c}</th>)}</tr></thead>
          <tbody>
            {m.rows.map((r, ri) => (
              <tr key={r.name}>
                <td><b>{r.name}</b>{r.desc && <small>{r.desc}</small>}</td>
                {r.cells.map((c, ci) => {
                  const k = CELL[c] || CELL.no;
                  return <td key={ci}><button type="button" className={`pj-cell ${k.cls}`} onClick={() => cycle(ri, ci)} title={`${m.cols[ci]} · ${k.help} (clic para cambiar)`} style={{ border: "none", cursor: "pointer", font: "inherit", fontWeight: 600 }}>{k.label}</button></td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="pj-legend" style={{ marginTop: "1rem" }}>
        {Object.values(CELL).map((k) => <span key={k.cls} className="flex items-center gap-2"><span className={`pj-cell ${k.cls}`}>{k.label}</span>{k.help}</span>)}
        <span className="text-muted">· Clic en una casilla para cambiarla.</span>
      </div>
      {m.foot && <p className="text-sm text-secondary" style={{ marginTop: "0.75rem" }}>{m.foot}</p>}
    </div>
  );
}
