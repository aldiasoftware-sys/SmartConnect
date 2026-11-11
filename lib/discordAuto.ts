// Aviso automático en Discord al guardar en el Calendario un vídeo de TikTok o Instagram de ALDIA con su enlace:
// sale el aviso en #tiktok / #instagram y la tarjeta con la pregunta en #debate-ia (functions/api/discord/social.ts).
// Si falla (o en `next dev`, sin funciones), queda pendiente en Comunidad › Discord › Avisos de redes con su botón «Avisar».
import type { Post } from "./social";

const AUTO = ["tiktok", "instagram"];

export const wantsDiscordAuto = (p: Post & { discord_notified_at?: string | null }) =>
  AUTO.includes(p.platform) && p.owner !== "Guille" && !!p.url && /^https?:\/\/\S+$/i.test(p.url.trim()) && !p.discord_notified_at;

export async function autoNotifyDiscord(p: Post & { discord_notified_at?: string | null }, token?: string | null) {
  if (!p.id || !token || !wantsDiscordAuto(p)) return;
  try {
    const r = await fetch("/api/discord/social", { method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ post_id: p.id, auto: true }) });
    if (!r.ok) console.warn("Aviso a Discord:", r.status, await r.text().catch(() => ""));
  } catch (e: any) { console.warn("Aviso a Discord:", e?.message || e); }
}
