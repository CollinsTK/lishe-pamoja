import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Listing, Order, Dispatch, User, SubscriptionPlan } from "@/types";
import { sampleListings, sampleOrders, sampleDispatches, samplePlans } from "@/data/sampleData";

interface DataContextType {
  listings: Listing[];
  orders: Order[];
  dispatches: Dispatch[];
  users: User[];
  subscriptionPlans: SubscriptionPlan[];
  addListing: (listing: Listing) => void;
  updateListing: (listingId: string, updates: Partial<Listing>) => void;
  deleteListing: (listingId: string) => void;
  addOrder: (order: Order) => void;
  updateOrder: (orderId: string, updates: Partial<Order>) => void;
  addDispatch: (dispatch: Dispatch) => void;
  updateDispatch: (dispatchId: string, updates: Partial<Dispatch>) => void;
  addUser: (user: User) => void;
  updateUser: (userId: string, updates: Partial<User>) => void;
  updateUserWallet: (userId: string, amount: number) => void;
  verifyUser: (userId: string) => void;
  addSubscriptionPlan: (plan: SubscriptionPlan) => void;
  updateSubscriptionPlan: (planId: string, updates: Partial<SubscriptionPlan>) => void;
  deleteSubscriptionPlan: (planId: string) => void;
}

const DataContext = createContext<DataContextType | null>(null);
const LISTINGS_STORAGE_KEY = "lisheListings";
const ORDERS_STORAGE_KEY = "lisheOrders";
const DISPATCHES_STORAGE_KEY = "lisheDispatches";
const USERS_STORAGE_KEY = "lisheUsers";
const PLANS_STORAGE_KEY = "lishePlans";

function loadFromStorage<T>(key: string, fallback: T) {
  if (typeof window === "undefined") return fallback;
  try {
    const stored = window.localStorage.getItem(key);
    if (stored) {
      let parsed = JSON.parse(stored) as T;
      // Scrub out the old dummy data IDs that look like "l1", "o2", "d1", "u1", "admin1", "n1"
      if (Array.isArray(parsed)) {
        parsed = parsed.filter((item: any) => {
          if (item && typeof item.id === "string") {
            if (/^[a-zA-Z]+\d$/.test(item.id)) {
              return false;
            }
          }
          return true;
        }) as unknown as T;
      }
      return parsed;
    }
    return fallback;
  } catch {
    return fallback;
  }
}

const defaultUsers: User[] = [];

export function DataProvider({ children }: { children: ReactNode }) {
  const [listings, setListings] = useState<Listing[]>(() => loadFromStorage(LISTINGS_STORAGE_KEY, sampleListings));
  const [orders, setOrders] = useState<Order[]>(() => loadFromStorage(ORDERS_STORAGE_KEY, sampleOrders));
  const [dispatches, setDispatches] = useState<Dispatch[]>(() => loadFromStorage(DISPATCHES_STORAGE_KEY, sampleDispatches));
  const [users, setUsers] = useState<User[]>(() => loadFromStorage(USERS_STORAGE_KEY, defaultUsers));
  const [subscriptionPlans, setSubscriptionPlans] = useState<SubscriptionPlan[]>(() => loadFromStorage(PLANS_STORAGE_KEY, samplePlans));

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(LISTINGS_STORAGE_KEY, JSON.stringify(listings));
  }, [listings]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(DISPATCHES_STORAGE_KEY, JSON.stringify(dispatches));
  }, [dispatches]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(PLANS_STORAGE_KEY, JSON.stringify(subscriptionPlans));
  }, [subscriptionPlans]);

  const addListing = (listing: Listing) => {
    setListings((prev) => [listing, ...prev]);
  };

  const updateListing = (listingId: string, updates: Partial<Listing>) => {
    setListings((prev) => prev.map((l) => (l.id === listingId ? { ...l, ...updates } : l)));
  };

  const deleteListing = (listingId: string) => {
    setListings((prev) => prev.filter((l) => l.id !== listingId));
  };

  const updateOrder = (orderId: string, updates: Partial<Order>) => {
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, ...updates } : o)));
  };

  const addOrder = (order: Order) => {
    setOrders((prev) => [order, ...prev]);
  };

  const addDispatch = (dispatch: Dispatch) => {
    setDispatches((prev) => [dispatch, ...prev]);
  };

  const updateDispatch = (dispatchId: string, updates: Partial<Dispatch>) => {
    setDispatches((prev) => prev.map((d) => (d.id === dispatchId ? { ...d, ...updates } : d)));
  };

  const addUser = (user: User) => {
    setUsers((prev) => [...prev, user]);
  };

  const updateUser = (userId: string, updates: Partial<User>) => {
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, ...updates } : u)));
  };

  const updateUserWallet = (userId: string, amount: number) => {
    setUsers((prev) => {
      const exists = prev.some(u => u.id === userId);
      if (exists) {
        return prev.map(u => u.id === userId ? { ...u, walletBalance: (u.walletBalance || 0) + amount } : u);
      } else {
        return [...prev, { id: userId, name: "User", email: "", role: "recipient", phone: "", walletBalance: amount }];
      }
    });
  };

  const verifyUser = (userId: string) => {
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, verified: true } : u)));
  };

  const addSubscriptionPlan = (plan: SubscriptionPlan) => {
    setSubscriptionPlans((prev) => [...prev, plan]);
  };

  const updateSubscriptionPlan = (planId: string, updates: Partial<SubscriptionPlan>) => {
    setSubscriptionPlans((prev) => prev.map((p) => (p.id === planId ? { ...p, ...updates } : p)));
  };

  const deleteSubscriptionPlan = (planId: string) => {
    setSubscriptionPlans((prev) => prev.filter((p) => p.id !== planId));
  };

  return (
    <DataContext.Provider value={{
      listings, orders, dispatches, users, subscriptionPlans,
      addListing, updateListing, deleteListing, addOrder, updateOrder, addDispatch, updateDispatch,
      addUser, updateUser, updateUserWallet, verifyUser,
      addSubscriptionPlan, updateSubscriptionPlan, deleteSubscriptionPlan
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used inside a DataProvider");
  return ctx;
}
