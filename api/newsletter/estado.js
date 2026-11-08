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

// vercel-api/newsletter/estado.ts
var estado_exports = {};
__export(estado_exports, {
  GET: () => GET
});
module.exports = __toCommonJS(estado_exports);

// lib/server/nl.ts
var FROM_FALLBACK = "ALDIA Intelligence <onboarding@resend.dev>";
var json = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers } });
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

// functions/api/newsletter/estado.ts
async function onRequestGet(ctx) {
  if (!await teamUser(ctx)) return json({ ok: false, error: "Solo para el equipo" }, 401);
  const from = ctx.env.NEWSLETTER_FROM || FROM_FALLBACK;
  return json({
    ok: true,
    resend: !!ctx.env.RESEND_API_KEY,
    supabase: !!ctx.env.SUPABASE_SERVICE_ROLE_KEY,
    from,
    testMode: from === FROM_FALLBACK,
    // con onboarding@resend.dev Resend solo deja enviar a la cuenta dueña
    origins: (ctx.env.NEWSLETTER_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean)
  });
}

// vercel-api/newsletter/estado.ts
var env = () => process.env;
var GET = (request) => onRequestGet({ request, env: env() });
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  GET
});
