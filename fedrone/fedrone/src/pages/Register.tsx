// Trang Đăng ký (khách)
import { FormEvent, useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Toast from '../components/Toast';

export default function Register() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    if (!error) return;
    setShowToast(true);
    const t = setTimeout(() => setShowToast(false), 3000);
    return () => clearTimeout(t);
  }, [error]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null); setLoading(true);
    try {
      // Kiểm tra số điện thoại phía client ở mức cơ bản (chuẩn E.164 hoặc Việt Nam 10 số)
      const phoneOk = /^(\+?[1-9]\d{7,14})$/.test(phone) || /^(0|\+84)(3|5|7|8|9)\d{8}$/.test(phone);
      if (!phoneOk) throw new Error('Số điện thoại không hợp lệ');
      await register(name, email, phone, password);
      nav('/');
    } catch (err: any) {
      const msg: string = (err?.message || '').toLowerCase();
      if (msg.includes('409') || msg.includes('exist')) {
        setError('Email đã tồn tại, vui lòng dùng email khác');
      } else if (msg.includes('invalid') || msg.includes('format')) {
        setError('Email không hợp lệ');
      } else if ((err?.message || '').toLowerCase().includes('phone')) {
        setError('Số điện thoại đã tồn tại hoặc không hợp lệ');
      } else {
        setError(err.message || 'Đăng ký thất bại');
      }
    }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white/90 backdrop-blur-md rounded-2xl shadow-xl p-8">
        <h2 className="text-3xl font-bold text-center mb-2 bg-gradient-to-r from-blue-600 to-sky-600 bg-clip-text text-transparent">Đăng ký</h2>
  <p className="text-center text-gray-500 mb-6">Tạo tài khoản P&Đ</p>
        {showToast && error && (
          <Toast message={error} onClose={() => setShowToast(false)} tone="error" />
        )}
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Họ tên</label>
            <input value={name} onChange={e => setName(e.target.value)} required className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="you@example.com" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại</label>
            <input value={phone} onChange={e => setPhone(e.target.value)} required className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="0901234567 hoặc +84901234567" />
            <p className="text-xs text-gray-500 mt-1">Nhập dạng 10 số (VD: 0901234567) hoặc chuẩn quốc tế (VD: +84901234567)</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <button className="w-full py-3 bg-gradient-to-r from-blue-600 to-sky-600 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all" disabled={loading}>
            {loading ? 'Đang đăng ký…' : 'Đăng ký'}
          </button>
        </form>
        <p className="text-center text-sm text-gray-600 mt-4">
          Đã có tài khoản? <Link to="/login" className="text-blue-600 hover:underline">Đăng nhập</Link>
        </p>
      </div>
    </div>
  );
}
