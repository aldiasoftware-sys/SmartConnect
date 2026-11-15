"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// «Esta semana» ya no existe: entrar en Smart Connect lleva directo al Calendario.
export default function Inicio() {
  const router = useRouter();
  useEffect(() => { router.replace("/contenido"); }, [router]);
  return null;
}
