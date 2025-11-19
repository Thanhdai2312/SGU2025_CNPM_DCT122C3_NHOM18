// Cấu hình cơ bản cho API client phía frontend
// - Ưu tiên biến môi trường VITE_API_BASE_URL nếu KHÔNG phải localhost (tránh bị build cố định localhost khi deploy LAN)
// - Nếu env là localhost nhưng người dùng truy cập qua IP mạng nội bộ -> dùng window.location.origin
// - Hàm tiện ích addAuth: thêm header Authorization nếu có token
const envBase = import.meta.env.VITE_API_BASE_URL as string | undefined;
const API_BASE = (!envBase || /localhost|127\.0\.0\.1/i.test(envBase)) ? window.location.origin : envBase;

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

  const url = `${API_BASE}${path}`;
  const res = await fetch(url, { ...options, headers });
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
