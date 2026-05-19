import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Listing } from '../types';

export interface DeliveryLocation {
  lat: number;
  lng: number;
  address: string;
}

export interface CartItem {
  listing: Listing;
  quantity: number;
  fulfillmentMode: 'Pickup' | 'Delivery';
  deliveryFee: number;
  deliveryLocation?: DeliveryLocation;
}

interface CartContextType {
  cartItems: CartItem[];
  addToCart: (listing: Listing, quantity: number, fulfillmentMode: 'Pickup' | 'Delivery', deliveryFee: number, deliveryLocation?: DeliveryLocation) => void;
  removeFromCart: (listingId: string) => void;
  updateQuantity: (listingId: string, quantity: number) => void;
  updateDeliveryLocation: (listingId: string, location: DeliveryLocation, fee: number) => void;
  clearCart: () => void;
  getCartTotal: () => number;
  updateListingInCart: (updatedListing: Listing) => void;
  removeListingFromCart: (listingId: string) => void;
  validateCartItems: () => { valid: CartItem[]; invalid: CartItem[] };
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  const addToCart = (listing: Listing, quantity: number, fulfillmentMode: 'Pickup' | 'Delivery', deliveryFee: number, deliveryLocation?: DeliveryLocation) => {
    setCartItems(prev => {
      const existing = prev.find(item => item.listing.id === listing.id);
      if (existing) {
        return prev.map(item => 
          item.listing.id === listing.id 
            ? { ...item, quantity: item.quantity + quantity, fulfillmentMode, deliveryFee, deliveryLocation } 
            : item
        );
      }
      return [...prev, { listing, quantity, fulfillmentMode, deliveryFee, deliveryLocation }];
    });
  };

  const removeFromCart = (listingId: string) => {
    setCartItems(prev => prev.filter(item => item.listing.id !== listingId));
  };

  const updateQuantity = (listingId: string, quantity: number) => {
    setCartItems(prev => prev.map(item => 
      item.listing.id === listingId ? { ...item, quantity } : item
    ));
  };

  const updateDeliveryLocation = (listingId: string, location: DeliveryLocation, fee: number) => {
    setCartItems(prev => prev.map(item =>
      item.listing.id === listingId
        ? { ...item, deliveryLocation: location, deliveryFee: fee }
        : item
    ));
  };

  const clearCart = () => setCartItems([]);

  const getCartTotal = () => {
    return cartItems.reduce((total, item) => {
      return total + (item.listing.price * item.quantity) + item.deliveryFee;
    }, 0);
  };

  // Update a listing in the cart (when listing is modified by vendor)
  const updateListingInCart = (updatedListing: Listing) => {
    setCartItems(prev => prev.map(item => {
      if (item.listing.id === updatedListing.id) {
        // Check if the requested quantity is still available
        const maxQuantity = Math.min(item.quantity, updatedListing.availableQuantity);
        
        // If listing is no longer available, remove from cart
        if (updatedListing.status === 'fully_claimed' || updatedListing.availableQuantity <= 0) {
          return null;
        }
        
        // Update the listing and adjust quantity if needed
        return {
          ...item,
          listing: updatedListing,
          quantity: maxQuantity
        };
      }
      return item;
    }).filter(Boolean) as CartItem[]);
  };

  // Remove a listing from cart (when listing is deleted by vendor)
  const removeListingFromCart = (listingId: string) => {
    setCartItems(prev => prev.filter(item => item.listing.id !== listingId));
  };

  // Validate all cart items (check if listings are still available)
  const validateCartItems = () => {
    const valid: CartItem[] = [];
    const invalid: CartItem[] = [];

    cartItems.forEach(item => {
      // Check if listing is still available
      if (item.listing.status === 'fully_claimed' || 
          item.listing.availableQuantity <= 0 ||
          new Date(item.listing.expiryDateTime) < new Date()) {
        invalid.push(item);
      } else if (item.quantity > item.listing.availableQuantity) {
        // Adjust quantity to available amount
        valid.push({
          ...item,
          quantity: item.listing.availableQuantity
        });
      } else {
        valid.push(item);
      }
    });

    // Update cart with only valid items
    setCartItems(valid);
    
    return { valid, invalid };
  };

  return (
    <CartContext.Provider value={{ 
      cartItems, 
      addToCart, 
      removeFromCart, 
      updateQuantity, 
      updateDeliveryLocation, 
      clearCart, 
      getCartTotal,
      updateListingInCart,
      removeListingFromCart,
      validateCartItems
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
