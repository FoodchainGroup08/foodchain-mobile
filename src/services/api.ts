import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { emit } from '@/constants/eventEmitter';

const BASE_URL = (process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8080') + '/api/v1';
export const TOKEN_KEY = 'foodchain_token';
export const REFRESH_TOKEN_KEY = 'foodchain_refresh_token';

export const apiClient = axios.create({ baseURL: BASE_URL });

apiClient.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
      if (refreshToken) {
        originalRequest._retry = true;
        try {
          const r = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken });
          const newAccessToken = r.data.accessToken as string;
          const newRefreshToken = r.data.refreshToken as string | undefined;
          await SecureStore.setItemAsync(TOKEN_KEY, newAccessToken);
          if (newRefreshToken) await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, newRefreshToken);
          originalRequest.headers = { ...originalRequest.headers, Authorization: `Bearer ${newAccessToken}` };
          return apiClient(originalRequest);
        } catch {
          await SecureStore.deleteItemAsync(TOKEN_KEY);
          await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
          await SecureStore.deleteItemAsync('foodchain_user');
          emit('foodchain:unauthorized');
          return Promise.reject(error);
        }
      }
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
      await SecureStore.deleteItemAsync('foodchain_user');
      emit('foodchain:unauthorized');
    }
    return Promise.reject(error);
  }
);

// ─── Types ────────────────────────────────────────────────────────────────────

export type UserRole = 'Customer' | 'Kitchen Staff' | 'Branch Manager' | 'Admin';

export interface User {
  id: string; name: string; email: string; role: UserRole;
  branchId?: string | null; addressLine?: string | null;
  latitude?: number | null; longitude?: number | null;
}

export interface Branch {
  id: string; name: string; address: string; phone?: string;
  description?: string; managerId?: string;
  latitude?: number; longitude?: number; location?: string;
  distance?: string; hours: string; rating: number;
  isOpen: boolean; isActive: boolean; manager?: string;
}

export interface BranchHour {
  id?: string; dayOfWeek: number; dayName?: string;
  openTime: string; closeTime: string; closed: boolean;
}

export interface BranchTable {
  id: string; tableNumber: string | number; capacity: number; isAvailable: boolean;
}

export interface MenuItem {
  id: string; name: string; description: string; price: number;
  category: string; available: boolean; isActive?: boolean;
  imageUrl?: string; image?: string;
}

export type OrderStatus = 'RECEIVED'|'CONFIRMED'|'PREPARING'|'READY'|'PICKED_UP'|'SERVED'|'COMPLETED'|'CANCELLED';

export interface OrderItem { id: string; name: string; price: number; quantity: number; }

export interface Order {
  id: string; status: string; items: OrderItem[]; itemCount?: number;
  subtotal: number; deliveryFee: number; total: number;
  branchId: string; branchName: string;
  orderType: 'delivery'|'dine-in'|'takeaway';
  tableNumber?: string; deliveryAddress?: string;
  customerId?: string; customerName: string; phoneNumber?: string;
  specialInstructions?: string; estimatedTime?: string;
  placedAt: string; orderDate?: string; deliveryDate?: string; paymentMethod?: string;
}

export interface PlaceOrderPayload {
  branchId: string; branchName?: string;
  orderType: 'delivery'|'dine-in'|'takeaway';
  tableNumber?: string; deliveryAddress?: string;
  customerName?: string; customerEmail?: string;
  phoneNumber?: string; paymentMethod?: string;
  specialInstructions?: string; notes?: string;
  items: Array<{ menuItemId: string; menuItemName?: string; quantity: number; unitPrice?: number; specialInstructions?: string }>;
}

export interface KitchenOrder {
  id: string; status: 'received'|'preparing'|'ready'|'picked-up'|'served';
  items: Array<{ id: string; name: string; quantity: number; specialInstructions?: string }>;
  orderType: 'dine-in'|'takeaway'|'delivery';
  tableNumber?: string; receivedAt: string;
  isNew?: boolean; isUrgent?: boolean; customerName?: string;
}

export interface KitchenStatusGroup { total: number; page: number; size: number; orders: KitchenOrder[]; }

export interface KitchenQueuePage {
  branchId: string; page: number; size: number;
  received: KitchenStatusGroup; preparing: KitchenStatusGroup; ready: KitchenStatusGroup;
}

export interface ManagerDashboard {
  totalOrders: number; totalRevenue: number; averageOrderValue: number;
  ordersChange?: number; revenueChange?: number; averagePrepTime?: number;
  peakHour?: string; peakHourOrders?: number; completionRate?: number;
  dineInCount?: number; takeawayCount?: number; deliveryCount?: number;
}

export interface ManagerHistoryDay {
  branchId: string; date: string; totalOrders: number; completedOrders: number;
  cancelledOrders: number; inProgressOrders: number; totalRevenue: number;
  avgOrderValue: number; dineInCount: number; takeawayCount: number; deliveryCount: number;
}

export interface HourlySales { hour: string; revenue: number; orders: number; }

export interface PopularItem {
  id: string; name: string; category: string; quantitySold: number; revenue: number; trend: number;
}

export interface AdminOverview {
  startDate: string; endDate: string; totalOrders: number; totalRevenue: number;
  avgOrderValue: number; completionRate: number; cancellationRate: number;
  revenueGrowthPercent: number; ordersGrowthPercent: number;
  topPerformingBranch: string|null; fastestBranch: string|null;
  slowestBranch: string|null; totalBranches: number;
}

export interface AdminPopularItem { id: string; name: string; quantitySold: number; revenue: number; }

export interface BranchComparison {
  branchId: string; name?: string; totalOrders: number; totalRevenue: number;
  avgOrderValue: number; completionRate: number; cancellationRate: number;
  avgPreparationTimeMinutes: number|null; topItems: AdminPopularItem[];
}

export interface TrendDataPoint {
  period: string; revenue: number; orders: number;
  avgPreparationTimeMinutes: number|null; completionRate: number|null;
}

export interface AdminTrends {
  startDate: string; endDate: string; interval: string; branchId: string|null; dataPoints: TrendDataPoint[];
}

export interface OrdersByStatusEntry { status: string; count: number; percentage: number; }

export interface AdminOperational {
  ordersByStatus: OrdersByStatusEntry[];
  ordersByHour: Array<{ hour: string; revenue: number; orders: number }>;
  peakHour: string|null; totalOrders: number;
}

export interface SystemUser {
  id: string; name: string; email: string; role: UserRole;
  status: 'active'|'inactive'; branch?: string; branchId?: string;
}

export type ReportType = 'BRANCH_PERFORMANCE'|'SALES_SUMMARY'|'ORDER_SUMMARY';

export interface GenerateReportRequest {
  reportType: ReportType; branchId?: string|null;
  startDate: string; endDate: string; requestedBy?: string;
}

export interface Report {
  id: number; reportType: string; branchId: string|null;
  startDate: string; endDate: string; generatedAt: string; generatedBy: string|null;
  totalOrders: number|null; completedOrders: number|null; cancelledOrders: number|null;
  inProgressOrders: number|null; totalRevenue: number|null; avgOrderValue: number|null;
  dineInCount: number|null; takeawayCount: number|null; deliveryCount: number|null;
  completionRate: number; cancellationRate: number;
}

export interface ReportListItem {
  id: number; reportType: string; branchId: string|null;
  startDate: string; endDate: string; generatedAt: string;
  generatedBy: string|null; totalRevenue: number|null; totalOrders: number|null;
}

export interface AdminNotification {
  id: number; userId: string; title: string; message: string; type: string;
  channel: string|null; relatedEntityType: string|null; relatedEntityId: string|null;
  status: string; isRead: boolean; retryCount: number;
  sentAt: string|null; readAt: string|null; createdAt: string;
}

export interface FoodSuggestionRequest {
  branchId: string; branchName: string; budget?: number;
  mealType?: 'breakfast'|'lunch'|'dinner'|'snack'|'dessert';
  appetite?: 'light'|'heavy'; dietaryPreferences?: string[];
  peopleCount?: number; fulfillmentType?: 'pickup'|'delivery'|'dine-in'; limit?: number;
}

export interface ComboItem { menuItemId: string; name: string; price: number; }

export interface ComboSuggestion {
  comboName: string; items: ComboItem[]; totalPrice: number;
  healthScore: number; wellnessTags: string[]; reason: string; confidence: number;
}

export type RecommendationSource = 'GEMINI'|'RULE_BASED'|'NONE';

export interface AiRecommendationResponse {
  recommendationSource: RecommendationSource; fallbackUsed: boolean;
  message: string; readyForSuggestions: boolean; questions: string[];
  suggestions: ComboSuggestion[]; estimatedTotalCost: number;
}

export interface WsOrderUpdate {
  orderId: string; branchId: string; customerId: string;
  oldStatus: OrderStatus; newStatus: OrderStatus; updatedBy: string; timestamp: string;
}

export interface AuthResponse {
  accessToken: string; refreshToken: string; tokenType: string; expiresIn: number; user: User;
}

// ─── Mappers ──────────────────────────────────────────────────────────────────

function mapUserRole(raw: string): UserRole {
  switch (raw) {
    case 'CUSTOMER': return 'Customer';
    case 'KITCHEN_STAFF': return 'Kitchen Staff';
    case 'BRANCH_MANAGER': return 'Branch Manager';
    case 'HEAD_OFFICE_ADMIN': case 'ADMIN': return 'Admin';
    default: return raw as UserRole;
  }
}

function mapUser(u: any): User {
  return { id: u.id, name: u.name, email: u.email, role: mapUserRole(u.role), branchId: u.branchId ?? null, addressLine: u.addressLine ?? null, latitude: u.latitude ?? null, longitude: u.longitude ?? null };
}

function mapBranch(b: any): Branch {
  return {
    id: b.id, name: b.name, address: b.address, phone: b.phone, description: b.description, managerId: b.managerId,
    latitude: b.latitude, longitude: b.longitude, location: b.address,
    distance: b.distanceKm != null ? `${Number(b.distanceKm).toFixed(1)} km` : b.distance,
    hours: (b.hours && b.hours !== 'Hours not set') ? b.hours : (b.hoursDisplay && b.hoursDisplay !== 'Hours not set') ? b.hoursDisplay : '—',
    rating: b.rating ?? 0, isOpen: b.isOpen ?? false, isActive: b.isActive ?? b.active ?? false, manager: b.manager ?? b.managerId,
  };
}

function mapMenuItem(m: any): MenuItem {
  return {
    id: m.id, name: m.name, description: m.description ?? '',
    price: m.price ?? m.basePrice ?? 0, category: m.category ?? m.categoryName ?? '',
    available: m.available ?? m.active ?? false, isActive: m.isActive ?? m.active ?? false,
    imageUrl: m.imageUrl ?? m.image, image: m.image ?? m.imageUrl,
  };
}

function normaliseOrderType(raw: string): 'dine-in'|'takeaway'|'delivery' {
  switch (raw?.toUpperCase?.()) {
    case 'DINE_IN': return 'dine-in';
    case 'TAKEAWAY': return 'takeaway';
    case 'DELIVERY': return 'delivery';
    default: return (raw as any) ?? 'dine-in';
  }
}

function normaliseOrderStatus(raw: string): string {
  const valid = ['RECEIVED','CONFIRMED','PREPARING','READY','PICKED_UP','SERVED','COMPLETED','CANCELLED'];
  return valid.includes(raw) ? raw : raw ?? 'RECEIVED';
}

function mapOrderItem(i: any): OrderItem {
  return { id: i.id ?? i.menuItemId ?? '', name: i.name ?? i.menuItemName ?? i.itemName ?? i.menuItem?.name ?? '', price: i.price ?? i.unitPrice ?? i.basePrice ?? 0, quantity: i.quantity ?? 1 };
}

function mapOrder(o: any): Order {
  return {
    id: o.id ?? o.orderId ?? '', status: normaliseOrderStatus(o.status),
    items: (o.items ?? []).map(mapOrderItem), itemCount: o.itemCount,
    subtotal: o.subtotal ?? o.totalAmount ?? 0, deliveryFee: o.deliveryFee ?? 0,
    total: o.total ?? o.totalAmount ?? 0, branchId: o.branchId ?? o.branch?.id ?? '',
    branchName: o.branchName ?? o.branch?.name ?? '', orderType: normaliseOrderType(o.orderType),
    tableNumber: o.tableNumber, deliveryAddress: o.deliveryAddress,
    customerId: o.customerId ?? o.userId ?? o.customer?.id, customerName: o.customerName ?? '',
    phoneNumber: o.phoneNumber, specialInstructions: o.specialInstructions,
    estimatedTime: o.estimatedTime, placedAt: o.placedAt ?? o.createdAt ?? new Date().toISOString(),
    paymentMethod: o.paymentMethod,
  };
}

const normalizeKitchenStatus = (status?: string): KitchenOrder['status'] => {
  const value = status?.toLowerCase().replace('_', '-');
  if (value === 'preparing' || value === 'ready' || value === 'picked-up' || value === 'served') return value;
  return 'received';
};

const normalizeKitchenOrderType = (orderType?: string): KitchenOrder['orderType'] => {
  const value = orderType?.toLowerCase().replace('_', '-');
  if (value === 'dine-in' || value === 'delivery') return value;
  return 'takeaway';
};

const mapKitchenOrder = (order: any): KitchenOrder => ({
  id: order.id ?? order.orderId,
  status: normalizeKitchenStatus(order.displayStatus ?? order.status),
  items: Array.isArray(order.items) ? order.items.map((item: any, i: number) => ({ id: item.id ?? item.menuItemId ?? `${item.name ?? 'item'}-${i}`, name: item.name ?? item.menuItemName ?? 'Menu item', quantity: item.quantity ?? 1, specialInstructions: item.specialInstructions ?? undefined })) : [],
  orderType: normalizeKitchenOrderType(order.displayOrderType ?? order.orderType),
  tableNumber: order.tableNumber ?? undefined,
  receivedAt: order.receivedAt ?? order.createdAt ?? new Date().toISOString(),
  isNew: order.isNew, isUrgent: order.isUrgent, customerName: order.customerName ?? undefined,
});

const parseStatusGroup = (g: any, fallbackSize: number): KitchenStatusGroup => {
  if (Array.isArray(g)) { const orders = g.map(mapKitchenOrder); return { total: orders.length, page: 0, size: fallbackSize, orders }; }
  if (!g || typeof g !== 'object') return { total: 0, page: 0, size: fallbackSize, orders: [] };
  const orders = Array.isArray(g.orders) ? g.orders.map(mapKitchenOrder) : [];
  return { total: g.total ?? orders.length, page: g.page ?? 0, size: g.size ?? fallbackSize, orders };
};

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const postRegister = (name: string, email: string, password: string) =>
  apiClient.post<any>('/auth/register', { name, email, password, role: 'CUSTOMER', branchId: null }).then(r => mapUser(r.data));

export const postLogin = (email: string, password: string) =>
  apiClient.post<any>('/auth/login', { email, password }).then(r => ({ token: (r.data.accessToken ?? r.data.token) as string, refreshToken: r.data.refreshToken as string|undefined, user: mapUser(r.data.user) }));

export const postLogout = (refreshToken?: string) =>
  apiClient.post('/auth/logout', refreshToken ? { refreshToken } : {}).then(r => r.data);

export const getMe = () => apiClient.get<any>('/users/me').then(r => mapUser(r.data));

export const updateProfile = (data: { name?: string; addressLine?: string; latitude?: number; longitude?: number }) =>
  apiClient.patch<any>('/users/me', data).then(r => mapUser(r.data));

export const postForgotPassword = (email: string) =>
  apiClient.post<any>('/auth/forgot-password', { email }).then(r => r.data);

export const postResetPassword = (token: string, newPassword: string) =>
  apiClient.post<any>('/auth/reset-password', { token, newPassword }).then(r => r.data);

export const getVerifyEmail = (token: string) =>
  apiClient.get<any>('/auth/verify-email', { params: { token } }).then(r => r.data);

export const postResendVerification = (email: string) =>
  apiClient.post<any>('/auth/resend-verification', { email }).then(r => r.data);

export const postRefreshToken = (refreshToken: string): Promise<AuthResponse> =>
  apiClient.post<any>('/auth/refresh', { refreshToken }).then(r => ({ accessToken: r.data.accessToken as string, refreshToken: r.data.refreshToken as string, tokenType: r.data.tokenType as string, expiresIn: r.data.expiresIn as number, user: mapUser(r.data.user) }));

// ─── Branches ─────────────────────────────────────────────────────────────────

export const getBranches = (): Promise<Branch[]> =>
  apiClient.get<any>('/branches').then(r => { const items: any[] = r.data?.content ?? (Array.isArray(r.data) ? r.data : []); return items.map(mapBranch); });

export const getBranchesNearby = (lat: number, lng: number): Promise<Branch[]> =>
  apiClient.get<any[]>('/branches/nearby', { params: { lat, lng } }).then(r => (r.data ?? []).map(mapBranch));

export const getBranchById = (id: string): Promise<Branch> =>
  apiClient.get<any>(`/branches/${id}`).then(r => mapBranch(r.data));

export const createBranch = (data: Partial<Branch>): Promise<Branch> =>
  apiClient.post<any>('/branches', data).then(r => mapBranch(r.data));

export const updateBranch = (id: string, data: Partial<Branch>): Promise<Branch> =>
  apiClient.put<any>(`/branches/${id}`, data).then(r => mapBranch(r.data));

export const patchBranchStatus = (id: string, isActive: boolean): Promise<Branch> =>
  apiClient.patch<any>(`/branches/${id}/${isActive ? 'activate' : 'deactivate'}`).then(r => mapBranch(r.data));

export const getBranchHours = (id: string): Promise<BranchHour[]> =>
  apiClient.get<any>(`/branches/${id}/hours`).then(r => r.data ?? []);

export const setBranchHours = (id: string, hours: Omit<BranchHour, 'id'|'dayName'>[]): Promise<BranchHour[]> =>
  apiClient.put<any>(`/branches/${id}/hours`, hours).then(r => r.data ?? []);

export const getTablesByBranch = (branchId: string): Promise<BranchTable[]> =>
  apiClient.get<any>(`/branches/${branchId}/tables`).then(r => {
    const items: any[] = r.data?.content ?? r.data?.tables ?? (Array.isArray(r.data) ? r.data : []);
    return items.map(t => ({ id: t.id ?? String(t.tableNumber ?? t.number), tableNumber: t.tableNumber ?? t.number ?? '?', capacity: t.capacity ?? t.seats ?? 4, isAvailable: t.isAvailable ?? t.available ?? true }));
  });

// ─── Menu ─────────────────────────────────────────────────────────────────────

export const getMenuByBranch = (branchId: string): Promise<MenuItem[]> =>
  apiClient.get<any[]>(`/menu/branch/${branchId}`).then(r => (r.data ?? []).map(mapMenuItem));

export const getAllMenuItems = (params?: { categoryId?: string; active?: boolean; page?: number; size?: number }): Promise<MenuItem[]> =>
  apiClient.get<any>('/menu/items', { params }).then(r => { const items: any[] = r.data?.content ?? (Array.isArray(r.data) ? r.data : []); return items.map(mapMenuItem); });

export const getMenuItemById = (id: string): Promise<MenuItem> =>
  apiClient.get<any>(`/menu/items/${id}`).then(r => mapMenuItem(r.data));

export const getCategories = (): Promise<string[]> =>
  apiClient.get<any>('/menu/categories', { params: { namesOnly: true } }).then(r => { const data: any[] = Array.isArray(r.data) ? r.data : []; return data.map(c => (typeof c === 'string' ? c : String(c.name ?? c))); });

export const getCategoriesFull = () =>
  apiClient.get<any>('/menu/categories').then(r => (Array.isArray(r.data) ? r.data : []) as Array<{ id: string; name: string; displayOrder: number; active: boolean }>);

export const createMenuItem = (data: { name: string; description?: string; categoryId: string; price: number; imageUrl?: string }): Promise<MenuItem> =>
  apiClient.post<any>('/menu/items', { name: data.name, description: data.description, categoryId: data.categoryId, basePrice: data.price, imageUrl: data.imageUrl }).then(r => mapMenuItem(r.data));

export const updateMenuItem = (id: string, data: { name?: string; description?: string; categoryId?: string; price?: number; imageUrl?: string }): Promise<MenuItem> =>
  apiClient.put<any>(`/menu/items/${id}`, { name: data.name, description: data.description, categoryId: data.categoryId, basePrice: data.price, imageUrl: data.imageUrl }).then(r => mapMenuItem(r.data));

export const deleteMenuItem = (id: string) =>
  apiClient.delete(`/menu/items/${id}`).then(r => r.data);

export const activateMenuItem = (id: string): Promise<MenuItem> =>
  apiClient.patch<any>(`/menu/items/${id}/activate`).then(r => mapMenuItem(r.data));

export const deactivateMenuItem = (id: string): Promise<MenuItem> =>
  apiClient.patch<any>(`/menu/items/${id}/deactivate`).then(r => mapMenuItem(r.data));

export const toggleMenuItemAvailability = (id: string): Promise<MenuItem> =>
  apiClient.patch<any>(`/menu/items/${id}/toggle`).then(r => mapMenuItem(r.data));

export const createCategory = (name: string, displayOrder?: number) =>
  apiClient.post<any>('/menu/categories', { name, displayOrder }).then(r => r.data);

export const updateCategory = (id: string, data: { name?: string; displayOrder?: number }) =>
  apiClient.put<any>(`/menu/categories/${id}`, data).then(r => r.data);

export const getFoodSuggestions = (request: FoodSuggestionRequest): Promise<AiRecommendationResponse> =>
  apiClient.post<AiRecommendationResponse>('/menu/suggestions', request).then(r => r.data);

// ─── Orders ───────────────────────────────────────────────────────────────────

export const placeOrder = (payload: PlaceOrderPayload): Promise<Order> =>
  apiClient.post<any>('/orders', payload, { headers: { 'Idempotency-Key': Math.random().toString(36).slice(2) + Date.now() } }).then(r => mapOrder(r.data));

export const getActiveOrders = (customerId?: string): Promise<Order[]> =>
  apiClient.get<any>('/orders/active', { params: { ...(customerId && { customerId }), size: 20 } }).then(r => {
    const data = r.data;
    if (data?.content && Array.isArray(data.content)) return data.content.map(mapOrder);
    if (Array.isArray(data)) return data.map(mapOrder);
    return data ? [mapOrder(data)] : [];
  });

export const getOrderHistory = (customerId?: string): Promise<Order[]> =>
  apiClient.get<any>('/orders/history', { params: { ...(customerId && { customerId }), size: 20 } }).then(r => {
    const data = r.data;
    if (data?.content && Array.isArray(data.content)) return data.content.map(mapOrder);
    return Array.isArray(data) ? data.map(mapOrder) : [];
  });

export const getOrderById = (id: string): Promise<Order> =>
  apiClient.get<any>(`/orders/${id}`).then(r => mapOrder(r.data));

export const cancelOrder = (id: string, cancelledBy?: string, reason?: string) =>
  apiClient.post(`/orders/${id}/cancel`, { cancelledBy, reason }).then(r => r.data);

// ─── Kitchen ──────────────────────────────────────────────────────────────────

export const getKitchenQueue = (page = 0, size = 20): Promise<KitchenQueuePage> =>
  apiClient.get<any>('/kitchen/queue', { params: { page, size } }).then(r => {
    const d = r.data;
    if (d && typeof d === 'object') {
      const receivedRaw = d.received ?? d.RECEIVED;
      const preparingRaw = d.preparing ?? d.PREPARING;
      const readyRaw = d.ready ?? d.READY;
      if (receivedRaw !== undefined || preparingRaw !== undefined || readyRaw !== undefined) {
        return { branchId: d.branchId ?? '', page: d.page ?? page, size: d.size ?? size, received: parseStatusGroup(receivedRaw, size), preparing: parseStatusGroup(preparingRaw, size), ready: parseStatusGroup(readyRaw, size) };
      }
    }
    return { branchId: '', page, size, received: { total: 0, page: 0, size, orders: [] }, preparing: { total: 0, page: 0, size, orders: [] }, ready: { total: 0, page: 0, size, orders: [] } };
  });

export const acceptKitchenOrder = (orderId: string) =>
  apiClient.post(`/kitchen/orders/${orderId}/accept`).then(r => r.data);

export const readyKitchenOrder = (orderId: string) =>
  apiClient.post(`/kitchen/orders/${orderId}/ready`).then(r => r.data);

export const pickupKitchenOrder = (orderId: string) =>
  apiClient.post(`/kitchen/orders/${orderId}/pickup`).then(r => r.data);

export const serveKitchenOrder = (orderId: string) =>
  apiClient.post(`/kitchen/orders/${orderId}/serve`).then(r => r.data);

// ─── Manager ──────────────────────────────────────────────────────────────────

export const getManagerDashboard = (date?: string): Promise<ManagerDashboard> =>
  apiClient.get<any>('/manager/dashboard', { params: date ? { date } : undefined }).then(r => {
    const d = r.data; return { ...d, totalRevenue: Math.round((d.totalRevenue ?? 0) / 100), averageOrderValue: Math.round((d.averageOrderValue ?? 0) / 100) };
  });

export const getManagerLiveOrders = (): Promise<Order[]> =>
  apiClient.get<any>('/manager/orders/live').then(r => {
    const rows: any[] = r.data?.content ?? (Array.isArray(r.data) ? r.data : []);
    return rows.map(o => ({ ...mapOrder(o), total: Math.round((o.total ?? 0) / 100), subtotal: Math.round((o.subtotal ?? 0) / 100), deliveryFee: Math.round((o.deliveryFee ?? 0) / 100) }));
  });

export const getDailySales = (date?: string): Promise<HourlySales[]> =>
  apiClient.get<any>('/manager/sales/daily', { params: date ? { date } : undefined }).then(r => {
    const rows: HourlySales[] = Array.isArray(r.data) ? r.data : r.data?.content ?? [];
    return rows.map(h => ({ ...h, revenue: Math.round((h.revenue ?? 0) / 100) }));
  });

export const getPopularItems = (date?: string): Promise<PopularItem[]> =>
  apiClient.get<any>('/manager/items/popular', { params: date ? { date } : undefined }).then(r => {
    const rows: PopularItem[] = Array.isArray(r.data) ? r.data : r.data?.content ?? [];
    return rows.map(item => ({ ...item, revenue: Math.round((item.revenue ?? 0) / 100) }));
  });

export const getManagerHistory = (from?: string, to?: string): Promise<ManagerHistoryDay[]> =>
  apiClient.get<any>('/manager/summary/history', { params: { ...(from && { from }), ...(to && { to }) } }).then(r => {
    const rows: ManagerHistoryDay[] = Array.isArray(r.data) ? r.data : r.data?.content ?? [];
    return rows.map(d => ({ ...d, totalRevenue: Math.round((d.totalRevenue ?? 0) / 100), avgOrderValue: Math.round((d.avgOrderValue ?? 0) / 100) }));
  });

// ─── Admin ────────────────────────────────────────────────────────────────────

export const getAdminOverview = (startDate?: string, endDate?: string, branchId?: string): Promise<AdminOverview> =>
  apiClient.get<any>('/admin/analytics/overview', { params: { startDate, endDate, branchId } }).then(r => ({ ...r.data, totalRevenue: Number(r.data.totalRevenue ?? 0), avgOrderValue: Number(r.data.avgOrderValue ?? 0) }));

export const getBranchComparison = (startDate?: string, endDate?: string): Promise<BranchComparison[]> =>
  apiClient.get<any[]>('/admin/analytics/compare', { params: { startDate, endDate } }).then(r => (r.data ?? []).map((b: any) => ({ ...b, totalRevenue: Number(b.totalRevenue ?? 0), avgOrderValue: Number(b.avgOrderValue ?? 0) })));

export const getAdminTrends = (startDate?: string, endDate?: string, interval?: string, branchId?: string): Promise<AdminTrends> =>
  apiClient.get<any>('/admin/analytics/trends', { params: { startDate, endDate, interval, branchId } }).then(r => ({ ...r.data, dataPoints: (r.data.dataPoints ?? []).map((p: any) => ({ ...p, revenue: Number(p.revenue ?? 0) })) }));

export const getAdminOperational = (startDate?: string, endDate?: string, branchId?: string): Promise<AdminOperational> =>
  apiClient.get<AdminOperational>('/admin/analytics/operational', { params: { startDate, endDate, branchId } }).then(r => r.data);

export const getAdminPopularItems = (startDate?: string, endDate?: string, limit = 10, branchId?: string): Promise<AdminPopularItem[]> =>
  apiClient.get<AdminPopularItem[]>('/admin/analytics/popular-items', { params: { startDate, endDate, limit, branchId } }).then(r => r.data ?? []);

export const getAllUsers = (role?: string): Promise<SystemUser[]> =>
  apiClient.get<SystemUser[]>('/admin/users', { params: role ? { role } : undefined }).then(r => r.data);

export const patchUserStatus = (userId: string, status: 'active'|'inactive') =>
  apiClient.patch(`/admin/users/${userId}/status`, { status }).then(r => r.data);

// ─── Reports ──────────────────────────────────────────────────────────────────

export const generateReport = (req: GenerateReportRequest): Promise<Report> =>
  apiClient.post<any>('/reports/generate', req).then(r => r.data);

export const getReports = (page = 0, size = 20) =>
  apiClient.get<any>('/reports', { params: { page, size } }).then(r => r.data);

export const getReportById = (id: number): Promise<Report> =>
  apiClient.get<any>(`/reports/${id}`).then(r => r.data);

// ─── Notifications ────────────────────────────────────────────────────────────

export const getNotifications = (page = 0, size = 20) =>
  apiClient.get<any>('/notifications', { params: { page, size } }).then(r => r.data);

export const getUnreadNotificationCount = (): Promise<number> =>
  apiClient.get<any>('/notifications/unread-count').then(r => Number(r.data ?? 0));

export const markNotificationRead = (id: number): Promise<AdminNotification> =>
  apiClient.patch<any>(`/notifications/${id}/read`).then(r => r.data);

export const markAllNotificationsRead = (): Promise<number> =>
  apiClient.patch<any>('/notifications/read-all').then(r => r.data);

export const deleteNotification = (id: number): Promise<void> =>
  apiClient.delete(`/notifications/${id}`).then(r => r.data);
