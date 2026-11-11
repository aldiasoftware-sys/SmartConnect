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
async function storageGet(env2, bucket, path) {
  const enc = path.split("/").map(encodeURIComponent).join("/");
  const res = await fetch(`${env2.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/${bucket}/${enc}`, { headers: adminHeaders(env2) });
  return res.ok ? res.arrayBuffer() : null;
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
var DEBATE_ID = "1568721988317483071";
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
async function discordForm(env2, path, method, payload, files) {
  if (!env2.DISCORD_BOT_TOKEN) throw Object.assign(new Error("Falta DISCORD_BOT_TOKEN en Cloudflare"), { status: 503 });
  for (let attempt = 0; attempt < 3; attempt++) {
    const form = new FormData();
    form.append("payload_json", JSON.stringify({ ...payload, attachments: files.map((f, i) => ({ id: i, filename: f.name })) }));
    files.forEach((f, i) => form.append(`files[${i}]`, new Blob([f.data], { type: f.type }), f.name));
    const res = await fetch(`https://discord.com/api/v10${path}`, {
      method,
      body: form,
      headers: { authorization: `Bot ${env2.DISCORD_BOT_TOKEN}`, "user-agent": "DiscordBot (https://aldiaproject.es, 1.0)" }
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
var BUCKET = "contenido";
var VIDEO_PLATFORMS = ["tiktok", "instagram"];
var isAldia = (p) => p.owner !== "Guille";
var BTN = {
  tiktok: { label: "Ver en TikTok", emoji: "\u{1F3B5}" },
  instagram: { label: "Ver en Instagram", emoji: "\u{1F4F8}" }
};
async function onRequestPost(ctx) {
  if (!await teamUser(ctx)) return json({ ok: false, error: "Solo para el equipo" }, 401);
  const b = await ctx.request.json().catch(() => ({}));
  try {
    let post = null;
    if (b.post_id) {
      const rows = await db(ctx.env, `content_posts?id=eq.${encodeURIComponent(b.post_id)}&select=*`);
      post = rows[0] || null;
      if (!post) return json({ ok: false, error: "No encuentro esa publicaci\xF3n" }, 404);
      if (post.discord_notified_at) return b.auto ? json({ ok: true, skipped: true }) : json({ ok: false, error: "Esta publicaci\xF3n ya se avis\xF3 en Discord" }, 409);
    }
    const platform = (post?.platform || b.platform || "").toLowerCase();
    const url = (post?.url || b.url || "").trim();
    const ch = SOCIAL_CHANNELS[platform];
    if (!ch) return json({ ok: false, error: "Red sin canal en Discord" }, 400);
    if (!/^https?:\/\/\S+$/i.test(url)) return json({ ok: false, error: "Enlace no v\xE1lido" }, 400);
    const title = (post?.title || b.text || "").trim().slice(0, 300);
    const card = post && VIDEO_PLATFORMS.includes(platform) && isAldia(post) ? await videoCard(ctx, post) : null;
    const more = card ? `
\u{1F4AC} De qu\xE9 va y debate: https://discord.com/channels/1568717330437902386/${DEBATE_ID}/${card}` : "";
    const content = `${ch.emoji} **Nuevo v\xEDdeo en ${ch.label}**${title ? `: ${title}` : ""}
${url}${more}`;
    const msg = await discord(ctx.env, `/channels/${ch.id}/messages`, { method: "POST", body: { content, allowed_mentions: { parse: [] } } });
    if (b.also_announce) await discord(ctx.env, `/channels/${ANNOUNCEMENTS_ID}/messages`, { method: "POST", body: { content, allowed_mentions: { parse: [] } } });
    if (post) await db(ctx.env, `content_posts?id=eq.${encodeURIComponent(post.id)}`, { method: "PATCH", body: { discord_notified_at: (/* @__PURE__ */ new Date()).toISOString() } });
    return json({ ok: true, id: msg.id, card });
  } catch (e) {
    return errorResponse(e);
  }
}
async function videoCard(ctx, post) {
  const env2 = ctx.env;
  const siblings = post.archivo ? await db(env2, `content_posts?archivo=eq.${encodeURIComponent(post.archivo)}&select=*`).catch(() => [post]) : [post];
  const all = siblings.some((s) => s.id === post.id) ? siblings.map((s) => s.id === post.id ? post : s) : [...siblings, post];
  const links = VIDEO_PLATFORMS.map((p) => all.find((s) => s.platform === p && s.url && /^https?:\/\//i.test(s.url))).filter(Boolean).map((s) => ({ platform: s.platform, url: s.url.trim() }));
  const existing = all.map((s) => s.discord_card_id).find(Boolean) || null;
  const txt = post.archivo ? await storageGet(env2, BUCKET, `${post.archivo} - Instagram descripcion.txt`) : null;
  const info = parseCaption(txt ? new TextDecoder().decode(txt) : "", post.title);
  const thumb = post.archivo ? await storageGet(env2, BUCKET, `${post.archivo} - miniatura LinkedIn.png`) : null;
  const hasThumb = !!thumb || !!existing;
  const components = [cardBody(info, links, hasThumb)];
  if (existing) {
    try {
      await discord(env2, `/channels/${DEBATE_ID}/messages/${existing}`, { method: "PATCH", body: { flags: 1 << 15, components } });
      return existing;
    } catch {
    }
  }
  const payload = { flags: 1 << 15, components: thumb ? components : [cardBody(info, links, false)], allowed_mentions: { parse: [] } };
  const msg = thumb ? await discordForm(env2, `/channels/${DEBATE_ID}/messages`, "POST", payload, [{ name: "miniatura.png", data: thumb, type: "image/png" }]) : await discord(env2, `/channels/${DEBATE_ID}/messages`, { method: "POST", body: payload });
  await discord(env2, `/channels/${DEBATE_ID}/messages/${msg.id}/threads`, {
    method: "POST",
    body: { name: `\u{1F4AC} ${info.headline}`.slice(0, 100), auto_archive_duration: 4320 }
  }).catch(() => null);
  const ids = all.map((s) => s.id).filter(Boolean);
  await db(env2, `content_posts?id=in.(${ids.map(encodeURIComponent).join(",")})`, { method: "PATCH", body: { discord_card_id: msg.id } }).catch(() => null);
  return msg.id;
}
function parseCaption(text, title) {
  const lines = text.split(/\n+/).map((l) => l.trim()).filter(Boolean).filter((l) => !l.startsWith("#") && !/discord|enlace en (el|la) (perfil|bio)|link en (la )?bio/i.test(l));
  const qi = lines.map((l) => l.includes("\xBF")).lastIndexOf(true);
  let question = "";
  if (qi >= 0) {
    const l = lines[qi];
    question = l.slice(l.indexOf("\xBF"), l.lastIndexOf("?") + 1 || void 0).trim();
  }
  const hook = (lines[0] && lines[0] !== lines[qi] ? lines[0] : "") || title;
  const body = lines.slice(1, qi >= 0 ? qi : void 0).join(" ");
  return { headline: (title || hook).replace(/\s*#\S+/g, "").trim() || "Nuevo v\xEDdeo", hook, summary: clip(body, 520), question: question || "\xBFT\xFA qu\xE9 opinas?" };
}
function clip(s, max) {
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const end = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf(": "));
  return end > max * 0.4 ? cut.slice(0, end + 1) : cut.replace(/\s+\S*$/, "") + "\u2026";
}
function cardBody(info, links, thumb) {
  const head = { type: 10, content: `-# \u{1F3AC} NUEVO V\xCDDEO DE ALDIA
## ${info.headline}
${info.hook !== info.headline ? info.hook : ""}`.trim() };
  const comps = [thumb ? { type: 9, components: [head], accessory: { type: 11, media: { url: "attachment://miniatura.png" } } } : head];
  if (info.summary) comps.push({ type: 10, content: info.summary });
  comps.push({ type: 14, divider: true, spacing: 1 });
  comps.push({ type: 10, content: `### \u{1F4AC} ${info.question}
Responde en el hilo de abajo \u{1F447} y si te ha servido, dale like y comp\xE1rtelo.` });
  if (links.length) comps.push({ type: 1, components: links.map((l) => ({ type: 2, style: 5, label: BTN[l.platform].label, emoji: { name: BTN[l.platform].emoji }, url: l.url })) });
  comps.push({ type: 10, content: "-# ALDIA \xB7 Noticias de IA cada d\xEDa" });
  return { type: 17, accent_color: ACCENT, components: comps };
}

// vercel-api/discord/social.ts
var env = () => process.env;
var POST = (request) => onRequestPost({ request, env: env() });
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  POST
});
