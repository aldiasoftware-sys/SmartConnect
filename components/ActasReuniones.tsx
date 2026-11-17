"use client";

// Actas de las reuniones grabadas con la app de Mac «Reuniones ALDIA» (skill reuniones-aldia).
// La app sube cada reunión a la tabla `reuniones` con origen «Grabada», el acta en Markdown y la transcripción.
import { useEffect, useMemo, useState } from "react";
import Portal from "@/components/Portal";
import { X, Mic, FileText, AlignLeft, Copy, Check } from "lucide-react";

export type ActaReunion = {
  id?: string;
  nombre_reunion: string;
  fecha_reunion: string;
  duracion?: string;
  acta?: string | null;
  transcripcion?: string | null;
  peticiones?: number | null;
};

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
const inl = (s: string) => esc(s).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/`(.+?)`/g, "<code>$1</code>");

/** Markdown mínimo del acta: títulos, tablas, listas, casillas y negritas. */
export function actaHtml(src: string) {
  const L = src.split("\n");
  let h = "", i = 0;
  while (i < L.length) {
    const l = L[i];
    if (/^\s*\|/.test(l)) {
      const rows: string[] = [];
      while (i < L.length && /^\s*\|/.test(L[i])) rows.push(L[i++]);
      const cells = (r: string) => r.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
      const body = rows.filter((r, k) => !(k === 1 && /^[\s|:-]+$/.test(r)));
      h += `<div class="acta-tw"><table><thead><tr>${cells(body[0]).map((c) => `<th>${inl(c)}</th>`).join("")}</tr></thead><tbody>${body
        .slice(1).map((r) => `<tr>${cells(r).map((c) => `<td>${inl(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
      continue;
    }
    if (/^\s*[-*] /.test(l)) {
      h += "<ul>";
      while (i < L.length && /^\s*[-*] /.test(L[i])) {
        const t = L[i++].replace(/^\s*[-*] /, "");
        const c = t.match(/^\[( |x)\] (.*)/i);
        h += c ? `<li class="chk"><span class="box ${c[1] !== " " ? "on" : ""}"></span><span>${inl(c[2])}</span></li>` : `<li>${inl(t)}</li>`;
      }
      h += "</ul>";
      continue;
    }
    const m = l.match(/^(#{1,3}) (.*)/);
    if (m) {
      if (m[1].length > 1) h += `<h4 class="${/nos piden/i.test(m[2]) ? "clave" : ""}">${inl(m[2])}</h4>`;
    } else if (l.startsWith(">")) h += `<blockquote>${inl(l.replace(/^>\s?/, ""))}</blockquote>`;
    else if (l.trim()) h += `<p>${inl(l)}</p>`;
    i++;
  }
  return h;
}

const fecha = (iso: string) => {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? iso : d.toLocaleString("es-ES", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
};

export default function ActasReuniones({ actas, inicial, onClose }: { actas: ActaReunion[]; inicial?: string | null; onClose: () => void }) {
  const lista = useMemo(() => [...actas].sort((a, b) => +new Date(b.fecha_reunion) - +new Date(a.fecha_reunion)), [actas]);
  const [sel, setSel] = useState<string | undefined>(inicial || lista[0]?.id);
  const [tab, setTab] = useState<"acta" | "trans">("acta");
  const [copiado, setCopiado] = useState(false);
  const r = lista.find((x) => x.id === sel) || lista[0];

  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);

  async function copiar() {
    const t = tab === "acta" ? r?.acta : r?.transcripcion;
    if (!t) return;
    try { await navigator.clipboard.writeText(t); setCopiado(true); setTimeout(() => setCopiado(false), 1600); } catch { /* sin permiso */ }
  }

  return (
    <Portal>
      <div className="dialog-overlay" onClick={onClose}>
        <div className="dialog acta-dlg" onClick={(e) => e.stopPropagation()}>
          <div className="dialog-head">
            <div>
              <div className="eyebrow">Actas · grabadas con Reuniones ALDIA</div>
              <h3 className="reu-dlg-title">{r ? r.nombre_reunion : "Actas"}</h3>
            </div>
            <button type="button" className="icon-btn" onClick={onClose} aria-label="Cerrar"><X /></button>
          </div>
          <div className="acta-body">
            <nav className="acta-list">
              {lista.length === 0 && (
                <p className="acta-empty">
                  Aún no hay reuniones grabadas. Se graban en el Mac con la app <b>Reuniones ALDIA</b> (está en Skills) y aparecen aquí solas.
                </p>
              )}
              {lista.map((x) => (
                <button key={x.id} type="button" className={`acta-it ${x.id === r?.id ? "on" : ""}`} onClick={() => { setSel(x.id); }}>
                  <b>{x.nombre_reunion}</b>
                  <small>{fecha(x.fecha_reunion)}{x.duracion ? ` · ${x.duracion}` : ""}</small>
                  {!!x.peticiones && <span className="acta-pet">{x.peticiones} {x.peticiones === 1 ? "petición" : "peticiones"}</span>}
                </button>
              ))}
            </nav>
            {r && (
              <section className="acta-main">
                <div className="acta-bar">
                  <div className="acta-tabs">
                    <button type="button" className={tab === "acta" ? "on" : ""} onClick={() => setTab("acta")}><FileText /> Acta</button>
                    <button type="button" className={tab === "trans" ? "on" : ""} onClick={() => setTab("trans")}><AlignLeft /> Transcripción</button>
                  </div>
                  <button type="button" className="btn-secondary acta-copy" onClick={copiar}>
                    {copiado ? <Check size={15} /> : <Copy size={15} />} {copiado ? "Copiado" : "Copiar"}
                  </button>
                </div>
                {tab === "acta" ? (
                  r.acta ? <div className="acta-md" dangerouslySetInnerHTML={{ __html: actaHtml(r.acta) }} /> : <p className="acta-empty">Esta reunión no tiene acta.</p>
                ) : (
                  <div className="acta-trans">{r.transcripcion || "Sin transcripción."}</div>
                )}
              </section>
            )}
          </div>
        </div>
      </div>

      <style jsx global>{`
        .acta-dlg { max-width: 1100px; width: calc(100vw - 48px); height: min(86vh, 900px); display: flex; flex-direction: column; }
        .acta-body { flex: 1; min-height: 0; display: grid; grid-template-columns: 270px minmax(0, 1fr); border-top: 1px solid var(--border-color); }
        .acta-list { overflow: auto; padding: 10px; border-right: 1px solid var(--border-color); background: var(--bg-secondary); }
        .acta-it { width: 100%; text-align: left; border: 0; background: none; border-radius: 12px; padding: 10px 12px; display: grid; gap: 2px; cursor: pointer; font-family: inherit; color: var(--ink); }
        .acta-it:hover { background: #fff; }
        .acta-it.on { background: #fff; box-shadow: var(--shadow-sm), inset 3px 0 0 var(--ink); }
        .acta-it b { font-size: 0.875rem; font-weight: 600; }
        .acta-it small { font-size: 0.75rem; color: var(--text-muted); }
        .acta-pet { justify-self: start; margin-top: 4px; font-size: 0.6875rem; font-weight: 600; padding: 2px 8px; border-radius: 99px; background: var(--accent-soft); color: var(--accent); }
        .acta-main { min-width: 0; display: flex; flex-direction: column; min-height: 0; }
        .acta-bar { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 12px 20px; border-bottom: 1px solid var(--border-color); }
        .acta-tabs { display: inline-flex; gap: 2px; padding: 3px; border-radius: 12px; background: var(--bg-secondary); }
        .acta-tabs button { border: 0; background: none; border-radius: 9px; height: 32px; padding: 0 12px; display: inline-flex; align-items: center; gap: 6px; font-family: inherit; font-size: 0.8125rem; font-weight: 600; color: var(--text-secondary); cursor: pointer; }
        .acta-tabs button svg { width: 15px; height: 15px; }
        .acta-tabs button.on { background: #fff; color: var(--ink); box-shadow: var(--shadow-sm); }
        .acta-copy { height: 34px; }
        .acta-md, .acta-trans { flex: 1; overflow: auto; padding: 8px 24px 28px; font-size: 0.9rem; line-height: 1.6; color: var(--ink); }
        .acta-trans { white-space: pre-wrap; padding-top: 18px; }
        .acta-md h4 { font-size: 1rem; margin: 22px 0 8px; }
        .acta-md h4.clave { display: inline-block; padding: 4px 10px; border-radius: 8px; background: var(--accent-soft); }
        .acta-md p { margin: 0 0 8px; }
        .acta-md ul { margin: 4px 0 8px; padding-left: 20px; }
        .acta-md li { margin: 3px 0; }
        .acta-md li.chk { list-style: none; margin-left: -20px; display: flex; gap: 8px; }
        .acta-md .box { width: 15px; height: 15px; border: 1.5px solid var(--text-muted); border-radius: 4px; flex-shrink: 0; margin-top: 4px; }
        .acta-md .box.on { background: var(--ink); border-color: var(--ink); }
        .acta-md blockquote { margin: 8px 0; padding: 6px 12px; border-left: 3px solid var(--border-color); color: var(--text-secondary); }
        .acta-tw { overflow-x: auto; margin: 4px 0 10px; }
        .acta-md table { width: 100%; border-collapse: collapse; font-size: 0.84rem; }
        .acta-md th { text-align: left; font-size: 0.6875rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); font-weight: 600; padding: 8px 10px; border-bottom: 1px solid var(--border-color); }
        .acta-md td { padding: 9px 10px; border-bottom: 1px solid var(--border-color); vertical-align: top; }
        .acta-md td:first-child { font-weight: 700; color: var(--text-muted); width: 28px; }
        .acta-empty { padding: 16px; color: var(--text-secondary); font-size: 0.875rem; line-height: 1.5; }
        @media (max-width: 760px) {
          .acta-dlg { width: 100vw; height: 100dvh; max-width: none; border-radius: 0; }
          .acta-body { grid-template-columns: 1fr; grid-template-rows: auto 1fr; }
          .acta-list { display: flex; gap: 6px; overflow-x: auto; border-right: 0; border-bottom: 1px solid var(--border-color); }
          .acta-it { min-width: 200px; }
          .acta-md, .acta-trans { padding: 8px 16px 24px; }
        }
      `}</style>
    </Portal>
  );
}
