"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Planificación se sustituyó por Proyectos (13-11-2026): su Gantt pasó al proyecto «Equipo ALDIA · Interno».
export default function PlanificacionRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/proyectos"); }, [router]);
  return <div className="page-wrapper"><div className="empty">Planificación ahora es Proyectos…</div></div>;
}
