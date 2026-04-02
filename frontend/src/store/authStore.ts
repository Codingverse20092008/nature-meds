import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AuthUser = {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: 'customer' | 'admin' | 'pharmacist';
  phone?: string | null;
  alternatePhone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  isVerified?: boolean;
  createdAt?: string;
};

type AuthState = {
  token: string | null;
  user: AuthUser | null;
  setSession: (payload: { token: string; user: AuthUser }) => void;
  clearSession: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setSession: ({ token, user }) => set({ token, user }),
      clearSession: () => set({ token: null, user: null }),
    }),
    {
      name: 'nature-meds-auth',
    }
  )
);

export function getAuthToken() {
  return useAuthStore.getState().token;
}
