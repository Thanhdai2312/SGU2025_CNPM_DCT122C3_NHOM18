// API client Delivery (dùng cho Admin/Operator)
// - list(): liệt kê deliveries (lọc theo orderId)
// - get(): lấy chi tiết một delivery
// - updateStatus(): chỉnh trạng thái (demo)
// - dispatch(): yêu cầu dispatch một delivery (sau khi kitchenDone)
import { API_BASE } from './client';

export type Delivery = {
  id: string;
  orderId: string;
  droneId?: string | null;
  status: 'QUEUED' | 'ASSIGNED' | 'EN_ROUTE' | 'ARRIVED' | 'COMPLETED' | 'FAILED';
  eta?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
};

function adminHeaders(tokenOverride?: string): HeadersInit {
  const token = tokenOverride || localStorage.getItem('adminToken');
  return token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}

export const deliveryApi = {
  async list(params?: { orderId?: string }, tokenOverride?: string): Promise<Delivery[]> {
    const qs = params?.orderId ? `?orderId=${encodeURIComponent(params.orderId)}` : '';
    const res = await fetch(`${API_BASE}/api/delivery${qs}`, { headers: adminHeaders(tokenOverride) });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  async getById(id: string, tokenOverride?: string): Promise<Delivery> {
    const res = await fetch(`${API_BASE}/api/delivery/${id}`, { headers: adminHeaders(tokenOverride) });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  async updateStatus(id: string, status: Delivery['status'], tokenOverride?: string): Promise<Delivery> {
    const res = await fetch(`${API_BASE}/api/delivery/${id}/status`, {
      method: 'POST',
      headers: adminHeaders(tokenOverride),
      body: JSON.stringify({ status }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  async simulateComplete(id: string, tokenOverride?: string): Promise<Delivery> {
    const res = await fetch(`${API_BASE}/api/delivery/${id}/simulate-complete`, {
      method: 'POST',
      headers: adminHeaders(tokenOverride),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  async dispatch(id: string, tokenOverride?: string): Promise<Delivery> {
    const res = await fetch(`${API_BASE}/api/delivery/${id}/dispatch`, {
      method: 'POST',
      headers: adminHeaders(tokenOverride),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
};
