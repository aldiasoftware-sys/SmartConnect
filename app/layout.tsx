"use client";

import { usePathname } from "next/navigation";
import { CalendarCheck, CalendarDays, LogOut, User, Users } from "lucide-react";
import "./globals.css";
import Sidebar, { NAV_SECTIONS } from "@/components/Sidebar";
import WeeklyCheckin from "@/components/WeeklyCheckin";
import SalesProvider from "@/lib/SalesContext";
import SocialProvider, { useSocial } from "@/lib/SocialContext";
import { AuthProvider, OPEN_PATHS, useAuth } from "@/lib/AuthContext";
import ScopeProvider, { useScope } from "@/lib/ScopeContext";
import { countdown, nextCheckinAt, weekLabel, weekNumber, weekStart } from "@/lib/social";
import { sweep } from "@/lib/files";
import { useEffect, useState } from "react";

function Header() {
  const pathname = usePathname();
  const { pending, openCheckin } = useSocial();
  const { user, signOut } = useAuth();
  const { me, scope, setScope } = useScope();
  const page = NAV_SECTIONS.flatMap((s) => s.items.map((i) => ({ ...i, section: s.title }))).find((i) => i.href === pathname);
  const w = weekStart();
  const [, tick] = useState(0);
  useEffect(() => { const t = setInterval(() => tick((n) => n + 1), 30000); return () => clearInterval(t); }, []);

  return (
    <header className="header">
      <div className="header-crumb">
        {page ? <>{page.section && <>{page.section} <span>/</span> </>}<b>{page.name}</b></> : <b>Aldia Smart Connect</b>}
      </div>
      <div className="header-actions">
        {me && (
          <div className="hdr-scope" role="group" aria-label="Ver lo de los dos o solo lo tuyo">
            <button className={scope === "equipo" ? "on" : ""} onClick={() => setScope("equipo")}><Users /> Equipo</button>
            <button className={scope === "yo" ? "on" : ""} onClick={() => setScope("yo")}><User /> {me.name}</button>
          </div>
        )}
        <div className="hdr-dock">
          <span className="hdr-week" title={`Semana ${weekNumber(w)} · ${weekLabel(w)}`}><CalendarDays /> <b>S{weekNumber(w)}</b><span>{weekLabel(w)}</span></span>
          <i className="hdr-sep" />
          {pending ? (
            <button className="hdr-checkin due" onClick={() => openCheckin()} title="Apuntar los seguidores de esta semana">
              <span className="pulse-dot" /> Check-in pendiente
            </button>
          ) : (
            <button className="hdr-checkin" onClick={() => openCheckin()} title="Check-in hecho · el próximo se abre el lunes a las 8:00">
              <CalendarCheck /> Próximo check-in <b>{countdown(nextCheckinAt())}</b>
            </button>
          )}
          <i className="hdr-sep" />
          <span className="hdr-me" title={user?.email || ""}>{(user?.email || "A")[0].toUpperCase()}</span>
          <button className="hdr-out" onClick={signOut} title="Cerrar sesión" aria-label="Cerrar sesión"><LogOut /></button>
        </div>
      </div>
    </header>
  );
}

/** Barrido de Archivos al abrir la app: borra lo que ya ha cumplido sus 3 días (una vez por sesión). */
function SweepFiles() {
  const { user } = useAuth();
  useEffect(() => {
    if (!user) return;   // con sesión: sin ella Supabase no deja ver los archivos
    try { if (sessionStorage.getItem("aldia_swept")) return; sessionStorage.setItem("aldia_swept", "1"); } catch { /* sin almacenamiento */ }
    sweep().catch(() => { /* aún no existe el espacio de archivos */ });
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const isAuthPage = pathname === "/login" || pathname === "/register" || OPEN_PATHS.includes(pathname);

  return (
    <html lang="es">
      <head>
        <title>Aldia Smart Connect</title>
        <link rel="icon" href="/aldia-mark.png" />
      </head>
      <body className="app-container">
        <AuthProvider>
          <ScopeProvider>
          <SalesProvider>
            <SocialProvider>
              {!isAuthPage && <Sidebar />}
              <main className="main-content">
                {!isAuthPage && <Header />}
                <div key={pathname} className={!isAuthPage ? "animate-in" : ""}>{children}</div>
              </main>
              {!isAuthPage && <WeeklyCheckin />}
              <SweepFiles />
            </SocialProvider>
          </SalesProvider>
          </ScopeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
