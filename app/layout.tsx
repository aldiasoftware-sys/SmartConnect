"use client";

import { usePathname } from "next/navigation";
import { CalendarCheck, LogOut } from "lucide-react";
import "./globals.css";
import Sidebar, { NAV_SECTIONS } from "@/components/Sidebar";
import WeeklyCheckin from "@/components/WeeklyCheckin";
import SalesProvider from "@/lib/SalesContext";
import SocialProvider, { useSocial } from "@/lib/SocialContext";
import { AuthProvider, useAuth } from "@/lib/AuthContext";
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
          <div className="seg scope-seg" title="Ver lo de los dos o solo lo tuyo">
            <button className={scope === "equipo" ? "on" : ""} onClick={() => setScope("equipo")}>Equipo</button>
            <button className={scope === "yo" ? "on" : ""} onClick={() => setScope("yo")}>{me.name}</button>
          </div>
        )}
        <span className="week-chip">Semana {weekNumber(w)} · {weekLabel(w)}</span>
        {pending ? (
          <button className="checkin-btn" onClick={() => openCheckin()} title="Apuntar los seguidores de esta semana">
            <span className="pulse-dot" /> Check-in pendiente
          </button>
        ) : (
          <button className="checkin-btn done" onClick={() => openCheckin()} title="Check-in hecho · el próximo se abre el lunes a las 8:00">
            <CalendarCheck /> Próximo check-in <b>{countdown(nextCheckinAt())}</b>
          </button>
        )}
        <div className="avatar" title={user?.email || ""} style={{ background: "var(--ink)", color: "#fff", borderColor: "var(--ink)" }}>{(user?.email || "A")[0].toUpperCase()}</div>
        <button className="checkin-btn" onClick={signOut} title="Cerrar sesión" aria-label="Cerrar sesión"><LogOut /></button>
      </div>
    </header>
  );
}

/** Barrido de Archivos al abrir la app: borra lo que ya ha cumplido sus 14 días (una vez por sesión). */
function SweepFiles() {
  useEffect(() => {
    try { if (sessionStorage.getItem("aldia_swept")) return; sessionStorage.setItem("aldia_swept", "1"); } catch { /* sin almacenamiento */ }
    sweep().catch(() => { /* aún no existe el espacio de archivos */ });
  }, []);
  return null;
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const isAuthPage = pathname === "/login" || pathname === "/register";

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
