"use client";

import { useSales } from "@/lib/SalesContext";
import { TrendingUp, BarChart3, PieChart, Zap } from "lucide-react";

export default function AnalyticsPage() {
  const { sales } = useSales();

  // Derived metrics from real Sales data
  const totalMRR = sales.filter(s => s.status === "pagado").reduce((sum, s) => sum + Number(s.monthly || 0), 0);
  const totalSetup = sales.filter(s => s.status === "pagado").reduce((sum, s) => sum + Number(s.setup || 0), 0);
  const activeClients = sales.filter(s => s.status === "pagado").length;
  const pendingClients = sales.filter(s => s.status === "proceso").length;
  const cancelledClients = sales.filter(s => s.status === "cancelado").length;
  const totalClients = sales.length;

  // MRR by client for bar chart
  const paidSales = sales.filter(s => s.status === "pagado" && Number(s.monthly) > 0);
  const maxMRR = Math.max(...paidSales.map(s => Number(s.monthly)), 1);

  // Status distribution percentages
  const pctActive = totalClients ? Math.round((activeClients / totalClients) * 100) : 0;
  const pctPending = totalClients ? Math.round((pendingClients / totalClients) * 100) : 0;
  const pctCancelled = totalClients ? Math.round((cancelledClients / totalClients) * 100) : 0;

  // Fibonacci projection (based on active clients count as seed)
  const fibSeed = Math.max(activeClients, 1);
  const fib: number[] = [fibSeed, fibSeed];
  for (let i = 2; i < 10; i++) fib[i] = fib[i - 1] + fib[i - 2];
  const maxFib = Math.max(...fib, 1);

  const stats = [
    { label: "MRR Activo", val: `€${totalMRR.toLocaleString()}`, sub: `${activeClients} clientes cobrados`, icon: TrendingUp },
    { label: "Setup Total", val: `€${totalSetup.toLocaleString()}`, sub: "proyectos cerrados", icon: BarChart3 },
    { label: "En Proceso", val: String(pendingClients), sub: "deals pendientes", icon: Zap },
    { label: "Cancelados", val: String(cancelledClients), sub: "de baja", icon: PieChart },
  ];

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div>
          <h2 className="page-title">Analítica</h2>
          <p className="page-subtitle">Métricas en tiempo real basadas en los datos de Sales.</p>
        </div>
        <button className="btn-secondary">Exportar PDF</button>
      </div>

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1.5rem", marginBottom: "2.5rem" }}>
        {stats.map((s, i) => (
          <div key={i} className="card">
            <div className="flex justify-between items-start" style={{ marginBottom: "1.25rem" }}>
              <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em" }}>{s.label}</span>
              <s.icon style={{ width: "16px", color: "var(--text-muted)", flexShrink: 0 }} />
            </div>
            <p style={{ fontSize: "2rem", fontWeight: 600, letterSpacing: "-0.04em", marginBottom: "0.35rem" }}>{s.val}</p>
            <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>{s.sub}</p>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1.5rem", marginBottom: "1.5rem" }}>
        {/* MRR per client bar chart */}
        <div className="card">
          <h3 style={{ fontWeight: 600, marginBottom: "0.375rem" }}>MRR por Cliente</h3>
          <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", marginBottom: "2rem" }}>Ingresos recurrentes mensuales por cliente activo</p>
          {paidSales.length === 0 ? (
            <div style={{ height: "180px", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: "0.875rem" }}>
              Añade clientes con estado "Cobrado" en Sales para ver datos aquí.
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "flex-end", gap: "16px", height: "180px" }}>
              {paidSales.map((s, i) => (
                <div key={s.id} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", justifyContent: "flex-end", height: "100%" }}>
                  <span style={{ fontSize: "10px", fontWeight: 600, color: "var(--text-secondary)" }}>€{s.monthly}</span>
                  <div style={{ width: "100%", height: `${(Number(s.monthly) / maxMRR) * 140}px`, background: i === paidSales.length - 1 ? "#111827" : "#f3f4f6", borderRadius: "6px 6px 0 0", minHeight: "8px" }} />
                  <span style={{ fontSize: "10px", fontWeight: 600, color: "var(--text-muted)", textAlign: "center", maxWidth: "70px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.client}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Status donut / breakdown */}
        <div className="card">
          <h3 style={{ fontWeight: 600, marginBottom: "2rem" }}>Distribución de Clientes</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {[
              { label: "Cobrados", pct: pctActive, color: "#10b981", count: activeClients },
              { label: "En Proceso", pct: pctPending, color: "#111827", count: pendingClients },
              { label: "Cancelados", pct: pctCancelled, color: "#e5e7eb", count: cancelledClients },
            ].map((d, i) => (
              <div key={i}>
                <div className="flex justify-between items-center" style={{ marginBottom: "6px" }}>
                  <span style={{ fontSize: "0.8125rem", fontWeight: 600 }}>{d.label}</span>
                  <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--text-muted)" }}>{d.count} ({d.pct}%)</span>
                </div>
                <div style={{ height: "6px", background: "#f3f4f6", borderRadius: "99px", overflow: "hidden" }}>
                  <div style={{ width: `${d.pct}%`, height: "100%", background: d.color, borderRadius: "99px", transition: "width 0.8s ease" }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Fibonacci projection */}
      <div className="card">
        <div className="flex justify-between items-center" style={{ marginBottom: "0.375rem" }}>
          <h3 style={{ fontWeight: 600 }}>Proyección de Crecimiento (Fibonacci)</h3>
          <span className="status-badge done" style={{ margin: 0 }}>Basado en clientes activos</span>
        </div>
        <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", marginBottom: "2rem" }}>
          Semilla actual: {fibSeed} cliente{fibSeed !== 1 ? "s" : ""} activo{fibSeed !== 1 ? "s" : ""}
        </p>
        <div style={{ display: "flex", alignItems: "flex-end", gap: "10px", height: "160px" }}>
          {fib.map((val, i) => (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", justifyContent: "flex-end", height: "100%" }}>
              <div style={{ width: "100%", height: `${(val / maxFib) * 130}px`, background: i === fib.length - 1 ? "#111827" : "#f3f4f6", borderRadius: "6px 6px 0 0", minHeight: "4px" }} />
              <span style={{ fontSize: "10px", fontWeight: 600, color: "var(--text-muted)" }}>{val}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
