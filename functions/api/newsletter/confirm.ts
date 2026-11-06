// GET /api/newsletter/confirm?t=<token> · el enlace del correo de confirmación.
import { Ctx, db, site } from "../../../lib/server/nl";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function onRequestGet(ctx: Ctx) {
  const t = new URL(ctx.request.url).searchParams.get("t") || "";
  const go = (estado: string) => Response.redirect(`${site(ctx)}/n?estado=${estado}`, 303);
  if (!UUID.test(t)) return go("error");
  try {
    const rows = await db<any[]>(ctx.env, `newsletter_subscribers?select=id,status&token=eq.${t}`);
    const sub = rows[0];
    if (!sub) return go("error");
    if (sub.status !== "activo") {
      await db(ctx.env, `newsletter_subscribers?id=eq.${sub.id}`, { method: "PATCH", body: { status: "activo", confirmed_at: new Date().toISOString(), unsubscribed_at: null } });
    }
    return go("confirmado");
  } catch (e: any) {
    console.error("newsletter/confirm", e?.message || e);
    return go("error");
  }
}
