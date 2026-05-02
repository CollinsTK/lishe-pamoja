import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Listing } from '../types';

export interface CartItem {
  listing: Listing;
  quantity: number;
  fulfillmentMode: 'Pickup' | 'Delivery';
  deliveryFee: number;
}

interface CartContextType {
  cartItems: CartItem[];
  addToCart: (listing: Listing, quantity: number, fulfillmentMode: 'Pickup' | 'Delivery', deliveryFee: number) => void;
  removeFromCart: (listingId: string) => void;
  updateQuantity: (listingId: string, quantity: number) => void;
  clearCart: () => void;
  getCartTotal: () => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  const addToCart = (listing: Listing, quantity: number, fulfillmentMode: 'Pickup' | 'Delivery', deliveryFee: number) => {
    setCartItems(prev => {
      const existing = prev.find(item => item.listing.id === listing.id);
      if (existing) {
        return prev.map(item => 
          item.listing.id === listing.id 
            ? { ...item, quantity: item.quantity + quantity, fulfillmentMode, deliveryFee } 
            : item
        );
      }
      return [...prev, { listing, quantity, fulfillmentMode, deliveryFee }];
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

  const clearCart = () => setCartItems([]);

  const getCartTotal = () => {
    return cartItems.reduce((total, item) => {
      return total + (item.listing.price * item.quantity) + item.deliveryFee;
    }, 0);
  };

  return (
    <CartContext.Provider value={{ cartItems, addToCart, removeFromCart, updateQuantity, clearCart, getCartTotal }}>
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
