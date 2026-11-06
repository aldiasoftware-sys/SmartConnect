// POST /api/newsletter/send · { edition_id, test?: boolean }   (solo el equipo, con su sesión de Supabase)
// test → una prueba al email de quien la pide.
// envío real → hasta 10 tandas de 100 por llamada; el panel vuelve a llamar mientras queden («remaining» > 0).
// Cada correo enviado queda en newsletter_sends: si se corta (p. ej. límite diario de Resend), se reanuda sin repetir.
import { Edition, renderEmailHtml, renderEmailText } from "../../../lib/newsletter";
import { Ctx, Mail, db, json, sendBatch, sendMail, site, teamUser } from "../../../lib/server/nl";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const BATCH = 100, MAX_BATCHES = 10;

export async function onRequestPost(ctx: Ctx) {
  const { env } = ctx;
  const me = await teamUser(ctx);
  if (!me) return json({ ok: false, error: "Solo para el equipo" }, 401);
  if (!env.SUPABASE_SERVICE_ROLE_KEY || !env.RESEND_API_KEY) return json({ ok: false, error: "Faltan RESEND_API_KEY o SUPABASE_SERVICE_ROLE_KEY en Cloudflare Pages" }, 503);

  const { edition_id, test } = (await ctx.request.json().catch(() => ({}))) as { edition_id?: string; test?: boolean };
  if (!edition_id || !UUID.test(edition_id)) return json({ ok: false, error: "Falta la edición" }, 400);
  const [edition] = await db<Edition[]>(env, `newsletter_editions?id=eq.${edition_id}`);
  if (!edition) return json({ ok: false, error: "No existe esa edición" }, 404);
  if (!edition.subject?.trim()) return json({ ok: false, error: "La edición no tiene asunto" }, 400);
  const base = site(ctx);

  try {
    if (test) {
      const unsub = `${base}/n?estado=prueba`;
      await sendMail(env, { to: me, subject: `[Prueba] ${edition.subject}`, html: renderEmailHtml(edition, { unsubscribeUrl: unsub }), text: renderEmailText(edition, { unsubscribeUrl: unsub }) });
      return json({ ok: true, test: true, to: me });
    }
    if (edition.status === "enviada") return json({ ok: false, error: "Esta edición ya se envió" }, 409);
    if (edition.status === "borrador") {
      await db(env, `newsletter_editions?id=eq.${edition_id}`, { method: "PATCH", body: { status: "enviando", sent_at: new Date().toISOString(), updated_at: new Date().toISOString() } });
      edition.sent_at = new Date().toISOString();
    }

    const subs = await db<{ id: string; email: string; name: string | null; token: string }[]>(env, "newsletter_subscribers?select=id,email,name,token&status=eq.activo&order=created_at");
    const sent = new Set((await db<{ subscriber_id: string }[]>(env, `newsletter_sends?select=subscriber_id&edition_id=eq.${edition_id}`)).map((s) => s.subscriber_id));
    const queue = subs.filter((s) => !sent.has(s.id));

    let done = 0, error: string | null = null;
    for (let b = 0; b < MAX_BATCHES && done < queue.length; b++) {
      const chunk = queue.slice(done, done + BATCH);
      const mails: Mail[] = chunk.map((s) => {
        const unsub = `${base}/api/newsletter/baja?t=${s.token}`;
        return {
          to: s.email, subject: edition.subject,
          html: renderEmailHtml(edition, { unsubscribeUrl: unsub, name: s.name }), text: renderEmailText(edition, { unsubscribeUrl: unsub, name: s.name }),
          headers: { "List-Unsubscribe": `<${unsub}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
        };
      });
      try {
        const ids = await sendBatch(env, mails);
        await db(env, "newsletter_sends", { method: "POST", body: chunk.map((s, i) => ({ edition_id, subscriber_id: s.id, resend_id: ids[i] || null })), prefer: "resolution=ignore-duplicates" });
        done += chunk.length;
      } catch (e: any) {
        error = e?.status === 429 ? "Resend ha llegado a su límite (en el plan gratis, 100 correos al día). Pulsa «Continuar envío» mañana o sube de plan." : e?.message || "Error al enviar";
        break;
      }
    }

    const total = sent.size + done, remaining = queue.length - done;
    if (!remaining) await db(env, `newsletter_editions?id=eq.${edition_id}`, { method: "PATCH", body: { status: "enviada", recipients: total, updated_at: new Date().toISOString() } });
    else await db(env, `newsletter_editions?id=eq.${edition_id}`, { method: "PATCH", body: { recipients: total, updated_at: new Date().toISOString() } });
    return json({ ok: !error, sent: done, total, remaining, error }, error && !done ? 502 : 200);
  } catch (e: any) {
    console.error("newsletter/send", e?.message || e);
    return json({ ok: false, error: e?.message || "Error al enviar" }, 500);
  }
}
