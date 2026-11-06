"use client";

import { useEffect, useState } from "react";
import { CONSENT_TEXT, NEWSLETTER_NAME } from "@/lib/newsletter";

// Página pública de ALDIA Intelligence: alta (con ?src=PALABRA para saber de dónde viene cada suscriptor),
// mensajes tras confirmar y la baja (?baja=<token>). Estilo de aldiaproject.es, no el del panel.
type View = "form" | "revisa" | "confirmado" | "error" | "prueba" | "baja" | "baja-hecha";

const MSG: Record<Exclude<View, "form" | "baja">, { t: string; p: string }> = {
  revisa: { t: "Revisa tu correo", p: "Te hemos enviado un enlace para confirmar la suscripción. Si no lo ves en unos minutos, mira en promociones o spam." },
  confirmado: { t: "¡Ya estás dentro!", p: `Recibirás ${NEWSLETTER_NAME} en tu correo. Si algún día deja de aportarte, te das de baja con un clic desde cualquier correo.` },
  error: { t: "Algo no ha ido bien", p: "El enlace no es válido o ha caducado. Vuelve a apuntarte y te enviamos uno nuevo." },
  prueba: { t: "Esto era una prueba", p: "El enlace de baja de los correos de prueba no da de baja a nadie." },
  "baja-hecha": { t: "Te hemos dado de baja", p: "No volverás a recibir la newsletter. Si cambias de idea, puedes volver a apuntarte cuando quieras." },
};

export default function NewsletterPublicPage() {
  const [view, setView] = useState<View>("form");
  const [token, setToken] = useState("");
  const [source, setSource] = useState("web");
  const [form, setForm] = useState({ name: "", email: "", website: "", consent: false });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const estado = q.get("estado") as View | null;
    if (q.get("baja")) { setToken(q.get("baja")!); setView("baja"); }
    else if (estado && estado in MSG) setView(estado);
    const src = (q.get("src") || "").trim().slice(0, 40);
    if (src) setSource(src);
  }, []);

  async function subscribe(e: React.FormEvent) {
    e.preventDefault(); setErr("");
    if (!form.consent) { setErr("Marca la casilla para poder enviarte la newsletter."); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/newsletter/subscribe", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: form.name, email: form.email, website: form.website, source }) });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) setView("revisa"); else setErr(data.error || "No hemos podido apuntarte ahora. Prueba en unos minutos.");
    } catch { setErr("Sin conexión. Prueba otra vez."); }
    setBusy(false);
  }

  async function unsubscribe() {
    setBusy(true); setErr("");
    try {
      const res = await fetch(`/api/newsletter/baja?t=${encodeURIComponent(token)}`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) setView("baja-hecha"); else setErr(data.error || "No hemos podido darte de baja.");
    } catch { setErr("Sin conexión. Prueba otra vez."); }
    setBusy(false);
  }

  return (
    <div className="nl-pub">
      <style>{CSS}</style>
      <div className="nl-wrap">
        <a className="nl-logo" href="https://aldiaproject.es">aldia<span>.</span></a>

        {view === "form" && (
          <>
            <div className="nl-eyebrow">Newsletter gratuita</div>
            <h1>{NEWSLETTER_NAME}</h1>
            <p className="nl-lead">Lo que de verdad importa de la IA y la automatización para tu empresa, en 5 minutos. Sin humo y con ejemplos que puedes copiar.</p>
            <ul className="nl-list">
              <li><b>Una noticia de IA explicada</b> y qué cambia para una pyme.</li>
              <li><b>Una automatización</b> de un proceso real, paso a paso.</li>
              <li><b>Una herramienta o un caso real</b>, con números.</li>
            </ul>
            <form onSubmit={subscribe} className="nl-form">
              <input aria-label="Tu nombre" placeholder="Tu nombre (opcional)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoComplete="given-name" />
              <input aria-label="Tu email" type="email" required placeholder="tu@empresa.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} autoComplete="email" />
              <input className="nl-hp" tabIndex={-1} autoComplete="off" aria-hidden="true" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} name="website" />
              <label className="nl-consent">
                <input type="checkbox" checked={form.consent} onChange={(e) => setForm({ ...form, consent: e.target.checked })} />
                <span>{CONSENT_TEXT}</span>
              </label>
              <button type="submit" disabled={busy}>{busy ? "Apuntándote…" : "Quiero recibirla"}</button>
              {err && <p className="nl-err">{err}</p>}
            </form>
            <p className="nl-legal">Responsable: ALDIA Project. Finalidad: enviarte la newsletter. Base: tu consentimiento. Tus datos no se ceden a nadie; el envío se hace con Resend. Puedes acceder, rectificar o suprimir tus datos respondiendo a cualquier correo.</p>
          </>
        )}

        {view === "baja" && (
          <>
            <h1>¿Darte de baja?</h1>
            <p className="nl-lead">Dejarás de recibir {NEWSLETTER_NAME}. Puedes volver cuando quieras.</p>
            <div className="nl-form"><button onClick={unsubscribe} disabled={busy}>{busy ? "Un momento…" : "Sí, darme de baja"}</button>{err && <p className="nl-err">{err}</p>}</div>
          </>
        )}

        {view in MSG && (
          <>
            <h1>{MSG[view as keyof typeof MSG].t}</h1>
            <p className="nl-lead">{MSG[view as keyof typeof MSG].p}</p>
            {(view === "error" || view === "baja-hecha") && <button className="nl-ghost" onClick={() => { window.history.replaceState(null, "", "/n"); setView("form"); }}>Apuntarme</button>}
            {view === "confirmado" && <a className="nl-ghost" href="https://aldiaproject.es">Ir a aldiaproject.es →</a>}
          </>
        )}

        <footer>ALDIA Project · Automatiza hoy. Lidera mañana.</footer>
      </div>
    </div>
  );
}

const CSS = `
.nl-pub{position:fixed;inset:0;overflow:auto;z-index:50;background:#fff;color:#0a0a0a;font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;
  background-image:radial-gradient(60% 50% at 85% 0%,rgba(0,255,136,.14),transparent 70%),linear-gradient(#f4f4f5 1px,transparent 1px),linear-gradient(90deg,#f4f4f5 1px,transparent 1px);
  background-size:auto,48px 48px,48px 48px}
.nl-wrap{max-width:560px;margin:0 auto;padding:48px 20px 40px;min-height:100%;display:flex;flex-direction:column}
.nl-logo{font-size:28px;font-weight:800;letter-spacing:-.05em;color:#0a0a0a;text-decoration:none;margin-bottom:56px}
.nl-logo span{color:#00ff88}
.nl-eyebrow{font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#71717a;margin-bottom:12px}
.nl-pub h1{font-size:clamp(34px,7vw,48px);line-height:1.05;font-weight:800;letter-spacing:-.04em;margin:0 0 16px}
.nl-lead{font-size:18px;line-height:1.55;color:#3f3f46;margin:0 0 24px}
.nl-list{list-style:none;padding:0;margin:0 0 28px;display:grid;gap:10px}
.nl-list li{position:relative;padding-left:26px;font-size:16px;line-height:1.5;color:#3f3f46}
.nl-list li:before{content:"";position:absolute;left:0;top:10px;width:14px;height:3px;background:#00ff88;border-radius:2px}
.nl-list b{color:#0a0a0a;font-weight:600}
.nl-form{display:grid;gap:10px}
.nl-form input:not([type=checkbox]){height:52px;border:1px solid #e4e4e7;border-radius:12px;padding:0 16px;font:inherit;font-size:16px;background:#fff;color:#0a0a0a;outline:none;transition:border-color .15s}
.nl-form input:focus{border-color:#0a0a0a}
.nl-hp{position:absolute!important;left:-9999px;width:1px;height:1px;opacity:0}
.nl-consent{display:flex;gap:10px;align-items:flex-start;font-size:13px;line-height:1.5;font-weight:400;color:#52525b;margin:4px 0;cursor:pointer}
.nl-consent input{appearance:auto;-webkit-appearance:checkbox;margin:2px 0 0;padding:0;border:0;width:16px;height:16px;accent-color:#0a0a0a;flex:none}
.nl-form button,.nl-ghost{height:52px;border:0;border-radius:999px;background:#0a0a0a;color:#fff;font:inherit;font-size:16px;font-weight:700;cursor:pointer;transition:transform .15s,opacity .15s}
.nl-form button:hover{transform:translateY(-1px)}
.nl-form button:disabled{opacity:.6;cursor:default;transform:none}
.nl-ghost{display:inline-flex;align-items:center;justify-content:center;padding:0 26px;text-decoration:none;align-self:flex-start;background:#fff;color:#0a0a0a;border:1px solid #0a0a0a}
.nl-err{color:#dc2626;font-size:14px;margin:4px 0 0}
.nl-legal{font-size:12px;line-height:1.55;color:#a1a1aa;margin:20px 0 0}
.nl-pub footer{margin-top:auto;padding-top:56px;font-size:13px;color:#a1a1aa}
`;
