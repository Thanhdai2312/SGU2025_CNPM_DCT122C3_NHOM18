// API client Bếp chi nhánh (Admin)
// - listOrders(): liệt kê đơn đã thanh toán chưa hoàn tất bếp (tuỳ chọn lọc theo chi nhánh)
// - start(): chuyển đơn sang PREPARING và thông báo khách
// - complete(): đánh dấu kitchenDone và tạo delivery QUEUED nếu chưa có
import { API_BASE } from './client';
import { getActiveAdminArea } from '../utils/adminAuth';

export type KitchenOrder = {
  id: string;
  user: { id: string; name: string; email: string };
  status: 'CONFIRMED' | 'PREPARING';
  kitchenDone: boolean;
  createdAt: string;
  items: { id: string; name: string; qty: number }[];
};

function headers() {
  const { session } = getActiveAdminArea();
  const token = session?.token || localStorage.getItem('adminToken');
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

async function request(path: string, init: RequestInit = {}) {
  const res = await fetch(`${API_BASE}${path}`, { ...init, headers: { ...headers(), ...(init.headers as any) } });
  const ct = res.headers.get('content-type') || '';
  if (!res.ok) {
    if (ct.includes('application/json')) { const d = await res.json(); throw new Error(d?.message || `HTTP ${res.status}`); }
    throw new Error(`HTTP ${res.status}`);
  }
  return ct.includes('application/json') ? res.json() : res.text();
}

export const kitchenAdminApi = {
  listOrders(restaurantId?: string): Promise<KitchenOrder[]> {
    const qp = restaurantId ? `?restaurantId=${encodeURIComponent(restaurantId)}` : '';
    return request(`/api/admin/kitchen/orders${qp}`);
  },
  start(orderId: string): Promise<{ ok: true }>{ return request(`/api/admin/kitchen/orders/${orderId}/start`, { method: 'POST' }); },
  complete(orderId: string): Promise<{ ok: true }>{ return request(`/api/admin/kitchen/orders/${orderId}/complete`, { method: 'POST' }); },
};
