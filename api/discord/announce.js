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

// vercel-api/discord/announce.ts
var announce_exports = {};
__export(announce_exports, {
  POST: () => POST
});
module.exports = __toCommonJS(announce_exports);

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
var ANNOUNCEMENTS_ID = "1568721931073491004";
var ACCENT = 13117480;
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

// functions/api/discord/announce.ts
var isUrl = (u) => !!u && /^https:\/\/\S+$/i.test(u);
async function onRequestPost(ctx) {
  const who = await teamUser(ctx);
  if (!who) return json({ ok: false, error: "Solo para el equipo" }, 401);
  const b = await ctx.request.json().catch(() => ({}));
  const title = (b.title || "").trim(), text = (b.body || "").trim();
  if (!title || !text) return json({ ok: false, error: "Faltan t\xEDtulo y texto" }, 400);
  if (title.length > 200 || text.length > 3500) return json({ ok: false, error: "Texto demasiado largo" }, 400);
  const comps = [];
  if (isUrl(b.image_url)) comps.push({ type: 12, items: [{ media: { url: b.image_url } }] });
  comps.push({ type: 10, content: `## ${title}` }, { type: 10, content: text });
  if (b.button_label && isUrl(b.button_url)) comps.push({ type: 1, components: [{ type: 2, style: 5, label: b.button_label.slice(0, 80), url: b.button_url }] });
  comps.push({ type: 10, content: "-# ALDIA \xB7 AI ENGINEERING PIONEERS" });
  try {
    const msg = await discord(ctx.env, `/channels/${ANNOUNCEMENTS_ID}/messages`, {
      method: "POST",
      body: { flags: 1 << 15, components: [{ type: 17, accent_color: ACCENT, components: comps }], allowed_mentions: { parse: [] } }
    });
    let crossposted = false;
    if (b.crosspost) crossposted = !!await discord(ctx.env, `/channels/${ANNOUNCEMENTS_ID}/messages/${msg.id}/crosspost`, { method: "POST" }).catch(() => null);
    return json({ ok: true, id: msg.id, crossposted, url: `https://discord.com/channels/1568717330437902386/${ANNOUNCEMENTS_ID}/${msg.id}` });
  } catch (e) {
    return errorResponse(e);
  }
}

// vercel-api/discord/announce.ts
var env = () => process.env;
var POST = (request) => onRequestPost({ request, env: env() });
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  POST
});
