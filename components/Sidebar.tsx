"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home, CalendarRange, Share2, Users, Inbox, Briefcase, Video, CircleDollarSign, LineChart,
  GanttChart, UserCog, CalendarDays, KeySquare, FolderOpen, Mail,
} from "lucide-react";

// Organizado como el Roadmap de arranque: atraer (contenido) → capturar y nutrir (comunidad) → convertir (comercial); y el equipo.
export const NAV_SECTIONS = [
  { title: "", items: [
    { name: "Esta semana", href: "/", icon: Home },
  ] },
  { title: "Contenido", items: [
    { name: "Calendario", href: "/contenido", icon: CalendarRange, isNew: true },
    { name: "Redes", href: "/redes", icon: Share2 },
    { name: "Archivos", href: "/archivos", icon: FolderOpen, isNew: true },
  ] },
  { title: "Comunidad", items: [
    { name: "Leads y contactos", href: "/comunidad", icon: Users },
    { name: "Newsletter", href: "/newsletter", icon: Mail, isNew: true },
    { name: "Mensajes web", href: "/clientes", icon: Inbox },
  ] },
  { title: "Comercial", items: [
    { name: "Ofertas", href: "/ofertas", icon: Briefcase, isNew: true },
    { name: "Reuniones", href: "/reuniones", icon: Video },
    { name: "Facturación", href: "/finanzas", icon: CircleDollarSign },
    { name: "Analítica", href: "/analitica", icon: LineChart },
  ] },
  { title: "Equipo", items: [
    { name: "Planificación", href: "/planificacion", icon: GanttChart },
    { name: "Equipo", href: "/equipo", icon: UserCog },
    { name: "Suscripciones", href: "/suscripciones", icon: CalendarDays },
    { name: "Credenciales", href: "/credenciales", icon: KeySquare },
  ] },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      <Link href="/" className="sidebar-logo">
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
              const isActive = pathname === item.href;
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
