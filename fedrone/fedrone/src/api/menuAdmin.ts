// API client Menu (Admin)
// - list(): liệt kê món theo nhà hàng
// - create(): thêm món
// - update(): cập nhật món
// - remove(): xoá món
import { API_BASE } from './client';

export type MenuItemAdmin = {
  id: string;
  restaurantId: string;
  name: string;
  price: number;
  weight?: number | null;
  isAvailable: boolean;
  type: 'FOOD' | 'DRINK';
  imageUrl?: string | null;
  stock?: number | null;
};

type UpsertInput = Partial<MenuItemAdmin> & { name?: string; price?: number };

function adminHeaders(tokenOverride?: string): HeadersInit {
  const token = tokenOverride || localStorage.getItem('adminToken');
  return token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}

export const menuAdminApi = {
  async list(restaurantId: string, tokenOverride?: string): Promise<MenuItemAdmin[]> {
    const res = await fetch(`${API_BASE}/api/admin/menu/${restaurantId}`, { headers: adminHeaders(tokenOverride) });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  async create(restaurantId: string, data: UpsertInput, tokenOverride?: string): Promise<MenuItemAdmin> {
    const res = await fetch(`${API_BASE}/api/admin/menu/${restaurantId}`, { method: 'POST', headers: adminHeaders(tokenOverride), body: JSON.stringify(data) });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  async update(id: string, data: UpsertInput, tokenOverride?: string): Promise<MenuItemAdmin> {
    const res = await fetch(`${API_BASE}/api/admin/menu/item/${id}`, { method: 'PATCH', headers: adminHeaders(tokenOverride), body: JSON.stringify(data) });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  async remove(id: string, tokenOverride?: string): Promise<{ ok: true }> {
    const res = await fetch(`${API_BASE}/api/admin/menu/item/${id}`, { method: 'DELETE', headers: adminHeaders(tokenOverride) });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
};