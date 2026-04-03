import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './api';
import type { AiChatResponse, AuthUser, Cart, Category, ImportLog, Order, PaginatedResponse, Product } from './types';
import { useAuthStore } from '../store/authStore';
import { useGuestCartStore } from '../store/guestCartStore';

type ProductQueryParams = {
  page?: number;
  limit?: number;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  requiresPrescription?: boolean;
};

type ProductListResponse = PaginatedResponse<Product[]>;

function buildSearchParams(params: Record<string, string | number | boolean | undefined>) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      searchParams.set(key, String(value));
    }
  });
  return searchParams.toString();
}

export function useProducts(params: ProductQueryParams) {
  return useQuery({
    queryKey: ['products', params],
    queryFn: async () => {
      const query = buildSearchParams(params);
      const { data } = await api.get<ProductListResponse>(`/api/v1/products${query ? `?${query}` : ''}`);
      return data;
    },
  });
}

export function useSearchProducts(search: string, limit = 8) {
  return useQuery({
    queryKey: ['product-search', search, limit],
    queryFn: async () => {
      const query = buildSearchParams({ q: search, limit });
      const { data } = await api.get<{ success: boolean; data: Product[]; count: number }>(`/api/v1/products/search?${query}`);
      return data.data;
    },
    enabled: search.trim().length > 1,
  });
}

export function useProduct(productId?: string) {
  return useQuery({
    queryKey: ['product', productId],
    queryFn: async () => {
      const { data } = await api.get<{ success: boolean; data: Product }>(`/api/v1/products/${productId}`);
      return data.data;
    },
    enabled: Boolean(productId),
  });
}

export function useFeaturedProducts(limit = 4) {
  return useQuery({
    queryKey: ['featured-products', limit],
    queryFn: async () => {
      const { data } = await api.get<{ success: boolean; data: Product[] }>(`/api/v1/products/featured?limit=${limit}`);
      return data.data;
    },
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data } = await api.get<{ success: boolean; data: Category[] }>('/api/v1/products/categories');
      return data.data;
    },
  });
}

export function useImportLogs(filters?: { status?: string; type?: string }) {
  return useQuery({
    queryKey: ['import-logs', filters],
    queryFn: async () => {
      const query = buildSearchParams({
        status: filters?.status,
        type: filters?.type,
      });
      const { data } = await api.get<PaginatedResponse<ImportLog[]>>(`/api/v1/csv/logs${query ? `?${query}` : ''}`);
      return data.data;
    },
  });
}

export function useImportLogDetails(logId?: number) {
  return useQuery({
    queryKey: ['import-log', logId],
    queryFn: async () => {
      const { data } = await api.get<{ success: boolean; data: ImportLog }>(`/api/v1/csv/logs/${logId}`);
      return data.data;
    },
    enabled: Boolean(logId),
  });
}

export function useImportStats() {
  return useQuery({
    queryKey: ['import-stats'],
    queryFn: async () => {
      const { data } = await api.get('/api/v1/csv/stats');
      return data;
    },
  });
}

export function useUploadCsv() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      file,
      onUploadProgress,
    }: {
      file: File;
      onUploadProgress?: (progress: number) => void;
    }) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'products');
      formData.append('mode', 'upsert');
      formData.append('autoCreateCategories', 'true');

      const { data } = await api.post('/api/v1/csv/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (event) => {
          if (event.total) {
            onUploadProgress?.(Math.round((event.loaded / event.total) * 100));
          }
        },
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['import-logs'] });
      queryClient.invalidateQueries({ queryKey: ['import-stats'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useRetryImport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (logId: number) => {
      const { data } = await api.post(`/api/v1/csv/retry/${logId}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['import-logs'] });
      queryClient.invalidateQueries({ queryKey: ['import-stats'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

type AuthResponse = {
  success: boolean;
  data: {
    token: string;
    user: AuthUser;
  };
};

export function useLogin() {
  const queryClient = useQueryClient();
  const setSession = useAuthStore((state) => state.setSession);
  const guestCart = useGuestCartStore((state) => state.items);
  const clearGuestCart = useGuestCartStore((state) => state.clear);

  return useMutation({
    mutationFn: async (payload: { email: string; password: string }) => {
      const { data } = await api.post<AuthResponse>('/api/v1/auth/login', payload);
      return data.data;
    },
    onSuccess: async (session) => {
      setSession(session);
      if (guestCart.length > 0) {
        await api.post('/api/v1/cart/sync', {
          items: guestCart.map((item) => ({
            productId: item.product.id,
            quantity: item.quantity,
          })),
        });
        clearGuestCart();
      }
      await queryClient.invalidateQueries({ queryKey: ['auth-user'] });
      await queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });
}

export function useRegister() {
  const queryClient = useQueryClient();
  const setSession = useAuthStore((state) => state.setSession);

  return useMutation({
    mutationFn: async (payload: {
      firstName: string;
      lastName: string;
      email: string;
      password: string;
      phone?: string;
      alternatePhone?: string;
      address?: string;
    }) => {
      const { data } = await api.post<AuthResponse>('/api/v1/auth/register', payload);
      return data.data;
    },
    onSuccess: async (session) => {
      setSession(session);
      const guestCart = useGuestCartStore.getState().items;
      const clearGuestCart = useGuestCartStore.getState().clear;
      if (guestCart.length > 0) {
        try {
          await api.post('/api/v1/cart/sync', {
            items: guestCart.map((item) => ({
              productId: item.product.id,
              quantity: item.quantity,
            })),
          });
          clearGuestCart();
        } catch (error) {
          console.error('[RegisterSync] Failed to sync guest cart:', error);
        }
      }
      await queryClient.invalidateQueries({ queryKey: ['auth-user'] });
      await queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });
}

export function useAuthUser() {
  const token = useAuthStore((state) => state.token);
  const setSession = useAuthStore((state) => state.setSession);
  const clearSession = useAuthStore((state) => state.clearSession);

  const query = useQuery({
    queryKey: ['auth-user'],
    queryFn: async () => {
      const { data } = await api.get<{ success: boolean; data: AuthUser }>('/api/v1/users/me');
      if (token) {
        setSession({ token, user: data.data });
      }
      return data.data;
    },
    enabled: Boolean(token),
    retry: false,
    staleTime: 300000,
  });

  useEffect(() => {
    if (query.isError) {
      clearSession();
    }
  }, [clearSession, query.isError]);

  return query;
}

export function useLogout() {
  const queryClient = useQueryClient();
  const clearSession = useAuthStore((state) => state.clearSession);

  return () => {
    clearSession();
    queryClient.removeQueries({ queryKey: ['cart'] });
    queryClient.removeQueries({ queryKey: ['auth-user'] });
  };
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const setSession = useAuthStore((state) => state.setSession);
  const token = useAuthStore((state) => state.token);

  return useMutation({
    mutationFn: async (payload: Partial<AuthUser>) => {
      const { data } = await api.put<{ success: boolean; data: AuthUser }>('/api/v1/users/me', payload);
      return data.data;
    },
    onSuccess: async (user) => {
      if (token) {
        setSession({ token, user });
      }
      await queryClient.invalidateQueries({ queryKey: ['auth-user'] });
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: async (payload: { currentPassword: string; newPassword: string }) => {
      const { data } = await api.post<{ success: boolean; message: string }>('/api/v1/users/me/change-password', payload);
      return data;
    },
  });
}

export function useVerifyEmail() {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const setSession = useAuthStore((state) => state.setSession);

  return useMutation({
    mutationFn: async (verificationToken: string) => {
      const { data } = await api.post<{ success: boolean; message: string }>('/api/v1/auth/verify-email', {
        token: verificationToken,
      });
      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['auth-user'] });
      if (token && user) {
        setSession({
          token,
          user: {
            ...user,
            isVerified: true,
          },
        });
      }
    },
  });
}

export function useResendVerification() {
  return useMutation({
    mutationFn: async ({ email }: { email?: string } = {}) => {
      const path = email ? '/api/v1/auth/resend-verification' : '/api/v1/users/me/resend-verification';
      const { data } = await api.post<{ success: boolean; message: string }>(path, email ? { email } : {});
      return data;
    },
  });
}

export function useCart() {
  const token = useAuthStore((state) => state.token);

  return useQuery({
    queryKey: ['cart'],
    queryFn: async () => {
      const { data } = await api.get<{ success: boolean; data: Cart }>('/api/v1/cart');
      return data.data;
    },
    enabled: Boolean(token),
  });
}

function updateCartCache(queryClient: ReturnType<typeof useQueryClient>, nextCart: Cart) {
  queryClient.setQueryData(['cart'], nextCart);
}

export function useAddToCart() {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);
  const guestAdd = useGuestCartStore((state) => state.addItem);

  return useMutation({
    mutationFn: async ({ product, quantity = 1 }: { product: Product; quantity?: number }) => {
      if (!token) {
        guestAdd(product);
        return null;
      }

      const { data } = await api.post<{ success: boolean; data: Cart }>('/api/v1/cart/items', {
        productId: product.id,
        quantity,
      });
      return data.data;
    },
    onSuccess: (cart) => {
      if (cart) {
        updateCartCache(queryClient, cart);
      }
    },
  });
}

export function useUpdateCartItem() {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);
  const guestUpdate = useGuestCartStore((state) => state.updateQuantity);

  return useMutation({
    mutationFn: async ({ productId, quantity }: { productId: number; quantity: number }) => {
      if (!token) {
        guestUpdate(productId, quantity);
        return null;
      }

      const previous = queryClient.getQueryData<Cart>(['cart']);
      if (previous) {
        queryClient.setQueryData<Cart>(['cart'], {
          ...previous,
          items: previous.items
            .map((item) =>
              item.product.id === productId
                ? { ...item, quantity, lineTotal: Number((item.product.price * quantity).toFixed(2)) }
                : item
            )
            .filter((item) => item.quantity > 0),
        });
      }

      const { data } = await api.put<{ success: boolean; data: Cart }>(`/api/v1/cart/items/${productId}`, { quantity });
      return data.data;
    },
    onSuccess: (cart) => {
      if (cart) {
        updateCartCache(queryClient, cart);
      }
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });
}

export function useRemoveCartItem() {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);
  const guestRemove = useGuestCartStore((state) => state.removeItem);

  return useMutation({
    mutationFn: async (productId: number) => {
      if (!token) {
        guestRemove(productId);
        return null;
      }

      const previous = queryClient.getQueryData<Cart>(['cart']);
      if (previous) {
        queryClient.setQueryData<Cart>(['cart'], {
          ...previous,
          items: previous.items.filter((item) => item.product.id !== productId),
        });
      }

      const { data } = await api.delete<{ success: boolean; data: Cart }>(`/api/v1/cart/items/${productId}`);
      return data.data;
    },
    onSuccess: (cart) => {
      if (cart) {
        updateCartCache(queryClient, cart);
      }
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });
}

export function useAiChat() {
  return useMutation({
    mutationFn: async (message: string) => {
      const { data } = await api.post<{ success: boolean; data: AiChatResponse }>('/api/v1/ai/chat', {
        message,
      });
      return data.data;
    },
  });
}

type CreateOrderPayload = {
  items: Array<{
    productId: number;
    quantity: number;
  }>;
  shippingAddress: string;
  shippingCity: string;
  shippingState: string;
  shippingZip: string;
  paymentMethod: 'cod';
};

export function useCreateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateOrderPayload) => {
      const { data } = await api.post<{ success: boolean; data: Order }>('/api/v1/orders', payload);
      return data.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['cart'] });
      await queryClient.invalidateQueries({ queryKey: ['orders'] });
      await queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
    },
  });
}

export function useOrders() {
  return useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Order[]>>('/api/v1/orders');
      return data.data;
    },
  });
}

export function useOrder(orderId?: string) {
  return useQuery({
    queryKey: ['orders', orderId],
    queryFn: async () => {
      const { data } = await api.get<{ success: boolean; data: Order }>(`/api/v1/orders/${orderId}`);
      return data.data;
    },
    enabled: Boolean(orderId),
  });
}

export function useAdminOrders() {
  return useQuery({
    queryKey: ['admin-orders'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Order[]>>('/api/v1/orders/admin/list');
      return data.data;
    },
  });
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ orderId, status }: { orderId: number; status: 'confirmed' | 'shipped' | 'delivered' }) => {
      const { data } = await api.patch<{ success: boolean; data: Order }>(`/api/v1/orders/${orderId}/status`, { status });
      return data.data;
    },
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      await queryClient.invalidateQueries({ queryKey: ['orders'] });
      await queryClient.invalidateQueries({ queryKey: ['orders', String(variables.orderId)] });
    },
  });
}

export function useCancelOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ orderId, reason }: { orderId: number; reason: string }) => {
      const { data } = await api.post<{ success: boolean; message: string }>(`/api/v1/orders/${orderId}/cancel-request`, { reason });
      return data;
    },
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({ queryKey: ['orders'] });
      await queryClient.invalidateQueries({ queryKey: ['orders', String(variables.orderId)] });
      await queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
    },
  });
}

export function useApproveCancel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderId: number) => {
      const { data } = await api.post<{ success: boolean; message: string }>(`/api/v1/orders/${orderId}/approve-cancel`);
      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
    },
  });
}

export function useRejectCancel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderId: number) => {
      const { data } = await api.post<{ success: boolean; message: string }>(`/api/v1/orders/${orderId}/reject-cancel`);
      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
    },
  });
}
