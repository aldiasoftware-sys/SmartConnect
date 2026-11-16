"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Plus, Search, Copy, Check, X, Pencil, Trash2, KeyRound, AtSign, MoreHorizontal, ShieldCheck, Lock, FolderLock, FolderPlus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";
import Portal from "@/components/Portal";
import { getSetting, setSetting } from "@/lib/store";
import { BrandLogo } from "@/components/AccountIcon";

/** Carpetas automáticas por servicio, según el nombre de la credencial (el orden manda: la primera que encaja). */
const FOLDERS: { name: string; re: RegExp; color: string; logo?: string }[] = [
  { name: "TikTok", re: /tik\s?tok/i, color: "#000000", logo: "tiktok" },
  { name: "Instagram", re: /instagram|\big\b/i, color: "#e1306c", logo: "instagram" },
  { name: "YouTube", re: /youtube|\byt\b/i, color: "#ff0000", logo: "youtube" },
  { name: "Meta / Facebook", re: /facebook|\bmeta\b|whatsapp/i, color: "#1877f2" },
  { name: "n8n", re: /n8n/i, color: "#ea4b71" },
  { name: "IA", re: /openai|chatgpt|anthropic|claude|gemini|eleven\s?labs|mistral|groq|perplexity|midjourney|replicate|hugging/i, color: "#d97757" },
  { name: "Google", re: /google|gmail|gcp|firebase|drive/i, color: "#4285f4" },
  { name: "Microsoft", re: /microsoft|azure|outlook|office|365|teams|power\s?(bi|apps|automate|platform)|dataverse/i, color: "#0078d4" },
  { name: "Discord", re: /discord/i, color: "#5865f2" },
  { name: "Supabase y bases de datos", re: /supabase|postgres|mongo|mysql|airtable/i, color: "#1f9d6c" },
  { name: "Código y despliegue", re: /github|gitlab|vercel|cloudflare|netlify|docker|aws|amazon|hostinger|ionos|godaddy|dominio|hosting|vps/i, color: "#24292f" },
  { name: "Pagos", re: /stripe|paypal|revolut|bizum|banco|bank/i, color: "#635bff" },
  { name: "Correo y newsletter", re: /resend|mailchimp|brevo|sendgrid|correo|mail/i, color: "#0e0e0e" },
  { name: "Diseño", re: /canva|figma|adobe|capcut/i, color: "#00a5ad" },
  { name: "LinkedIn", re: /linkedin/i, color: "#0a66c2" },
];
const folderOf = (c: { name: string; user?: string }) => FOLDERS.find((f) => f.re.test(c.name || "")) || FOLDERS.find((f) => f.re.test(c.user || "")) || null;
function byFolder<T extends { name: string; user?: string }>(items: T[]) {
  const out: { name: string; color: string; logo?: string; items: T[] }[] = [];
  for (const c of items) {
    const f = folderOf(c); const name = f?.name || "Otros";
    let g = out.find((x) => x.name === name);
    if (!g) { g = { name, color: f?.color || "#94a3b8", logo: f?.logo, items: [] }; out.push(g); }
    g.items.push(c);
  }
  return out.sort((a, b) => (a.name === "Otros" ? 1 : b.name === "Otros" ? -1 : FOLDERS.findIndex((f) => f.name === a.name) - FOLDERS.findIndex((f) => f.name === b.name)));
}

interface Credential {
  id: string;
  name: string;
  user: string;
  pass: string;
  vault: string;
}

/** Minibóvedas: grupos de credenciales por dueño o proyecto (Aldia, Guille, Millán, un cliente…). */
type VaultDef = { name: string; color: string };
const VAULT_COLORS = ["#1e3a8a", "#b45309", "#0f766e", "#7c3aed", "#be123c", "#15803d", "#0369a1", "#a16207", "#475569"];
const DEFAULT_VAULTS: VaultDef[] = [
  { name: "Aldia", color: "#1e3a8a" },
  { name: "Guille", color: "#b45309" },
  { name: "Millán", color: "#0f766e" },
];
const SIN = "";   // sin bóveda
function hashColor(name: string) { let h = 0; for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0; return VAULT_COLORS[h % VAULT_COLORS.length]; }
const missingColumn = (e: { code?: string; message?: string } | null) => !!e && /42703|PGRST204|column .*vault/i.test(`${e.code} ${e.message}`);

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
  const [form, setForm] = useState({ name: '', user: '', pass: '', vault: SIN });
  const [vaults, setVaults] = useState<VaultDef[]>(DEFAULT_VAULTS);
  const [vaultCol, setVaultCol] = useState(true);             // ¿existe la columna credentials.vault?
  const [vaultOf, setVaultOf] = useState<Record<string, string>>({});   // respaldo en app_settings mientras no exista
  const [active, setActive] = useState<string | null>(null);  // null = todas
  const [newVault, setNewVault] = useState<VaultDef | null>(null);
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

    const [defs, map, probe] = await Promise.all([
      getSetting<VaultDef[]>("credential_vaults", DEFAULT_VAULTS),
      getSetting<Record<string, string>>("credential_vault_of", {}),
      supabase.from('credentials').select('vault').limit(1),
    ]);
    const hasCol = !missingColumn(probe.error);
    setVaultCol(hasCol); setVaultOf(map); setVaults(defs?.length ? defs : DEFAULT_VAULTS);

    if (error) console.error("Error fetching creds:", error.message);
    else setCreds(data.map(d => ({
      id: d.id,
      name: d.name,
      user: d.username_email,
      pass: d.password_text,
      vault: (hasCol ? d.vault || map[d.id] : map[d.id]) || SIN,
    })));
    setLoading(false);

    // en cuanto existe la columna, las bóvedas guardadas aparte pasan a cada credencial
    if (!error && hasCol && Object.keys(map).length) {
      const pend = data.filter((d) => !d.vault && map[d.id]);
      const results = await Promise.all(pend.map((d) => supabase.from('credentials').update({ vault: map[d.id] }).eq('id', d.id)));
      if (results.every((r) => !r.error)) { setVaultOf({}); await setSetting("credential_vault_of", {}); }
    }
  };

  // la bóveda de una credencial; sin la columna se guarda aparte (app_settings) para que la vea todo el equipo
  const saveVaultFallback = async (id: string, vault: string) => {
    const next = { ...vaultOf }; if (vault) next[id] = vault; else delete next[id];
    setVaultOf(next); await setSetting("credential_vault_of", next);
  };
  const ensureVault = async (name: string) => {
    if (!name || vaults.some((v) => v.name.toLowerCase() === name.toLowerCase())) return;
    const next = [...vaults, { name, color: hashColor(name) }]; setVaults(next); await setSetting("credential_vaults", next);
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

    const vault = form.vault.trim();
    const row: Record<string, string | null> = { name: form.name, username_email: form.user, password_text: form.pass };
    if (vaultCol) row.vault = vault || null;
    const { data, error } = editingId !== null
      ? await supabase.from('credentials').update(row).eq('id', editingId).select('id').single()
      : await supabase.from('credentials').insert(row).select('id').single();

    if (error) { setSaving(false); setFormError("No se ha podido guardar. Inténtalo de nuevo."); return; }
    await ensureVault(vault);
    if (!vaultCol && data?.id) await saveVaultFallback(data.id, vault);
    setSaving(false);
    fetchCreds();
    closeModal();
  };

  const openNew = () => {
    setEditingId(null);
    setForm({ name: '', user: '', pass: '', vault: active ?? SIN });
    setFormError("");
    setIsModalOpen(true);
  };

  const openEdit = (cred: Credential) => {
    setEditingId(cred.id);
    setForm({ name: cred.name, user: cred.user, pass: cred.pass, vault: cred.vault });
    setFormError("");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setEditingId(null);
    setForm({ name: '', user: '', pass: '', vault: SIN });
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
    return creds.filter((c) => (active === null || c.vault === active)
      && (!q || (c.name || "").toLowerCase().includes(q) || (c.user || "").toLowerCase().includes(q) || (c.vault || "").toLowerCase().includes(q)));
  }, [creds, query, active]);

  // bóvedas a mostrar: las definidas + las que aparezcan en credenciales (por si alguien escribió una nueva)
  const allVaults = useMemo(() => {
    const list = [...vaults];
    creds.forEach((c) => { if (c.vault && !list.some((v) => v.name === c.vault)) list.push({ name: c.vault, color: hashColor(c.vault) }); });
    return list;
  }, [vaults, creds]);
  const colorOf = (name: string) => allVaults.find((v) => v.name === name)?.color || "#94a3b8";
  const countIn = (name: string) => creds.filter((c) => c.vault === name).length;
  const groups = useMemo(() => {
    const g = allVaults.map((v) => ({ ...v, items: filtered.filter((c) => c.vault === v.name) }));
    g.push({ name: SIN, color: "#94a3b8", items: filtered.filter((c) => !c.vault) });
    return g.filter((x) => x.items.length);
  }, [allVaults, filtered]);

  const createVault = async () => {
    const name = newVault?.name.trim(); if (!name || !newVault) return;
    const same = allVaults.find((v) => v.name.toLowerCase() === name.toLowerCase());
    if (same) { setActive(same.name); setNewVault(null); return; }
    const next = [...vaults, { name, color: newVault.color }]; setVaults(next); setNewVault(null); setActive(name);
    await setSetting("credential_vaults", next);
  };
  const removeVault = async (name: string) => {
    if (countIn(name)) { alert(`La bóveda «${name}» tiene credenciales: muévelas a otra antes de quitarla.`); return; }
    if (!confirm(`¿Quitar la bóveda «${name}»? Está vacía.`)) return;
    const next = vaults.filter((v) => v.name !== name); setVaults(next); if (active === name) setActive(null);
    await setSetting("credential_vaults", next);
  };

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

  const renderCard = (cred: Credential) => (
            <div key={cred.id} className="mx-card cr-card animate-in" style={{ ["--vc" as any]: cred.vault ? colorOf(cred.vault) : "transparent" }}>
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
            </div>);

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

      <div className="cr-chips" role="tablist" aria-label="Bóvedas">
        <button role="tab" aria-selected={active === null} className={`cr-chip${active === null ? " on" : ""}`} onClick={() => setActive(null)}>Todas <b>{creds.length}</b></button>
        {allVaults.map((v) => (
          <span key={v.name} className={`cr-chip-wrap${active === v.name ? " on" : ""}`} style={{ ["--vc" as any]: v.color }}>
            <button role="tab" aria-selected={active === v.name} className={`cr-chip${active === v.name ? " on" : ""}`} onClick={() => setActive(active === v.name ? null : v.name)}>
              <i className="cr-dot" /> {v.name} <b>{countIn(v.name)}</b>
            </button>
            {active === v.name && !countIn(v.name) && vaults.some((x) => x.name === v.name) && (
              <button className="cr-chip-x" aria-label={`Quitar la bóveda ${v.name}`} title="Quitar bóveda vacía" onClick={() => removeVault(v.name)}><X /></button>
            )}
          </span>
        ))}
        {creds.some((c) => !c.vault) && (
          <button role="tab" aria-selected={active === SIN} className={`cr-chip${active === SIN ? " on" : ""}`} onClick={() => setActive(active === SIN ? null : SIN)}>
            <i className="cr-dot" style={{ background: "#94a3b8" }} /> Sin bóveda <b>{countIn(SIN)}</b>
          </button>
        )}
        <button className="cr-chip add" onClick={() => setNewVault({ name: "", color: VAULT_COLORS[(vaults.length) % VAULT_COLORS.length] })}><FolderPlus /> Nueva bóveda</button>
      </div>

      {!vaultCol && !loading && (
        <p className="cr-warn">Las bóvedas se están guardando aparte porque falta la columna <code>vault</code> en <code>credentials</code>. Funciona igual; cuando ejecutéis <code>credenciales_bovedas.sql</code> en Supabase se quedarán en la propia credencial.</p>
      )}

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
          <h3>{query.trim() ? "Sin resultados" : "Bóveda vacía"}</h3>
          <p>{query.trim() ? `Ninguna credencial coincide con «${query.trim()}»${active !== null ? ` en «${active || "Sin bóveda"}»` : ""}.` : `Aún no hay credenciales en «${active || "Sin bóveda"}».`}</p>
          {query.trim()
            ? <button className="btn-secondary" onClick={() => setQuery("")}>Limpiar búsqueda</button>
            : <button className="btn-primary" onClick={openNew}><Plus style={{ width: 16, height: 16 }} /> Nueva credencial aquí</button>}
        </div>
      ) : (
        <div className="cr-groups">
          {groups.map((g) => (
            <section key={g.name || "sin"} className="cr-vault" style={{ ["--vc" as any]: g.color }}>
              <header className="cr-vault-head">
                <span className="cr-vault-ico"><FolderLock /></span>
                <h3>{g.name || "Sin bóveda"}</h3>
                <span className="cr-vault-n">{g.items.length}</span>
              </header>
              <div className="cr-folders">
                {byFolder(g.items).map((f) => (
                  <details key={f.name} className="cr-folder" open={!!query.trim() || g.items.length <= 6}>
                    <summary>
                      {f.logo ? <BrandLogo platform={f.logo} size={26} /> : <span className="cr-folder-ico" style={{ background: f.color }}>{f.name === "Otros" ? "…" : f.name.slice(0, 2)}</span>}
                      <b>{f.name}</b>
                      <span className="cr-vault-n">{f.items.length}</span>
                      <i className="cr-folder-chev" aria-hidden>›</i>
                    </summary>
                    <div className="cr-grid">{f.items.map(renderCard)}</div>
                  </details>
                ))}
              </div>
            </section>
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
                    <div className="eyebrow" style={{ marginBottom: 2 }}>{form.vault.trim() ? `Bóveda · ${form.vault.trim()}` : "Bóveda"}</div>
                    <h3 style={{ fontSize: "1.25rem", fontWeight: 500, letterSpacing: "-0.03em" }}>{editingId ? "Editar Credencial" : "Nueva Credencial"}</h3>
                  </div>
                </div>
                <button type="button" className="icon-btn" onClick={closeModal} aria-label="Cerrar"><X /></button>
              </div>
              <div className="dialog-body">
                <div className="form-group"><label>Bóveda</label>
                  <div className="cr-pick">
                    {allVaults.map((v) => (
                      <button type="button" key={v.name} className={`cr-chip${form.vault === v.name ? " on" : ""}`} style={{ ["--vc" as any]: v.color }} onClick={() => setForm({ ...form, vault: form.vault === v.name ? SIN : v.name })}>
                        <i className="cr-dot" /> {v.name}
                      </button>
                    ))}
                    <input className="cr-pick-new" list="cr-vaults" value={allVaults.some((v) => v.name === form.vault) ? "" : form.vault}
                      onChange={(e) => setForm({ ...form, vault: e.target.value })} placeholder="u otra nueva…" aria-label="Otra bóveda" autoComplete="off" />
                    <datalist id="cr-vaults">{allVaults.map((v) => <option key={v.name} value={v.name} />)}</datalist>
                  </div>
                </div>
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

      {newVault && (
        <Portal>
          <div className="dialog-overlay" onClick={() => setNewVault(null)}>
            <form className="dialog" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()} onSubmit={(e) => { e.preventDefault(); createVault(); }}>
              <div className="dialog-head">
                <div className="cr-dhead">
                  <div className="cr-tile lg" style={{ background: newVault.color }} aria-hidden="true"><FolderLock /></div>
                  <div>
                    <div className="eyebrow" style={{ marginBottom: 2 }}>Minibóveda</div>
                    <h3 style={{ fontSize: "1.25rem", fontWeight: 500, letterSpacing: "-0.03em" }}>Nueva bóveda</h3>
                  </div>
                </div>
                <button type="button" className="icon-btn" onClick={() => setNewVault(null)} aria-label="Cerrar"><X /></button>
              </div>
              <div className="dialog-body">
                <div className="form-group"><label>¿De quién o de qué proyecto?</label>
                  <input autoFocus value={newVault.name} onChange={(e) => setNewVault({ ...newVault, name: e.target.value })} placeholder="Ej: Cliente Palacio, Locodea, Guille…" autoComplete="off" /></div>
                <div className="form-group" style={{ marginBottom: 0 }}><label>Color</label>
                  <div className="cr-swatches">
                    {VAULT_COLORS.map((c) => (
                      <button type="button" key={c} className={`cr-swatch${newVault.color === c ? " on" : ""}`} style={{ background: c }} aria-label={`Color ${c}`} onClick={() => setNewVault({ ...newVault, color: c })} />
                    ))}
                  </div>
                </div>
              </div>
              <div className="dialog-foot">
                <span />
                <div className="flex gap-2">
                  <button type="button" className="btn-secondary" onClick={() => setNewVault(null)}>Cancelar</button>
                  <button type="submit" className="btn-primary" disabled={!newVault.name.trim()}>Crear bóveda</button>
                </div>
              </div>
            </form>
          </div>
        </Portal>
      )}

      <style jsx global>{`
        .cr-chips { display: flex; flex-wrap: wrap; gap: 8px; margin: -0.25rem 0 1.25rem; }
        .cr-chip { --vc: var(--ink); display: inline-flex; align-items: center; gap: 7px; height: 34px; padding: 0 12px; border-radius: 99px; border: 1px solid var(--border-color); background: #fff; color: var(--text-secondary); font: inherit; font-size: 0.8125rem; font-weight: 500; cursor: pointer; transition: var(--transition); white-space: nowrap; }
        .cr-chip b { font-weight: 600; color: var(--text-muted); font-variant-numeric: tabular-nums; }
        .cr-chip:hover { border-color: var(--vc); color: var(--ink); }
        .cr-chip.on { background: var(--vc); border-color: var(--vc); color: #fff; }
        .cr-chip.on b { color: rgba(255,255,255,0.75); }
        .cr-chip.on .cr-dot { background: #fff !important; }
        .cr-chip.add { border-style: dashed; color: var(--text-muted); }
        .cr-chip.add svg { width: 15px; height: 15px; }
        .cr-chip-wrap { --vc: var(--ink); display: inline-flex; align-items: center; gap: 2px; }
        .cr-chip-x { width: 28px; height: 28px; border: 0; border-radius: 99px; background: none; color: var(--text-muted); display: inline-flex; align-items: center; justify-content: center; cursor: pointer; }
        .cr-chip-x:hover { background: var(--bad-soft); color: var(--bad); }
        .cr-chip-x svg { width: 14px; height: 14px; }
        .cr-dot { width: 9px; height: 9px; border-radius: 50%; background: var(--vc); flex-shrink: 0; }
        .cr-warn { font-size: 0.8125rem; color: var(--text-secondary); background: var(--warn-soft); border-radius: 12px; padding: 0.625rem 0.875rem; margin: -0.5rem 0 1.25rem; }

        .cr-groups { display: flex; flex-direction: column; gap: 1.25rem; }
        .cr-vault { border-radius: 22px; padding: 0.875rem; background: color-mix(in srgb, var(--vc) 6%, transparent); border: 1px solid color-mix(in srgb, var(--vc) 18%, transparent); }
        .cr-vault-head { display: flex; align-items: center; gap: 0.625rem; margin: 0 0.25rem 0.75rem; }
        .cr-vault-head h3 { font-size: 1rem; font-weight: 600; letter-spacing: -0.02em; color: var(--ink); }
        .cr-vault-ico { width: 30px; height: 30px; border-radius: 9px; background: var(--vc); color: #fff; display: inline-flex; align-items: center; justify-content: center; }
        .cr-vault-ico svg { width: 16px; height: 16px; }
        .cr-vault-n { font-size: 0.75rem; font-weight: 600; color: var(--vc); background: color-mix(in srgb, var(--vc) 12%, #fff); border-radius: 99px; padding: 2px 8px; }
        .cr-card { box-shadow: inset 3px 0 0 var(--vc), var(--shadow-sm); }

        .cr-pick { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
        .cr-pick .cr-chip { height: 32px; }
        .cr-pick-new { flex: 1; min-width: 130px; height: 32px !important; padding: 0 12px !important; border-radius: 99px !important; font-size: 0.8125rem !important; }
        .cr-swatches { display: flex; flex-wrap: wrap; gap: 8px; }
        .cr-swatch { width: 30px; height: 30px; border-radius: 50%; border: 3px solid #fff; box-shadow: 0 0 0 1px var(--border-color); cursor: pointer; }
        .cr-swatch.on { box-shadow: 0 0 0 2px var(--ink); }
        .cr-folders { display: flex; flex-direction: column; gap: 0.5rem; }
        .cr-folder { border: 1px solid var(--border-color); border-radius: 16px; background: #fff; overflow: hidden; }
        .cr-folder > summary { list-style: none; display: flex; align-items: center; gap: 10px; padding: 0.625rem 0.875rem; cursor: pointer; user-select: none; transition: background .15s; }
        .cr-folder > summary::-webkit-details-marker { display: none; }
        .cr-folder > summary:hover { background: #fafbfd; }
        .cr-folder > summary b { font-size: 0.875rem; font-weight: 600; }
        .cr-folder-ico { width: 26px; height: 26px; border-radius: 8px; color: #fff; font-size: 0.625rem; font-weight: 700; display: inline-flex; align-items: center; justify-content: center; text-transform: uppercase; flex-shrink: 0; }
        .cr-folder-chev { margin-left: auto; font-style: normal; color: var(--text-muted); font-size: 1.1rem; transition: transform .2s; }
        .cr-folder[open] .cr-folder-chev { transform: rotate(90deg); }
        .cr-folder[open] > .cr-grid { padding: 0.25rem 0.875rem 0.875rem; }
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
