"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarRange, Users, Inbox, Briefcase, Video, CircleDollarSign, LineChart,
  FolderKanban, UserCog, CalendarDays, KeySquare, FolderOpen, Mail, MessagesSquare, Puzzle, Target,
} from "lucide-react";

// Organizado como el Roadmap de arranque: atraer (contenido) → capturar y nutrir (comunidad) → convertir (comercial); y el equipo.
// Sin «Esta semana» (entrar lleva directo al Calendario) ni «Redes»; Equipo va antes que Comercial y los gastos fijos están en Comercial.
export const NAV_SECTIONS = [
  { title: "Contenido", items: [
    { name: "Calendario", href: "/contenido", icon: CalendarRange },
    { name: "Archivos", href: "/archivos", icon: FolderOpen },
  ] },
  { title: "Comunidad", items: [
    { name: "Comunidad", href: "/comunidad", icon: Users, isNew: true },
    { name: "Newsletter", href: "/newsletter", icon: Mail },
    { name: "Discord", href: "/discord", icon: MessagesSquare },
    { name: "Mensajes web", href: "/clientes", icon: Inbox },
  ] },
  { title: "Equipo", items: [
    { name: "Proyectos", href: "/proyectos", icon: FolderKanban },
    { name: "Equipo", href: "/equipo", icon: UserCog },
    { name: "Skills", href: "/skills", icon: Puzzle, isNew: true },
    { name: "Credenciales", href: "/credenciales", icon: KeySquare, isNew: true },
  ] },
  { title: "Comercial", items: [
    { name: "Posibles clientes", href: "/posibles-clientes", icon: Target, isNew: true },
    { name: "Ofertas", href: "/ofertas", icon: Briefcase },
    { name: "Reuniones", href: "/reuniones", icon: Video },
    { name: "Facturación", href: "/finanzas", icon: CircleDollarSign },
    { name: "Gastos", href: "/suscripciones", icon: CalendarDays },
    { name: "Analítica", href: "/analitica", icon: LineChart },
  ] },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      <Link href="/contenido" className="sidebar-logo">
        <img src="/aldia-mark.png" alt="Aldia" />
        <div>
          <b>Aldia Smart Connect</b>
          <small>Automatiza hoy. Lidera mañana.</small>
        </div>
      </Link>

      {NAV_SECTIONS.map((section) => (
        <div key={section.title || "inicio"}>
          {section.title && <p className="nav-section">{section.title}</p>}
          <nav className="nav-list">
            {section.items.map((item) => {
              const isActive = pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href + "/"));
              return (
                <Link key={item.href} href={item.href} className={`nav-link ${isActive ? "active" : ""}`} title={item.name}>
                  <item.icon />
                  <span>{item.name}</span>
                  {"isNew" in item && item.isNew && <em className="nav-new" style={{ fontStyle: "normal" }}>Nuevo</em>}
                </Link>
              );
            })}
          </nav>
        </div>
      ))}

      <div className="sidebar-foot">Guille · Millán · aldiaproject.es</div>
    </aside>
  );
}
