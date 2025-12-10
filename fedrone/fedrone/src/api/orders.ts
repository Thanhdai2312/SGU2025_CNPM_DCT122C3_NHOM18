// API client Đơn hàng
// - mine(): danh sách đơn của tôi (khách)
// - listAll(): danh sách tất cả đơn (admin/operator)
// - cancel(): khách hủy đơn trong 60s đầu
import { API_BASE } from './client';

export type OrderSummary = {
  id: string;
  createdAt: string;
  status: string;
  paymentStatus: string;
  total: number;
  shippingFee: number;
  shippingAddress: string;
  userId?: string;
  restaurantId?: string;
  delivery?: { status: string };
};

function authHeaders(overrideToken?: string): HeadersInit {
  const token = overrideToken || localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const ordersApi = {
  async listMine(tokenOverride?: string): Promise<OrderSummary[]> {
    const res = await fetch(`${API_BASE}/api/orders/mine`, { headers: { ...authHeaders(tokenOverride) } });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  async listAll(tokenOverride?: string): Promise<OrderSummary[]> {
    const res = await fetch(`${API_BASE}/api/orders`, { headers: { ...authHeaders(tokenOverride) } });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  async cancel(orderId: string, tokenOverride?: string): Promise<{ ok: true }> {
    const res = await fetch(`${API_BASE}/api/orders/${orderId}/cancel`, { method: 'POST', headers: { ...authHeaders(tokenOverride) } });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }
};
