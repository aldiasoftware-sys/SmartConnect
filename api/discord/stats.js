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

// vercel-api/discord/stats.ts
var stats_exports = {};
__export(stats_exports, {
  GET: () => GET
});
module.exports = __toCommonJS(stats_exports);

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
var ACTIVITY_CHANNELS = [
  { id: "1568721956407353535", name: "\u{1F4AC}\u30FBgeneral" },
  { id: "1568721938527027221", name: "\u{1F64B}\u30FBpresentaciones" },
  { id: "1568721988317483071", name: "\u{1F9E0}\u30FBdebate-ia" },
  { id: "1568721998958432266", name: "\u{1F916}\u30FBclaude-code" },
  { id: "1568722036635734046", name: "\u2699\uFE0F\u30FBautomatizaci\xF3n" },
  { id: "1568722151618642012", name: "\u{1F3C6}\u30FBreto-semanal" }
];
var FORUMS = {
  "1568741117778989056": "\u{1F198}\u30FBayuda",
  "1568741145679499486": "\u{1F4DA}\u30FBrecursos",
  "1568741182287384629": "\u{1F680}\u30FBproyectos"
};
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
var madridDay = (d = /* @__PURE__ */ new Date()) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(d);
async function activity(env2) {
  const since = Date.now() - 7 * 864e5;
  const days = {};
  for (let i = 6; i >= 0; i--) days[madridDay(new Date(Date.now() - i * 864e5))] = 0;
  const authors = /* @__PURE__ */ new Set();
  const channels = await Promise.all(ACTIVITY_CHANNELS.map(async (c) => {
    const msgs = await discord(env2, `/channels/${c.id}/messages?limit=100`).catch(() => []);
    let n = 0;
    for (const m of msgs) {
      const t = Date.parse(m.timestamp);
      if (m.author?.bot || m.webhook_id || t < since || m.type !== 0 && m.type !== 19) continue;
      n++;
      authors.add(m.author.id);
      const d = madridDay(new Date(t));
      if (d in days) days[d]++;
    }
    return { id: c.id, name: c.name, messages: n };
  }));
  const threads = (await discord(env2, `/guilds/${GUILD_ID}/threads/active`).catch(() => ({ threads: [] }))).threads || [];
  const forums = Object.entries(FORUMS).map(([id, name]) => {
    const own = threads.filter((t) => t.parent_id === id);
    const recent = own.filter((t) => Date.parse(t.thread_metadata?.create_timestamp || 0) >= since && t.owner_id !== "1568719781643821228");
    return { id, name, open: own.length, new7d: recent.length, replies: own.reduce((s, t) => s + (t.message_count || 0), 0) };
  });
  return {
    channels,
    forums,
    byDay: Object.entries(days).map(([day, messages]) => ({ day, messages })),
    activeAuthors: authors.size,
    messages7d: channels.reduce((s, c) => s + c.messages, 0)
  };
}
async function snapshot(env2, members, online, messages7d) {
  if (!env2.SUPABASE_SERVICE_ROLE_KEY) return false;
  const day = madridDay();
  const prev = await db(env2, `discord_snapshots?day=eq.${day}&select=members,online`).catch(() => null);
  if (prev === null) return false;
  const row = { day, members: Math.max(members, prev[0]?.members || 0), online: Math.max(online, prev[0]?.online || 0), messages_7d: messages7d, updated_at: (/* @__PURE__ */ new Date()).toISOString() };
  await db(env2, "discord_snapshots?on_conflict=day", { method: "POST", body: row, prefer: "resolution=merge-duplicates" });
  return true;
}
async function guildCounts(env2) {
  const g = await discord(env2, `/guilds/${GUILD_ID}?with_counts=true`);
  return {
    name: g.name,
    icon: g.icon ? `https://cdn.discordapp.com/icons/${GUILD_ID}/${g.icon}.png?size=128` : null,
    members: g.approximate_member_count,
    online: g.approximate_presence_count
  };
}
function errorResponse(e) {
  return json({ ok: false, error: e?.message || "Error" }, e?.status && e.status < 600 ? e.status === 503 ? 503 : 502 : 500);
}

// functions/api/discord/stats.ts
async function onRequestGet(ctx) {
  if (!await teamUser(ctx)) return json({ ok: false, error: "Solo para el equipo" }, 401);
  try {
    const [g, act] = await Promise.all([guildCounts(ctx.env), activity(ctx.env)]);
    const saved = await snapshot(ctx.env, g.members, g.online, act.messages7d).catch(() => false);
    const history = saved ? await db(ctx.env, "discord_snapshots?select=day,members,online,messages_7d&order=day.desc&limit=120").catch(() => []) : [];
    return json({ ok: true, guild: g, invite: INVITE_URL, activity: act, history: history.reverse(), historyReady: saved, serviceKey: !!ctx.env.SUPABASE_SERVICE_ROLE_KEY });
  } catch (e) {
    return errorResponse(e);
  }
}

// vercel-api/discord/stats.ts
var env = () => process.env;
var GET = (request) => onRequestGet({ request, env: env() });
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  GET
});
