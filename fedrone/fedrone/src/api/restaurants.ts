// API client Nhà hàng
// - list(): danh sách chi nhánh hiển thị map/list
// - menu(): danh sách món còn bán của 1 chi nhánh
import { API_BASE } from './client';

export type Restaurant = { id: string; name: string; address: string; lat?: number; lng?: number };
export type MenuItem = { id: string; name: string; price: number; weight?: number; type?: 'FOOD' | 'DRINK'; imageUrl?: string | null; stock?: number | null };

export const restaurantsApi = {
  async list(): Promise<Restaurant[]> {
    const res = await fetch(`${API_BASE}/api/restaurants`);
    if (!res.ok) throw new Error('Failed to load restaurants');
    return res.json();
  },
  async menu(restaurantId: string): Promise<MenuItem[]> {
    const res = await fetch(`${API_BASE}/api/restaurants/${restaurantId}/menu`);
    if (!res.ok) throw new Error('Failed to load menu');
    return res.json();
  }
};
