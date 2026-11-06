"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import Portal from "@/components/Portal";
import {
  Calendar as CalendarIcon,
  Clock,
  Video,
  Phone,
  MoreHorizontal,
  Plus,
  ChevronLeft,
  ChevronRight,
  X,
  Save,
  Trash2,
  CalendarDays,
  ArrowUpRight,
} from "lucide-react";

interface Reunion {
  id?: string;
  nombre_reunion: string;
  fecha_reunion: string;
  duracion: string;
  origen: "Calendly" | "Telefono" | "Otro";
  notas?: string;
  created_at?: string;
}

type Origen = Reunion["origen"];

const ORIGENES: { id: Origen; label: string; cls: string; Icon: typeof Video }[] = [
  { id: "Calendly", label: "Calendly", cls: "cal", Icon: Video },
  { id: "Telefono", label: "Teléfono", cls: "tel", Icon: Phone },
  { id: "Otro", label: "Otro", cls: "otro", Icon: MoreHorizontal },
];
const origenDe = (o?: string | null) => ORIGENES.find((x) => x.id === o) || ORIGENES[2];

const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];
const MONTH_SHORT = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const WEEKDAY_SHORT = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"]; // por getDay()
const WEEKDAY_LONG = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const DURACIONES = ["15 min", "30 min", "45 min", "1 hora"];

// Medidas de la celda (deben cuadrar con el CSS de abajo) para saber cuántas píldoras caben
const CELL_CHROME = 5 * 2 + 2 + 20 + 3; // padding + borde + cabecera del día + hueco
const PILL_H = 18;
const PILL_GAP = 2;

const pad = (n: number) => String(n).padStart(2, "0");
const keyOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
/** Valor para <input type="datetime-local"> en hora local */
const toLocalInput = (d: Date) => `${keyOf(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
const hora = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const sameDay = (a: Date, b: Date) => keyOf(a) === keyOf(b);

function cuandoEs(d: Date, now: Date) {
  const mins = Math.round((d.getTime() - now.getTime()) / 60000);
  if (mins <= 0) return "Ahora";
  if (mins < 60) return `En ${mins} min`;
  if (sameDay(d, now)) {
    const h = Math.floor(mins / 60), m = mins % 60;
    return `En ${h} h${m ? ` ${m} min` : ""}`;
  }
  const manana = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  if (sameDay(d, manana)) return `Mañana · ${hora(d)}`;
  return `${WEEKDAY_SHORT[d.getDay()]} ${d.getDate()} ${MONTH_SHORT[d.getMonth()]} · ${hora(d)}`;
}

export default function ReunionesPage() {
  const [reuniones, setReuniones] = useState<Reunion[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [currentReunion, setCurrentReunion] = useState<Reunion | null>(null);
  const [duracion, setDuracion] = useState("30 min");
  const [saving, setSaving] = useState(false);
  const [dayOpen, setDayOpen] = useState<string | null>(null);

  // Calendar state
  const [currentDate, setCurrentDate] = useState(new Date());
  const [now, setNow] = useState(new Date());
  const gridRef = useRef<HTMLDivElement>(null);
  const [gridH, setGridH] = useState(0);

  useEffect(() => {
    fetchReuniones();

    const channel = supabase
      .channel("reuniones-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reuniones" },
        () => {
          fetchReuniones();
        }
      )
      .subscribe();

    const t = setInterval(() => setNow(new Date()), 60000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(t);
    };
  }, []);

  // Alto real de la rejilla → cuántas reuniones caben por día sin desbordar
  useEffect(() => {
    const el = gridRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([entry]) => setGridH(entry.contentRect.height));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Esc cierra el diálogo abierto
  useEffect(() => {
    if (!isDrawerOpen && !dayOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (isDrawerOpen) setIsDrawerOpen(false);
      else setDayOpen(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isDrawerOpen, dayOpen]);

  async function fetchReuniones() {
    setLoading(true);
    const { data, error } = await supabase
      .from("reuniones")
      .select("*")
      .order("fecha_reunion", { ascending: true });

    if (error) {
      console.error("Error fetching reuniones:", error);
    } else {
      setReuniones(data || []);
    }
    setLoading(false);
  }

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const fechaLocal = formData.get("fecha_reunion") as string;
    const fecha = new Date(fechaLocal);

    const reunionData: Reunion = {
      nombre_reunion: formData.get("nombre_reunion") as string,
      // el input da hora local; se guarda con su zona para que se vea igual al volver
      fecha_reunion: isNaN(fecha.getTime()) ? fechaLocal : fecha.toISOString(),
      duracion: formData.get("duracion") as string,
      origen: formData.get("origen") as Origen,
      notas: formData.get("notas") as string,
    };

    setSaving(true);
    if (currentReunion?.id) {
      const { error } = await supabase
        .from("reuniones")
        .update(reunionData)
        .eq("id", currentReunion.id);

      if (error) alert("Error al actualizar");
    } else {
      const { error } = await supabase
        .from("reuniones")
        .insert([reunionData]);

      if (error) alert("Error al crear");
    }
    setSaving(false);

    setIsDrawerOpen(false);
    setCurrentReunion(null);
    fetchReuniones();
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Estás seguro de eliminar esta reunión?")) return;

    const { error } = await supabase
      .from("reuniones")
      .delete()
      .eq("id", id);

    if (error) alert("Error al eliminar");
    else {
      setIsDrawerOpen(false);
      setCurrentReunion(null);
      fetchReuniones();
    }
  }

  /** Nueva reunión; si viene un día, se propone ese día (hoy: la próxima hora en punto; otro día: 10:00). */
  const openCreateDrawer = (day?: Date) => {
    let fecha: Date;
    const n = new Date();
    if (day && !sameDay(day, n)) {
      fecha = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 10, 0);
    } else if (day) {
      fecha = new Date(n.getFullYear(), n.getMonth(), n.getDate(), n.getHours() + 1, 0);
    } else {
      fecha = new Date(n.getFullYear(), n.getMonth(), n.getDate(), n.getHours(), n.getMinutes() < 30 ? 30 : 60);
    }
    setCurrentReunion({
      nombre_reunion: "",
      fecha_reunion: toLocalInput(fecha),
      duracion: "30 min",
      origen: "Calendly",
      notas: "",
    });
    setDuracion("30 min");
    setDayOpen(null);
    setIsDrawerOpen(true);
  };

  const openEditDrawer = (reunion: Reunion) => {
    setCurrentReunion(reunion);
    setDuracion(reunion.duracion || "");
    setDayOpen(null);
    setIsDrawerOpen(true);
  };

  // Calendar Helpers
  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToday = () => setCurrentDate(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const totalDays = daysInMonth(year, month);
  const offset = (new Date(year, month, 1).getDay() + 6) % 7; // lunes = 0
  const weeks = Math.ceil((offset + totalDays) / 7);
  const cells = Array.from({ length: weeks * 7 }, (_, i) => new Date(year, month, 1 - offset + i));
  const isCurrentMonth = month === now.getMonth() && year === now.getFullYear();

  // Reuniones agrupadas por día local
  const byDay = useMemo(() => {
    const m = new Map<string, Reunion[]>();
    for (const r of reuniones) {
      const d = new Date(r.fecha_reunion);
      if (isNaN(d.getTime())) continue;
      const k = keyOf(d);
      const list = m.get(k);
      if (list) list.push(r);
      else m.set(k, [r]);
    }
    m.forEach((list) => list.sort((a, b) => +new Date(a.fecha_reunion) - +new Date(b.fecha_reunion)));
    return m;
  }, [reuniones]);

  const getReunionesForDay = (d: Date) => byDay.get(keyOf(d)) || [];

  const monthReuniones = reuniones.filter((r) => {
    const d = new Date(r.fecha_reunion);
    return d.getMonth() === month && d.getFullYear() === year;
  });

  const upcoming = reuniones
    .filter((r) => +new Date(r.fecha_reunion) >= +now)
    .sort((a, b) => +new Date(a.fecha_reunion) - +new Date(b.fecha_reunion));
  const next = upcoming[0];

  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7));
  const weekEnd = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 7);
  const thisWeek = reuniones.filter((r) => {
    const t = +new Date(r.fecha_reunion);
    return t >= +weekStart && t < +weekEnd;
  }).length;
  const todayCount = getReunionesForDay(now).length;

  // Cuántas píldoras caben en cada día según el alto disponible
  const rowH = gridH > 0 ? (gridH - (weeks - 1) * 6) / weeks : 0;
  const slots = rowH > 0 ? Math.max(1, Math.floor((rowH - CELL_CHROME + PILL_GAP) / (PILL_H + PILL_GAP))) : 3;

  const dayOpenDate = dayOpen ? new Date(`${dayOpen}T00:00:00`) : null;
  const dayOpenList = dayOpen ? byDay.get(dayOpen) || [] : [];

  const pill = (r: Reunion) => {
    const d = new Date(r.fecha_reunion);
    const o = origenDe(r.origen);
    return (
      <button
        key={r.id}
        type="button"
        className={`reu-ev ${o.cls} ${+d < +now ? "done" : ""}`}
        title={`${hora(d)} · ${r.nombre_reunion}${r.duracion ? ` · ${r.duracion}` : ""} · ${o.label}`}
        onClick={(e) => { e.stopPropagation(); openEditDrawer(r); }}
      >
        <i />
        <time>{hora(d)}</time>
        <span>{r.nombre_reunion}</span>
      </button>
    );
  };

  const item = (r: Reunion, showDay = true) => {
    const d = new Date(r.fecha_reunion);
    const o = origenDe(r.origen);
    return (
      <button key={r.id} type="button" className="reu-item" onClick={() => openEditDrawer(r)}>
        {showDay ? (
          <span className={`reu-date ${sameDay(d, now) ? "on" : ""}`}>
            <small>{WEEKDAY_SHORT[d.getDay()]}</small>
            <b>{d.getDate()}</b>
          </span>
        ) : (
          <span className={`reu-o ${o.cls}`}><o.Icon /></span>
        )}
        <span className="reu-item-txt">
          <b>{r.nombre_reunion}</b>
          <small>{hora(d)}{r.duracion ? ` · ${r.duracion}` : ""}{showDay ? "" : ` · ${o.label}`}</small>
        </span>
        {showDay && <span className={`reu-dot ${o.cls}`} title={o.label} />}
      </button>
    );
  };

  // Agenda para móvil: días del mes con reuniones
  const agendaDays = cells
    .filter((d) => d.getMonth() === month)
    .map((d) => ({ d, list: getReunionesForDay(d) }))
    .filter((x) => x.list.length > 0);

  return (
    <div className="page-wrapper animate-in reu">
      <div className="mx-head reu-head">
        <div>
          <div className="eyebrow">Reuniones</div>
          <h2>
            {MONTH_NAMES[month]} <em>{year}</em>
            <span className="mx-count">
              {loading && reuniones.length === 0 ? "…" : `${monthReuniones.length} ${monthReuniones.length === 1 ? "reunión" : "reuniones"}`}
            </span>
          </h2>
        </div>
        <div className="mx-head-actions">
          {next && (
            <button type="button" className="reu-nextchip" onClick={() => openEditDrawer(next)} title="Siguiente reunión">
              <span className={`reu-dot ${origenDe(next.origen).cls}`} />
              <b>{next.nombre_reunion}</b>
              <small>{cuandoEs(new Date(next.fecha_reunion), now)}</small>
            </button>
          )}
          <div className="reu-nav" role="group" aria-label="Cambiar de mes">
            <button type="button" className="mx-act" onClick={prevMonth} aria-label="Mes anterior" title="Mes anterior">
              <ChevronLeft />
            </button>
            <button type="button" className={`reu-today ${isCurrentMonth ? "on" : ""}`} onClick={goToday}>
              Hoy
            </button>
            <button type="button" className="mx-act" onClick={nextMonth} aria-label="Mes siguiente" title="Mes siguiente">
              <ChevronRight />
            </button>
          </div>
          <button className="btn-primary" onClick={() => openCreateDrawer()}>
            <Plus size={18} />
            Nueva Reunión
          </button>
        </div>
      </div>

      <div className="reu-board">
        <section className="reu-cal" aria-label={`Calendario de ${MONTH_NAMES[month]} ${year}`}>
          <div className="reu-wk">
            {WEEKDAYS.map((d, i) => (
              <span key={d} className={i >= 5 ? "we" : ""}>{d}</span>
            ))}
          </div>
          <div className="reu-grid" ref={gridRef} style={{ gridTemplateRows: `repeat(${weeks}, minmax(0, 1fr))` }}>
            {cells.map((d, idx) => {
              const dayReuniones = getReunionesForDay(d);
              const out = d.getMonth() !== month;
              const isToday = sameDay(d, now);
              const isPast = !isToday && +d < +now;
              const weekend = idx % 7 >= 5;
              const overflow = dayReuniones.length > slots;
              const shown = overflow ? dayReuniones.slice(0, Math.max(0, slots - 1)) : dayReuniones;
              const hidden = dayReuniones.length - shown.length;

              return (
                <div
                  key={keyOf(d)}
                  className={`reu-cell ${out ? "out" : ""} ${isToday ? "today" : ""} ${isPast ? "past" : ""} ${weekend ? "we" : ""}`}
                  onClick={() => openCreateDrawer(d)}
                >
                  <div className="reu-top">
                    <span className="reu-num">
                      {d.getDate()}
                      {out && d.getDate() === 1 && <small>{MONTH_SHORT[d.getMonth()]}</small>}
                    </span>
                    <button
                      type="button"
                      className="reu-add"
                      aria-label={`Añadir reunión el ${d.getDate()} de ${MONTH_NAMES[d.getMonth()].toLowerCase()}`}
                      title="Añadir reunión"
                      onClick={(e) => { e.stopPropagation(); openCreateDrawer(d); }}
                    >
                      <Plus />
                    </button>
                  </div>
                  <div className="reu-evs">
                    {shown.map(pill)}
                    {hidden > 0 && (
                      <button
                        type="button"
                        className="reu-more"
                        onClick={(e) => { e.stopPropagation(); setDayOpen(keyOf(d)); }}
                      >
                        {shown.length === 0 ? `${hidden} ${hidden === 1 ? "reunión" : "reuniones"}` : `+${hidden} más`}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <aside className="reu-side">
          {next ? (
            <button type="button" className="reu-next" onClick={() => openEditDrawer(next)}>
              <span className="reu-next-top">
                <span>Siguiente reunión</span>
                <ArrowUpRight />
              </span>
              <b>{next.nombre_reunion}</b>
              <span className="reu-next-meta">
                <span className="reu-chip">{cuandoEs(new Date(next.fecha_reunion), now)}</span>
                <span>
                  {hora(new Date(next.fecha_reunion))}
                  {next.duracion ? ` · ${next.duracion}` : ""} · {origenDe(next.origen).label}
                </span>
              </span>
            </button>
          ) : (
            <div className="reu-next empty">
              <span className="reu-next-top"><span>Siguiente reunión</span></span>
              <b>Nada en la agenda</b>
              <span className="reu-next-meta"><span>Cuando entre una reunión aparecerá aquí.</span></span>
            </div>
          )}

          <div className="reu-stats">
            <div>
              <small>Hoy</small>
              <b>{todayCount}</b>
            </div>
            <div>
              <small>Esta semana</small>
              <b>{thisWeek}</b>
            </div>
          </div>

          <div className="reu-up">
            <div className="reu-up-head">
              <b>Próximas</b>
              <span className="mx-count">{upcoming.length}</span>
            </div>
            <div className="reu-up-list">
              {upcoming.length > 1 ? (
                upcoming.slice(1, 30).map((r) => item(r))
              ) : (
                <div className="reu-up-empty">
                  <CalendarDays />
                  <span>{upcoming.length === 1 ? "No hay más reuniones después de la siguiente." : "Sin reuniones próximas."}</span>
                </div>
              )}
            </div>
            <div className="reu-legend">
              {ORIGENES.map((o) => (
                <span key={o.id}><i className={`reu-dot ${o.cls}`} />{o.label}</span>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {/* Móvil: agenda en lista */}
      <div className="reu-agenda">
        {agendaDays.length === 0 ? (
          <div className="mx-empty">
            <span className="mx-ico"><CalendarDays /></span>
            <h3>Sin reuniones en {MONTH_NAMES[month].toLowerCase()}</h3>
            <p>Añade una reunión o cambia de mes con las flechas.</p>
            <button className="btn-primary" onClick={() => openCreateDrawer()}><Plus size={16} /> Nueva Reunión</button>
          </div>
        ) : (
          agendaDays.map(({ d, list }) => (
            <div key={keyOf(d)} className="reu-ag-day">
              <div className={`reu-ag-head ${sameDay(d, now) ? "on" : ""}`}>
                <b>{d.getDate()}</b>
                <span>{WEEKDAY_LONG[d.getDay()]}</span>
                {sameDay(d, now) && <span className="mx-pill info">Hoy</span>}
              </div>
              <div className="reu-ag-list">{list.map((r) => item(r, false))}</div>
            </div>
          ))
        )}
      </div>

      {/* Día con más reuniones de las que caben */}
      {dayOpen && dayOpenDate && (
        <Portal>
          <div className="dialog-overlay" onClick={() => setDayOpen(null)}>
            <div className="dialog reu-dialog" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
              <div className="dialog-head">
                <div>
                  <div className="eyebrow">{WEEKDAY_LONG[dayOpenDate.getDay()]}</div>
                  <h3 className="reu-dlg-title">
                    {dayOpenDate.getDate()} de {MONTH_NAMES[dayOpenDate.getMonth()].toLowerCase()}
                  </h3>
                </div>
                <button type="button" className="icon-btn" onClick={() => setDayOpen(null)} aria-label="Cerrar"><X /></button>
              </div>
              <div className="dialog-body reu-day-body">
                {dayOpenList.map((r) => item(r, false))}
              </div>
              <div className="dialog-foot">
                <span className="mx-meta">{dayOpenList.length} {dayOpenList.length === 1 ? "reunión" : "reuniones"}</span>
                <button type="button" className="btn-primary" onClick={() => openCreateDrawer(dayOpenDate)}>
                  <Plus size={16} /> Añadir
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* Crear / editar */}
      {isDrawerOpen && (
        <Portal>
          <div className="dialog-overlay" onClick={() => setIsDrawerOpen(false)}>
            <form
              key={currentReunion?.id || "nueva"}
              className="dialog reu-dialog"
              style={{ maxWidth: 520 }}
              onClick={(e) => e.stopPropagation()}
              onSubmit={handleSave}
            >
              <div className="dialog-head">
                <div>
                  <div className="eyebrow">Reuniones</div>
                  <h3 className="reu-dlg-title">{currentReunion?.id ? "Editar Reunión" : "Nueva Reunión"}</h3>
                </div>
                <button type="button" onClick={() => setIsDrawerOpen(false)} className="icon-btn" aria-label="Cerrar">
                  <X />
                </button>
              </div>

              <div className="dialog-body">
                <div className="form-group">
                  <label>Nombre de la Reunión</label>
                  <div className="reu-field">
                    <Video size={17} />
                    <input
                      name="nombre_reunion"
                      defaultValue={currentReunion?.nombre_reunion}
                      placeholder="Ej: Demo producto"
                      required
                      autoFocus={!currentReunion?.id}
                    />
                  </div>
                </div>

                <div className="reu-row">
                  <div className="form-group">
                    <label>Fecha y Hora</label>
                    <div className="reu-field">
                      <CalendarIcon size={17} />
                      <input
                        type="datetime-local"
                        name="fecha_reunion"
                        defaultValue={(() => {
                          const f = currentReunion?.fecha_reunion;
                          if (!f) return "";
                          const d = new Date(f);
                          return isNaN(d.getTime()) ? f.slice(0, 16) : toLocalInput(d);
                        })()}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Duración</label>
                    <div className="reu-field">
                      <Clock size={17} />
                      <input
                        name="duracion"
                        value={duracion}
                        onChange={(e) => setDuracion(e.target.value)}
                        placeholder="Ej: 30 min, 1 hora"
                        required
                      />
                    </div>
                  </div>
                </div>
                <div className="reu-quick">
                  {DURACIONES.map((d) => (
                    <button
                      key={d}
                      type="button"
                      className={`mx-pill ${duracion === d ? "info" : ""}`}
                      onClick={() => setDuracion(d)}
                    >
                      {d}
                    </button>
                  ))}
                </div>

                <div className="form-group">
                  <label>Origen</label>
                  <div className="reu-origen">
                    {ORIGENES.map((o) => (
                      <label key={o.id} className={o.cls}>
                        <input type="radio" name="origen" value={o.id} defaultChecked={(currentReunion?.origen || "Calendly") === o.id} required />
                        <span><o.Icon />{o.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Notas (Opcional)</label>
                  <textarea
                    name="notas"
                    defaultValue={currentReunion?.notas}
                    placeholder="Añade detalles adicionales..."
                    rows={3}
                  />
                </div>
              </div>

              <div className="dialog-foot">
                {currentReunion?.id ? (
                  <button type="button" className="btn-danger" onClick={() => handleDelete(currentReunion.id!)}>
                    <Trash2 size={15} /> Eliminar
                  </button>
                ) : <span />}
                <div className="reu-foot-actions">
                  <button type="button" className="btn-secondary" onClick={() => setIsDrawerOpen(false)}>Cancelar</button>
                  <button type="submit" className="btn-primary" disabled={saving}>
                    <Save size={16} />
                    {saving ? "Guardando…" : currentReunion?.id ? "Guardar Cambios" : "Crear Reunión"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </Portal>
      )}

      <style jsx global>{`
        /* Página a pantalla completa: el mes entero cabe sin hacer scroll */
        .page-wrapper.reu {
          height: calc(100vh - 68px);
          max-width: none;
          min-height: 540px;
          padding: 1.5rem 2.5rem 1.25rem;
          display: flex;
          flex-direction: column;
        }
        .reu .reu-head {
          margin-bottom: 1rem;
          align-items: center;
          flex-shrink: 0;
        }
        .reu .reu-head .eyebrow { margin-bottom: 0.25rem; }
        .reu .reu-head h2 { font-size: 2rem; }
        .reu .reu-head h2 em {
          font-style: normal;
          font-weight: 400;
          color: var(--text-muted);
          margin-left: -0.35rem;
        }
        .reu-nav {
          display: inline-flex;
          align-items: center;
          gap: 2px;
          padding: 4px;
          background: #fff;
          border: 1px solid var(--border-color);
          border-radius: 99px;
          box-shadow: var(--shadow-sm);
        }
        .reu-nav .mx-act { border-radius: 99px; }
        .reu-nav .mx-act svg { width: 18px; height: 18px; }
        .reu-today {
          border: 0;
          background: none;
          height: 32px;
          padding: 0 14px;
          border-radius: 99px;
          font-family: inherit;
          font-size: 0.8125rem;
          font-weight: 600;
          color: var(--text-secondary);
          cursor: pointer;
          transition: var(--transition);
        }
        .reu-today:hover { background: var(--bg-secondary); color: var(--ink); }
        .reu-today.on { background: var(--accent-soft); color: var(--accent); }

        .reu-board {
          flex: 1;
          min-height: 0;
          display: grid;
          grid-template-columns: minmax(0, 1fr) 272px;
          gap: 1rem;
        }

        /* ---------- calendario ---------- */
        .reu-cal {
          min-width: 0;
          min-height: 0;
          display: flex;
          flex-direction: column;
          background: #fff;
          border: 1px solid var(--border-color);
          border-radius: 24px;
          box-shadow: var(--shadow-sm);
          padding: 0.625rem 0.75rem 0.75rem;
        }
        .reu-wk {
          display: grid;
          grid-template-columns: repeat(7, minmax(0, 1fr));
          gap: 6px;
          padding: 0.25rem 0 0.5rem;
          flex-shrink: 0;
        }
        .reu-wk span {
          font-size: 0.6875rem;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--text-secondary);
          padding-left: 8px;
        }
        .reu-wk span.we { color: var(--text-muted); }
        .reu-grid {
          flex: 1;
          min-height: 0;
          display: grid;
          grid-template-columns: repeat(7, minmax(0, 1fr));
          gap: 6px;
        }
        .reu-cell {
          position: relative;
          min-width: 0;
          min-height: 0;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          gap: 3px;
          padding: 5px;
          background: #f7f9fc;
          border: 1px solid var(--border-color);
          border-radius: 12px;
          cursor: pointer;
          transition: background 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
        }
        .reu-cell.we {
          background: repeating-linear-gradient(135deg, #f7f8fb 0 8px, #f1f3f7 8px 16px);
        }
        .reu-cell:hover {
          background: #fff;
          border-color: var(--border-strong);
          box-shadow: var(--shadow-md);
        }
        .reu-cell.out {
          background: transparent;
          border-style: dashed;
        }
        .reu-cell.out .reu-num { color: #c3cad7; }
        .reu-cell.out .reu-evs { opacity: 0.5; }
        .reu-cell.today {
          background: #fff;
          border-color: var(--accent);
          box-shadow: 0 0 0 3px rgba(30, 58, 138, 0.12), var(--shadow-md);
        }
        .reu-top {
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-shrink: 0;
        }
        .reu-num {
          min-width: 22px;
          height: 20px;
          padding: 0 6px;
          border-radius: 99px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 3px;
          font-size: 0.75rem;
          font-weight: 600;
          font-variant-numeric: tabular-nums;
          color: var(--ink);
        }
        .reu-num small { font-size: 0.625rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; }
        .reu-cell.past .reu-num { color: var(--text-muted); }
        .reu-cell.today .reu-num { background: var(--accent); color: #fff; }
        .reu-add {
          width: 20px;
          height: 20px;
          border: 0;
          border-radius: 7px;
          background: var(--accent);
          color: #fff;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          opacity: 0;
          transform: scale(0.7);
          transition: var(--transition);
        }
        .reu-add svg { width: 13px; height: 13px; stroke-width: 2.5; }
        .reu-cell:hover .reu-add,
        .reu-add:focus-visible { opacity: 1; transform: none; }
        .reu-evs {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-height: 0;
        }
        .reu-ev {
          --c: var(--accent);
          --bg: var(--accent-soft);
          width: 100%;
          min-width: 0;
          height: 18px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 0 6px;
          border: 0;
          border-radius: 6px;
          background: var(--bg);
          color: var(--c);
          font-family: inherit;
          font-size: 0.6875rem;
          font-weight: 600;
          line-height: 18px;
          text-align: left;
          cursor: pointer;
          transition: background 0.15s ease, color 0.15s ease;
        }
        .reu-ev.tel { --c: #0b8a59; --bg: var(--ok-soft); }
        .reu-ev.otro { --c: var(--text-secondary); --bg: var(--bg-surface); }
        .reu-ev:hover { background: var(--c); color: #fff; }
        .reu-ev.done { opacity: 0.62; }
        .reu-ev i { width: 6px; height: 6px; border-radius: 99px; background: currentColor; flex-shrink: 0; }
        .reu-ev time { font-weight: 500; font-variant-numeric: tabular-nums; opacity: 0.8; flex-shrink: 0; }
        .reu-ev span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .reu-more {
          height: 18px;
          flex-shrink: 0;
          padding: 0 6px;
          border: 0;
          border-radius: 6px;
          background: none;
          font-family: inherit;
          font-size: 0.6875rem;
          font-weight: 600;
          color: var(--text-secondary);
          text-align: left;
          cursor: pointer;
        }
        .reu-more:hover { background: var(--bg-surface); color: var(--ink); }

        /* ---------- lateral ---------- */
        .reu-side {
          min-height: 0;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .reu-next {
          display: flex;
          flex-direction: column;
          align-items: stretch;
          gap: 0.5rem;
          width: 100%;
          padding: 1rem 1.125rem 1.125rem;
          border: 0;
          border-radius: 20px;
          background: linear-gradient(150deg, var(--navy) 0%, var(--navy-2) 100%);
          color: #fff;
          font-family: inherit;
          text-align: left;
          cursor: pointer;
          box-shadow: 0 30px 60px -30px rgba(30, 58, 138, 0.55);
          transition: var(--transition);
          flex-shrink: 0;
        }
        .reu-next:hover { transform: translateY(-2px); }
        .reu-next.empty { cursor: default; }
        .reu-next.empty:hover { transform: none; }
        .reu-next-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 0.6875rem;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--brand-light);
        }
        .reu-next-top svg { width: 16px; height: 16px; }
        .reu-next b {
          font-size: 1.0625rem;
          font-weight: 600;
          letter-spacing: -0.02em;
          line-height: 1.25;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .reu-next-meta {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 6px 8px;
          font-size: 0.75rem;
          color: #c4d2f5;
        }
        .reu-chip {
          padding: 3px 9px;
          border-radius: 99px;
          background: rgba(255, 255, 255, 0.14);
          color: #fff;
          font-weight: 600;
        }
        .reu-stats {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.75rem;
          flex-shrink: 0;
        }
        .reu-stats > div {
          background: #fff;
          border: 1px solid var(--border-color);
          border-radius: 16px;
          padding: 0.625rem 0.875rem 0.75rem;
          box-shadow: var(--shadow-sm);
        }
        .reu-stats small {
          display: block;
          font-size: 0.6875rem;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--text-muted);
        }
        .reu-stats b {
          display: block;
          font-size: 1.5rem;
          font-weight: 500;
          letter-spacing: -0.04em;
          line-height: 1.15;
          font-variant-numeric: tabular-nums;
        }
        .reu-up {
          flex: 1;
          min-height: 0;
          display: flex;
          flex-direction: column;
          background: #fff;
          border: 1px solid var(--border-color);
          border-radius: 20px;
          box-shadow: var(--shadow-sm);
          overflow: hidden;
        }
        .reu-up-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.75rem 1rem 0.5rem;
          flex-shrink: 0;
        }
        .reu-up-head b { font-size: 0.875rem; font-weight: 600; letter-spacing: -0.01em; }
        .reu-up-list {
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          scrollbar-width: thin;
          padding: 0 0.375rem 0.375rem;
        }
        .reu-up-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          padding: 1.5rem 1rem;
          text-align: center;
          font-size: 0.8125rem;
          color: var(--text-muted);
        }
        .reu-up-empty svg { width: 22px; height: 22px; }
        .reu-legend {
          display: flex;
          flex-wrap: wrap;
          gap: 4px 12px;
          padding: 0.625rem 1rem;
          border-top: 1px solid var(--border-color);
          font-size: 0.6875rem;
          font-weight: 600;
          color: var(--text-secondary);
          flex-shrink: 0;
        }
        .reu-legend span { display: inline-flex; align-items: center; gap: 6px; }

        /* fila de reunión (lateral, agenda móvil y diálogo del día) */
        .reu-item {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.5rem 0.625rem;
          border: 0;
          border-radius: 12px;
          background: none;
          font-family: inherit;
          text-align: left;
          cursor: pointer;
          transition: background 0.15s ease;
        }
        .reu-item:hover { background: var(--bg-secondary); }
        .reu-date {
          width: 38px;
          height: 40px;
          border-radius: 11px;
          background: var(--bg-secondary);
          display: inline-flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          line-height: 1.05;
        }
        .reu-date small { font-size: 0.5625rem; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--text-muted); }
        .reu-date b { font-size: 0.9375rem; font-weight: 600; color: var(--ink); font-variant-numeric: tabular-nums; }
        .reu-date.on { background: var(--accent); }
        .reu-date.on small { color: var(--brand-light); }
        .reu-date.on b { color: #fff; }
        .reu-item-txt { flex: 1; min-width: 0; display: flex; flex-direction: column; }
        .reu-item-txt b {
          font-size: 0.8125rem;
          font-weight: 600;
          color: var(--ink);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .reu-item-txt small { font-size: 0.75rem; color: var(--text-muted); font-variant-numeric: tabular-nums; }
        .reu-dot { width: 8px; height: 8px; border-radius: 99px; background: var(--accent); flex-shrink: 0; display: inline-block; }
        .reu-dot.tel { background: var(--ok); }
        .reu-dot.otro { background: var(--text-muted); }
        .reu-o {
          width: 36px;
          height: 36px;
          border-radius: 11px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          background: var(--accent-soft);
          color: var(--accent);
        }
        .reu-o.tel { background: var(--ok-soft); color: var(--ok); }
        .reu-o.otro { background: var(--bg-surface); color: var(--text-secondary); }
        .reu-o svg { width: 16px; height: 16px; }

        /* ---------- agenda (móvil) ---------- */
        .reu-agenda { display: none; }
        .reu-ag-day {
          background: #fff;
          border: 1px solid var(--border-color);
          border-radius: 20px;
          box-shadow: var(--shadow-sm);
          padding: 0.75rem 0.5rem 0.5rem;
        }
        .reu-ag-head {
          display: flex;
          align-items: baseline;
          gap: 0.5rem;
          padding: 0 0.625rem 0.375rem;
        }
        .reu-ag-head b { font-size: 1.375rem; font-weight: 500; letter-spacing: -0.04em; font-variant-numeric: tabular-nums; }
        .reu-ag-head > span:not(.mx-pill) { font-size: 0.8125rem; color: var(--text-secondary); text-transform: capitalize; flex: 1; }
        .reu-ag-head.on b { color: var(--accent); }

        /* ---------- diálogos ---------- */
        .reu-dlg-title { font-size: 1.25rem; font-weight: 500; letter-spacing: -0.03em; }
        .reu-dialog .eyebrow { text-transform: uppercase; }
        .dialog-body.reu-day-body { display: flex; flex-direction: column; gap: 2px; padding: 0.75rem 1.25rem; }
        .reu-field { position: relative; }
        .reu-field svg {
          position: absolute;
          left: 13px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-muted);
          pointer-events: none;
        }
        .reu-field input { padding-left: 2.5rem; }
        .reu-row {
          display: grid;
          grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr);
          gap: 0.875rem;
        }
        .reu-row .form-group { margin-bottom: 0.5rem; }
        .reu-quick { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 1.25rem; justify-content: flex-end; }
        .reu-origen { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.5rem; }
        .reu-origen label { margin: 0; cursor: pointer; }
        .reu-origen input { position: absolute; opacity: 0; width: 1px; height: 1px; pointer-events: none; }
        .reu-origen span {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          height: 42px;
          border: 1px solid var(--border-color);
          border-radius: 12px;
          background: #fff;
          font-size: 0.8125rem;
          font-weight: 600;
          color: var(--text-secondary);
          transition: var(--transition);
        }
        .reu-origen span svg { width: 16px; height: 16px; position: static; transform: none; }
        .reu-origen label:hover span { border-color: var(--border-strong); color: var(--ink); }
        .reu-origen input:checked + span { border-color: var(--accent); background: var(--accent-soft); color: var(--accent); box-shadow: 0 0 0 1px var(--accent); }
        .reu-origen label.tel input:checked + span { border-color: var(--ok); background: var(--ok-soft); color: var(--ok); box-shadow: 0 0 0 1px var(--ok); }
        .reu-origen label.otro input:checked + span { border-color: var(--ink); background: var(--bg-surface); color: var(--ink); box-shadow: 0 0 0 1px var(--ink); }
        .reu-origen input:focus-visible + span { box-shadow: 0 0 0 4px rgba(30, 58, 138, 0.15); }
        .reu-foot-actions { display: flex; gap: 0.5rem; }

        /* ---------- responsive ---------- */
        /* en portátiles (1366) el mes se lleva todo el ancho y la siguiente reunión sube a la cabecera */
        .reu-nextchip {
          display: none;
          align-items: center;
          gap: 8px;
          max-width: 320px;
          height: 42px;
          padding: 0 14px;
          border: 1px solid var(--border-color);
          border-radius: 99px;
          background: #fff;
          box-shadow: var(--shadow-sm);
          font-family: inherit;
          cursor: pointer;
          transition: var(--transition);
        }
        .reu-nextchip:hover { border-color: var(--border-strong); box-shadow: var(--shadow-md); }
        .reu-nextchip b {
          min-width: 0;
          font-size: 0.8125rem;
          font-weight: 600;
          color: var(--ink);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .reu-nextchip small {
          flex-shrink: 0;
          padding: 2px 8px;
          border-radius: 99px;
          background: var(--accent-soft);
          color: var(--accent);
          font-size: 0.6875rem;
          font-weight: 600;
        }
        @media (max-width: 1439px) {
          .reu-board { grid-template-columns: minmax(0, 1fr); }
          .reu-side { display: none; }
          .reu-nextchip { display: inline-flex; }
        }
        @media (max-width: 1080px) {
          .reu-nextchip { display: none; }
        }
        @media (max-width: 900px) {
          .page-wrapper.reu { padding: 1.25rem 1.25rem 1rem; }
        }
        @media (max-width: 760px) {
          .page-wrapper.reu { height: auto; min-height: 0; padding-bottom: 3rem; }
          .reu .reu-head { align-items: flex-start; }
          .reu .reu-head h2 { font-size: 1.75rem; }
          .reu .reu-head h2 { flex-wrap: wrap; row-gap: 0.25rem; }
          .reu .reu-head .mx-count { white-space: nowrap; }
          .reu .reu-head .mx-head-actions { width: 100%; flex-wrap: wrap; }
          .reu .reu-head .mx-head-actions .btn-primary { flex: 1; }
          .reu-board { display: none; }
          .reu-agenda { display: flex; flex-direction: column; gap: 0.75rem; }
          .reu-row { grid-template-columns: 1fr; gap: 0; }
          .reu-quick { justify-content: flex-start; margin-top: -0.25rem; }
        }
      `}</style>
    </div>
  );
}
