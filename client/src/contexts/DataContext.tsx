import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { apiClient } from '../lib/apiClient';
import { Listing, Order } from '../types/index';

interface DataContextType {
  listings: Listing[];
  users: any[];
  orders: Order[];
  dispatches: any[];
  subscriptionPlans: any[];
  isLoading: boolean;
  fetchData: () => Promise<void>;
  fetchListings: () => Promise<void>;
  fetchUsers: () => Promise<void>;
  fetchTransactions: () => Promise<void>;
  fetchAllSubscriptionPlans: () => Promise<void>;
  updateListing: (id: string, updates: Partial<Listing>) => void;
  updateOrder: (id: string, updates: any) => void;
  updateUserWallet: (userId: string, amount: number) => void;
  verifyUser: (userId: string) => Promise<void>;
  updateUser: (userId: string, updates: any) => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
  addSubscriptionPlan: (plan: any) => void;
  deleteSubscriptionPlan: (planId: string) => void;
  createSubscriptionPlan: (plan: any) => Promise<any>;
  updateSubscriptionPlan: (planId: string, updates: any) => Promise<any>;
  startListingsPolling: () => void;
  stopListingsPolling: () => void;
}
const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [listings, setListings] = useState<Listing[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [dispatches, setDispatches] = useState<any[]>([]);
  const [subscriptionPlans, setSubscriptionPlans] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Transform backend listing to frontend Listing type
  const readListing = (listing: any): Listing => ({
    id: listing._id || listing.id,
    title: listing.title,
    description: listing.description,
    images: listing.images || [],
    quantity: listing.availableQuantity,
    unit: listing.unit,
    price: listing.price,
    isFree: listing.isFree,
    category: listing.category,
    pickupStart: listing.pickupWindowStart?.split('T')[1] || '08:00',
    pickupEnd: listing.pickupWindowEnd?.split('T')[1] || '18:00',
    pickupWindowStart: listing.pickupWindowStart,
    pickupWindowEnd: listing.pickupWindowEnd,
    expiryDateTime: listing.expiryDateTime,
    deliveryAllowed: listing.deliveryAllowed,
        location: listing.location || { lat: 0, lng: 0, address: 'Unknown Location' },
    status: listing.status,
    ownerType: 'VendorOwned',
    vendorId: listing.vendor?._id || listing.vendor,
    vendorName: listing.vendor?.name || 'Unknown Vendor',
    createdAt: listing.createdAt,
  });
  // Transform backend transaction to frontend Order type
  const readTransaction = (transaction: any): Order => {
    const listing = transaction.listingId;
    const basePrice = (listing?.price || 0) * transaction.quantity;
    const logisticsFee = transaction.deliveryFee || 0;
    const totalPrice = basePrice + logisticsFee;

    return {
      id: transaction._id,
      listingId: listing?._id,
      listingTitle: listing?.title || 'Unknown Listing',
      recipientId: transaction.recipientId?._id || transaction.recipientId,
      vendorId: transaction.vendorId?._id || transaction.vendorId,
      orderedQuantity: transaction.quantity,
      unit: listing?.unit || 'unit',
      orderType: listing?.isFree ? 'Claim' : 'Purchase',
      fulfillmentMode: transaction.fulfillmentMode,
      basePrice,
      logisticsFee,
      totalPrice,
      status: transaction.status,
      createdAt: transaction.createdAt,
    };
  };

  // Fetch only listings
  const fetchListings = async () => {
    try {
      const listingsRes = await apiClient.get('/listings').catch(() => ({ listings: [] }));
      const raw = Array.isArray(listingsRes) ? listingsRes : (listingsRes?.listings ?? []);
      if (Array.isArray(raw)) {
        setListings(raw.map(readListing));
      }
    } catch (error) {
      console.error('Error fetching listings:', error);
    }
  };

  // Fetch only users
  const fetchUsers = async () => {
    try {
      const usersRes = await apiClient.get('/users').catch(() => []);
      if (Array.isArray(usersRes)) {
        const mappedUsers = usersRes.map(u => ({ ...u, id: u._id || u.id }));
        setUsers(mappedUsers);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  // Fetch only transactions
  const fetchTransactions = async () => {
    try {
      const transactionsRes = await apiClient.get('/transactions').catch(() => ({ transactions: [] }));
      if (transactionsRes.transactions && Array.isArray(transactionsRes.transactions)) {
        const mapped = transactionsRes.transactions.map(readTransaction);
        setOrders(mapped);
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  };

  // Fetch subscription plans from API
  const fetchSubscriptionPlans = async () => {
    try {
      const response = await apiClient.get('/subscription-plans').catch(() => ({ plans: [] }));
      if (response.plans && Array.isArray(response.plans)) {
        setSubscriptionPlans(response.plans);
      }
    } catch (error) {
      console.error('Error fetching subscription plans:', error);
    }
  };

  // Fetch all subscription plans (admin only)
  const fetchAllSubscriptionPlans = async () => {
    try {
      const response = await apiClient.get('/subscription-plans/admin/all').catch(() => ({ plans: [] }));
      if (response.plans && Array.isArray(response.plans)) {
        setSubscriptionPlans(response.plans);
      }
    } catch (error) {
      console.error('Error fetching all subscription plans:', error);
    }
  };

  // Create subscription plan (admin only)
  const createSubscriptionPlan = async (plan: any) => {
    try {
      const response = await apiClient.post('/subscription-plans/admin', plan);
      if (response.success && response.plan) {
        setSubscriptionPlans(prev => [...prev, response.plan]);
      }
      return response;
    } catch (error) {
      console.error('Error creating subscription plan:', error);
      throw error;
    }
  };

  // Update subscription plan (admin only)
  const updateSubscriptionPlan = async (planId: string, updates: any) => {
    try {
      const response = await apiClient.put(`/subscription-plans/admin/${planId}`, updates);
      if (response.success && response.plan) {
        setSubscriptionPlans(prev => prev.map(p => p.planId === planId ? response.plan : p));
      }
      return response;
    } catch (error) {
      console.error('Error updating subscription plan:', error);
      throw error;
    }
  };

  // Delete subscription plan (admin only)
  const deleteSubscriptionPlan = async (planId: string) => {
    try {
      await apiClient.delete(`/subscription-plans/admin/${planId}`);
      setSubscriptionPlans(prev => prev.filter(p => p.planId !== planId));
    } catch (error) {
      console.error('Error deleting subscription plan:', error);
      throw error;
    }
  };

  // Fetch dispatches (transactions with logistics)
  const fetchDispatches = async () => {
    try {
      const dispatchesRes = await apiClient.get('/transactions').catch(() => ({ transactions: [] }));
      if (dispatchesRes.transactions && Array.isArray(dispatchesRes.transactions)) {
        // Filter for delivery orders with logistics assigned
        const dispatches = dispatchesRes.transactions.filter(
          (t: any) => t.fulfillmentMode === 'Delivery' && t.logisticsId
        );
        setDispatches(dispatches);
      }
    } catch (error) {
      console.error('Error fetching dispatches:', error);
    }
  };

  // Fetch all data (used on initial mount)
  const fetchData = async () => {
    try {
      await Promise.all([
        fetchListings(), 
        fetchUsers(), 
        fetchTransactions(),
        fetchSubscriptionPlans(),
        fetchDispatches()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Start polling listings every 10 seconds
  const startListingsPolling = () => {
    if (pollingIntervalRef.current) {
      // Already polling
      return;
    }

    // Initial fetch
    fetchListings();

    // Set up polling interval
    pollingIntervalRef.current = setInterval(() => {
      fetchListings();
    }, 10000); // Poll every 10 seconds
  };

  // Stop polling listings
  const stopListingsPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  };

  // Fetch data on component mount
  useEffect(() => {
    fetchData();

    // Cleanup polling on unmount
    return () => {
      stopListingsPolling();
    };
  }, []);

  // Optimistic update for listings
  const updateListing = (id: string, updates: Partial<Listing>) => {
    setListings(listings.map(l => (l.id === id ? { ...l, ...updates } : l)));
  };

  // Add a subscription plan (local optimistic update)
  const addSubscriptionPlan = (plan: any) => {
    setSubscriptionPlans(prev => [...prev.filter(p => p.planId !== plan.planId), plan]);
  };

  // Optimistic update for orders
  const updateOrder = (id: string, updates: any) => {
    setOrders(orders.map(o => (o.id === id ? { ...o, ...updates } : o)));
  };

  // Optimistic wallet update for a user
  const updateUserWallet = (userId: string, amount: number) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, walletBalance: (u.walletBalance || 0) + amount } : u));
  };

  // Admin: grant canSell + canDeliver capabilities ("verify" vendor/logistics)
  const verifyUser = async (userId: string) => {
    const res: any = await apiClient.put(`/users/admin/${userId}`, {
      capabilities: { canSell: true, canDeliver: true },
    });
    if (res.success && res.user) {
      setUsers(prev => prev.map(u => u.id === userId || u._id === userId ? { ...res.user, id: res.user._id || userId } : u));
    }
  };

  // Admin: update arbitrary user fields (suspend, activate, capabilities, etc.)
  const updateUser = async (userId: string, updates: any) => {
    const suspended = updates.status === 'Suspended' ? true : updates.status === 'Active' ? false : undefined;
    const payload: any = {};
    if (suspended !== undefined) payload.suspended = suspended;
    if (updates.capabilities) payload.capabilities = updates.capabilities;
    if (updates.isAdmin !== undefined) payload.isAdmin = updates.isAdmin;
    const res: any = await apiClient.put(`/users/admin/${userId}`, payload);
    if (res.success && res.user) {
      setUsers(prev => prev.map(u => u.id === userId || u._id === userId ? { ...res.user, id: res.user._id || userId } : u));
    }
  };

  // Admin: delete a user
  const deleteUser = async (userId: string) => {
    await apiClient.delete(`/users/admin/${userId}`);
    setUsers(prev => prev.filter(u => u.id !== userId && u._id !== userId));
  };

  return (
    <DataContext.Provider
      value={{
        listings,
        users,
        orders,
        dispatches,
        subscriptionPlans,
        isLoading,
        fetchData,
        fetchListings,
        fetchUsers,
        fetchTransactions,
        fetchAllSubscriptionPlans,
        updateListing,
        updateOrder,
        updateUserWallet,
        verifyUser,
        updateUser,
        deleteUser,
        addSubscriptionPlan,
        deleteSubscriptionPlan,
        createSubscriptionPlan,
        updateSubscriptionPlan,
        startListingsPolling,
        stopListingsPolling,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
