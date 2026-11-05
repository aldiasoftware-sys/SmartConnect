"use client";

import { useState, useEffect } from "react";
import { Plus, MoreHorizontal, X, Users, Edit2, Trash2, Loader2, RefreshCw } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'active' | 'pending';
}

export default function TeamPage() {
  const { user: authUser } = useAuth();
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', role: 'Miembro' });

  const fetchTeam = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('team_members')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) console.error("Error fetching team:", error);
    else setTeam(data.map(d => ({
      id: d.id,
      name: d.full_name,
      email: d.email,
      role: d.role,
      status: d.status as any
    })));
    setLoading(false);
  };

  useEffect(() => {
    if (authUser) fetchTeam();
    else setLoading(false);
  }, [authUser]);

  const handleCreatePersona = async () => {
    if (!form.name) return;
    
    // Generate a dummy email if none provided
    const userEmail = form.email || `${form.name.toLowerCase().replace(/\s+/g, '')}@equipo.local`;

    const { error } = await supabase.from('team_members').insert({
      full_name: form.name,
      email: userEmail,
      role: form.role,
      status: 'active'
    });

    if (error) console.error("Error creating persona:", error);
    else fetchTeam();
    
    setIsModalOpen(false);
    setForm({ name: '', email: '', role: 'Miembro' });
  };

  const handleDelete = async (id: string, email: string) => {
    if (email === authUser?.email) {
      alert("No puedes eliminarte a ti mismo.");
      return;
    }
    if (confirm("¿Estás seguro de que quieres eliminar a esta persona?")) {
      await supabase.from('team_members').delete().eq('id', id);
      fetchTeam();
    }
  };

  const filteredTeam = team.filter(m => 
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    m.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div>
          <h2 className="page-title">Personal</h2>
          <p className="page-subtitle">Gestiona las personas del equipo para asignarlas a tareas.</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn-primary" onClick={() => setIsModalOpen(true)}>
            <Plus style={{ width: '18px', height: '18px' }} />
            Añadir Persona
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: "2rem" }}>
        <input 
          type="text" 
          placeholder="Buscar persona por nombre..." 
          className="search-input"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ width: "100%", padding: "0.75rem 1rem", border: "1px solid var(--border-color)", borderRadius: "8px", fontSize: "0.875rem" }}
        />
      </div>

      <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Persona</th>
                <th>Rol</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredTeam.map((member) => (
                <tr key={member.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="avatar" style={{ background: "#111827", color: "#fff", borderColor: "#111827" }}>
                        {member.name[0]?.toUpperCase() || 'U'}
                      </div>
                      <div>
                        <p style={{ fontWeight: 600 }}>{member.name}</p>
                        <p style={{ fontSize: "11px", color: "var(--text-muted)" }}>{member.email}</p>
                      </div>
                    </div>
                  </td>
                  <td style={{ color: "var(--text-secondary)" }}>{member.role}</td>
                  <td>
                    <span className="status-badge done" style={{ margin: 0 }}>
                      Activo
                    </span>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <button 
                      onClick={() => handleDelete(member.id, member.email)}
                      style={{ background: "transparent", border: "none", cursor: "pointer", color: "#ef4444" }}
                    >
                      <Trash2 style={{ width: "18px" }} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
      </div>

      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content drawer-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center" style={{ marginBottom: "2rem" }}>
              <h3 style={{ fontSize: "1.25rem", fontWeight: 700 }}>Añadir Persona</h3>
              <X style={{ cursor: "pointer", width: "20px", color: "var(--text-muted)" }} onClick={() => setIsModalOpen(false)} />
            </div>
            <div className="form-group">
              <label>Nombre de la Persona</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ej: Juan Pérez" />
            </div>
            <div className="form-group">
              <label>Correo Electrónico (Opcional)</label>
              <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Para asociar cuenta real si existe..." />
            </div>
            <div className="form-group">
              <label>Responsabilidad / Rol</label>
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                <option>Miembro</option>
                <option>Desarrollador</option>
                <option>Ventas</option>
                <option>Administrador</option>
              </select>
            </div>
            <button className="btn-primary" style={{ width: "100%", marginTop: "0.5rem" }} onClick={handleCreatePersona}>
              Crear Persona
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
