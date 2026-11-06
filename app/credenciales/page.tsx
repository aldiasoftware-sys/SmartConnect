"use client";

import { useState, useEffect } from "react";
import { Plus, ShieldCheck, Copy, X, Edit2, Trash2, Loader2, RefreshCw } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";

interface Credential {
  id: string;
  name: string;
  user: string;
  pass: string;
}

export default function CredentialsPage() {
  const { user: authUser } = useAuth();
  const [creds, setCreds] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', user: '', pass: '' });

  const fetchCreds = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('credentials')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) console.error("Error fetching creds:", error);
    else setCreds(data.map(d => ({
      id: d.id,
      name: d.name,
      user: d.username_email,
      pass: d.password_text
    })));
    setLoading(false);
  };

  useEffect(() => {
    if (authUser) fetchCreds();
    else setLoading(false);
  }, [authUser]);

  const handleSave = async () => {
    if (!form.name) return;
    
    if (editingId !== null) {
      await supabase.from('credentials').update({
        name: form.name,
        username_email: form.user,
        password_text: form.pass
      }).eq('id', editingId);
    } else {
      await supabase.from('credentials').insert({
        name: form.name,
        username_email: form.user,
        password_text: form.pass
      });
    }
    
    fetchCreds();
    closeModal();
  };

  const openEdit = (cred: Credential) => {
    setEditingId(cred.id);
    setForm({ name: cred.name, user: cred.user, pass: cred.pass });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setEditingId(null);
    setForm({ name: '', user: '', pass: '' });
    setIsModalOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm("¿Estás seguro de que quieres eliminar esta credencial?")) {
      await supabase.from('credentials').delete().eq('id', id);
      fetchCreds();
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Copiado al portapapeles");
  };

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div>
          <h2 className="page-title">Credenciales</h2>
          <p className="page-subtitle">Accesos a APIs y entornos de forma segura y centralizada.</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn-primary" onClick={() => setIsModalOpen(true)}>
            <Plus style={{ width: '18px', height: '18px' }} />
            Nueva Credencial
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1.5rem" }}>
          {creds.map((cred) => (
            <div key={cred.id} className="card animate-in" style={{ padding: "1.5rem" }}>
              <div className="flex justify-between items-start" style={{ marginBottom: "1.25rem" }}>
                <div style={{ padding: "8px", background: "var(--bg-secondary)", borderRadius: "8px" }}>
                  <ShieldCheck style={{ width: "20px", color: "var(--text-main)" }} />
                </div>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button onClick={() => openEdit(cred)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text-muted)" }}><Edit2 style={{ width: "16px" }} /></button>
                  <button onClick={() => handleDelete(cred.id)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#ef4444" }}><Trash2 style={{ width: "16px" }} /></button>
                </div>
              </div>
              <h3 style={{ fontWeight: 600, marginBottom: "1rem", fontSize: "1rem" }}>{cred.name}</h3>
              
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <div style={{ background: "var(--bg-secondary)", padding: "0.75rem", borderRadius: "8px", display: "flex", justifyContent: "between", alignItems: "center" }}>
                  <div style={{ overflow: "hidden" }}>
                    <p style={{ fontSize: "10px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>Email / Usuario</p>
                    <p style={{ fontSize: "13px", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{cred.user}</p>
                  </div>
                  <button onClick={() => copyToClipboard(cred.user)} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}><Copy style={{ width: "14px" }} /></button>
                </div>
                
                <div style={{ background: "var(--bg-secondary)", padding: "0.75rem", borderRadius: "8px", display: "flex", justifyContent: "between", alignItems: "center" }}>
                  <div>
                    <p style={{ fontSize: "10px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>Contraseña</p>
                    <p style={{ fontSize: "13px", fontWeight: 600 }}>••••••••••••</p>
                  </div>
                  <button onClick={() => copyToClipboard(cred.pass)} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}><Copy style={{ width: "14px" }} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>

      {isModalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content drawer-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center" style={{ marginBottom: "2rem" }}>
              <h3 style={{ fontSize: "1.25rem", fontWeight: 600 }}>{editingId ? "Editar Credencial" : "Nueva Credencial"}</h3>
              <X style={{ cursor: "pointer", width: "20px", color: "var(--text-muted)" }} onClick={closeModal} />
            </div>
            <div className="form-group"><label>Nombre del Servicio</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ej: Supabase Dashboard" /></div>
            <div className="form-group"><label>Email / Usuario</label><input value={form.user} onChange={(e) => setForm({ ...form, user: e.target.value })} placeholder="Tu email o ID" /></div>
            <div className="form-group"><label>Contraseña / API Key</label><input type="password" value={form.pass} onChange={(e) => setForm({ ...form, pass: e.target.value })} placeholder="••••••••" /></div>
            <button className="btn-primary" style={{ width: "100%", marginTop: "0.5rem" }} onClick={handleSave}>
              {editingId ? "Actualizar" : "Guardar Credencial"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
