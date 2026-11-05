"use client";

import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { supabase } from "./supabase";
import { useAuth } from "./AuthContext";

export type SaleRecord = {
  id: string;
  client: string;
  status: "pagado" | "proceso" | "cancelado";
  setup: string;
  monthly: string;
}

interface SalesContextType {
  sales: SaleRecord[];
  loading: boolean;
  addSale: (s: Omit<SaleRecord, "id">) => Promise<void>;
  updateSale: (id: string, s: Partial<Omit<SaleRecord, "id">>) => Promise<void>;
  deleteSale: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const SalesContext = createContext<SalesContextType | null>(null);

export default function SalesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSales = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('finances')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching sales:", error);
    } else {
      setSales(data.map(d => ({
        id: d.id,
        client: d.client_name,
        status: d.payment_status,
        setup: String(d.setup_cost),
        monthly: String(d.monthly_fee)
      })));
    }
    setLoading(false);
  };

  useEffect(() => {
    if (user) {
      fetchSales();
    } else {
      setSales([]);
      setLoading(false);
    }
  }, [user]);

  const addSale = async (s: Omit<SaleRecord, "id">) => {
    const { error } = await supabase.from('finances').insert({
      client_name: s.client,
      payment_status: s.status,
      setup_cost: Number(s.setup),
      monthly_fee: Number(s.monthly)
    });
    if (error) console.error("Error adding sale:", error);
    else fetchSales();
  };

  const updateSale = async (id: string, s: Partial<Omit<SaleRecord, "id">>) => {
    const payload: any = {};
    if (s.client) payload.client_name = s.client;
    if (s.status) payload.payment_status = s.status;
    if (s.setup) payload.setup_cost = Number(s.setup);
    if (s.monthly) payload.monthly_fee = Number(s.monthly);

    const { error } = await supabase
      .from('finances')
      .update(payload)
      .eq('id', id);

    if (error) console.error("Error updating sale:", error);
    else fetchSales();
  };

  const deleteSale = async (id: string) => {
    const { error } = await supabase.from('finances').delete().eq('id', id);
    if (error) console.error("Error deleting sale:", error);
    else fetchSales();
  };

  return (
    <SalesContext.Provider value={{ sales, loading, addSale, updateSale, deleteSale, refresh: fetchSales }}>
      {children}
    </SalesContext.Provider>
  );
}

export function useSales() {
  const ctx = useContext(SalesContext);
  if (!ctx) throw new Error("useSales must be used inside SalesProvider");
  return ctx;
}
