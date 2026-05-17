import { ReactNode } from "react";

// DEPRECATED: Legacy role system - being replaced by capabilities
export type UserRole = "user" | "recipient" | "vendor" | "logistics" | "admin";

// User capabilities - determine what features user can access
export interface UserCapabilities {
  canBrowse: boolean;    // View listings, claim/purchase
  canSell: boolean;      // Create listings, manage vendor orders
  canDeliver: boolean;   // Accept delivery dispatches
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;        // DEPRECATED: kept for backward compatibility
  capabilities: UserCapabilities;
  isAdmin: boolean;
  phone: string;
  avatar?: string;
  verified?: boolean;
  status?: "Active" | "Pending" | "Suspended";
  joined?: string;
  subscription?: UserSubscription;
  subscriptionHistory?: SubscriptionHistoryItem[];
  walletBalance?: number;
  location?: { lat: number | null; lng: number | null; address: string | null };
}

export interface VendorProfile {
  id: string;
  userId: string;
  businessName: string;
  verified: boolean;
  location: string;
  rating: number;
}

export interface SubscriptionPlan {
  _id?: string;
  planId: string;
  name: string;
  description: string;
  price: number;
  durationType: 'monthly' | 'quarterly' | 'yearly';
  durationDays: number;
  capabilities: {
    canSell: boolean;
    canDeliver: boolean;
  };
  features: string[];
  limits: {
    listings: number; // -1 means unlimited
    deliveries: number;
  };
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserSubscription {
  plan: string; // planId
  status: 'active' | 'pending' | 'expired' | 'cancelled' | 'suspended';
  startDate?: Date | string;
  endDate?: Date | string;
  paymentMethod?: 'wallet' | 'mpesa' | null;
  autoRenew: boolean;
}

export interface SubscriptionHistoryItem {
  plan: string;
  status: 'active' | 'expired' | 'cancelled';
  startDate: Date | string;
  endDate: Date | string;
  paymentMethod?: 'wallet' | 'mpesa';
  amount?: number;
  mpesaReceiptNumber?: string;
  createdAt?: Date | string;
}

export interface Listing {
  id: string;
  title: string;
  description: string;
  images: string[];
  quantity: number;
  unit: string;
  price: number;
  isFree: boolean;
  category: string;
  pickupStart: string;
  pickupEnd: string;
  pickupWindowStart?: string;
  pickupWindowEnd?: string;
  expiryDateTime: string;
  deliveryAllowed: boolean;
  location: { lat: number; lng: number; address: string };
  
  status: "available" | "partially_claimed" | "fully_claimed" | "expired" | "cancelled";
  ownerType: "VendorOwned" | "PlatformOwned";
  vendorId: string;
  vendorName: string;
  createdAt: string;
}

export interface Order {
  id: string;
  listingId: string;
  listingTitle: string;
  recipientId: string;
  vendorId: string;
  orderedQuantity: number;
  unit: string;
  orderType: "Claim" | "Purchase";
  fulfillmentMode: "Pickup" | "Delivery";
  basePrice: number;
  logisticsFee: number;
  totalPrice: number;
  status: "CLAIMED" | "LOGISTICS_ASSIGNED" | "IN_TRANSIT" | "DELIVERED" | "COMPLETED" | "CANCELLED";
  createdAt: string;
}

export interface Dispatch {
  id: string;
  orderId: string;
  logisticsPartnerId: string;
  status: "Assigned" | "PickedUp" | "InTransit" | "Delivered" | "Failed";
  pickupAddress: string;
  dropoffAddress: string;
  createdAt: string;
  proofPhoto?: string;
  proofSignature?: string;
  pickupPin?: string;
  deliveryPin?: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  type: "order" | "listing" | "dispatch" | "system";
}
