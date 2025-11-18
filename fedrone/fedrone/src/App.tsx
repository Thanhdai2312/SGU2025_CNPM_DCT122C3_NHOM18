import { Plane, ShoppingCart, LogOut, LocateFixed } from 'lucide-react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
// Ứng dụng gốc phía client (SPA)
// - Định nghĩa bố cục/điều hướng chung và header/footer
// - Tích hợp các trang chính: Trang chủ, Đăng nhập/Đăng ký, Giỏ hàng/Checkout, Theo dõi đơn
// - Khu vực Admin: Dashboard, Drones, Kitchen, Orders, Users, Products
import { useEffect, useState } from 'react';

export default function App() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  // Đã bỏ huy hiệu số lượng trên icon giỏ hàng theo yêu cầu

  const onLogout = () => {
    logout();
    navigate('/');
  };
  useEffect(() => {
    try {
      // Khởi tạo trạng thái theo dõi đơn từ localStorage
      const id = localStorage.getItem('lastPaidOrderId');
      setActiveOrderId(id);
      const onStorage = () => {
        const v = localStorage.getItem('lastPaidOrderId');
        setActiveOrderId(v);
      };
      window.addEventListener('storage', onStorage);
      return () => window.removeEventListener('storage', onStorage);
    } catch {}
  }, []);

  // Không còn đồng bộ huy hiệu giỏ hàng theo user

  // Cập nhật lại khi đổi route (sự kiện storage không kích hoạt trong cùng 1 tab)
  useEffect(() => {
    try {
      // Cập nhật lại mỗi khi chuyển route (storage event không kích hoạt trong cùng tab)
      const id = localStorage.getItem('lastPaidOrderId');
      setActiveOrderId(id);
    } catch {}
  }, [location]);
  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-blue-50">
      {/* Phần đầu trang (Header) */}
      <header className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center space-x-3 group">
              <div className="bg-gradient-to-br from-blue-500 to-sky-600 p-2 rounded-xl shadow-lg group-hover:scale-105 transition-transform">
                <Plane className="w-8 h-8 text-white" />
              </div>
              <div>
                <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-sky-600 bg-clip-text text-transparent">
                  P&Đ
                </span>
                <p className="text-xs text-gray-500">Drone Delivery</p>
              </div>
            </Link>
            <div className="flex items-center space-x-3">
              {!user && (
                <>
                  <Link to="/login" className="px-5 py-2.5 text-gray-700 font-medium hover:text-blue-600 transition-colors duration-200">
                    Đăng nhập
                  </Link>
                  <Link to="/register" className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-sky-600 text-white font-medium rounded-xl shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 transform hover:-translate-y-0.5 transition-all duration-200">
                    Đăng ký
                  </Link>
                </>
              )}
              {user && (
                <>
                  <Link to="/cart" className="inline-flex items-center space-x-2 px-4 py-2 text-amber-700 bg-amber-50 border border-amber-200 rounded-xl hover:bg-amber-100 transition-colors">
                    <ShoppingCart className="w-5 h-5" />
                    <span>Giỏ hàng</span>
                  </Link>
                  <Link to="/orders" className="inline-flex items-center space-x-2 px-4 py-2 text-rose-700 bg-rose-50 border border-rose-200 rounded-xl hover:bg-rose-100 transition-colors">
                    <span>Đơn hàng</span>
                  </Link>
                  {activeOrderId && (
                    <Link to={`/orders/${activeOrderId}`} className="inline-flex items-center space-x-2 px-4 py-2 text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl hover:bg-emerald-100 transition-colors">
                      <LocateFixed className="w-5 h-5" />
                      <span>Theo dõi đơn</span>
                    </Link>
                  )}
                  {/* Đã bỏ liên kết Admin để tách riêng khu vực quản trị khỏi giao diện khách hàng */}
                  <div className="px-4 py-2 text-gray-800 font-medium">
                    Xin chào, <span className="text-blue-600">{user.name}</span>
                  </div>
                  <button onClick={onLogout} className="inline-flex items-center space-x-2 px-4 py-2 text-white bg-gradient-to-r from-blue-600 to-sky-600 rounded-xl shadow hover:shadow-lg transition">
                    <LogOut className="w-5 h-5" />
                    <span>Đăng xuất</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <Outlet />

      {/* Chân trang (Footer) */}
      <footer className="bg-gray-900 text-white py-8 mt-16">
        <div className="container mx-auto px-6 text-center">
          <div className="flex items-center justify-center space-x-2 mb-3">
            <Plane className="w-6 h-6" />
            <span className="text-xl font-bold">P&Đ</span>
          </div>
          <p className="text-gray-400 text-sm">Tương lai của giao đồ ăn đã ở đây</p>
        </div>
      </footer>
    </div>
  );
}
