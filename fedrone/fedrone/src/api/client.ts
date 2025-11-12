// Cấu hình cơ bản cho API client phía frontend
// - API_BASE: đọc từ .env hoặc mặc định http://localhost:3000
// - Hàm tiện ích addAuth: thêm header Authorization nếu có token
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export type LoginResponse = {
  accessToken: string;
  user: { id: string | number; name: string; email: string; role?: string; phone?: string; workRestaurantId?: string | null };
};

async function request(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const ct = res.headers.get('content-type') || '';
  if (!res.ok) {
    try {
      if (ct.includes('application/json')) {
        const data = await res.json();
        const msg = (data && (data.message || data.error || data.msg)) as string | undefined;
        throw new Error(msg || `HTTP ${res.status}`);
      }
      const text = await res.text();
      throw new Error(text || `HTTP ${res.status}`);
    } catch (e: any) {
      // Nếu parse lỗi, fallback
      throw new Error(e?.message || `HTTP ${res.status}`);
    }
  }
  return ct.includes('application/json') ? res.json() : res.text();
}

export const authApi = {
  async login(email: string, password: string): Promise<LoginResponse> {
    return request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
  },
  async register(name: string, email: string, phone: string, password: string): Promise<LoginResponse> {
    return request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, phone, password })
    });
  }
};

export { API_BASE };
