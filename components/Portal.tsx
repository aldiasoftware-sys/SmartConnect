"use client";

import { useEffect, useState, ReactNode } from "react";
import { createPortal } from "react-dom";

/** Pinta los diálogos directamente en <body>, por encima de la cabecera y del menú. */
export default function Portal({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  return ready ? createPortal(children, document.body) : null;
}
