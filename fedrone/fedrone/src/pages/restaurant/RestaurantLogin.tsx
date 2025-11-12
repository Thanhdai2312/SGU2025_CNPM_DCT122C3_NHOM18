import { useState } from 'react';
import { authApi } from '../../api/client';
import { useNavigate, useLocation } from 'react-router-dom';

export default function RestaurantLogin() {
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
      const role = (res.user.role || '').toLowerCase();
      if (role !== 'restaurant') {
        setError('Tài khoản không phải nhân viên nhà hàng');
        try {
          localStorage.removeItem('restaurantToken');
          localStorage.removeItem('restaurantUser');
        } catch {}
        return;
      }
      localStorage.setItem('restaurantToken', res.accessToken);
      localStorage.setItem('restaurantUser', JSON.stringify(res.user));
      const redirectTo = (location.state as any)?.from?.pathname || '/restaurant';
      navigate(redirectTo, { replace: true });
    } catch (e: any) {
      setError(e?.message || 'Đăng nhập thất bại');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-emerald-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow p-6">
        <h1 className="text-2xl font-bold text-emerald-700 mb-4">Đăng nhập Nhà hàng</h1>
        {error && <div className="mb-3 p-3 rounded border border-emerald-200 bg-emerald-50 text-emerald-700 text-sm">{error}</div>}
        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className="block text-sm text-gray-700 mb-1">Email</label>
            <input className="w-full border rounded-lg px-3 py-2" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">Mật khẩu</label>
            <input className="w-full border rounded-lg px-3 py-2" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          <button disabled={loading} className="w-full py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60">{loading ? 'Đang đăng nhập...' : 'Đăng nhập'}</button>
        </form>
      </div>
    </div>
  );
}
