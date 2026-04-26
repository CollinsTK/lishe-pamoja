import { Listing, Order, Dispatch, Notification, SubscriptionPlan, User } from "@/types";

export const sampleUser: User = {
  id: "u1",
  name: "Jane Wanjiku",
  email: "jane@example.com",
  role: "recipient",
  phone: "+254 712 345 678",
};

export const sampleListings: Listing[] = [];

export const sampleOrders: Order[] = [];

export const sampleDispatches: Dispatch[] = [];

export const sampleNotifications: Notification[] = [];

export const samplePlans: SubscriptionPlan[] = [
  { id: "sp1", name: "Starter", price: 500, features: ["Up to 10 listings/month", "Basic analytics", "Email support"], listingsLimit: 10 },
  { id: "sp2", name: "Growth", price: 1500, features: ["Up to 50 listings/month", "Advanced analytics", "Priority support", "Featured listings"], listingsLimit: 50 },
  { id: "sp3", name: "Enterprise", price: 5000, features: ["Unlimited listings", "Full analytics suite", "Dedicated account manager", "API access"], listingsLimit: -1 },
];

export const categories = ["Vegetables", "Fruits", "Bakery", "Dairy", "Grains", "Cooked Meals", "Beverages", "Other"];
