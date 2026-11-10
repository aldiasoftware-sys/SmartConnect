// Modelo del Roadmap de arranque de ALDIA (v2): cuentas, contenido, comunidad, ofertas y sus métricas.

// ===================== CUENTAS =====================
export type Platform = "linkedin" | "tiktok" | "own";
export type Account = { id: string; platform: Platform; name: string; owner: string; color: string; optional?: boolean };

/** Redes (seguidores) */
export const ACCOUNTS: Account[] = [
  { id: "tiktok_aldia", platform: "tiktok", name: "TikTok", owner: "Aldia (conjunta)", color: "#fe2c55" },
  { id: "linkedin_guille", platform: "linkedin", name: "LinkedIn", owner: "Guille", color: "#0a66c2" },
  { id: "linkedin_millan", platform: "linkedin", name: "LinkedIn", owner: "Millán", color: "#5b6472" },
];
/** Comunidad propia (lo que no alquilamos a las redes) */
export const OWN_CHANNELS: Account[] = [
  { id: "canal_avisos", platform: "own", name: "Canal de avisos", owner: "Telegram / WhatsApp", color: "#229ed9", optional: true },
  { id: "newsletter", platform: "own", name: "Newsletter", owner: "Suscriptores", color: "#0e0e0e", optional: true },
];
export const ALL_CHANNELS = [...ACCOUNTS, ...OWN_CHANNELS];

export type Snapshot = { id?: string; week_start: string; account: string; followers: number };
export type GanttItem = {
  id?: string; title: string; owner: string | null; category: string | null;
  start_date: string; end_date: string; progress: number; notes?: string | null;
};

// ===================== FECHAS (semanas de lunes a domingo, en hora local) =====================
export const toISO = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const fromISO = (s: string) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
export const addDays = (s: string, n: number) => { const d = fromISO(s); d.setDate(d.getDate() + n); return toISO(d); };
export const weekStart = (d = new Date()) => { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return toISO(x); };
export const daysBetween = (a: string, b: string) => Math.round((fromISO(b).getTime() - fromISO(a).getTime()) / 86400000);
export const weekNumber = (s: string) => {
  const d = fromISO(s); d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const w1 = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d.getTime() - w1.getTime()) / 86400000 - 3 + ((w1.getDay() + 6) % 7)) / 7);
};
const MES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
export const DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
export const shortDate = (s: string) => { const d = fromISO(s); return `${d.getDate()} ${MES[d.getMonth()]}`; };
export const weekLabel = (s: string) => `${shortDate(s)} – ${shortDate(addDays(s, 6))}`;
export const today = () => toISO(new Date());

/** El check-in se abre cada lunes a las 8:00; hasta esa hora sigue tocando el de la semana anterior. */
export const CHECKIN_HOUR = 8;
export const checkinWeek = (now = new Date()) => weekStart(new Date(now.getTime() - CHECKIN_HOUR * 3600000));
export const nextCheckinAt = (now = new Date()) => { const d = fromISO(addDays(checkinWeek(now), 7)); d.setHours(CHECKIN_HOUR, 0, 0, 0); return d; };
/** «2 d 23 h 41 min» hasta una fecha */
export const countdown = (to: Date, now = new Date()) => {
  const m = Math.max(0, Math.floor((to.getTime() - now.getTime()) / 60000));
  const d = Math.floor(m / 1440), h = Math.floor((m % 1440) / 60), min = m % 60;
  return d ? `${d} d ${h} h ${min} min` : h ? `${h} h ${min} min` : `${min} min`;
};
export const fmt = (n: number) => n.toLocaleString("es-ES");
export const euros = (n: number) => `${Math.round(n).toLocaleString("es-ES")} €`;
export const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);

// ===================== CONTENIDO =====================
export type Post = {
  id?: string; publish_date: string | null; platform: string; kind: string | null; owner: string | null;
  title: string; keyword?: string | null; status: string; url?: string | null; notes?: string | null;
  /** vídeo de Archivos del que sale (persona/fecha/pieza); lo rellena la sincronización Archivos → Calendario */
  archivo?: string | null;
};
export const PLATFORMS: Record<string, { label: string; color: string; soft: string }> = {
  tiktok: { label: "TikTok", color: "#fe2c55", soft: "#ffe8ed" },
  linkedin: { label: "LinkedIn", color: "#0a66c2", soft: "#e3eefa" },
  instagram: { label: "Instagram", color: "#d6249f", soft: "#fbe6f4" },
  newsletter: { label: "Newsletter", color: "#0e0e0e", soft: "#eceef1" },
  directo: { label: "Directo", color: "#e8590c", soft: "#ffeadc" },
  telegram: { label: "Telegram", color: "#229ed9", soft: "#e2f3fb" },
};
export const KINDS: Record<string, string> = {
  noticia: "Noticia de IA", automatizacion: "Automatización", tutorial: "Tutorial", caso: "Caso real",
  post: "Post", video: "Vídeo", pregunta: "Pregunta del viernes", newsletter: "Newsletter", directo: "Directo mensual", aviso: "Aviso / recurso",
};
/** Del guion al vídeo: nosotros guion y voz, Claude monta, n8n lo deja listo para subir. */
export const STATUSES = [
  { id: "idea", label: "Idea", color: "#9aa0ab" },
  { id: "guion", label: "Guion", color: "#e8590c" },
  { id: "voz", label: "Voz grabada", color: "#b7791f" },
  { id: "montado", label: "Montado", color: "#0a66c2" },
  { id: "publicado", label: "Publicado", color: "#12a26b" },
];
export const statusOf = (id: string) => STATUSES.find((s) => s.id === id) || STATUSES[0];

/** Mínimos de la rutina: 3 TikToks (ni menos ni muchos más) y 2 posts de LinkedIn a la semana; 1 publicación al día por red como máximo. */
export const TARGETS = { tiktok: 3, linkedin: 2 };

/** La semana tipo del roadmap: cuatro piezas de TikTok (lunes a jueves) y dos de LinkedIn (caso del jueves y pregunta del viernes). */
export const WEEK_TEMPLATE: Omit<Post, "publish_date">[] = [
  { platform: "tiktok", kind: "noticia", owner: "Aldia", title: "Noticia de IA: qué ha salido y qué le cambia a una empresa", status: "idea" },
  { platform: "tiktok", kind: "automatizacion", owner: "Aldia", title: "Automatización de la semana · «Comenta PALABRA»", keyword: "", status: "idea" },
  { platform: "tiktok", kind: "tutorial", owner: "Aldia", title: "Tutorial paso a paso con la pantalla real", status: "idea" },
  { platform: "tiktok", kind: "caso", owner: "Aldia", title: "Caso real de uno de nuestros sectores", status: "idea" },
  { platform: "linkedin", kind: "caso", owner: "Guille", title: "El caso de la semana y lo aprendido", status: "idea" },
  { platform: "linkedin", kind: "pregunta", owner: "Millán", title: "Pregunta del viernes (encuesta o pregunta abierta)", status: "idea" },
];
export const TEMPLATE_DAY = [0, 1, 2, 3, 3, 4]; // lunes… viernes, en el mismo orden que WEEK_TEMPLATE

export type WeekContent = { week: string; tiktok: number; linkedin: number; planned: number; published: number; failed: number; reviewed: boolean };

/** Publicaciones de cada semana: lo publicado, lo planificado y los fallos (planificado, con la fecha pasada y sin publicar). */
export function contentByWeek(posts: Post[], weeks: string[], platform?: string): WeekContent[] {
  const t = today();
  return weeks.map((w) => {
    const end = addDays(w, 6);
    const ps = posts.filter((p) => p.publish_date && p.publish_date >= w && p.publish_date <= end && (!platform || p.platform === platform) && (p.platform === "tiktok" || p.platform === "linkedin"));
    const pub = ps.filter((p) => p.status === "publicado");
    return {
      week: w,
      tiktok: pub.filter((p) => p.platform === "tiktok").length,
      linkedin: pub.filter((p) => p.platform === "linkedin").length,
      planned: ps.length,
      published: pub.length,
      failed: ps.filter((p) => p.status !== "publicado" && p.publish_date! < t).length,
      reviewed: end < t,
    };
  });
}
/** ¿Se cumplió el mínimo de la rutina esa semana? */
export const metMinimum = (c: WeekContent) => c.tiktok >= TARGETS.tiktok && c.linkedin >= TARGETS.linkedin;

// ===================== SEGUIDORES =====================
/** Semanas con algún dato, de la más antigua a la más reciente, sin huecos. */
export function weekRange(dates: string[], upTo = weekStart()) {
  const all = dates.map((d) => weekStart(fromISO(d))).sort();
  if (!all.length) return [upTo];
  const out: string[] = []; const last = all[all.length - 1] > upTo ? all[all.length - 1] : upTo;
  for (let w = all[0]; w <= last; w = addDays(w, 7)) out.push(w);
  return out;
}

/** Seguidores de cada cuenta en cada semana; si una semana no se apuntó, se arrastra el último valor conocido. */
export function followerSeries(snaps: Snapshot[], weeks: string[], accounts: Account[] = ACCOUNTS) {
  const series: Record<string, (number | null)[]> = {};
  for (const a of accounts) {
    let last: number | null = null;
    series[a.id] = weeks.map((w) => {
      const s = snaps.find((x) => x.account === a.id && x.week_start === w);
      if (s) last = s.followers;
      return last;
    });
  }
  const total = weeks.map((_, i) => accounts.reduce((sum, a) => sum + (series[a.id][i] ?? 0), 0));
  return { series, total };
}

/** Último valor apuntado de una cuenta (o null). */
export const latestFollowers = (snaps: Snapshot[], acc: string) =>
  [...snaps].filter((s) => s.account === acc).sort((a, b) => b.week_start.localeCompare(a.week_start))[0]?.followers ?? null;

// ===================== COMUNIDAD =====================
export type Person = {
  id?: string; name: string; kind: PersonKind; stage: number; origin: string | null; keyword?: string | null;
  email?: string | null; company?: string | null; sector?: string | null; pain?: string | null;
  pending_reply: boolean; pending_since?: string | null; last_contact?: string | null; next_step?: string | null; notes?: string | null; created_at?: string;
};
/** Lead → Contacto → Cliente: se puede pasar de uno a otro en los dos sentidos */
export type PersonKind = "lead" | "contacto" | "cliente";
export const PERSON_KINDS: { id: PersonKind; label: string; plural: string; desc: string }[] = [
  { id: "lead", label: "Lead", plural: "Leads", desc: "Ha mostrado interés (comentario, palabra clave, descarga), pero aún no hay relación. Se le nutre." },
  { id: "contacto", label: "Contacto", plural: "Contactos", desc: "Ya hemos hablado: sabemos quién es, qué hace y qué le duele. Trato de tú a tú y seguimiento." },
  { id: "cliente", label: "Cliente", plural: "Clientes", desc: "Ya trabaja con nosotros: diagnóstico, proyecto o mantenimiento." },
];
export const kindOf = (k?: string | null) => PERSON_KINDS.find((x) => x.id === k) || PERSON_KINDS[0];

/** La escalera para que interactúen con nosotros */
export const LADDER = [
  { n: 1, label: "Ver", desc: "Un post útil que resuelve una duda concreta" },
  { n: 2, label: "Comentar", desc: "«Comenta PALABRA y te lo envío»" },
  { n: 3, label: "Recibir", desc: "DM automático con el recurso y el enlace para el email" },
  { n: 4, label: "Suscribirse", desc: "Newsletter / canal de avisos" },
  { n: 5, label: "Participar", desc: "Directos, webinars, comunidad cerrada" },
  { n: 6, label: "Hablar con ALDIA", desc: "Diagnóstico gratuito de 30 minutos" },
];
export const ORIGINS = ["LinkedIn", "TikTok", "Web", "Boca a boca"];
/** Abrir Skool cuando haya entre 30 y 50 personas que respondan */
export const SKOOL_AT = 30;
export const hoursWaiting = (p: Person) => (p.pending_reply && p.pending_since ? (Date.now() - new Date(p.pending_since).getTime()) / 3600000 : 0);

// ===================== OFERTAS =====================
export type Offer = {
  id?: string; client: string; tier: string; status: string; amount: number; monthly: number;
  problem?: string | null; pattern?: string | null; next_step?: string | null; next_date?: string | null; notes?: string | null; created_at?: string;
};
/** Una oferta que se entiende en una frase: cada escalón abre el siguiente */
export const TIERS: Record<string, { label: string; sub: string; price: string; next: string }> = {
  diagnostico: { label: "ALDIA Óptima", sub: "Diagnóstico", price: "Primera reunión gratis; si se acepta, se acuerda el pago del diagnóstico", next: "Estudio de los procesos y propuesta" },
  portfolio: { label: "Servicio portfolio", sub: "App o automatización", price: "Según la capacidad de la empresa", next: "Reuniones y propuesta" },
  mantenimiento: { label: "Mantenimiento", sub: "Mensual", price: "150–500 €/mes", next: "Nuevos procesos" },
};
export const OFFER_STATUSES = [
  { id: "reunion", label: "Primera reunión", color: "#9aa0ab" },
  { id: "diagnostico", label: "Diagnóstico", color: "#b7791f" },
  { id: "propuesta", label: "Propuesta enviada", color: "#0a66c2" },
  { id: "negociacion", label: "Negociando", color: "#e8590c" },
  { id: "ganada", label: "Ganada", color: "#12a26b" },
  { id: "perdida", label: "Perdida", color: "#e5484d" },
];
export const OPEN_OFFER = (o: Offer) => o.status !== "ganada" && o.status !== "perdida";
/** Los precios se validan tras los diez primeros diagnósticos */
export const DIAGNOSTICS_TO_VALIDATE = 10;
/** El SaaS sale de un problema que se repite en tres o más empresas */
export const SAAS_REPEAT = 3;
export const SAAS_STEPS = [
  { label: "Detectar el patrón", desc: "El problema se repite en tres o más empresas" },
  { label: "Plantilla interna", desc: "Base reutilizable en lugar de empezar de cero" },
  { label: "Servicio productizado", desc: "Mismo alcance, precio y entrega para todos" },
  { label: "Landing y lista de espera", desc: "Serie «Construyendo ALDIA» mientras se construye" },
  { label: "Piloto pagado", desc: "Tres clientes que pagan antes de que esté terminado" },
  { label: "Decidir", desc: "Construir el SaaS solo si se repite y hay quien pague" },
];
/** Problemas que se repiten: etiqueta → clientes distintos */
export function patterns(offers: Offer[]) {
  const m = new Map<string, Set<string>>();
  for (const o of offers) { const k = (o.pattern || "").trim(); if (!k) continue; const key = k.toLowerCase(); if (!m.has(key)) m.set(key, new Set()); m.get(key)!.add(o.client.trim().toLowerCase()); }
  return Array.from(m.entries()).map(([k, s]) => ({ pattern: offers.find((o) => (o.pattern || "").trim().toLowerCase() === k)!.pattern!.trim(), clients: s.size }))
    .sort((a, b) => b.clients - a.clients);
}
