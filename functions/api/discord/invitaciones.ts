// /api/discord/invitaciones · un enlace de invitación por red (TikTok, Instagram, LinkedIn, YouTube, web)
// y cuánta gente ha entrado por cada uno. GET los lee; POST crea los que falten. Solo equipo.
import { Ctx, errorResponse, json, teamUser } from "../../../lib/server/discord";
import { createInvites, readInvites } from "../../../lib/server/comunidad";

export async function onRequestGet(ctx: Ctx) {
  if (!(await teamUser(ctx))) return json({ ok: false, error: "Solo para el equipo" }, 401);
  try { return json({ ok: true, ...(await readInvites(ctx.env)) }); }
  catch (e) { return errorResponse(e); }
}

export async function onRequestPost(ctx: Ctx) {
  if (!(await teamUser(ctx))) return json({ ok: false, error: "Solo para el equipo" }, 401);
  if (!ctx.env.SUPABASE_SERVICE_ROLE_KEY) return json({ ok: false, error: "Falta SUPABASE_SERVICE_ROLE_KEY en Cloudflare" }, 503);
  try { await createInvites(ctx.env); return json({ ok: true, ...(await readInvites(ctx.env)) }); }
  catch (e) { return errorResponse(e); }
}
