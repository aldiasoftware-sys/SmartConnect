"use client";

import { DragEvent, useEffect, useRef, useState } from "react";
import { MoreHorizontal, Trash2 } from "lucide-react";

/** Lo que se arrastra a la papelera: las rutas a borrar y cómo nombrarlas al pedir confirmación. */
export type TrashItem = { paths: string[]; label: string };

/** Tipo propio para distinguir una tarjeta arrastrada de archivos que llegan del ordenador (esos se suben). */
export const TRASH_TYPE = "application/x-aldia-papelera";

/** Props para hacer arrastrable una tarjeta hacia la papelera. */
export const trashDrag = (item: TrashItem, onStart: () => void, onEnd: () => void) => ({
  draggable: true,
  onDragStart: (e: DragEvent) => { e.dataTransfer.setData(TRASH_TYPE, JSON.stringify(item)); e.dataTransfer.effectAllowed = "move"; onStart(); },
  onDragEnd: onEnd,
});

/** Papelera fija abajo a la derecha: se ilumina mientras se arrastra una tarjeta y la borra al soltarla encima. */
export function Papelera({ dragging, onDrop }: { dragging: boolean; onDrop: (item: TrashItem) => void }) {
  const [over, setOver] = useState(false);
  useEffect(() => { if (!dragging) setOver(false); }, [dragging]);
  const mine = (e: DragEvent) => e.dataTransfer.types.includes(TRASH_TYPE);
  return (
    <div
      className={`papelera${dragging ? " armed" : ""}${over ? " over" : ""}`}
      aria-label="Papelera: arrastra aquí una tarjeta para borrarla"
      onDragOver={(e) => { if (!mine(e)) return; e.preventDefault(); e.stopPropagation(); e.dataTransfer.dropEffect = "move"; setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        if (!mine(e)) return;
        e.preventDefault(); e.stopPropagation(); setOver(false);
        const raw = e.dataTransfer.getData(TRASH_TYPE);
        if (raw) onDrop(JSON.parse(raw));
      }}
    >
      <Trash2 /> <span>{over ? "Suelta para borrar" : dragging ? "Arrastra aquí para borrar" : "Papelera"}</span>
    </div>
  );
}

/** Botón «⋯» de una tarjeta con su menú. */
export function CardMenu({ onDelete }: { onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const click = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", click); document.addEventListener("keydown", key);
    return () => { document.removeEventListener("mousedown", click); document.removeEventListener("keydown", key); };
  }, [open]);
  return (
    // los clics y teclas del menú no deben abrir la tarjeta que lo contiene
    <div className="card-menu" ref={ref} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
      <button className="icon-btn" aria-label="Más opciones" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}><MoreHorizontal /></button>
      {open && (
        <div className="card-menu-pop" role="menu">
          <button role="menuitem" className="danger" onClick={() => { setOpen(false); onDelete(); }}><Trash2 /> Eliminar</button>
        </div>
      )}
    </div>
  );
}
