import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Listing, Order, Dispatch, User, SubscriptionPlan } from "@/types";
import { samplePlans } from "@/data/sampleData";
import { apiClient } from "@/lib/apiClient";

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
const defaultListings: Listing[] = [];
const defaultOrders: Order[] = [];
const defaultDispatches: Dispatch[] = [];
const defaultPlans: SubscriptionPlan[] = [];

export function DataProvider({ children }: { children: ReactNode }) {
  const [listings, setListings] = useState<Listing[]>(defaultListings);
  const [orders, setOrders] = useState<Order[]>(defaultOrders);
  const [dispatches, setDispatches] = useState<Dispatch[]>(defaultDispatches);
  const [users, setUsers] = useState<User[]>(defaultUsers);
  const [subscriptionPlans, setSubscriptionPlans] = useState<SubscriptionPlan[]>(defaultPlans);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [listingsRes, usersRes, transactionsRes] = await Promise.all([
        apiClient.get('/listings').catch(() => []),
        apiClient.get('/users').catch(() => []), 
        apiClient.get('/transactions').catch(() => ({ transactions: [] })),
      ]);

      if (Array.isArray(listingsRes)) {
        // Map _id to id and map backend statuses to frontend statuses
        const mappedListings = listingsRes.map(l => {
          let mappedStatus = "Available";
          if (l.status === 'fully_claimed') mappedStatus = "Sold";
          if (l.status === 'expired') mappedStatus = "Expired";
          if (l.status === 'cancelled') mappedStatus = "Cancelled";
          
          return { 
            ...l, 
            id: l._id || l.id, 
            quantity: l.availableQuantity,
            status: mappedStatus
          };
        });
        setListings(mappedListings);
      }
      
      if (Array.isArray(usersRes)) {
        const mappedUsers = usersRes.map(u => ({ ...u, id: u._id || u.id }));
        setUsers(mappedUsers);
      }
      
      if (transactionsRes.transactions && Array.isArray(transactionsRes.transactions)) {
        const mappedTransactions = transactionsRes.transactions.map((t: any) => ({ ...t, id: t._id || t.id }));
        setOrders(mappedTransactions);
        
        const dispatchesList = mappedTransactions.filter((t: any) => t.logisticsId);
        setDispatches(dispatchesList);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const addListing = async (listing: Listing) => {
    try {
      const res = await apiClient.post('/listings', listing);
      const savedListing = { ...res, id: res._id || res.id, quantity: res.availableQuantity };
      setListings((prev) => [savedListing, ...prev]);
    } catch (e) {
      console.error(e);
      // Fallback
      setListings((prev) => [listing, ...prev]);
    }
  };

  const updateListing = async (listingId: string, updates: Partial<Listing>) => {
    try {
      await apiClient.put(`/listings/${listingId}`, updates);
    } catch (e) { console.error(e); }
    setListings((prev) => prev.map((l) => (l.id === listingId ? { ...l, ...updates } : l)));
  };

  const deleteListing = async (listingId: string) => {
    try {
      await apiClient.delete(`/listings/${listingId}`);
    } catch (e) { console.error(e); }
    setListings((prev) => prev.filter((l) => l.id !== listingId));
  };

  const updateOrder = async (orderId: string, updates: Partial<Order>) => {
    try {
      // For status updates
      if (updates.status === 'Cancelled') {
        await apiClient.put(`/transactions/${orderId}/cancel`, {});
      } else if (updates.status === 'IN_TRANSIT') {
        await apiClient.put(`/transactions/${orderId}/verify-pickup`, { pin: 'dummy' });
      } else if (updates.status === 'DELIVERED') {
        await apiClient.put(`/transactions/${orderId}/verify-delivery`, { pin: 'dummy' });
      } else if (updates.status === 'LOGISTICS_ASSIGNED') {
        await apiClient.put(`/transactions/${orderId}/accept`, {});
      }
    } catch (e) { console.error(e); }
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, ...updates } : o)));
  };

  const addOrder = async (order: Order) => {
    // handled via checkoutCart usually
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
      {isLoading ? <div className="min-h-screen flex items-center justify-center">Loading...</div> : children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used inside a DataProvider");
  return ctx;
}
