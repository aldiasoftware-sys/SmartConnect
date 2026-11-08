// GET /api/discord/flows · estado de los flujos n8n del Discord · POST {slug} · lanzarlo ahora (solo equipo)
// Habla con un único webhook de n8n (0xFe…H) protegido con el secreto compartido: la clave de n8n se queda en n8n.
import { Ctx, errorResponse, json, teamUser } from "../../../lib/server/discord";

async function hook(ctx: Ctx, query = "") {
  if (!ctx.env.N8N_DISCORD_HOOK || !ctx.env.DISCORD_SECRET) throw Object.assign(new Error("Faltan N8N_DISCORD_HOOK o DISCORD_SECRET en Cloudflare"), { status: 503 });
  const res = await fetch(ctx.env.N8N_DISCORD_HOOK + query, { headers: { "x-discord-secret": ctx.env.DISCORD_SECRET } });
  const data: any = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data?.message || `n8n ${res.status}`), { status: 502 });
  return data;
}

export async function onRequestGet(ctx: Ctx) {
  if (!(await teamUser(ctx))) return json({ ok: false, error: "Solo para el equipo" }, 401);
  try { return json({ ok: true, ...(await hook(ctx)) }); } catch (e) { return errorResponse(e); }
}

export async function onRequestPost(ctx: Ctx) {
  if (!(await teamUser(ctx))) return json({ ok: false, error: "Solo para el equipo" }, 401);
  const { slug } = (await ctx.request.json().catch(() => ({}))) as { slug?: string };
  if (!slug || !/^[a-z-]+$/.test(slug)) return json({ ok: false, error: "Flujo no válido" }, 400);
  try { return json({ ok: true, ...(await hook(ctx, `?run=${slug}`)) }); } catch (e) { return errorResponse(e); }
}
