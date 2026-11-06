"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Plus, Search, Copy, Check, X, Pencil, Trash2, KeyRound, AtSign, MoreHorizontal, ShieldCheck, Lock } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";
import Portal from "@/components/Portal";

interface Credential {
  id: string;
  name: string;
  user: string;
  pass: string;
}

/** Colores «de marca» aproximados para los servicios más habituales; el resto sale de un tono derivado del nombre. */
const BRANDS: [RegExp, string][] = [
  [/supabase/i, "#1f9d6c"],
  [/github/i, "#24292f"],
  [/gitlab/i, "#e24329"],
  [/google|gmail|gcp|firebase/i, "#4285f4"],
  [/microsoft|azure|outlook|office|365|teams|power\s?(bi|apps|automate|platform)/i, "#0078d4"],
  [/aws|amazon/i, "#ff9900"],
  [/stripe/i, "#635bff"],
  [/openai|chatgpt/i, "#10a37f"],
  [/anthropic|claude/i, "#d97757"],
  [/notion|vercel|apple|x\.com|twitter/i, "#111111"],
  [/linkedin/i, "#0a66c2"],
  [/tiktok/i, "#fe2c55"],
  [/facebook|meta/i, "#1877f2"],
  [/instagram/i, "#e1306c"],
  [/cloudflare/i, "#f38020"],
  [/slack/i, "#4a154b"],
  [/shopify/i, "#5e8e3e"],
  [/hubspot/i, "#ff7a59"],
  [/wordpress/i, "#21759b"],
  [/canva/i, "#00a5ad"],
  [/figma/i, "#f24e1e"],
  [/skool/i, "#1e3a8a"],
  [/telegram/i, "#229ed9"],
  [/whatsapp/i, "#25d366"],
];

function tileColor(name: string) {
  const hit = BRANDS.find(([re]) => re.test(name));
  if (hit) return hit[1];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  return `hsl(${h}, 55%, 42%)`;
}

function initials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "?";
  return (words.length > 1 ? words[0][0] + words[1][0] : words[0][0]).toUpperCase();
}

/** Menú «⋯» de la tarjeta, con Editar y Eliminar. */
function CredMenu({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const click = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", click); document.addEventListener("keydown", key);
    return () => { document.removeEventListener("mousedown", click); document.removeEventListener("keydown", key); };
  }, [open]);
  return (
    <div className="card-menu" ref={ref}>
      <button className={`mx-act cr-more${open ? " on" : ""}`} aria-label="Más opciones" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}><MoreHorizontal /></button>
      {open && (
        <div className="card-menu-pop" role="menu">
          <button role="menuitem" onClick={() => { setOpen(false); onEdit(); }}><Pencil /> Editar</button>
          <button role="menuitem" className="danger" onClick={() => { setOpen(false); onDelete(); }}><Trash2 /> Eliminar</button>
        </div>
      )}
    </div>
  );
}

export default function CredentialsPage() {
  const { user: authUser } = useAuth();
  const [creds, setCreds] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', user: '', pass: '' });
  const [query, setQuery] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchCreds = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('credentials')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) console.error("Error fetching creds:", error.message);
    else setCreds(data.map(d => ({
      id: d.id,
      name: d.name,
      user: d.username_email,
      pass: d.password_text
    })));
    setLoading(false);
  };

  useEffect(() => {
    if (authUser) fetchCreds();
    else setLoading(false);
  }, [authUser]);

  useEffect(() => () => { if (copyTimer.current) clearTimeout(copyTimer.current); }, []);

  const handleSave = async () => {
    if (!form.name.trim()) { setFormError("Ponle un nombre al servicio."); return; }
    setSaving(true);
    setFormError("");

    const { error } = editingId !== null
      ? await supabase.from('credentials').update({
          name: form.name,
          username_email: form.user,
          password_text: form.pass
        }).eq('id', editingId)
      : await supabase.from('credentials').insert({
          name: form.name,
          username_email: form.user,
          password_text: form.pass
        });

    setSaving(false);
    if (error) { setFormError("No se ha podido guardar. Inténtalo de nuevo."); return; }
    fetchCreds();
    closeModal();
  };

  const openNew = () => {
    setEditingId(null);
    setForm({ name: '', user: '', pass: '' });
    setFormError("");
    setIsModalOpen(true);
  };

  const openEdit = (cred: Credential) => {
    setEditingId(cred.id);
    setForm({ name: cred.name, user: cred.user, pass: cred.pass });
    setFormError("");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setEditingId(null);
    setForm({ name: '', user: '', pass: '' });
    setFormError("");
    setIsModalOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm("¿Estás seguro de que quieres eliminar esta credencial?")) {
      await supabase.from('credentials').delete().eq('id', id);
      fetchCreds();
      return true;
    }
    return false;
  };

  const copyToClipboard = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(null), 1600);
    } catch {
      alert("No se ha podido copiar al portapapeles");
    }
  };

  // cerrar el diálogo con Escape
  useEffect(() => {
    if (!isModalOpen) return;
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") closeModal(); };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [isModalOpen]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return creds;
    return creds.filter((c) => (c.name || "").toLowerCase().includes(q) || (c.user || "").toLowerCase().includes(q));
  }, [creds, query]);

  const copyBtn = (value: string, k: string, what: string) => {
    const on = copied === k;
    return (
      <button
        key={k}
        type="button"
        className={`cr-copy${on ? " on" : ""}`}
        disabled={!value}
        onClick={() => copyToClipboard(value, k)}
        aria-label={on ? "Copiado" : `Copiar ${what}`}
        title={on ? "Copiado" : `Copiar ${what}`}
      >
        {on ? <><Check /><span>Copiado</span></> : <Copy />}
      </button>
    );
  };

  return (
    <div className="page-wrapper">
      <div className="mx-head">
        <div>
          <div className="eyebrow">Bóveda del equipo</div>
          <h2>Credenciales {!loading && <span className="mx-count">{query.trim() ? `${filtered.length} de ${creds.length}` : creds.length}</span>}</h2>
          <p>Accesos a APIs y entornos de forma segura y centralizada.</p>
        </div>
        <div className="mx-head-actions">
          <button className="btn-primary" onClick={openNew}>
            <Plus style={{ width: 18, height: 18 }} />
            Nueva Credencial
          </button>
        </div>
      </div>

      <div className="mx-toolbar">
        <div className="mx-search">
          <Search />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por servicio o usuario…"
            aria-label="Buscar credenciales"
            autoComplete="off"
          />
          {query && <button className="cr-clear" aria-label="Limpiar búsqueda" onClick={() => setQuery("")}><X /></button>}
        </div>
        <span className="cr-note"><ShieldCheck /> Las contraseñas se muestran siempre ocultas</span>
      </div>

      {loading ? (
        <div className="cr-grid">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="mx-skeleton" style={{ height: 168, borderRadius: 18 }} />)}
        </div>
      ) : creds.length === 0 ? (
        <div className="mx-empty">
          <div className="mx-ico ink"><KeyRound /></div>
          <h3>Tu bóveda está vacía</h3>
          <p>Guarda aquí los accesos a APIs, paneles y entornos para tenerlos a mano y copiarlos con un clic.</p>
          <button className="btn-primary" onClick={openNew}><Plus style={{ width: 16, height: 16 }} /> Nueva Credencial</button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="mx-empty">
          <div className="mx-ico"><Search /></div>
          <h3>Sin resultados</h3>
          <p>Ninguna credencial coincide con «{query.trim()}».</p>
          <button className="btn-secondary" onClick={() => setQuery("")}>Limpiar búsqueda</button>
        </div>
      ) : (
        <div className="cr-grid">
          {filtered.map((cred) => (
            <div key={cred.id} className="mx-card cr-card animate-in">
              <div className="cr-top">
                <div className="cr-tile" style={{ background: tileColor(cred.name || "") }} aria-hidden="true">{initials(cred.name || "")}</div>
                <div className="mx-grow">
                  <div className="mx-title mx-trunc" title={cred.name}>{cred.name}</div>
                  <div className="mx-meta mx-trunc">{cred.pass ? "Contraseña guardada" : "Sin contraseña"}</div>
                </div>
                <CredMenu onEdit={() => openEdit(cred)} onDelete={() => handleDelete(cred.id)} />
              </div>

              <div className="cr-fields">
                <div className="cr-field">
                  <AtSign className="cr-fico" />
                  <div className="mx-grow">
                    <div className="cr-label">Email / Usuario</div>
                    <div className={`cr-value mx-trunc${cred.user ? "" : " empty"}`} title={cred.user || undefined}>{cred.user || "—"}</div>
                  </div>
                  {copyBtn(cred.user, `${cred.id}:user`, "usuario")}
                </div>
                <div className="cr-field">
                  <Lock className="cr-fico" />
                  <div className="mx-grow">
                    <div className="cr-label">Contraseña</div>
                    <div className={`cr-value cr-mask${cred.pass ? "" : " empty"}`}>{cred.pass ? "••••••••••••" : "—"}</div>
                  </div>
                  {copyBtn(cred.pass, `${cred.id}:pass`, "contraseña")}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <Portal>
          <div className="dialog-overlay" onClick={closeModal}>
            <form
              className="dialog"
              style={{ maxWidth: 480 }}
              onClick={(e) => e.stopPropagation()}
              onSubmit={(e) => { e.preventDefault(); handleSave(); }}
            >
              <div className="dialog-head">
                <div className="cr-dhead">
                  <div className="cr-tile lg" style={{ background: form.name.trim() ? tileColor(form.name) : "var(--navy)" }} aria-hidden="true">
                    {form.name.trim() ? initials(form.name) : <KeyRound />}
                  </div>
                  <div>
                    <div className="eyebrow" style={{ marginBottom: 2 }}>Bóveda</div>
                    <h3 style={{ fontSize: "1.25rem", fontWeight: 500, letterSpacing: "-0.03em" }}>{editingId ? "Editar Credencial" : "Nueva Credencial"}</h3>
                  </div>
                </div>
                <button type="button" className="icon-btn" onClick={closeModal} aria-label="Cerrar"><X /></button>
              </div>
              <div className="dialog-body">
                <div className="form-group"><label>Nombre del Servicio</label>
                  <input autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ej: Supabase Dashboard" autoComplete="off" /></div>
                <div className="form-group"><label>Email / Usuario</label>
                  <input value={form.user} onChange={(e) => setForm({ ...form, user: e.target.value })} placeholder="Tu email o ID" autoComplete="off" /></div>
                <div className="form-group" style={{ marginBottom: 0 }}><label>Contraseña / API Key</label>
                  <input type="password" value={form.pass} onChange={(e) => setForm({ ...form, pass: e.target.value })} placeholder="••••••••" autoComplete="new-password" /></div>
                {formError && <p style={{ color: "var(--bad)", fontSize: "0.8125rem", marginTop: "0.75rem" }}>{formError}</p>}
              </div>
              <div className="dialog-foot">
                {editingId
                  ? <button type="button" className="btn-danger" onClick={async () => { if (await handleDelete(editingId)) closeModal(); }}><Trash2 style={{ width: 15, height: 15 }} /> Eliminar</button>
                  : <span />}
                <div className="flex gap-2">
                  <button type="button" className="btn-secondary" onClick={closeModal}>Cancelar</button>
                  <button type="submit" className="btn-primary" disabled={saving}>
                    {saving ? "Guardando…" : editingId ? "Actualizar" : "Guardar Credencial"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </Portal>
      )}

      <style jsx global>{`
        .cr-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(268px, 100%), 1fr)); gap: 0.875rem; }
        .cr-card { padding: 0.875rem; border-radius: 18px; display: flex; flex-direction: column; gap: 0.75rem; }
        .cr-card:hover { transform: translateY(-1px); }
        .cr-top { display: flex; align-items: center; gap: 0.75rem; padding: 0.125rem 0.125rem 0 0.25rem; }
        .cr-tile { width: 40px; height: 40px; border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; color: #fff; font-weight: 600; font-size: 0.9375rem; letter-spacing: -0.02em; box-shadow: inset 0 0 0 1px rgba(255,255,255,0.14), inset 0 -10px 18px -10px rgba(0,0,0,0.35), 0 6px 14px -8px rgba(10,22,51,0.45); background-image: linear-gradient(150deg, rgba(255,255,255,0.18), rgba(255,255,255,0) 60%) !important; }
        .cr-tile.lg { width: 46px; height: 46px; border-radius: 14px; font-size: 1.0625rem; }
        .cr-tile svg { width: 20px; height: 20px; }
        .cr-top .mx-meta { font-size: 0.75rem; margin-top: 1px; }
        .cr-more { opacity: 0.55; }
        .cr-card:hover .cr-more, .cr-more.on, .cr-more:focus-visible { opacity: 1; }
        .cr-more.on { background: var(--bg-secondary); color: var(--ink); }

        .cr-fields { display: flex; flex-direction: column; gap: 4px; padding: 4px; border-radius: 14px; background: var(--bg-secondary); }
        .cr-field { display: flex; align-items: center; gap: 0.625rem; padding: 0.45rem 0.4rem 0.45rem 0.65rem; border-radius: 10px; background: #fff; box-shadow: var(--shadow-sm); min-width: 0; }
        .cr-fico { width: 15px; height: 15px; color: var(--text-muted); flex-shrink: 0; }
        .cr-label { font-size: 0.625rem; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--text-muted); line-height: 1.3; }
        .cr-value { font-size: 0.8125rem; font-weight: 500; color: var(--ink); line-height: 1.35; }
        .cr-value.empty { color: var(--text-muted); font-weight: 400; }
        .cr-mask { letter-spacing: 0.12em; font-size: 0.875rem; line-height: 1.2; }

        .cr-copy { height: 30px; min-width: 30px; padding: 0 8px; border: 0; border-radius: 9px; background: none; color: var(--text-muted); display: inline-flex; align-items: center; justify-content: center; gap: 5px; cursor: pointer; font-family: inherit; font-size: 0.75rem; font-weight: 600; flex-shrink: 0; transition: var(--transition); }
        .cr-copy svg { width: 15px; height: 15px; }
        .cr-copy:hover:not(:disabled) { background: var(--accent-soft); color: var(--accent); }
        .cr-copy:disabled { opacity: 0.35; cursor: default; }
        .cr-copy.on { background: var(--ok-soft); color: var(--ok); animation: crPop 0.22s cubic-bezier(0.16, 1, 0.3, 1); }
        @keyframes crPop { from { transform: scale(0.9); } to { transform: scale(1); } }

        .mx-search .cr-clear { position: absolute; right: 8px; top: 50%; transform: translateY(-50%); width: 30px; height: 30px; border: 0; border-radius: 9px; background: none; color: var(--text-muted); display: inline-flex; align-items: center; justify-content: center; cursor: pointer; }
        .mx-search .cr-clear:hover { background: var(--bg-secondary); color: var(--ink); }
        .mx-search .cr-clear svg { width: 15px; height: 15px; }
        .mx-search input { padding-right: 44px; }
        .cr-note { display: inline-flex; align-items: center; gap: 7px; font-size: 0.8125rem; color: var(--text-muted); white-space: nowrap; }
        .cr-note svg { width: 15px; height: 15px; color: var(--ok); }

        .cr-dhead { display: flex; align-items: center; gap: 0.875rem; }

        @media (max-width: 720px) {
          .mx-head-actions { width: 100%; }
          .mx-head-actions .btn-primary { flex: 1; justify-content: center; }
          .cr-note { white-space: normal; }
          .cr-grid { gap: 0.75rem; }
        }
      `}</style>
    </div>
  );
}
