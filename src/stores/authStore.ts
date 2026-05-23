import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { postLogin, postLogout, postRegister, getMe, updateProfile, postRefreshToken, type User } from '@/services/api';

export const TOKEN_KEY = 'foodchain_token';
export const REFRESH_TOKEN_KEY = 'foodchain_refresh_token';
export const USER_KEY = 'foodchain_user';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<'logged_in' | 'verify_email'>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  bootstrap: () => Promise<void>;
  setUser: (user: User | null) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,

  setUser: (user) => set({ user }),

  bootstrap: async () => {
    set({ isLoading: true });
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      const storedUser = await SecureStore.getItemAsync(USER_KEY);
      if (token) {
        set({ token, isAuthenticated: true });
        try {
          const user = await getMe();
          await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
          set({ user, isLoading: false });
        } catch {
          if (storedUser) {
            set({ user: JSON.parse(storedUser), isLoading: false });
          } else {
            await SecureStore.deleteItemAsync(TOKEN_KEY);
            await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
            set({ user: null, token: null, isAuthenticated: false, isLoading: false });
          }
        }
      } else {
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },

  login: async (email, password) => {
    const { token, refreshToken, user } = await postLogin(email, password);
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    if (refreshToken) await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
    set({ user, token, isAuthenticated: true });
  },

  register: async (name, email, password) => {
    await postRegister(name, email, password);
    return 'verify_email';
  },

  logout: async () => {
    try {
      const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
      await postLogout(refreshToken ?? undefined);
    } catch {}
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    await SecureStore.deleteItemAsync(USER_KEY);
    set({ user: null, token: null, isAuthenticated: false });
  },

  refreshUser: async () => {
    const user = await getMe();
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
    set({ user });
  },
}));
