import { useState } from 'react';
import { authApi } from '../../api/client';
import { useNavigate, useLocation } from 'react-router-dom';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await authApi.login(email, password);
      // Save admin credentials separately from customer
      localStorage.setItem('adminToken', res.accessToken);
      localStorage.setItem('adminUser', JSON.stringify(res.user));
    const parsed = res.user as { role?: string };
    const role = (parsed?.role || '').toLowerCase();
    const ok = role === 'admin' || role === 'restaurant';
      if (!ok) {
        setError('Tài khoản không có quyền truy cập Admin.');
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');
        return;
      }
  // Điều hướng mặc định theo role
  let defaultPath = '/admin';
  if (role === 'restaurant') defaultPath = '/admin/kitchen';
  const redirectTo = (location.state as any)?.from?.pathname || defaultPath;
  navigate(redirectTo, { replace: true });
    } catch (e: any) {
      setError(e?.message || 'Đăng nhập thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-rose-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow p-6">
        <h1 className="text-2xl font-bold text-rose-700 mb-4">Đăng nhập Admin</h1>
        {error && <div className="mb-3 p-3 rounded border border-rose-200 bg-rose-50 text-rose-700 text-sm">{error}</div>}
        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className="block text-sm text-gray-700 mb-1">Email</label>
            <input className="w-full border rounded-lg px-3 py-2" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">Mật khẩu</label>
            <input className="w-full border rounded-lg px-3 py-2" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          <button disabled={loading} className="w-full py-2 rounded-lg bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-60">{loading ? 'Đang đăng nhập...' : 'Đăng nhập'}</button>
        </form>
      </div>
    </div>
  );
}
