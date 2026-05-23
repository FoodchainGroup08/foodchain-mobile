import React, { createContext, useContext, useState } from 'react';
import type { MenuItem } from '@/services/api';

export interface CartItem extends MenuItem {
  quantity: number;
}

interface CartContextValue {
  items: CartItem[];
  branchId: string | null;
  branchName: string | null;
  addItem: (item: MenuItem, branchId: string, branchName: string) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  subtotal: number;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [branchId, setBranchId] = useState<string | null>(null);
  const [branchName, setBranchName] = useState<string | null>(null);

  const addItem = (item: MenuItem, bId: string, bName: string) => {
    if (branchId && branchId !== bId) {
      setItems([{ ...item, quantity: 1 }]);
      setBranchId(bId);
      setBranchName(bName);
      return;
    }
    setBranchId(bId);
    setBranchName(bName);
    setItems(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const removeItem = (id: string) => {
    setItems(prev => {
      const next = prev.filter(i => i.id !== id);
      if (next.length === 0) { setBranchId(null); setBranchName(null); }
      return next;
    });
  };

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) { removeItem(id); return; }
    setItems(prev => prev.map(i => i.id === id ? { ...i, quantity } : i));
  };

  const clearCart = () => {
    setItems([]);
    setBranchId(null);
    setBranchName(null);
  };

  return (
    <CartContext.Provider value={{
      items, branchId, branchName,
      addItem, removeItem, updateQuantity, clearCart,
      totalItems: items.reduce((s, i) => s + i.quantity, 0),
      subtotal: items.reduce((s, i) => s + i.price * i.quantity, 0),
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
