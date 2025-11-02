// API client Người dùng (Admin)
// - list(): tìm kiếm/lọc theo vai trò
// - stats(): thống kê số lượng theo vai trò
// - remove(): xoá người dùng (cascade theo backend)
import { API_BASE } from './client';

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: 'ADMIN' | 'CUSTOMER';
  createdAt: string;
};

function adminHeaders() {
  const token = localStorage.getItem('adminToken');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

async function request(path: string, options: RequestInit = {}) {
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers: { ...adminHeaders(), ...(options.headers as any) } });
  const ct = res.headers.get('content-type') || '';
  if (!res.ok) {
    if (ct.includes('application/json')) {
      const data = await res.json();
      throw new Error(data?.message || `HTTP ${res.status}`);
    }
    throw new Error(`HTTP ${res.status}`);
  }
  return ct.includes('application/json') ? res.json() : res.text();
}

export const usersAdminApi = {
  async stats(): Promise<{ admins: number; customers: number }> {
    return request('/api/admin/users/stats');
  },
  async list(params: { search?: string; role?: 'ADMIN' | 'CUSTOMER' } = {}): Promise<AdminUser[]> {
    const q = new URLSearchParams();
    if (params.search) q.set('search', params.search);
    if (params.role) q.set('role', params.role);
    const qs = q.toString();
    return request(`/api/admin/users${qs ? `?${qs}` : ''}`);
  },
  async remove(id: string): Promise<void> {
    await request(`/api/admin/users/${id}`, { method: 'DELETE' });
  }
};
