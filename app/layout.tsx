"use client";

import { usePathname } from "next/navigation";
import { CalendarCheck } from "lucide-react";
import "./globals.css";
import Sidebar, { NAV_SECTIONS } from "@/components/Sidebar";
import WeeklyCheckin from "@/components/WeeklyCheckin";
import SalesProvider from "@/lib/SalesContext";
import SocialProvider, { useSocial } from "@/lib/SocialContext";
import { AuthProvider } from "@/lib/AuthContext";
import { weekLabel, weekNumber, weekStart } from "@/lib/social";
import { sweep } from "@/lib/files";
import { useEffect } from "react";

function Header() {
  const pathname = usePathname();
  const { pending, openCheckin } = useSocial();
  const page = NAV_SECTIONS.flatMap((s) => s.items.map((i) => ({ ...i, section: s.title }))).find((i) => i.href === pathname);
  const w = weekStart();

  return (
    <header className="header">
      <div className="header-crumb">
        {page ? <>{page.section && <>{page.section} <span>/</span> </>}<b>{page.name}</b></> : <b>Aldia Smart Connect</b>}
      </div>
      <div className="header-actions">
        <span className="week-chip">Semana {weekNumber(w)} · {weekLabel(w)}</span>
        <button className="checkin-btn" onClick={() => openCheckin()} title="Apuntar seguidores y publicaciones de la semana">
          {pending ? <span className="pulse-dot" /> : <CalendarCheck />}
          {pending ? "Check-in pendiente" : "Check-in semanal"}
        </button>
        <div className="avatar" style={{ background: "var(--ink)", color: "#fff", borderColor: "var(--ink)" }}>A</div>
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
        </AuthProvider>
      </body>
    </html>
  );
}
