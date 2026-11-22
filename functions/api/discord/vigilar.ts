// POST /api/discord/vigilar · aviso AUTOMÁTICO de los vídeos de TikTok e Instagram de ALDIA en Discord (22-11).
// Lo llama n8n cada 15 min con el secreto compartido (flujo «DISCORD | Redes automáticas»). Nadie tiene que pegar enlaces:
//   · TikTok: los vídeos que el Mac de Guille ya lee de la cuenta (app_settings «tiktok_stats», API oficial, cada 30 min).
//   · Instagram: los Reels que el PC de Millán publica solo y apunta en el Calendario (content_posts con enlace y sin avisar).
// Por cada vídeo nuevo: aviso breve en #tiktok / #instagram y UNA tarjeta por vídeo en #debate-ia (la misma tarjeta recibe el
// botón de la otra red cuando sale allí, emparejando por título). Lo ya avisado se apunta en app_settings «discord_redes».
// La primera vez solo avisa lo publicado desde ese día (sin aluvión con lo antiguo).
import { Ctx, DEBATE_ID, SOCIAL_CHANNELS, discord, discordForm, errorResponse, json } from "../../../lib/server/discord";
import { db, storageGet } from "../../../lib/server/nl";
import { cardBody, parseCaption, type Info } from "./social";

const STATE_KEY = "discord_redes";
const BUCKET = "contenido";
const POR_VUELTA = 6;            // como mucho, vídeos avisados en cada pasada
const DIAS_PAREJA = 4;           // TikTok e Instagram del mismo vídeo pueden salir con días de diferencia

type Video = { platform: "tiktok" | "instagram"; key: string; title: string; url: string; date: string; cover?: string | null; rowId?: string };
type Card = { id: string; title: string; date: string; links: Record<string, string>; thumb: boolean; info: Info };
type State = { desde: string; vistos: Record<string, string[]>; tarjetas: Card[] };

const madridDay = (d = new Date()) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(d);
const words = (s: string) => new Set(s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9ñ ]+/g, " ")
  .split(/\s+/).filter((w) => w.length > 2 && !["que", "por", "para", "con", "los", "las", "del", "una", "uno", "sus", "esta", "este"].includes(w)));
function similar(a: string, b: string) {
  const A = words(a), B = words(b);
  if (!A.size || !B.size) return 0;
  let n = 0; A.forEach((w) => { if (B.has(w)) n++; });
  return n / Math.min(A.size, B.size);
}
const near = (a: string, b: string) => Math.abs(Date.parse(a) - Date.parse(b)) <= DIAS_PAREJA * 864e5;
const cleanUrl = (u: string) => u.split("?")[0];

export async function onRequestPost(ctx: Ctx) {
  const secret = ctx.request.headers.get("x-discord-secret") || "";
  if (!ctx.env.DISCORD_SECRET || secret !== ctx.env.DISCORD_SECRET) return json({ ok: false, error: "No autorizado" }, 401);
  const env = ctx.env;
  try {
    const rows = await db<{ value: State }[]>(env, `app_settings?key=eq.${STATE_KEY}&select=value`);
    const state: State = rows[0]?.value || { desde: `${madridDay()}T00:00:00+01:00`, vistos: {}, tarjetas: [] };
    state.vistos ||= {}; state.tarjetas ||= [];
    const seen = (p: string) => new Set(state.vistos[p] || []);

    // ---- vídeos nuevos de las dos redes
    const videos: Video[] = [];
    const tk = await db<{ value: any }[]>(env, "app_settings?key=eq.tiktok_stats&select=value").catch(() => []);
    const tkSeen = seen("tiktok");
    for (const v of tk[0]?.value?.videos || []) {
      if (!v?.id || tkSeen.has(String(v.id)) || !v.publicado || Date.parse(v.publicado) < Date.parse(state.desde)) continue;
      videos.push({ platform: "tiktok", key: String(v.id), title: String(v.titulo || "").replace(/\s*#\S+/g, "").trim(),
        url: cleanUrl(v.link || ""), date: v.publicado, cover: v.miniatura });
    }
    const igSeen = seen("instagram");
    const ig = await db<any[]>(env, `content_posts?platform=eq.instagram&discord_notified_at=is.null&url=like.*instagram.com*` +
      `&publish_date=gte.${state.desde.slice(0, 10)}&select=id,title,url,created_at,owner,notes&order=created_at`);
    for (const r of ig) {
      const url = cleanUrl(String(r.url).trim());
      // la cuenta de Instagram de ALDIA: lo que publica el PC solo (lleva «Reel publicado») o lo que no es del carril personal de Guille
      if (igSeen.has(url) || !(r.owner !== "Guille" || /^Reel publicado/.test(r.notes || ""))) continue;
      videos.push({ platform: "instagram", key: url, title: String(r.title || "").trim(), url, date: r.created_at, rowId: r.id });
    }
    videos.sort((a, b) => Date.parse(a.date) - Date.parse(b.date));

    const hechos: { platform: string; title: string; card: string | null }[] = [];
    for (const v of videos.slice(0, POR_VUELTA)) {
      if (!/^https?:\/\/\S+$/i.test(v.url)) continue;
      const card = await upsertCard(ctx, state, v).catch((e) => { console.warn("tarjeta:", e?.message || e); return null; });
      const ch = SOCIAL_CHANNELS[v.platform];
      const more = card ? `\n💬 De qué va y debate: https://discord.com/channels/1568717330437902386/${DEBATE_ID}/${card}` : "";
      await discord(env, `/channels/${ch.id}/messages`, { method: "POST",
        body: { content: `${ch.emoji} **Nuevo vídeo en ${ch.label}**${v.title ? `: ${v.title}` : ""}\n${v.url}${more}`, allowed_mentions: { parse: [] } } });
      state.vistos[v.platform] = [...(state.vistos[v.platform] || []), v.key].slice(-300);
      if (v.rowId) await db(env, `content_posts?id=eq.${v.rowId}`, { method: "PATCH", body: { discord_notified_at: new Date().toISOString(), ...(card ? { discord_card_id: card } : {}) } }).catch(() => null);
      // se guarda tras cada vídeo: si algo falla a mitad, no se repite lo ya avisado
      await saveState(ctx, state);
      hechos.push({ platform: v.platform, title: v.title, card });
    }
    if (!rows[0]) await saveState(ctx, state);
    return json({ ok: true, avisados: hechos, pendientes: Math.max(0, videos.length - POR_VUELTA) });
  } catch (e) { return errorResponse(e); }
}

async function saveState(ctx: Ctx, state: State) {
  state.tarjetas = state.tarjetas.slice(-60);
  await db(ctx.env, "app_settings?on_conflict=key", { method: "POST", prefer: "resolution=merge-duplicates,return=minimal",
    body: { key: STATE_KEY, value: state } });
}

/** Una tarjeta por vídeo en #debate-ia: si ya existe la de la otra red (título parecido, fechas cercanas), se le añade el botón. */
async function upsertCard(ctx: Ctx, state: State, v: Video): Promise<string | null> {
  const env = ctx.env;
  const pair = state.tarjetas.filter((c) => !c.links[v.platform] && near(c.date, v.date))
    .map((c) => ({ c, s: similar(c.title, v.title) })).sort((a, b) => b.s - a.s)[0];
  if (pair && pair.s >= 0.5) {
    const c = pair.c;
    c.links[v.platform] = v.url;
    try {
      await discord(env, `/channels/${DEBATE_ID}/messages/${c.id}`, { method: "PATCH", body: { flags: 1 << 15, components: [cardBody(c.info, linksOf(c), c.thumb)] } });
      return c.id;
    } catch { state.tarjetas = state.tarjetas.filter((x) => x !== c); /* la borraron: se hace otra */ }
  }

  // texto y miniatura del kit de Archivos (pieza del Calendario con título parecido); si no, el título y la portada de TikTok
  const kits = await db<any[]>(env, `content_posts?archivo=not.is.null&publish_date=gte.${shift(v.date, -DIAS_PAREJA)}` +
    `&publish_date=lte.${shift(v.date, DIAS_PAREJA)}&select=title,archivo`).catch(() => []);
  const kit = kits.map((k) => ({ k, s: similar(k.title || "", v.title) })).sort((a, b) => b.s - a.s)[0];
  let txt = "", thumb: ArrayBuffer | null = null;
  if (kit && kit.s >= 0.5) {
    const t = await storageGet(env, BUCKET, `${kit.k.archivo} - Instagram descripcion.txt`);
    if (t) txt = new TextDecoder().decode(t);
    thumb = await storageGet(env, BUCKET, `${kit.k.archivo} - miniatura LinkedIn.png`);
  }
  if (!thumb && v.cover) thumb = await fetch(v.cover).then((r) => (r.ok ? r.arrayBuffer() : null)).catch(() => null);
  const info = parseCaption(txt, v.title);
  const c: Card = { id: "", title: v.title, date: v.date, links: { [v.platform]: v.url }, thumb: !!thumb, info };
  const payload = { flags: 1 << 15, components: [cardBody(info, linksOf(c), !!thumb)], allowed_mentions: { parse: [] } };
  const msg = thumb
    ? await discordForm<any>(env, `/channels/${DEBATE_ID}/messages`, "POST", payload, [{ name: "miniatura.png", data: thumb, type: "image/png" }])
    : await discord<any>(env, `/channels/${DEBATE_ID}/messages`, { method: "POST", body: payload });
  await discord(env, `/channels/${DEBATE_ID}/messages/${msg.id}/threads`, { method: "POST",
    body: { name: `💬 ${info.headline}`.slice(0, 100), auto_archive_duration: 4320 } }).catch(() => null);
  c.id = msg.id;
  state.tarjetas.push(c);
  return msg.id;
}

const linksOf = (c: Card) => ["tiktok", "instagram"].filter((p) => c.links[p]).map((p) => ({ platform: p, url: c.links[p] }));
const shift = (iso: string, days: number) => madridDay(new Date(Date.parse(iso) + days * 864e5));
