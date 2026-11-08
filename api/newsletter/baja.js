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

// vercel-api/newsletter/baja.ts
var baja_exports = {};
__export(baja_exports, {
  GET: () => GET,
  OPTIONS: () => OPTIONS,
  POST: () => POST
});
module.exports = __toCommonJS(baja_exports);

// lib/server/nl.ts
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

// functions/api/newsletter/baja.ts
var UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
var tokenOf = (ctx) => new URL(ctx.request.url).searchParams.get("t") || "";
var onRequestOptions = (ctx) => new Response(null, { status: 204, headers: cors(ctx) });
function onRequestGet(ctx) {
  const t = tokenOf(ctx);
  return Response.redirect(`${site(ctx)}/n${UUID.test(t) ? `?baja=${t}` : "?estado=error"}`, 303);
}
async function onRequestPost(ctx) {
  const t = tokenOf(ctx);
  const headers = cors(ctx);
  if (!UUID.test(t)) return json({ ok: false, error: "Enlace no v\xE1lido" }, 400, headers);
  try {
    await db(ctx.env, `newsletter_subscribers?token=eq.${t}&status=neq.baja`, { method: "PATCH", body: { status: "baja", unsubscribed_at: (/* @__PURE__ */ new Date()).toISOString() } });
    return json({ ok: true }, 200, headers);
  } catch (e) {
    console.error("newsletter/baja", e?.message || e);
    return json({ ok: false, error: "No hemos podido darte de baja. Responde al \xFAltimo correo y lo hacemos a mano." }, 500, headers);
  }
}

// vercel-api/newsletter/baja.ts
var env = () => process.env;
var GET = (request) => onRequestGet({ request, env: env() });
var OPTIONS = (request) => onRequestOptions({ request, env: env() });
var POST = (request) => onRequestPost({ request, env: env() });
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  GET,
  OPTIONS,
  POST
});
