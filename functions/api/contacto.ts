// POST /api/contacto · el formulario de contacto de aldiaproject.es (y el asistente y la auditoría) deja aquí su mensaje.
// Se guarda en contact_messages con la clave secreta (la web nunca toca Supabase) y aparece al momento en «Mensajes web».
// Si hay RESEND_API_KEY y CONTACT_NOTIFY (emails separados por comas), además avisa al equipo por correo.
import { EMAIL_RE, Env as NlEnv, db, json, sendMail } from "../../lib/server/nl";

type Env = NlEnv & { CONTACT_NOTIFY?: string; CONTACT_ORIGINS?: string };
type Ctx = { request: Request; env: Env };

const ORIGINS = ["https://aldiaproject.es", "https://www.aldiaproject.es"];

function cors(ctx: Ctx): Record<string, string> {
  const origin = ctx.request.headers.get("origin");
  if (!origin) return {};
  const extra = `${ctx.env.CONTACT_ORIGINS || ""},${ctx.env.NEWSLETTER_ORIGINS || ""}`.split(",").map((s) => s.trim().replace(/\/$/, "")).filter(Boolean);
  const ok = [new URL(ctx.request.url).origin, ...ORIGINS, ...extra].includes(origin) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
  return ok ? { "access-control-allow-origin": origin, "access-control-allow-methods": "POST, OPTIONS", "access-control-allow-headers": "content-type", vary: "origin" } : {};
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));

export const onRequestOptions = (ctx: Ctx) => new Response(null, { status: 204, headers: cors(ctx) });

export async function onRequestPost(ctx: Ctx) {
  const { request, env } = ctx;
  const headers = cors(ctx);
  const isForm = !(request.headers.get("content-type") || "").includes("application/json");
  let b: Record<string, any> = {};
  try {
    b = isForm ? Object.fromEntries(Array.from((await request.formData()).entries()).map(([k, v]) => [k, String(v)])) : await request.json();
  } catch { return json({ ok: false, error: "Petición no válida" }, 400, headers); }

  if (b.website) return json({ ok: true }, 200, headers);          // trampa para bots: campo oculto relleno
  const nombre = String(b.nombre || b.name || "").trim().slice(0, 120);
  const email = String(b.email || "").trim().toLowerCase().slice(0, 200);
  const tel = String(b.telefono || b.phone || "").trim().slice(0, 40);
  const origen = String(b.origen || "Web").trim().slice(0, 60);
  let mensaje = String(b.mensaje || b.message || "").trim().slice(0, 5000);
  if (!nombre || !EMAIL_RE.test(email)) return json({ ok: false, error: "Faltan el nombre o un email válido" }, 400, headers);
  if (!mensaje) mensaje = "Pide que le contactemos.";
  if (origen && !/formulario de contacto principal/i.test(origen)) mensaje += `\n\n— Desde: ${origen}`;
  if (!env.SUPABASE_SERVICE_ROLE_KEY) return json({ ok: false, error: "El formulario aún no está configurado" }, 503, headers);

  try {
    // el mismo email no puede dejar más de un mensaje por minuto (bots y dobles clics)
    const since = new Date(Date.now() - 60_000).toISOString();
    const dup = await db<any[]>(env, `contact_messages?select=id&correo_cliente=eq.${encodeURIComponent(email)}&created_at=gte.${encodeURIComponent(since)}&limit=1`);
    if (!dup.length) {
      await db(env, "contact_messages", { method: "POST", body: { nombre_cliente: nombre, correo_cliente: email, telefono_cliente: tel && !/no proporcionado/i.test(tel) ? tel : null, mensaje_cliente: mensaje, estado: "sin responder" } });
      const to = (env.CONTACT_NOTIFY || "").split(",").map((s) => s.trim()).filter(Boolean);
      if (to.length && env.RESEND_API_KEY) {
        await Promise.all(to.map((t) => sendMail(env, {
          to: t, subject: `Nuevo mensaje web de ${nombre}`,
          html: `<p><b>${esc(nombre)}</b> · ${esc(email)}${tel ? ` · ${esc(tel)}` : ""}</p><p style="white-space:pre-wrap">${esc(mensaje)}</p><p>Respóndelo desde Smart Connect › Mensajes web.</p>`,
          text: `${nombre} · ${email}${tel ? ` · ${tel}` : ""}\n\n${mensaje}\n\nRespóndelo desde Smart Connect › Mensajes web.`,
          headers: { "Reply-To": email },
        }).catch((e) => console.error("contacto/aviso", e?.message || e))));
      }
    }
    return json({ ok: true }, 200, headers);
  } catch (e: any) {
    console.error("contacto", e?.message || e);
    return json({ ok: false, error: "No se ha podido enviar ahora. Prueba en unos minutos." }, 500, headers);
  }
}
