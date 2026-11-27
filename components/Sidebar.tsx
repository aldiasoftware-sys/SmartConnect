"use client";

import Link from "next/link";
import { BrandLogo } from "@/components/AccountIcon";
import { useAsistencia } from "@/lib/asistencia";
import { usePathname } from "next/navigation";
import {
  CalendarRange, Inbox, Briefcase, Video, CircleDollarSign, LineChart,
  FolderKanban, UserCog, CalendarDays, KeySquare, FolderOpen, Puzzle, Target,
} from "lucide-react";

/** Logos reales de Discord y YouTube para el menú (mismo tamaño que los iconos). */
const DiscordLogo = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}><path d="M20.317 4.37a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.865-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.74 19.74 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.058a.082.082 0 0 0 .031.056 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.873-1.295 1.226-1.994a.076.076 0 0 0-.042-.106 13.1 13.1 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.291a.074.074 0 0 1 .078-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.3 12.3 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.331c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" /></svg>
);
/** YouTube, TikTok e Instagram juntos (logos reales, un poco montados). */
const RedesLogos = () => (
  <span className="nav-redes" aria-hidden><BrandLogo platform="youtube" size={16} /><BrandLogo platform="tiktok" size={16} /><BrandLogo platform="instagram" size={16} /></span>
);

// Organizado como el Roadmap de arranque: atraer (contenido) → capturar y nutrir (comunidad) → convertir (comercial); y el equipo.
// Sin «Esta semana» (entrar lleva directo al Calendario) ni «Redes»; Equipo va antes que Comercial y los gastos fijos están en Comercial.
export const NAV_SECTIONS = [
  { title: "Contenido", items: [
    { name: "Calendario", href: "/contenido", icon: CalendarRange },
    { name: "Archivos", href: "/archivos", icon: FolderOpen },
    { name: "Redes", href: "/red?p=youtube", icon: RedesLogos },
  ] },
  { title: "Comunidad", items: [
    { name: "Discord", href: "/discord", icon: DiscordLogo },
    { name: "Mensajes web", href: "/clientes", icon: Inbox },
  ] },
  { title: "Equipo", items: [
    { name: "Proyectos", href: "/proyectos", icon: FolderKanban },
    { name: "Equipo", href: "/equipo", icon: UserCog },
    { name: "Skills", href: "/skills", icon: Puzzle },
    { name: "Credenciales", href: "/credenciales", icon: KeySquare },
  ] },
  { title: "Comercial", items: [
    { name: "Posibles clientes", href: "/posibles-clientes", icon: Target },
    { name: "Ofertas", href: "/ofertas", icon: Briefcase },
    { name: "Reuniones", href: "/reuniones", icon: Video },
    { name: "Facturación", href: "/finanzas", icon: CircleDollarSign },
    { name: "Gastos", href: "/suscripciones", icon: CalendarDays },
    { name: "Analítica", href: "/analitica", icon: LineChart },
  ] },
];

export default function Sidebar() {
  // reuniones nuevas que aún no he contestado (Asistiré / No asistiré): punto rojo con el número
  const { pendientes } = useAsistencia();
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
                  {item.href === "/reuniones" && pendientes.length > 0 && <em className="nav-alert" title={`${pendientes.length} sin contestar`}>{pendientes.length}</em>}
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
