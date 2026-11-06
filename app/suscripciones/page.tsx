"use client";

import { useState, useEffect } from "react";
import { Plus, MoreHorizontal, X, Box, Edit2, Trash2, Loader2, RefreshCw } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";

interface Subscription {
  id: string;
  name: string;
  date: string;
  price: string;
}

export default function SubscriptionsPage() {
  const { user } = useAuth();
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', date: '', price: '' });
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);

  const fetchSubs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .order('renewal_date', { ascending: true });

    if (error) console.error("Error fetching subs:", error);
    else setSubs(data.map(d => ({
      id: d.id,
      name: d.service_name,
      date: d.renewal_date,
      price: d.price_info
    })));
    setLoading(false);
  };

  useEffect(() => {
    if (user) fetchSubs();
    else setLoading(false);
  }, [user]);

  const handleSave = async () => {
    if (!form.name) return;
    
    const payload = {
      service_name: form.name,
      renewal_date: form.date ? form.date : null,
      price_info: form.price
    };
    
    if (editingId !== null) {
      const { error } = await supabase.from('subscriptions').update(payload).eq('id', editingId);
      if (error) console.error("Error updating:", error);
    } else {
      const { error } = await supabase.from('subscriptions').insert(payload);
      if (error) console.error("Error inserting:", error);
    }
    
    fetchSubs();
    closeModal();
  };

  const openEdit = (sub: Subscription) => {
    setEditingId(sub.id);
    setForm({ name: sub.name, date: sub.date, price: sub.price });
    setIsModalOpen(true);
    setDropdownOpen(null);
  };

  const closeModal = () => {
    setEditingId(null);
    setForm({ name: '', date: '', price: '' });
    setIsModalOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm("¿Estás seguro de que quieres eliminar esta suscripción?")) {
      await supabase.from('subscriptions').delete().eq('id', id);
      fetchSubs();
    }
    setDropdownOpen(null);
  };

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div>
          <h2 className="page-title">Suscripciones</h2>
          <p className="page-subtitle">Próximas renovaciones y gasto de herramientas AI.</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn-primary" onClick={() => setIsModalOpen(true)}>
            <Plus style={{ width: '18px', height: '18px' }} />
            Añadir Suscripción
          </button>
        </div>
      </div>

      <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Servicio</th>
                <th>Renovación</th>
                <th>Costo</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {subs.map((sub) => (
                <tr key={sub.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="avatar" style={{ background: "#f8f9fa", borderRadius: "8px" }}>
                        <Box style={{ width: "13px", strokeWidth: 2 }} />
                      </div>
                      <span style={{ fontWeight: 600 }}>{sub.name}</span>
                    </div>
                  </td>
                  <td style={{ color: "var(--text-secondary)" }}>{sub.date}</td>
                  <td style={{ color: "var(--text-secondary)" }}>{sub.price}</td>
                  <td style={{ textAlign: "right", position: "relative" }}>
                    <button 
                      onClick={() => setDropdownOpen(dropdownOpen === sub.id ? null : sub.id)}
                      style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: "4px" }}
                    >
                      <MoreHorizontal style={{ width: "18px" }} />
                    </button>
                    
                    {dropdownOpen === sub.id && (
                      <div className="dropdown-menu animate-in" style={{ position: "absolute", right: 0, top: "100%", zIndex: 10, background: "white", border: "1px solid var(--border-color)", borderRadius: "8px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", minWidth: "120px", overflow: "hidden" }}>
                        <button 
                          onClick={() => openEdit(sub)}
                          style={{ display: "flex", alignItems: "center", gap: "8px", width: "100%", padding: "8px 12px", border: "none", background: "none", cursor: "pointer", fontSize: "0.875rem", textAlign: "left", color: "var(--text-main)" }}
                        >
                          <Edit2 style={{ width: "14px" }} /> Editar
                        </button>
                        <button 
                          onClick={() => handleDelete(sub.id)}
                          style={{ display: "flex", alignItems: "center", gap: "8px", width: "100%", padding: "8px 12px", border: "none", background: "none", cursor: "pointer", fontSize: "0.875rem", textAlign: "left", color: "#ef4444" }}
                        >
                          <Trash2 style={{ width: "14px" }} /> Eliminar
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
      </div>

      {isModalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content drawer-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center" style={{ marginBottom: "2rem" }}>
              <h3 style={{ fontSize: "1.25rem", fontWeight: 600 }}>{editingId ? "Editar Suscripción" : "Nueva Suscripción"}</h3>
              <X style={{ cursor: "pointer", width: "20px", color: "var(--text-muted)" }} onClick={closeModal} />
            </div>
            <div className="form-group"><label>Servicio</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ej: ChatGPT Plus" /></div>
            <div className="form-group"><label>Fecha de Renovación</label><input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
            <div className="form-group"><label>Precio / Plan</label><input value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="Ej: $20/mes" /></div>
            <button className="btn-primary" style={{ width: "100%", marginTop: "0.5rem" }} onClick={handleSave}>
              {editingId ? "Actualizar" : "Guardar"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
