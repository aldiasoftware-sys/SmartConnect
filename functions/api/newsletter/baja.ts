// /api/newsletter/baja?t=<token>
// GET  → lleva a /n con el botón «Darme de baja» (los antivirus del correo abren los enlaces; un GET no da de baja a nadie).
// POST → da de baja. Lo usan ese botón y la baja en un clic de Gmail/Outlook (List-Unsubscribe-Post, RFC 8058).
import { Ctx, cors, db, json, site } from "../../../lib/server/nl";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const tokenOf = (ctx: Ctx) => new URL(ctx.request.url).searchParams.get("t") || "";

export const onRequestOptions = (ctx: Ctx) => new Response(null, { status: 204, headers: cors(ctx) });

export function onRequestGet(ctx: Ctx) {
  const t = tokenOf(ctx);
  return Response.redirect(`${site(ctx)}/n${UUID.test(t) ? `?baja=${t}` : "?estado=error"}`, 303);
}

export async function onRequestPost(ctx: Ctx) {
  const t = tokenOf(ctx);
  const headers = cors(ctx);
  if (!UUID.test(t)) return json({ ok: false, error: "Enlace no válido" }, 400, headers);
  try {
    await db(ctx.env, `newsletter_subscribers?token=eq.${t}&status=neq.baja`, { method: "PATCH", body: { status: "baja", unsubscribed_at: new Date().toISOString() } });
    return json({ ok: true }, 200, headers);
  } catch (e: any) {
    console.error("newsletter/baja", e?.message || e);
    return json({ ok: false, error: "No hemos podido darte de baja. Responde al último correo y lo hacemos a mano." }, 500, headers);
  }
}
