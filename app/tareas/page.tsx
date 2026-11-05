"use client";

import { Plus } from "lucide-react";
import { KanbanBoard } from "@/components/KanbanBoard";

export default function Home() {
  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div>
          <h2 className="page-title">Tareas</h2>
          <p className="page-subtitle">Gestiona tus proyectos y automatizaciones de IA.</p>
        </div>
        <button className="btn-primary" onClick={() => window.dispatchEvent(new CustomEvent('open-new-task'))}>
          <Plus style={{ width: '18px', height: '18px' }} />
          Nueva Tarea
        </button>
      </div>

      <KanbanBoard />
    </div>
  );
}
