// Newsletter «ALDIA Intelligence»: tipos, metas del roadmap y la plantilla del correo.
// La usan el panel (vista previa) y las funciones de Cloudflare (envío), así que aquí no puede haber
// nada del navegador ni alias «@/»: lo que se ve en la vista previa es exactamente lo que llega.

export const NEWSLETTER_NAME = "ALDIA Intelligence";

export type SubscriberStatus = "pendiente" | "activo" | "baja";
export type Subscriber = {
  id: string; email: string; name?: string | null; source?: string | null; status: SubscriberStatus;
  consent_text?: string | null; consent_at?: string | null; confirmed_at?: string | null; unsubscribed_at?: string | null; created_at: string;
};

export type ItemKind = "noticia" | "automatizacion" | "herramienta" | "caso" | "recurso" | "texto";
export type EditionItem = { kind: ItemKind; title: string; body: string; url?: string; source?: string };
export type EditionCta = { text?: string; label?: string; url?: string };
export type Edition = {
  id?: string; number?: number | null; subject: string; preheader?: string | null; intro?: string | null;
  items: EditionItem[]; cta?: EditionCta | null; status: "borrador" | "enviando" | "enviada";
  planned_for?: string | null; sent_at?: string | null; recipients?: number; created_at?: string; updated_at?: string;
};

export const ITEM_KINDS: Record<ItemKind, { label: string; hint: string }> = {
  noticia: { label: "Noticia IA", hint: "Qué ha pasado y qué cambia para una pyme. Siempre con fuente." },
  automatizacion: { label: "Automatización de la semana", hint: "Un proceso concreto, antes y después, y cómo copiarlo." },
  herramienta: { label: "Herramienta", hint: "Una herramienta útil, para qué sirve y cuánto cuesta." },
  caso: { label: "Caso real", hint: "Datos reales y con permiso del cliente." },
  recurso: { label: "Recurso gratis", hint: "Plantilla, checklist o guía descargable." },
  texto: { label: "Nota", hint: "Texto libre." },
};

export const DEFAULT_CTA: EditionCta = {
  text: "¿Quieres saber qué podrías automatizar en tu empresa? Te lo decimos en 30 minutos, sin compromiso.",
  label: "Pedir diagnóstico gratis",
  url: "https://aldiaproject.es",
};

export const blankEdition = (number: number): Edition => ({
  number, subject: "", preheader: "", intro: "", status: "borrador", cta: { ...DEFAULT_CTA },
  items: [
    { kind: "noticia", title: "", body: "", url: "", source: "" },
    { kind: "automatizacion", title: "", body: "" },
    { kind: "herramienta", title: "", body: "", url: "" },
  ],
});

// ---------- metas y cadencia del roadmap ----------
/** S1 empieza el lunes 9-11-2026. Quincenal hasta S4, semanal desde S5. Se envía el viernes. */
export const ROADMAP_S1 = "2026-11-09";
export const NEWSLETTER_GOALS = [
  { week: 4, until: "2026-12-06", target: 50 },
  { week: 8, until: "2027-01-03", target: 150 },
  { week: 12, until: "2027-01-31", target: 300 },
];
export const goalFor = (day: string) => NEWSLETTER_GOALS.find((g) => day <= g.until) || NEWSLETTER_GOALS[NEWSLETTER_GOALS.length - 1];
export const cadenceFor = (day: string) => (day <= "2026-12-06" ? "quincenal" : "semanal");

// ---------- formato del texto: **negrita**, [enlace](https://…), listas con «- » y párrafos ----------
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const safeUrl = (u?: string) => (u && /^(https?:\/\/|mailto:)/i.test(u.trim()) ? u.trim() : "");

const FONT = "Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";
const C = { ink: "#0A0A0A", text: "#3F3F46", muted: "#71717A", line: "#E4E4E7", soft: "#F4F4F5", accent: "#00FF88" };

function inline(s: string) {
  return esc(s)
    .replace(/\*\*(.+?)\*\*/g, `<strong style="color:${C.ink}">$1</strong>`)
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, t, u) => {
      const url = safeUrl(u.replace(/&amp;/g, "&"));
      return url ? `<a href="${esc(url)}" style="color:${C.ink};text-decoration:underline">${t}</a>` : t;
    });
}

export function richText(src: string, size = 16) {
  const p = `margin:0 0 14px;font-family:${FONT};font-size:${size}px;line-height:1.6;color:${C.text}`;
  return (src || "").trim().split(/\n\s*\n/).filter(Boolean).map((block) => {
    const lines = block.split("\n");
    if (lines.every((l) => /^\s*[-•]\s+/.test(l))) {
      return `<ul style="${p};padding-left:20px">${lines.map((l) => `<li style="margin:0 0 6px">${inline(l.replace(/^\s*[-•]\s+/, ""))}</li>`).join("")}</ul>`;
    }
    return `<p style="${p}">${lines.map(inline).join("<br>")}</p>`;
  }).join("");
}

const plain = (s: string) => (s || "").replace(/\*\*(.+?)\*\*/g, "$1").replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, "$1 ($2)").trim();

const longDate = (iso?: string | null) => {
  const d = iso ? new Date(iso) : new Date();
  return d.toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Madrid" });
};

export type RenderOptions = { unsubscribeUrl: string; webUrl?: string; name?: string | null };

/** El correo en HTML (tablas y estilos en línea, como lo necesitan Gmail y Outlook). */
export function renderEmailHtml(e: Edition, o: RenderOptions) {
  const items = (e.items || []).filter((i) => i.title?.trim() || i.body?.trim());
  const cta = e.cta && (e.cta.label || e.cta.text) ? e.cta : null;
  const ctaUrl = safeUrl(cta?.url);
  const greeting = o.name ? `Hola, ${esc(o.name.split(" ")[0])}:` : "";

  const blocks = items.map((it, i) => {
    const url = safeUrl(it.url);
    return `
      <tr><td style="padding:${i === 0 ? "8px" : "28px"} 40px 0">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
          <td style="width:18px;height:3px;background:${C.accent};font-size:0;line-height:0">&nbsp;</td>
          <td style="padding-left:10px;font-family:${FONT};font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${C.muted}">${esc(ITEM_KINDS[it.kind]?.label || "")}</td>
        </tr></table>
        ${it.title?.trim() ? `<h2 style="margin:10px 0 10px;font-family:${FONT};font-size:21px;line-height:1.3;font-weight:800;letter-spacing:-0.02em;color:${C.ink}">${esc(it.title)}</h2>` : ""}
        ${richText(it.body)}
        ${url ? `<p style="margin:0;font-family:${FONT};font-size:14px"><a href="${esc(url)}" style="color:${C.ink};font-weight:600;text-decoration:underline">${it.kind === "noticia" ? "Leer la fuente" : it.kind === "recurso" ? "Descargar" : "Ver más"} →</a>${it.source ? `<span style="color:${C.muted}"> · ${esc(it.source)}</span>` : ""}</p>` : it.source ? `<p style="margin:0;font-family:${FONT};font-size:13px;color:${C.muted}">Fuente: ${esc(it.source)}</p>` : ""}
      </td></tr>
      ${i < items.length - 1 ? `<tr><td style="padding:28px 40px 0"><div style="height:1px;background:${C.line};font-size:0;line-height:0">&nbsp;</div></td></tr>` : ""}`;
  }).join("");

  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only"><title>${esc(e.subject || NEWSLETTER_NAME)}</title></head>
<body style="margin:0;padding:0;background:${C.soft}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(e.preheader || "")}&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.soft}"><tr><td align="center" style="padding:32px 12px">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#FFFFFF;border:1px solid ${C.line};border-radius:16px">
    <tr><td style="padding:32px 40px 0">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td style="font-family:${FONT};font-size:22px;font-weight:800;letter-spacing:-0.04em;color:${C.ink}">aldia<span style="color:${C.accent}">.</span></td>
        <td align="right" style="font-family:${FONT};font-size:12px;color:${C.muted}">${e.number ? `Nº ${e.number} · ` : ""}${longDate(e.sent_at)}</td>
      </tr></table>
      <div style="margin-top:20px;font-family:${FONT};font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:${C.muted}">${NEWSLETTER_NAME}</div>
      <h1 style="margin:8px 0 18px;font-family:${FONT};font-size:28px;line-height:1.2;font-weight:800;letter-spacing:-0.03em;color:${C.ink}">${esc(e.subject || "Sin asunto")}</h1>
      ${greeting ? `<p style="margin:0 0 14px;font-family:${FONT};font-size:16px;line-height:1.6;color:${C.text}">${greeting}</p>` : ""}
      ${richText(e.intro || "")}
    </td></tr>
    ${blocks}
    ${cta ? `
    <tr><td style="padding:32px 40px 0">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.ink};border-radius:12px"><tr><td style="padding:28px">
        ${cta.text ? `<p style="margin:0 0 18px;font-family:${FONT};font-size:17px;line-height:1.5;font-weight:600;color:#FFFFFF">${esc(cta.text)}</p>` : ""}
        ${cta.label && ctaUrl ? `<a href="${esc(ctaUrl)}" style="display:inline-block;background:${C.accent};color:${C.ink};font-family:${FONT};font-size:15px;font-weight:700;text-decoration:none;padding:12px 22px;border-radius:999px">${esc(cta.label)} →</a>` : ""}
      </td></tr></table>
    </td></tr>` : ""}
    <tr><td style="padding:32px 40px 32px">
      <p style="margin:0;font-family:${FONT};font-size:14px;line-height:1.6;color:${C.text}">Hasta la próxima,<br><strong style="color:${C.ink}">Guille y Millán · ALDIA Project</strong></p>
    </td></tr>
  </table>
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px"><tr><td style="padding:20px 40px;font-family:${FONT};font-size:12px;line-height:1.6;color:${C.muted};text-align:center">
    Recibes ${NEWSLETTER_NAME} porque te suscribiste en ALDIA Project. Puedes responder a este correo: lo leemos.<br>
    ${o.webUrl ? `<a href="${esc(o.webUrl)}" style="color:${C.muted}">Ver en el navegador</a> · ` : ""}<a href="${esc(o.unsubscribeUrl)}" style="color:${C.muted}">Darme de baja</a><br>
    ALDIA Project · Automatiza hoy. Lidera mañana. · <a href="https://aldiaproject.es" style="color:${C.muted}">aldiaproject.es</a>
  </td></tr></table>
</td></tr></table>
</body></html>`;
}

/** Versión en texto plano (mejora la entrega y la leen algunos clientes de correo). */
export function renderEmailText(e: Edition, o: RenderOptions) {
  const items = (e.items || []).filter((i) => i.title?.trim() || i.body?.trim());
  const parts = [
    `${NEWSLETTER_NAME}${e.number ? ` · Nº ${e.number}` : ""}`, "", (e.subject || "").toUpperCase(), "",
    ...(o.name ? [`Hola, ${o.name.split(" ")[0]}:`, ""] : []),
    plain(e.intro || ""), "",
    ...items.flatMap((it) => [`— ${ITEM_KINDS[it.kind]?.label || ""} —`, it.title, "", plain(it.body), ...(safeUrl(it.url) ? [safeUrl(it.url)] : []), ""]),
    ...(e.cta?.text || e.cta?.label ? [plain(e.cta.text || ""), ...(safeUrl(e.cta.url) ? [`${e.cta.label || "Más información"}: ${safeUrl(e.cta.url)}`] : []), ""] : []),
    "Hasta la próxima,", "Guille y Millán · ALDIA Project", "",
    `Darte de baja: ${o.unsubscribeUrl}`,
  ];
  return parts.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

/** Correo de confirmación del alta (doble opt-in). */
export function renderConfirmHtml(confirmUrl: string, name?: string | null) {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:${C.soft}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" style="padding:32px 12px">
  <table role="presentation" width="520" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:520px;background:#FFFFFF;border:1px solid ${C.line};border-radius:16px"><tr><td style="padding:36px 40px">
    <div style="font-family:${FONT};font-size:22px;font-weight:800;letter-spacing:-0.04em;color:${C.ink}">aldia<span style="color:${C.accent}">.</span></div>
    <h1 style="margin:24px 0 12px;font-family:${FONT};font-size:24px;line-height:1.25;font-weight:800;letter-spacing:-0.03em;color:${C.ink}">Confirma tu suscripción</h1>
    <p style="margin:0 0 22px;font-family:${FONT};font-size:16px;line-height:1.6;color:${C.text}">${name ? `Hola, ${esc(name.split(" ")[0])}. ` : ""}Solo falta un clic para recibir ${NEWSLETTER_NAME}: lo que de verdad importa de la IA y la automatización para tu empresa, explicado en 5 minutos.</p>
    <a href="${esc(confirmUrl)}" style="display:inline-block;background:${C.ink};color:#FFFFFF;font-family:${FONT};font-size:15px;font-weight:700;text-decoration:none;padding:13px 24px;border-radius:999px">Sí, quiero recibirla</a>
    <p style="margin:24px 0 0;font-family:${FONT};font-size:13px;line-height:1.6;color:${C.muted}">Si no te has suscrito tú, ignora este correo: no te enviaremos nada más.</p>
  </td></tr></table>
</td></tr></table></body></html>`;
}

export const CONSENT_TEXT = "Acepto recibir la newsletter ALDIA Intelligence de ALDIA Project. Puedo darme de baja en cualquier momento desde cada correo.";
