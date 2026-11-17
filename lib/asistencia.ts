"use client";

// Asistencia a reuniones: cada miembro del equipo contesta «Asistiré» o «No asistiré» a las reuniones futuras.
// Se guarda en app_settings «reuniones_asistencia» = { [idReunion]: { [idMiembro]: "si" | "no" } } (sin tabla nueva).
// Lo que aún no has contestado sale con un punto rojo en «Reuniones» del menú.
import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabase";
import { getSetting, setSetting } from "./store";
import { useScope } from "./ScopeContext";

export type Respuesta = "si" | "no";
export type Asistencia = Record<string, Record<string, Respuesta>>;
export type ReunionLite = { id: string; nombre_reunion: string; fecha_reunion: string; duracion?: string; origen?: string };

const KEY = "reuniones_asistencia";
const EVT = "aldia-asistencia";

export async function guardarRespuesta(reunion: string, miembro: string, r: Respuesta) {
  const cur = await getSetting<Asistencia>(KEY, {});
  const next = { ...cur, [reunion]: { ...(cur[reunion] || {}), [miembro]: r } };
  await setSetting(KEY, next);
  window.dispatchEvent(new Event(EVT));
  return next;
}

/** Reuniones futuras, respuestas de todos y las que me faltan por contestar. Se refresca cada minuto y al contestar. */
export function useAsistencia() {
  const { me } = useScope();
  const [reuniones, setReuniones] = useState<ReunionLite[]>([]);
  const [asis, setAsis] = useState<Asistencia>({});

  const load = useCallback(async () => {
    const desde = new Date(Date.now() - 2 * 3600e3).toISOString();
    const [{ data }, a] = await Promise.all([
      supabase.from("reuniones").select("id,nombre_reunion,fecha_reunion,duracion,origen").gte("fecha_reunion", desde).order("fecha_reunion", { ascending: true }),
      getSetting<Asistencia>(KEY, {}),
    ]);
    // las grabadas con la app de Mac ya han pasado: no se pregunta «¿Asistirás?»
    setReuniones(((data as ReunionLite[]) || []).filter((r) => r.origen !== "Grabada")); setAsis(a || {});
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 60000);
    window.addEventListener(EVT, load); window.addEventListener("focus", load);
    return () => { clearInterval(t); window.removeEventListener(EVT, load); window.removeEventListener("focus", load); };
  }, [load]);

  const pendientes = me ? reuniones.filter((r) => !asis[r.id]?.[me.id]) : [];
  const responder = async (id: string, r: Respuesta) => { if (!me) return; setAsis(await guardarRespuesta(id, me.id, r)); };
  return { reuniones, asis, pendientes, responder, me, recargar: load };
}
