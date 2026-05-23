import { create } from 'zustand';
import type { MenuItem } from '@/services/api';

export interface CartItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
}

interface CartState {
  items: CartItem[];
  branchId: string | null;
  branchName: string | null;
  addItem: (item: MenuItem, branchId: string, branchName: string) => void;
  removeItem: (menuItemId: string) => void;
  updateQuantity: (menuItemId: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: () => number;
  subtotal: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  branchId: null,
  branchName: null,

  addItem: (menuItem, branchId, branchName) => {
    const state = get();
    if (state.branchId && state.branchId !== branchId) {
      set({ items: [], branchId, branchName });
    }
    const existing = state.items.find(i => i.menuItemId === menuItem.id);
    if (existing) {
      set(s => ({
        items: s.items.map(i =>
          i.menuItemId === menuItem.id ? { ...i, quantity: i.quantity + 1 } : i
        ),
        branchId,
        branchName,
      }));
    } else {
      set(s => ({
        items: [...s.items, {
          menuItemId: menuItem.id,
          name: menuItem.name,
          price: menuItem.price,
          quantity: 1,
          imageUrl: menuItem.imageUrl,
        }],
        branchId,
        branchName,
      }));
    }
  },

  removeItem: (menuItemId) =>
    set(s => ({ items: s.items.filter(i => i.menuItemId !== menuItemId) })),

  updateQuantity: (menuItemId, quantity) => {
    if (quantity <= 0) {
      get().removeItem(menuItemId);
      return;
    }
    set(s => ({
      items: s.items.map(i => i.menuItemId === menuItemId ? { ...i, quantity } : i),
    }));
  },

  clearCart: () => set({ items: [], branchId: null, branchName: null }),

  totalItems: () => get().items.reduce((sum, i) => sum + i.quantity, 0),

  subtotal: () => get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
}));
