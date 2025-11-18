// Trang Đăng nhập (khách)
import { FormEvent, useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const loc = useLocation() as any;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null); setLoading(true);
    try {
      await login(email, password);
      const to = loc.state?.from?.pathname || '/';
      nav(to);
    } catch (err: any) { setError(err.message || 'Đăng nhập thất bại'); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white/90 backdrop-blur-md rounded-2xl shadow-xl p-8">
        <h2 className="text-3xl font-bold text-center mb-2 bg-gradient-to-r from-blue-600 to-sky-600 bg-clip-text text-transparent">Đăng nhập</h2>
  <p className="text-center text-gray-500 mb-6">Chào mừng quay lại P&Đ</p>
        {error && <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{error}</div>}
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="you@example.com" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <button className="w-full py-3 bg-gradient-to-r from-blue-600 to-sky-600 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all" disabled={loading}>
            {loading ? 'Đang đăng nhập…' : 'Đăng nhập'}
          </button>
        </form>
        <p className="text-center text-sm text-gray-600 mt-4">
          Chưa có tài khoản? <Link to="/register" className="text-blue-600 hover:underline">Đăng ký</Link>
        </p>
      </div>
    </div>
  );
}
