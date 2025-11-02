// API client giỏ hàng phía frontend
// - get(): lấy giỏ hiện tại
// - setItems(): ghi đè danh sách item (server sẽ tính giá dựa vào MenuItem hiện tại)
// - addOne()/updateQty(): tiện ích thao tác giỏ
import { API_BASE } from './client';

export type CartMenuItem = {
  id: string;
  name: string;
  price: number;
  weight?: number;
};

export type CartItem = {
  id: string;
  menuItemId: string;
  qty: number;
  menuItem: CartMenuItem;
};

export type Cart = {
  id: string;
  userId: string;
  items: CartItem[];
};

export const cartApi = {
  async get(): Promise<Cart> {
    const res = await fetch(`${API_BASE}/api/cart`, { headers: authHeader() as any });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  async setItems(items: { menuItemId: string; qty: number }[]): Promise<Cart> {
    const res = await fetch(`${API_BASE}/api/cart`, {
      method: 'POST',
  headers: { 'Content-Type': 'application/json', ...(authHeader() as any) },
      body: JSON.stringify({ items })
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  async addOne(menuItemId: string): Promise<Cart> {
    const current = await this.get();
    const map = new Map<string, number>();
    current.items.forEach(i => map.set(i.menuItemId, i.qty));
    map.set(menuItemId, (map.get(menuItemId) || 0) + 1);
    const items = Array.from(map.entries()).map(([id, qty]) => ({ menuItemId: id, qty }));
    return this.setItems(items);
  },
  async updateQty(menuItemId: string, qty: number): Promise<Cart> {
    const current = await this.get();
    const map = new Map<string, number>();
    current.items.forEach(i => map.set(i.menuItemId, i.qty));
    if (qty <= 0) map.delete(menuItemId); else map.set(menuItemId, qty);
    const items = Array.from(map.entries()).map(([id, q]) => ({ menuItemId: id, qty: q }));
    return this.setItems(items);
  }
};

function authHeader() {
  const t = localStorage.getItem('token');
  return t ? { Authorization: `Bearer ${t}` } : {};
}
