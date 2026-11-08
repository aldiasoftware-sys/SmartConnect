"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// vercel-api/newsletter/send.ts
var send_exports = {};
__export(send_exports, {
  POST: () => POST
});
module.exports = __toCommonJS(send_exports);

// lib/newsletter.ts
var NEWSLETTER_NAME = "ALDIA Intelligence";
var ITEM_KINDS = {
  noticia: { label: "Noticia IA", hint: "Qu\xE9 ha pasado y qu\xE9 cambia para una pyme. Siempre con fuente." },
  automatizacion: { label: "Automatizaci\xF3n de la semana", hint: "Un proceso concreto, antes y despu\xE9s, y c\xF3mo copiarlo." },
  herramienta: { label: "Herramienta", hint: "Una herramienta \xFAtil, para qu\xE9 sirve y cu\xE1nto cuesta." },
  caso: { label: "Caso real", hint: "Datos reales y con permiso del cliente." },
  recurso: { label: "Recurso gratis", hint: "Plantilla, checklist o gu\xEDa descargable." },
  texto: { label: "Nota", hint: "Texto libre." }
};
var esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
var safeUrl = (u) => u && /^(https?:\/\/|mailto:)/i.test(u.trim()) ? u.trim() : "";
var FONT = "Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";
var C = { ink: "#0A0A0A", text: "#3F3F46", muted: "#71717A", line: "#E4E4E7", soft: "#F4F4F5", accent: "#00FF88" };
function inline(s) {
  return esc(s).replace(/\*\*(.+?)\*\*/g, `<strong style="color:${C.ink}">$1</strong>`).replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, t, u) => {
    const url = safeUrl(u.replace(/&amp;/g, "&"));
    return url ? `<a href="${esc(url)}" style="color:${C.ink};text-decoration:underline">${t}</a>` : t;
  });
}
function richText(src, size = 16) {
  const p = `margin:0 0 14px;font-family:${FONT};font-size:${size}px;line-height:1.6;color:${C.text}`;
  return (src || "").trim().split(/\n\s*\n/).filter(Boolean).map((block) => {
    const lines = block.split("\n");
    if (lines.every((l) => /^\s*[-•]\s+/.test(l))) {
      return `<ul style="${p};padding-left:20px">${lines.map((l) => `<li style="margin:0 0 6px">${inline(l.replace(/^\s*[-•]\s+/, ""))}</li>`).join("")}</ul>`;
    }
    return `<p style="${p}">${lines.map(inline).join("<br>")}</p>`;
  }).join("");
}
var plain = (s) => (s || "").replace(/\*\*(.+?)\*\*/g, "$1").replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, "$1 ($2)").trim();
var longDate = (iso) => {
  const d = iso ? new Date(iso) : /* @__PURE__ */ new Date();
  return d.toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Madrid" });
};
function renderEmailHtml(e, o) {
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
        ${url ? `<p style="margin:0;font-family:${FONT};font-size:14px"><a href="${esc(url)}" style="color:${C.ink};font-weight:600;text-decoration:underline">${it.kind === "noticia" ? "Leer la fuente" : it.kind === "recurso" ? "Descargar" : "Ver m\xE1s"} \u2192</a>${it.source ? `<span style="color:${C.muted}"> \xB7 ${esc(it.source)}</span>` : ""}</p>` : it.source ? `<p style="margin:0;font-family:${FONT};font-size:13px;color:${C.muted}">Fuente: ${esc(it.source)}</p>` : ""}
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
        <td align="right" style="font-family:${FONT};font-size:12px;color:${C.muted}">${e.number ? `N\xBA ${e.number} \xB7 ` : ""}${longDate(e.sent_at)}</td>
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
        ${cta.label && ctaUrl ? `<a href="${esc(ctaUrl)}" style="display:inline-block;background:${C.accent};color:${C.ink};font-family:${FONT};font-size:15px;font-weight:700;text-decoration:none;padding:12px 22px;border-radius:999px">${esc(cta.label)} \u2192</a>` : ""}
      </td></tr></table>
    </td></tr>` : ""}
    <tr><td style="padding:32px 40px 32px">
      <p style="margin:0;font-family:${FONT};font-size:14px;line-height:1.6;color:${C.text}">Hasta la pr\xF3xima,<br><strong style="color:${C.ink}">Guille y Mill\xE1n \xB7 ALDIA Project</strong></p>
    </td></tr>
  </table>
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px"><tr><td style="padding:20px 40px;font-family:${FONT};font-size:12px;line-height:1.6;color:${C.muted};text-align:center">
    Recibes ${NEWSLETTER_NAME} porque te suscribiste en ALDIA Project. Puedes responder a este correo: lo leemos.<br>
    ${o.webUrl ? `<a href="${esc(o.webUrl)}" style="color:${C.muted}">Ver en el navegador</a> \xB7 ` : ""}<a href="${esc(o.unsubscribeUrl)}" style="color:${C.muted}">Darme de baja</a><br>
    ALDIA Project \xB7 Automatiza hoy. Lidera ma\xF1ana. \xB7 <a href="https://aldiaproject.es" style="color:${C.muted}">aldiaproject.es</a>
  </td></tr></table>
</td></tr></table>
</body></html>`;
}
function renderEmailText(e, o) {
  const items = (e.items || []).filter((i) => i.title?.trim() || i.body?.trim());
  const parts = [
    `${NEWSLETTER_NAME}${e.number ? ` \xB7 N\xBA ${e.number}` : ""}`,
    "",
    (e.subject || "").toUpperCase(),
    "",
    ...o.name ? [`Hola, ${o.name.split(" ")[0]}:`, ""] : [],
    plain(e.intro || ""),
    "",
    ...items.flatMap((it) => [`\u2014 ${ITEM_KINDS[it.kind]?.label || ""} \u2014`, it.title, "", plain(it.body), ...safeUrl(it.url) ? [safeUrl(it.url)] : [], ""]),
    ...e.cta?.text || e.cta?.label ? [plain(e.cta.text || ""), ...safeUrl(e.cta.url) ? [`${e.cta.label || "M\xE1s informaci\xF3n"}: ${safeUrl(e.cta.url)}`] : [], ""] : [],
    "Hasta la pr\xF3xima,",
    "Guille y Mill\xE1n \xB7 ALDIA Project",
    "",
    `Darte de baja: ${o.unsubscribeUrl}`
  ];
  return parts.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

// lib/server/nl.ts
var FROM_FALLBACK = "ALDIA Intelligence <onboarding@resend.dev>";
var json = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers } });
var site = (ctx) => (ctx.env.NEWSLETTER_SITE || new URL(ctx.request.url).origin).replace(/\/$/, "");
function adminHeaders(env2) {
  const key = env2.SUPABASE_SERVICE_ROLE_KEY || "";
  return key.startsWith("sb_") ? { apikey: key } : { apikey: key, authorization: `Bearer ${key}` };
}
async function db(env2, path, init = {}) {
  const res = await fetch(`${env2.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/${path}`, {
    method: init.method || "GET",
    headers: { ...adminHeaders(env2), "content-type": "application/json", ...init.prefer ? { prefer: init.prefer } : {} },
    body: init.body === void 0 ? void 0 : JSON.stringify(init.body)
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
}
async function teamUser(ctx) {
  const auth = ctx.request.headers.get("authorization") || "";
  if (!/^Bearer\s+\S+/.test(auth)) return null;
  const { NEXT_PUBLIC_SUPABASE_URL: url, NEXT_PUBLIC_SUPABASE_ANON_KEY: anon } = ctx.env;
  const [isTeam, user] = await Promise.all([
    fetch(`${url}/rest/v1/rpc/is_team`, { method: "POST", headers: { apikey: anon, authorization: auth, "content-type": "application/json" }, body: "{}" }),
    fetch(`${url}/auth/v1/user`, { headers: { apikey: anon, authorization: auth } })
  ]);
  if (!isTeam.ok || !user.ok || await isTeam.json() !== true) return null;
  return (await user.json()).email || null;
}
var mailBody = (env2, m) => ({
  from: env2.NEWSLETTER_FROM || FROM_FALLBACK,
  to: [m.to],
  subject: m.subject,
  html: m.html,
  text: m.text,
  ...env2.NEWSLETTER_REPLY_TO ? { reply_to: env2.NEWSLETTER_REPLY_TO } : {},
  ...m.headers ? { headers: m.headers } : {}
});
async function resend(env2, path, body) {
  const res = await fetch(`https://api.resend.com${path}`, {
    method: "POST",
    headers: { authorization: `Bearer ${env2.RESEND_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.message || `Resend ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return data;
}
var sendMail = (env2, m) => resend(env2, "/emails", mailBody(env2, m));
async function sendBatch(env2, mails) {
  const data = await resend(env2, "/emails/batch", mails.map((m) => mailBody(env2, m)));
  return (data?.data || []).map((d) => d.id);
}

// functions/api/newsletter/send.ts
var UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
var BATCH = 100;
var MAX_BATCHES = 10;
async function onRequestPost(ctx) {
  const { env: env2 } = ctx;
  const me = await teamUser(ctx);
  if (!me) return json({ ok: false, error: "Solo para el equipo" }, 401);
  if (!env2.SUPABASE_SERVICE_ROLE_KEY || !env2.RESEND_API_KEY) return json({ ok: false, error: "Faltan RESEND_API_KEY o SUPABASE_SERVICE_ROLE_KEY en Cloudflare Pages" }, 503);
  const { edition_id, test } = await ctx.request.json().catch(() => ({}));
  if (!edition_id || !UUID.test(edition_id)) return json({ ok: false, error: "Falta la edici\xF3n" }, 400);
  const [edition] = await db(env2, `newsletter_editions?id=eq.${edition_id}`);
  if (!edition) return json({ ok: false, error: "No existe esa edici\xF3n" }, 404);
  if (!edition.subject?.trim()) return json({ ok: false, error: "La edici\xF3n no tiene asunto" }, 400);
  const base = site(ctx);
  try {
    if (test) {
      const unsub = `${base}/n?estado=prueba`;
      await sendMail(env2, { to: me, subject: `[Prueba] ${edition.subject}`, html: renderEmailHtml(edition, { unsubscribeUrl: unsub }), text: renderEmailText(edition, { unsubscribeUrl: unsub }) });
      return json({ ok: true, test: true, to: me });
    }
    if (edition.status === "enviada") return json({ ok: false, error: "Esta edici\xF3n ya se envi\xF3" }, 409);
    if (edition.status === "borrador") {
      await db(env2, `newsletter_editions?id=eq.${edition_id}`, { method: "PATCH", body: { status: "enviando", sent_at: (/* @__PURE__ */ new Date()).toISOString(), updated_at: (/* @__PURE__ */ new Date()).toISOString() } });
      edition.sent_at = (/* @__PURE__ */ new Date()).toISOString();
    }
    const subs = await db(env2, "newsletter_subscribers?select=id,email,name,token&status=eq.activo&order=created_at");
    const sent = new Set((await db(env2, `newsletter_sends?select=subscriber_id&edition_id=eq.${edition_id}`)).map((s) => s.subscriber_id));
    const queue = subs.filter((s) => !sent.has(s.id));
    let done = 0, error = null;
    for (let b = 0; b < MAX_BATCHES && done < queue.length; b++) {
      const chunk = queue.slice(done, done + BATCH);
      const mails = chunk.map((s) => {
        const unsub = `${base}/api/newsletter/baja?t=${s.token}`;
        return {
          to: s.email,
          subject: edition.subject,
          html: renderEmailHtml(edition, { unsubscribeUrl: unsub, name: s.name }),
          text: renderEmailText(edition, { unsubscribeUrl: unsub, name: s.name }),
          headers: { "List-Unsubscribe": `<${unsub}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" }
        };
      });
      try {
        const ids = await sendBatch(env2, mails);
        await db(env2, "newsletter_sends", { method: "POST", body: chunk.map((s, i) => ({ edition_id, subscriber_id: s.id, resend_id: ids[i] || null })), prefer: "resolution=ignore-duplicates" });
        done += chunk.length;
      } catch (e) {
        error = e?.status === 429 ? "Resend ha llegado a su l\xEDmite (en el plan gratis, 100 correos al d\xEDa). Pulsa \xABContinuar env\xEDo\xBB ma\xF1ana o sube de plan." : e?.message || "Error al enviar";
        break;
      }
    }
    const total = sent.size + done, remaining = queue.length - done;
    if (!remaining) await db(env2, `newsletter_editions?id=eq.${edition_id}`, { method: "PATCH", body: { status: "enviada", recipients: total, updated_at: (/* @__PURE__ */ new Date()).toISOString() } });
    else await db(env2, `newsletter_editions?id=eq.${edition_id}`, { method: "PATCH", body: { recipients: total, updated_at: (/* @__PURE__ */ new Date()).toISOString() } });
    return json({ ok: !error, sent: done, total, remaining, error }, error && !done ? 502 : 200);
  } catch (e) {
    console.error("newsletter/send", e?.message || e);
    return json({ ok: false, error: e?.message || "Error al enviar" }, 500);
  }
}

// vercel-api/newsletter/send.ts
var env = () => process.env;
var POST = (request) => onRequestPost({ request, env: env() });
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  POST
});
