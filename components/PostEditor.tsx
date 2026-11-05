"use client";

import { useState } from "react";
import { X, Trash2, Check } from "lucide-react";
import { KINDS, PLATFORMS, Post, STATUSES } from "@/lib/social";
import { deleteRow, saveRow } from "@/lib/store";
import Portal from "./Portal";

const KINDS_BY_PLATFORM: Record<string, string[]> = {
  tiktok: ["noticia", "automatizacion", "tutorial", "caso"],
  linkedin: ["caso", "post", "pregunta"],
  newsletter: ["newsletter"],
  directo: ["directo"],
  telegram: ["aviso"],
};

/** Crear o editar una pieza del calendario de contenido. */
export default function PostEditor({ post, onClose, onSaved }: { post: Post; onClose: () => void; onSaved: () => void }) {
  const [p, setP] = useState<Post>(post);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = (k: keyof Post, v: any) => setP({ ...p, [k]: v });

  async function save(next = p) {
    if (!next.title.trim()) { setError("Ponle un título."); return; }
    setSaving(true);
    try { await saveRow<Post>("content_posts", { ...next, publish_date: next.publish_date || null }); onSaved(); onClose(); }
    catch (e: any) { setError(e?.message || "No se ha podido guardar."); setSaving(false); }
  }
  async function remove() { if (p.id) { await deleteRow("content_posts", p.id); onSaved(); onClose(); } }

  return (
    <Portal>
      <div className="dialog-overlay" onClick={onClose}>
        <form className="dialog" style={{ maxWidth: 560 }} onClick={(e) => e.stopPropagation()} onSubmit={(e) => { e.preventDefault(); save(); }}>
          <div className="dialog-head">
            <div>
              <div className="eyebrow">{PLATFORMS[p.platform]?.label} · {KINDS[p.kind || ""] || "Pieza"}</div>
              <h3 style={{ fontSize: "1.25rem", fontWeight: 800, letterSpacing: "-0.03em" }}>{p.id ? "Editar pieza" : "Nueva pieza"}</h3>
            </div>
            <button type="button" className="icon-btn" onClick={onClose} aria-label="Cerrar"><X /></button>
          </div>
          <div className="dialog-body">
            <div className="form-group"><label>Título</label>
              <input autoFocus value={p.title} onChange={(e) => set("title", e.target.value)} placeholder="Qué cuenta esta pieza, en una frase" /></div>
            <div className="flex gap-4">
              <div className="form-group flex-1"><label>Red / canal</label>
                <select value={p.platform} onChange={(e) => setP({ ...p, platform: e.target.value, kind: KINDS_BY_PLATFORM[e.target.value][0] })}>
                  {Object.entries(PLATFORMS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select></div>
              <div className="form-group flex-1"><label>Tipo</label>
                <select value={p.kind || ""} onChange={(e) => set("kind", e.target.value)}>
                  {(KINDS_BY_PLATFORM[p.platform] || Object.keys(KINDS)).map((k) => <option key={k} value={k}>{KINDS[k]}</option>)}
                </select></div>
            </div>
            <div className="flex gap-4">
              <div className="form-group flex-1"><label>Día de publicación</label>
                <input type="date" value={p.publish_date || ""} onChange={(e) => set("publish_date", e.target.value || null)} />
                <small className="text-muted text-xs">Vacío = banco de ideas</small></div>
              <div className="form-group flex-1"><label>Quién</label>
                <select value={p.owner || "Aldia"} onChange={(e) => set("owner", e.target.value)}>
                  {["Aldia", "Guille", "Millán"].map((o) => <option key={o}>{o}</option>)}
                </select></div>
            </div>
            <div className="form-group"><label>Estado</label>
              <div className="seg" style={{ flexWrap: "wrap" }}>
                {STATUSES.map((s) => (
                  <button type="button" key={s.id} className={p.status === s.id ? "on" : ""} onClick={() => set("status", s.id)}>
                    <i style={{ width: 7, height: 7, borderRadius: 9, background: s.color, display: "inline-block", marginRight: 6, verticalAlign: 1 }} />{s.label}
                  </button>
                ))}
              </div></div>
            {(p.kind === "automatizacion" || p.keyword) && (
              <div className="form-group"><label>Palabra clave del «Comenta PALABRA»</label>
                <input value={p.keyword || ""} onChange={(e) => set("keyword", e.target.value.toUpperCase())} placeholder="p. ej. FACTURAS" /></div>
            )}
            <div className="form-group"><label>Enlace (cuando esté publicado)</label>
              <input value={p.url || ""} onChange={(e) => set("url", e.target.value)} placeholder="https://" /></div>
            <div className="form-group" style={{ marginBottom: 0 }}><label>Notas / guion</label>
              <textarea rows={3} value={p.notes || ""} onChange={(e) => set("notes", e.target.value)} /></div>
            {error && <p style={{ color: "var(--bad)", fontSize: "0.8125rem", marginTop: "0.75rem" }}>{error}</p>}
          </div>
          <div className="dialog-foot">
            {p.id ? <button type="button" className="btn-danger" onClick={remove}><Trash2 style={{ width: 15, height: 15 }} /> Borrar</button> : <span />}
            <div className="flex gap-2">
              {p.status !== "publicado" && <button type="button" className="btn-secondary" disabled={saving} onClick={() => save({ ...p, status: "publicado" })}><Check style={{ width: 15, height: 15 }} /> Publicado</button>}
              <button type="submit" className="btn-primary" disabled={saving}>{saving ? "Guardando…" : "Guardar"}</button>
            </div>
          </div>
        </form>
      </div>
    </Portal>
  );
}
