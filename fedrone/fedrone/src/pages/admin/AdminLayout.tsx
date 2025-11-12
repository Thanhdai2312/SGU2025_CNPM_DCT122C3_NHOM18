import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Home, ClipboardList, Plane, Radar, LogOut, User2, Utensils, Users, ChefHat } from 'lucide-react';
import { useMemo } from 'react';
import { useRestaurantName } from '../../hooks/useRestaurantName';

export default function AdminLayout() {
  // Layout chung cho khu vực Admin
  // - Thanh điều hướng tới các trang quản trị
  // - Bảo vệ quyền truy cập bằng RequireAdmin
  const navigate = useNavigate();
  const admin = useMemo(() => {
    try {
      const raw = localStorage.getItem('adminUser');
      return raw ? JSON.parse(raw) : undefined;
    } catch {
      return undefined;
    }
  }, []);

  const onLogout = () => {
    try {
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminUser');
    } catch {}
    navigate('/admin/login', { replace: true });
  };
  const workRestaurantId = (admin as any)?.workRestaurantId as string | undefined;
  const { name: restaurantName } = useRestaurantName(workRestaurantId);
  return (
    <div className="min-h-[70vh]">
      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-rose-700 text-white min-h-full">
          <div className="p-4 font-bold text-xl tracking-wide">
            P&Đ Admin
            {((admin?.role || '').toLowerCase() === 'restaurant') && (
              <div className="mt-1 text-xs font-normal opacity-90 truncate" title={restaurantName || ''}>
                {restaurantName ? `Nhà hàng: ${restaurantName}` : 'Nhà hàng: (đang tải...)'}
              </div>
            )}
          </div>
          <nav className="px-2 py-2 space-y-1">
            {((admin?.role || '').toLowerCase() === 'admin') && (
              <>
                <NavLink to="/admin" end className={({ isActive }) => `flex items-center gap-2 px-3 py-2 rounded ${isActive ? 'bg-rose-600' : 'hover:bg-rose-600/60'}`}>
                  <Home className="w-4 h-4" /> Dashboard
                </NavLink>
                <NavLink to="/admin/orders" className={({ isActive }) => `flex items-center gap-2 px-3 py-2 rounded ${isActive ? 'bg-rose-600' : 'hover:bg-rose-600/60'}`}>
                  <ClipboardList className="w-4 h-4" /> Đơn hàng
                </NavLink>
                <NavLink to="/admin/drones" className={({ isActive }) => `flex items-center gap-2 px-3 py-2 rounded ${isActive ? 'bg-rose-600' : 'hover:bg-rose-600/60'}`}>
                  <Plane className="w-4 h-4" /> Drone
                </NavLink>
                <NavLink to="/admin/deliveries" className={({ isActive }) => `flex items-center gap-2 px-3 py-2 rounded ${isActive ? 'bg-rose-600' : 'hover:bg-rose-600/60'}`}>
                  <Home className="w-4 h-4" /> Giao hàng
                </NavLink>
                <NavLink to="/admin/monitor" className={({ isActive }) => `flex items-center gap-2 px-3 py-2 rounded ${isActive ? 'bg-rose-600' : 'hover:bg-rose-600/60'}`}>
                  <Radar className="w-4 h-4" /> Theo dõi
                </NavLink>
                <NavLink to="/admin/users" className={({ isActive }) => `flex items-center gap-2 px-3 py-2 rounded ${isActive ? 'bg-rose-600' : 'hover:bg-rose-600/60'}`}>
                  <Users className="w-4 h-4" /> Người dùng
                </NavLink>
              </>
            )}
            {((admin?.role || '').toLowerCase() === 'restaurant') && (
              <>
                <NavLink to="/admin/drones" className={({ isActive }) => `flex items-center gap-2 px-3 py-2 rounded ${isActive ? 'bg-rose-600' : 'hover:bg-rose-600/60'}`}>
                  <Plane className="w-4 h-4" /> Drone
                </NavLink>
                <NavLink to="/admin/products" className={({ isActive }) => `flex items-center gap-2 px-3 py-2 rounded ${isActive ? 'bg-rose-600' : 'hover:bg-rose-600/60'}`}>
                  <Utensils className="w-4 h-4" /> Sản phẩm
                </NavLink>
                <NavLink to="/admin/kitchen" className={({ isActive }) => `flex items-center gap-2 px-3 py-2 rounded ${isActive ? 'bg-rose-600' : 'hover:bg-rose-600/60'}`}>
                  <ChefHat className="w-4 h-4" /> Bếp
                </NavLink>
                <NavLink to="/admin/orders" className={({ isActive }) => `flex items-center gap-2 px-3 py-2 rounded ${isActive ? 'bg-rose-600' : 'hover:bg-rose-600/60'}`}>
                  <ClipboardList className="w-4 h-4" /> Đơn hàng
                </NavLink>
              </>
            )}
            <div className="mt-6 border-t border-white/20 pt-3">
              <div className="flex items-center gap-2 px-3 py-2 text-sm opacity-90">
                <User2 className="w-4 h-4" />
                <div className="truncate" title={admin?.email || admin?.name || ''}>
                  {admin?.name || admin?.email || 'Chưa đăng nhập'}
                </div>
              </div>
              <button onClick={onLogout} className="mt-2 w-full flex items-center justify-center gap-2 px-3 py-2 rounded bg-rose-600 hover:bg-rose-500 text-white text-sm">
                <LogOut className="w-4 h-4" /> Đăng xuất
              </button>
            </div>
          </nav>
        </aside>
        {/* Content */}
        <main className="flex-1 bg-rose-50/30">
          <div className="p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
