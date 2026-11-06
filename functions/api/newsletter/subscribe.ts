// POST /api/newsletter/subscribe · alta en la newsletter con doble confirmación por email.
// Acepta JSON (el formulario de /n y el panel) o un formulario HTML normal (redirige a /n).
// Siempre responde lo mismo («revisa tu correo») para no revelar quién está suscrito.
import { CONSENT_TEXT, renderConfirmHtml } from "../../../lib/newsletter";
import { Ctx, EMAIL_RE, cors, db, json, sendMail, site } from "../../../lib/server/nl";

export const onRequestOptions = (ctx: Ctx) => new Response(null, { status: 204, headers: cors(ctx) });

export async function onRequestPost(ctx: Ctx) {
  const { request, env } = ctx;
  const headers = cors(ctx);
  const isForm = !(request.headers.get("content-type") || "").includes("application/json");
  let body: Record<string, string> = {};
  try {
    body = isForm ? Object.fromEntries(Array.from((await request.formData()).entries()).map(([k, v]) => [k, String(v)])) : await request.json();
  } catch { return json({ ok: false, error: "Petición no válida" }, 400, headers); }

  const done = (estado: "revisa" | "error", status = 200, error?: string) =>
    isForm ? Response.redirect(`${site(ctx)}/n?estado=${estado}`, 303) : json(estado === "revisa" ? { ok: true } : { ok: false, error }, status, headers);

  if (body.website) return done("revisa");                       // trampa para bots: campo oculto relleno
  const email = String(body.email || "").trim().toLowerCase();
  if (!EMAIL_RE.test(email) || email.length > 200) return done("error", 400, "Ese email no parece válido");
  if (!env.SUPABASE_SERVICE_ROLE_KEY || !env.RESEND_API_KEY) return done("error", 503, "La newsletter aún no está configurada");
  const name = String(body.name || "").trim().slice(0, 80) || null;
  const source = String(body.source || "web").trim().slice(0, 40) || "web";

  try {
    const found = await db<any[]>(env, `newsletter_subscribers?select=id,status,token,confirm_sent_at,name&email=eq.${encodeURIComponent(email)}`);   // siempre se guarda en minúsculas
    let sub = found[0];
    if (sub?.status === "activo") return done("revisa");
    // no repetir el correo de confirmación más de una vez cada 10 minutos
    if (sub?.status === "pendiente" && sub.confirm_sent_at && Date.now() - new Date(sub.confirm_sent_at).getTime() < 10 * 60 * 1000) return done("revisa");

    const now = new Date().toISOString();
    const fields = { name: name || sub?.name || null, source, status: "pendiente", consent_text: CONSENT_TEXT, consent_at: now, confirm_sent_at: now, unsubscribed_at: null };
    if (sub) [sub] = await db<any[]>(env, `newsletter_subscribers?id=eq.${sub.id}`, { method: "PATCH", body: fields, prefer: "return=representation" });
    else [sub] = await db<any[]>(env, "newsletter_subscribers", { method: "POST", body: { email, ...fields }, prefer: "return=representation" });

    const url = `${site(ctx)}/api/newsletter/confirm?t=${sub.token}`;
    await sendMail(env, { to: email, subject: "Confirma tu suscripción a ALDIA Intelligence", html: renderConfirmHtml(url, sub.name), text: `Confirma tu suscripción a ALDIA Intelligence: ${url}\n\nSi no te has suscrito tú, ignora este correo.` });
    return done("revisa");
  } catch (e: any) {
    console.error("newsletter/subscribe", e?.message || e);
    return done("error", 500, "No hemos podido apuntarte ahora. Prueba en unos minutos.");
  }
}
