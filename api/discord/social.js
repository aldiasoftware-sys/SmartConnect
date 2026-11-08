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

// vercel-api/discord/social.ts
var social_exports = {};
__export(social_exports, {
  POST: () => POST
});
module.exports = __toCommonJS(social_exports);

// lib/server/nl.ts
var json = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers } });
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

// lib/server/discord.ts
var GUILD_ID = "1568717330437902386";
var INVITE_URL = `https://discord.com/channels/${GUILD_ID}`;
var SOCIAL_CHANNELS = {
  tiktok: { id: "1568729990428758168", label: "TikTok", emoji: "\u{1F3B5}" },
  instagram: { id: "1568729993796657152", label: "Instagram", emoji: "\u{1F4F8}" },
  youtube: { id: "1568729996065767585", label: "YouTube", emoji: "\u25B6\uFE0F" },
  linkedin: { id: "1568729998372765961", label: "LinkedIn", emoji: "\u{1F4BC}" }
};
var ANNOUNCEMENTS_ID = "1568721931073491004";
async function discord(env2, path, init = {}) {
  if (!env2.DISCORD_BOT_TOKEN) throw Object.assign(new Error("Falta DISCORD_BOT_TOKEN en Cloudflare"), { status: 503 });
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(`https://discord.com/api/v10${path}`, {
      method: init.method || "GET",
      headers: {
        authorization: `Bot ${env2.DISCORD_BOT_TOKEN}`,
        "user-agent": "DiscordBot (https://aldiaproject.es, 1.0)",
        ...init.body === void 0 ? {} : { "content-type": "application/json" }
      },
      body: init.body === void 0 ? void 0 : JSON.stringify(init.body)
    });
    if (res.status === 429) {
      const wait = Number((await res.json().catch(() => ({}))).retry_after || 1);
      await new Promise((r) => setTimeout(r, Math.min(wait, 5) * 1e3 + 200));
      continue;
    }
    const text = await res.text();
    if (!res.ok) throw Object.assign(new Error(`Discord ${res.status}: ${text.slice(0, 200)}`), { status: res.status });
    return text ? JSON.parse(text) : null;
  }
  throw new Error("Discord: demasiadas peticiones, prueba en un minuto");
}
function errorResponse(e) {
  return json({ ok: false, error: e?.message || "Error" }, e?.status && e.status < 600 ? e.status === 503 ? 503 : 502 : 500);
}

// functions/api/discord/social.ts
async function onRequestPost(ctx) {
  if (!await teamUser(ctx)) return json({ ok: false, error: "Solo para el equipo" }, 401);
  const b = await ctx.request.json().catch(() => ({}));
  const ch = SOCIAL_CHANNELS[(b.platform || "").toLowerCase()];
  const url = (b.url || "").trim();
  if (!ch) return json({ ok: false, error: "Red sin canal en Discord" }, 400);
  if (!/^https?:\/\/\S+$/i.test(url)) return json({ ok: false, error: "Enlace no v\xE1lido" }, 400);
  const text = (b.text || "").trim().slice(0, 500);
  const content = `${ch.emoji} **Nueva publicaci\xF3n en ${ch.label}**${text ? `
${text}` : ""}
${url}`;
  try {
    if (b.post_id) {
      const rows = await db(ctx.env, `content_posts?id=eq.${encodeURIComponent(b.post_id)}&select=discord_notified_at`);
      if (rows[0]?.discord_notified_at) return json({ ok: false, error: "Esta publicaci\xF3n ya se avis\xF3 en Discord" }, 409);
    }
    const msg = await discord(ctx.env, `/channels/${ch.id}/messages`, { method: "POST", body: { content, allowed_mentions: { parse: [] } } });
    if (b.also_announce) await discord(ctx.env, `/channels/${ANNOUNCEMENTS_ID}/messages`, { method: "POST", body: { content, allowed_mentions: { parse: [] } } });
    if (b.post_id) await db(ctx.env, `content_posts?id=eq.${encodeURIComponent(b.post_id)}`, { method: "PATCH", body: { discord_notified_at: (/* @__PURE__ */ new Date()).toISOString() } });
    return json({ ok: true, id: msg.id });
  } catch (e) {
    return errorResponse(e);
  }
}

// vercel-api/discord/social.ts
var env = () => process.env;
var POST = (request) => onRequestPost({ request, env: env() });
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  POST
});
