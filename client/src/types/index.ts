import { ReactNode } from "react";

export type UserRole = "recipient" | "vendor" | "logistics" | "admin";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone: string;
  avatar?: string;
  verified?: boolean;
  status?: "Active" | "Pending" | "Suspended";
  joined?: string;
  subscriptionPlanId?: string;
  walletBalance?: number;
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
  id: string;
  name: string;
  price: number;
  features: string[];
  listingsLimit: number; // -1 means unlimited
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
  expiryDateTime: string;
  deliveryAllowed: boolean;
  location: { lat: number; lng: number; address: string };
  status: "Available" | "Reserved" | "Sold" | "Expired" | "Cancelled";
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
  status: "Pending" | "Confirmed" | "Cancelled" | "Completed" | "Expired";
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
