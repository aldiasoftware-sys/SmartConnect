"use client";

import { useEffect, useState } from "react";
import { Puzzle, Download, Copy, Check, RefreshCw, ChevronDown, Film, HardDrive } from "lucide-react";
import { SkillInfo, listSkills, skillPrompt, skillUrl } from "@/lib/skills";
import { fmtSize } from "@/lib/files";

const cuando = (iso: string) => {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? iso : d.toLocaleString("es-ES", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
};

/** Descarga un archivo de .skills con un enlace firmado (sin abrir pestañas, para que el navegador no bloquee varias seguidas). */
async function bajar(slug: string, file: string) {
  const a = document.createElement("a");
  a.href = await skillUrl(slug, file); a.download = file; a.rel = "noopener";
  document.body.appendChild(a); a.click(); a.remove();
}

function SkillCard({ s }: { s: SkillInfo }) {
  const [prompt, setPrompt] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [bajando, setBajando] = useState("");
  const partes = s.referencias || [];

  useEffect(() => { skillPrompt(s.slug).then(setPrompt).catch(() => setPrompt(null)); }, [s.slug, s.version]);

  // se copia el texto ya cargado (esperar aquí haría perder el «clic» y el navegador no dejaría escribir en el portapapeles)
  async function copiar() {
    if (!prompt) return;
    try { await navigator.clipboard.writeText(prompt); }
    catch {
      const ta = document.createElement("textarea"); ta.value = prompt; ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select(); document.execCommand("copy"); ta.remove();
    }
    setCopiado(true); setTimeout(() => setCopiado(false), 1800);
  }
  async function todas() {
    for (let i = 0; i < partes.length; i++) {
      setBajando(`${i + 1}/${partes.length}`);
      await bajar(s.slug, partes[i].nombre);
      await new Promise((r) => setTimeout(r, 1200));
    }
    setBajando("");
  }

  return (
    <div className="card skill-card">
      <div className="skill-head">
        <span className="skill-ico"><Puzzle /></span>
        <div style={{ minWidth: 0 }}>
          <h3>{s.nombre}</h3>
          <div className="section-sub">Versión {s.version}{s.autor ? ` · de ${s.autor}` : ""} · actualizada {cuando(s.actualizada)}</div>
        </div>
      </div>
      {s.descripcion && <p className="skill-desc">{s.descripcion}</p>}

      <div className="skill-actions">
        <button className="btn-primary" onClick={() => bajar(s.slug, s.zip)}><Download style={{ width: 16, height: 16 }} /> Descargar skill <small>{fmtSize(s.tam_zip)}</small></button>
        <button className={`btn-secondary ${copiado ? "skill-ok" : ""}`} onClick={copiar} disabled={!prompt}>{copiado ? <Check style={{ width: 15, height: 15 }} /> : <Copy style={{ width: 15, height: 15 }} />} {copiado ? "Prompt copiado" : "Copiar prompt de instalación"}</button>
      </div>

      {partes.length > 0 && (
        <div className="skill-refs">
          <div className="flex items-center gap-2" style={{ minWidth: 0 }}>
            <Film style={{ width: 15, height: 15, flexShrink: 0, color: "var(--text-muted)" }} />
            <span><b>Material de referencia</b> · {partes.length} {partes.length === 1 ? "parte" : "partes"} · {fmtSize(s.tam_referencias || 0)}</span>
          </div>
          <button className="copy-btn" onClick={todas} disabled={!!bajando}><Download /> {bajando ? `Bajando ${bajando}…` : `Descargar las ${partes.length} partes`}</button>
        </div>
      )}

      <button className="skill-toggle" onClick={() => setOpen(!open)}><ChevronDown style={{ width: 15, height: 15, transform: open ? "rotate(180deg)" : "none" }} /> {open ? "Ocultar" : "Ver"} el prompt de instalación</button>
      {open && <pre className="skill-prompt">{prompt ?? "Cargando…"}</pre>}
    </div>
  );
}

export default function SkillsPage() {
  const [skills, setSkills] = useState<SkillInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true); setError("");
    try { setSkills(await listSkills()); }
    catch (e: any) { setError(e?.message || "No se han podido leer las skills."); }
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div>
          <div className="eyebrow">Equipo · Claude Code</div>
          <h2 className="page-title">Skills</h2>
          <p className="page-subtitle">Las skills del equipo, siempre en su última versión: se vuelven a subir solas cada vez que cambian. Descarga el zip (y las partes del material de referencia, si las tiene), copia el prompt y pégalo en Claude Code en el otro ordenador.</p>
        </div>
        <button className="btn-secondary" onClick={load} disabled={loading}><RefreshCw style={{ width: 15, height: 15 }} /> Actualizar</button>
      </div>

      {error && <div className="banner"><HardDrive /><div>{error}</div></div>}
      {loading ? <p className="text-muted text-sm">Cargando…</p> : skills.length === 0 ? (
        <div className="banner"><Puzzle /><div>Todavía no hay skills publicadas. Se suben con <code>publicar_skill.py</code>.</div></div>
      ) : (
        <div className="skill-grid">{skills.map((s) => <SkillCard key={s.slug} s={s} />)}</div>
      )}
    </div>
  );
}
