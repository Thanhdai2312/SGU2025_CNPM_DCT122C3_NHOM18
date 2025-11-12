export type AdminSession = { token: string; user: { id: string; name: string; email: string; role?: string; workRestaurantId?: string | null } };

export function getAdminSession(): AdminSession | undefined {
  try {
    const token = localStorage.getItem('adminToken');
    const userRaw = localStorage.getItem('adminUser');
    const user = userRaw ? JSON.parse(userRaw) : undefined;
    if (token && user) return { token, user };
  } catch {}
  return undefined;
}

export function getRestaurantSession(): AdminSession | undefined {
  try {
    const token = localStorage.getItem('restaurantToken');
    const userRaw = localStorage.getItem('restaurantUser');
    const user = userRaw ? JSON.parse(userRaw) : undefined;
    if (token && user) return { token, user };
  } catch {}
  return undefined;
}

export function getActiveAdminArea(): { session?: AdminSession; role?: 'admin'|'restaurant' } {
  // Ưu tiên theo path: /restaurant => restaurant; /admin => admin
  const path = typeof window !== 'undefined' ? window.location.pathname : '';
  if (path.startsWith('/restaurant')) {
    const res = getRestaurantSession();
    if (res && (res.user.role || '').toLowerCase() === 'restaurant') return { session: res, role: 'restaurant' };
  }
  if (path.startsWith('/admin')) {
    const admin = getAdminSession();
    if (admin && (admin.user.role || '').toLowerCase() === 'admin') return { session: admin, role: 'admin' };
  }
  // Fallback: ưu tiên ADMIN nếu tồn tại, sau đó đến RESTAURANT
  const admin = getAdminSession();
  if (admin && (admin.user.role || '').toLowerCase() === 'admin') return { session: admin, role: 'admin' };
  const res = getRestaurantSession();
  if (res && (res.user.role || '').toLowerCase() === 'restaurant') return { session: res, role: 'restaurant' };
  return {};
}

export function clearAdminSession() {
  try {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
  } catch {}
}

export function clearRestaurantSession() {
  try {
    localStorage.removeItem('restaurantToken');
    localStorage.removeItem('restaurantUser');
  } catch {}
}
