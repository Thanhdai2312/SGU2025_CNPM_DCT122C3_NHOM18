// API client Checkout
// - estimate(): ước tính phí ship trước khi đặt
// - checkout(): tạo đơn hàng mới từ giỏ hàng
import { API_BASE } from './client';

export type CheckoutInput = {
  restaurantId: string;
  address?: string;
  destLat?: number;
  destLng?: number;
  items: { menuItemId: string; qty: number }[];
};

export type CheckoutResult = {
  orderId: string; // order id
  total: number;
  shippingFee: number;
};

export const checkoutApi = {
  async create(input: CheckoutInput, token?: string): Promise<CheckoutResult> {
    const res = await fetch(`${API_BASE}/api/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(input),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }
  ,
    async estimate(params: { restaurantId: string; destLat: number; destLng: number }, token?: string): Promise<{ distanceKm: number; shippingFee: number; formula: string; overLimit?: boolean }> {
    const qs = new URLSearchParams({
      restaurantId: params.restaurantId,
      destLat: String(params.destLat),
      destLng: String(params.destLng),
    }).toString();
    const res = await fetch(`${API_BASE}/api/checkout/estimate?${qs}`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }
};
