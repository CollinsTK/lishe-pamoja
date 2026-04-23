import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Listing, Order } from "@/types";
import { sampleListings, sampleOrders } from "@/data/sampleData";

interface DataContextType {
  listings: Listing[];
  orders: Order[];
  addListing: (listing: Listing) => void;
  addOrder: (order: Order) => void;
}

const DataContext = createContext<DataContextType | null>(null);
const LISTINGS_STORAGE_KEY = "lisheListings";
const ORDERS_STORAGE_KEY = "lisheOrders";

function loadFromStorage<T>(key: string, fallback: T) {
  if (typeof window === "undefined") return fallback;
  try {
    const stored = window.localStorage.getItem(key);
    return stored ? (JSON.parse(stored) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [listings, setListings] = useState<Listing[]>(() => loadFromStorage(LISTINGS_STORAGE_KEY, sampleListings));
  const [orders, setOrders] = useState<Order[]>(() => loadFromStorage(ORDERS_STORAGE_KEY, sampleOrders));

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(LISTINGS_STORAGE_KEY, JSON.stringify(listings));
  }, [listings]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders));
  }, [orders]);

  const addListing = (listing: Listing) => {
    setListings((prev) => [listing, ...prev]);
  };

  const addOrder = (order: Order) => {
    setOrders((prev) => [order, ...prev]);
  };

  return (
    <DataContext.Provider value={{ listings, orders, addListing, addOrder }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used inside a DataProvider");
  return ctx;
}
