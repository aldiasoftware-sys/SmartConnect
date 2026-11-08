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

// vercel-api/newsletter/subscribe.ts
var subscribe_exports = {};
__export(subscribe_exports, {
  OPTIONS: () => OPTIONS,
  POST: () => POST
});
module.exports = __toCommonJS(subscribe_exports);

// lib/newsletter.ts
var NEWSLETTER_NAME = "ALDIA Intelligence";
var esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
var FONT = "Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";
var C = { ink: "#0A0A0A", text: "#3F3F46", muted: "#71717A", line: "#E4E4E7", soft: "#F4F4F5", accent: "#00FF88" };
function renderConfirmHtml(confirmUrl, name) {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:${C.soft}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" style="padding:32px 12px">
  <table role="presentation" width="520" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:520px;background:#FFFFFF;border:1px solid ${C.line};border-radius:16px"><tr><td style="padding:36px 40px">
    <div style="font-family:${FONT};font-size:22px;font-weight:800;letter-spacing:-0.04em;color:${C.ink}">aldia<span style="color:${C.accent}">.</span></div>
    <h1 style="margin:24px 0 12px;font-family:${FONT};font-size:24px;line-height:1.25;font-weight:800;letter-spacing:-0.03em;color:${C.ink}">Confirma tu suscripci\xF3n</h1>
    <p style="margin:0 0 22px;font-family:${FONT};font-size:16px;line-height:1.6;color:${C.text}">${name ? `Hola, ${esc(name.split(" ")[0])}. ` : ""}Solo falta un clic para recibir ${NEWSLETTER_NAME}: lo que de verdad importa de la IA y la automatizaci\xF3n para tu empresa, explicado en 5 minutos.</p>
    <a href="${esc(confirmUrl)}" style="display:inline-block;background:${C.ink};color:#FFFFFF;font-family:${FONT};font-size:15px;font-weight:700;text-decoration:none;padding:13px 24px;border-radius:999px">S\xED, quiero recibirla</a>
    <p style="margin:24px 0 0;font-family:${FONT};font-size:13px;line-height:1.6;color:${C.muted}">Si no te has suscrito t\xFA, ignora este correo: no te enviaremos nada m\xE1s.</p>
  </td></tr></table>
</td></tr></table></body></html>`;
}
var CONSENT_TEXT = "Acepto recibir la newsletter ALDIA Intelligence de ALDIA Project. Puedo darme de baja en cualquier momento desde cada correo.";

// lib/server/nl.ts
var FROM_FALLBACK = "ALDIA Intelligence <onboarding@resend.dev>";
var json = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers } });
var site = (ctx) => (ctx.env.NEWSLETTER_SITE || new URL(ctx.request.url).origin).replace(/\/$/, "");
function cors(ctx) {
  const origin = ctx.request.headers.get("origin");
  if (!origin) return {};
  const allowed = [new URL(ctx.request.url).origin, ...(ctx.env.NEWSLETTER_ORIGINS || "").split(",").map((s) => s.trim().replace(/\/$/, "")).filter(Boolean)];
  return allowed.includes(origin) ? { "access-control-allow-origin": origin, "access-control-allow-methods": "POST, OPTIONS", "access-control-allow-headers": "content-type, authorization", vary: "origin" } : {};
}
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
var EMAIL_RE = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[a-z]{2,}$/i;

// functions/api/newsletter/subscribe.ts
var onRequestOptions = (ctx) => new Response(null, { status: 204, headers: cors(ctx) });
async function onRequestPost(ctx) {
  const { request, env: env2 } = ctx;
  const headers = cors(ctx);
  const isForm = !(request.headers.get("content-type") || "").includes("application/json");
  let body = {};
  try {
    body = isForm ? Object.fromEntries(Array.from((await request.formData()).entries()).map(([k, v]) => [k, String(v)])) : await request.json();
  } catch {
    return json({ ok: false, error: "Petici\xF3n no v\xE1lida" }, 400, headers);
  }
  const done = (estado, status = 200, error) => isForm ? Response.redirect(`${site(ctx)}/n?estado=${estado}`, 303) : json(estado === "revisa" ? { ok: true } : { ok: false, error }, status, headers);
  if (body.website) return done("revisa");
  const email = String(body.email || "").trim().toLowerCase();
  if (!EMAIL_RE.test(email) || email.length > 200) return done("error", 400, "Ese email no parece v\xE1lido");
  if (!env2.SUPABASE_SERVICE_ROLE_KEY || !env2.RESEND_API_KEY) return done("error", 503, "La newsletter a\xFAn no est\xE1 configurada");
  const name = String(body.name || "").trim().slice(0, 80) || null;
  const source = String(body.source || "web").trim().slice(0, 40) || "web";
  try {
    const found = await db(env2, `newsletter_subscribers?select=id,status,token,confirm_sent_at,name&email=eq.${encodeURIComponent(email)}`);
    let sub = found[0];
    if (sub?.status === "activo") return done("revisa");
    if (sub?.status === "pendiente" && sub.confirm_sent_at && Date.now() - new Date(sub.confirm_sent_at).getTime() < 10 * 60 * 1e3) return done("revisa");
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const fields = { name: name || sub?.name || null, source, status: "pendiente", consent_text: CONSENT_TEXT, consent_at: now, confirm_sent_at: now, unsubscribed_at: null };
    if (sub) [sub] = await db(env2, `newsletter_subscribers?id=eq.${sub.id}`, { method: "PATCH", body: fields, prefer: "return=representation" });
    else [sub] = await db(env2, "newsletter_subscribers", { method: "POST", body: { email, ...fields }, prefer: "return=representation" });
    const url = `${site(ctx)}/api/newsletter/confirm?t=${sub.token}`;
    await sendMail(env2, { to: email, subject: "Confirma tu suscripci\xF3n a ALDIA Intelligence", html: renderConfirmHtml(url, sub.name), text: `Confirma tu suscripci\xF3n a ALDIA Intelligence: ${url}

Si no te has suscrito t\xFA, ignora este correo.` });
    return done("revisa");
  } catch (e) {
    console.error("newsletter/subscribe", e?.message || e);
    return done("error", 500, "No hemos podido apuntarte ahora. Prueba en unos minutos.");
  }
}

// vercel-api/newsletter/subscribe.ts
var env = () => process.env;
var OPTIONS = (request) => onRequestOptions({ request, env: env() });
var POST = (request) => onRequestPost({ request, env: env() });
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  OPTIONS,
  POST
});
