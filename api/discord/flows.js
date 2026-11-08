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

// vercel-api/discord/flows.ts
var flows_exports = {};
__export(flows_exports, {
  GET: () => GET,
  POST: () => POST
});
module.exports = __toCommonJS(flows_exports);

// lib/server/nl.ts
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

// lib/server/discord.ts
var GUILD_ID = "1568717330437902386";
var INVITE_URL = `https://discord.com/channels/${GUILD_ID}`;
function errorResponse(e) {
  return json({ ok: false, error: e?.message || "Error" }, e?.status && e.status < 600 ? e.status === 503 ? 503 : 502 : 500);
}

// functions/api/discord/flows.ts
async function hook(ctx, query = "") {
  if (!ctx.env.N8N_DISCORD_HOOK || !ctx.env.DISCORD_SECRET) throw Object.assign(new Error("Faltan N8N_DISCORD_HOOK o DISCORD_SECRET en Cloudflare"), { status: 503 });
  const res = await fetch(ctx.env.N8N_DISCORD_HOOK + query, { headers: { "x-discord-secret": ctx.env.DISCORD_SECRET } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data?.message || `n8n ${res.status}`), { status: 502 });
  return data;
}
async function onRequestGet(ctx) {
  if (!await teamUser(ctx)) return json({ ok: false, error: "Solo para el equipo" }, 401);
  try {
    return json({ ok: true, ...await hook(ctx) });
  } catch (e) {
    return errorResponse(e);
  }
}
async function onRequestPost(ctx) {
  if (!await teamUser(ctx)) return json({ ok: false, error: "Solo para el equipo" }, 401);
  const { slug } = await ctx.request.json().catch(() => ({}));
  if (!slug || !/^[a-z-]+$/.test(slug)) return json({ ok: false, error: "Flujo no v\xE1lido" }, 400);
  try {
    return json({ ok: true, ...await hook(ctx, `?run=${slug}`) });
  } catch (e) {
    return errorResponse(e);
  }
}

// vercel-api/discord/flows.ts
var env = () => process.env;
var GET = (request) => onRequestGet({ request, env: env() });
var POST = (request) => onRequestPost({ request, env: env() });
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  GET,
  POST
});
