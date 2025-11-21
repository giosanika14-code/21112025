import { create } from 'zustand';
import type { User } from '@/types';

interface AuthState {
  user: User | null;
  token: string | null;
  setAuth: (user: User, token: string) => void;
  clearAuth: () => void;
  isAuthenticated: () => boolean;
  hydrated: boolean;
  setHydrated: () => void;
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  user: null,
  token: null,
  hydrated: false,

  setHydrated: () => set({ hydrated: true }),

  setAuth: (user, token) => {
    set({ user, token });
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token);
      localStorage.setItem('user', JSON.stringify(user));
    }
  },

  clearAuth: () => {
    set({ user: null, token: null });
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
    }
  },

  isAuthenticated: () => {
    const { token } = get();
    return !!token;
  },
}));

// Hydrate from localStorage on client side
if (typeof window !== 'undefined') {
  const token = localStorage.getItem('auth_token');
  const userStr = localStorage.getItem('user');

  if (token && userStr) {
    try {
      const user = JSON.parse(userStr);
      useAuthStore.setState({ user, token, hydrated: true });
    } catch (error) {
      console.error('Failed to parse user from localStorage');
      useAuthStore.setState({ hydrated: true });
    }
  } else {
    useAuthStore.setState({ hydrated: true });
  }
}
