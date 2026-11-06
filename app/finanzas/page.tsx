"use client";

import { useState } from "react";
import { RefreshCw, Plus, MoreHorizontal, X, FileText, Edit2, Trash2, Loader2 } from "lucide-react";
import { useSales } from "@/lib/SalesContext";
import type { SaleRecord } from "@/lib/SalesContext";

export default function SalesPage() {
  const { sales, addSale, updateSale, deleteSale, refresh, loading } = useSales();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<{ client: string; status: "pagado" | "proceso" | "cancelado"; setup: string; monthly: string }>({ client: "", status: "proceso", setup: "", monthly: "" });
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);

  const handleSave = () => {
    if (!form.client) return;
    
    if (editingId !== null) {
      updateSale(editingId, { ...form, status: form.status as any });
    } else {
      addSale({ ...form, status: form.status as any });
    }
    
    closeModal();
  };

  const openEdit = (sale: SaleRecord) => {
    setEditingId(sale.id);
    setForm({
      client: sale.client,
      status: sale.status,
      setup: sale.setup,
      monthly: sale.monthly
    });
    setIsModalOpen(true);
    setDropdownOpen(null);
  };

  const closeModal = () => {
    setEditingId(null);
    setForm({ client: "", status: "proceso", setup: "", monthly: "" });
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (confirm("¿Estás seguro de que quieres eliminar este cliente?")) {
      deleteSale(id);
    }
    setDropdownOpen(null);
  };

  const totalMRR = sales
    .filter((s) => s.status === "pagado")
    .reduce((sum, s) => sum + Number(s.monthly || 0), 0);

  const totalSetup = sales
    .filter((s) => s.status === "pagado")
    .reduce((sum, s) => sum + Number(s.setup || 0), 0);

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div>
          <h2 className="page-title">Sales</h2>
          <p className="page-subtitle">Control de ingresos y facturación de clientes AI.</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn-primary" onClick={() => setIsModalOpen(true)}>
            <Plus style={{ width: "18px", height: "18px" }} />
            Nuevo Cliente
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1.5rem", marginBottom: "2.5rem" }}>
        <div className="card">
          <p style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.75rem" }}>MRR Activo</p>
          <p style={{ fontSize: "1.875rem", fontWeight: 600, letterSpacing: "-0.04em" }}>€{totalMRR.toLocaleString()}</p>
        </div>
        <div className="card">
          <p style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.75rem" }}>Setup Cobrado</p>
          <p style={{ fontSize: "1.875rem", fontWeight: 600, letterSpacing: "-0.04em" }}>€{totalSetup.toLocaleString()}</p>
        </div>
        <div className="card">
          <p style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.75rem" }}>Clientes Activos</p>
          <p style={{ fontSize: "1.875rem", fontWeight: 600, letterSpacing: "-0.04em" }}>{sales.filter(s => s.status === "pagado").length}</p>
        </div>
      </div>

      {/* Table */}
      <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Estado</th>
                <th>Setup</th>
                <th>MRR</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {sales.map((s) => {
                const cls = s.status === "pagado" ? "done" : s.status === "proceso" ? "inprogress" : "todo";
                return (
                  <tr key={s.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="avatar" style={{ background: "#f8f9fa", borderRadius: "8px" }}>
                          <FileText style={{ width: "13px", strokeWidth: 2 }} />
                        </div>
                        <span style={{ fontWeight: 600 }}>{s.client}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`status-badge ${cls}`} style={{ margin: 0 }}>
                        {s.status === "pagado" ? "Cobrado" : s.status === "proceso" ? "En Proceso" : "Cancelado"}
                      </span>
                    </td>
                    <td style={{ color: "var(--text-secondary)" }}>€{s.setup}</td>
                    <td style={{ color: "var(--text-secondary)" }}>€{s.monthly}/mes</td>
                    <td style={{ textAlign: "right", position: "relative" }}>
                      <button 
                        onClick={() => setDropdownOpen(dropdownOpen === s.id ? null : s.id)}
                        style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: "4px" }}
                      >
                        <MoreHorizontal style={{ width: "18px" }} />
                      </button>
                      
                      {dropdownOpen === s.id && (
                        <div className="dropdown-menu animate-in" style={{ position: "absolute", right: 0, top: "100%", zIndex: 10, background: "white", border: "1px solid var(--border-color)", borderRadius: "8px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", minWidth: "120px", overflow: "hidden" }}>
                          <button 
                            onClick={() => openEdit(s)}
                            style={{ display: "flex", alignItems: "center", gap: "8px", width: "100%", padding: "8px 12px", border: "none", background: "none", cursor: "pointer", fontSize: "0.875rem", textAlign: "left", color: "var(--text-main)" }}
                          >
                            <Edit2 style={{ width: "14px" }} /> Editar
                          </button>
                          <button 
                            onClick={() => handleDelete(s.id)}
                            style={{ display: "flex", alignItems: "center", gap: "8px", width: "100%", padding: "8px 12px", border: "none", background: "none", cursor: "pointer", fontSize: "0.875rem", textAlign: "left", color: "#ef4444" }}
                          >
                            <Trash2 style={{ width: "14px" }} /> Eliminar
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content drawer-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center" style={{ marginBottom: "2rem" }}>
              <h3 style={{ fontSize: "1.25rem", fontWeight: 600 }}>{editingId ? "Editar Cliente" : "Nuevo Cliente"}</h3>
              <X style={{ cursor: "pointer", width: "20px", color: "var(--text-muted)" }} onClick={closeModal} />
            </div>
            <div className="form-group"><label>Nombre del Cliente</label><input value={form.client} onChange={(e) => setForm({ ...form, client: e.target.value })} placeholder="Ej: Acme Corp" /></div>
            <div className="form-group">
              <label>Estado del Pago</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as any })}>
                <option value="pagado">Cobrado</option>
                <option value="proceso">En Proceso</option>
                <option value="cancelado">Cancelado</option>
              </select>
            </div>
            <div className="flex gap-4">
              <div className="form-group flex-1"><label>Setup (€)</label><input type="number" value={form.setup} onChange={(e) => setForm({ ...form, setup: e.target.value })} placeholder="0" /></div>
              <div className="form-group flex-1"><label>MRR Mensual (€)</label><input type="number" value={form.monthly} onChange={(e) => setForm({ ...form, monthly: e.target.value })} placeholder="0" /></div>
            </div>
            <button className="btn-primary" style={{ width: "100%", marginTop: "0.5rem" }} onClick={handleSave}>
              {editingId ? "Actualizar Cliente" : "Guardar Cliente"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
