// GET /api/discord/stats · métricas en vivo del servidor + histórico diario (solo equipo)
import { Ctx, INVITE_URL, activity, errorResponse, guildCounts, json, snapshot, teamUser } from "../../../lib/server/discord";
import { db } from "../../../lib/server/nl";

export async function onRequestGet(ctx: Ctx) {
  if (!(await teamUser(ctx))) return json({ ok: false, error: "Solo para el equipo" }, 401);
  try {
    const [g, act] = await Promise.all([guildCounts(ctx.env), activity(ctx.env)]);
    const saved = await snapshot(ctx.env, g.members, g.online, act.messages7d).catch(() => false);
    const history = saved
      ? await db<any[]>(ctx.env, "discord_snapshots?select=day,members,online,messages_7d&order=day.desc&limit=120").catch(() => [])
      : [];
    return json({ ok: true, guild: g, invite: INVITE_URL, activity: act, history: history.reverse(), historyReady: saved, serviceKey: !!ctx.env.SUPABASE_SERVICE_ROLE_KEY });
  } catch (e) { return errorResponse(e); }
}
