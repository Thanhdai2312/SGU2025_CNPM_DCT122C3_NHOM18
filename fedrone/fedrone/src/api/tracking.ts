// API client Theo dõi đơn
// - get(orderId): trả về trạng thái delivery, ETA, tiến độ, vị trí drone
import { API_BASE } from './client';

export type TrackingResponse = {
  orderId: string;
  items: { name: string; qty: number; price: number }[];
  address: string;
  shippingFee: number;
  subtotal: number;
  total: number;
  restaurant?: { name: string; lat: number; lng: number };
  destination?: { lat: number; lng: number };
  deliveryId?: string;
  tracking: {
    status: 'NO_DELIVERY' | 'QUEUED' | 'ASSIGNED' | 'EN_ROUTE' | 'COMPLETED' | string;
    eta?: string;
    startedAt?: string;
    completedAt?: string;
    droneId?: string;
    progress?: number; // 0..100
    drone?: { lat: number; lng: number };
  }
};

export const trackingApi = {
  async get(orderId: string, token?: string): Promise<TrackingResponse> {
    const res = await fetch(`${API_BASE}/api/tracking/${orderId}`, {
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }
};
