// Layout dành riêng cho khu vực Nhà hàng (màu xanh lá)
// - Menu: Drone (xem drone thuộc/nằm ở chi nhánh và gọi drone về), Sản phẩm, Bếp, Thống kê hôm nay
// - Chỉ dùng cho người dùng role RESTAURANT (đã được RestaurantGuard bảo vệ)
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Plane, Utensils, ChefHat, BarChart3, LogOut, User2 } from 'lucide-react';
import { getRestaurantSession, clearRestaurantSession } from '../../utils/adminAuth';
import { useRestaurantName } from '../../hooks/useRestaurantName';

export default function RestaurantLayout() {
  const navigate = useNavigate();
  const session = getRestaurantSession();
  const user = session?.user;
  const workRestaurantId = (user as any)?.workRestaurantId as string | undefined;
  const { name: restaurantName } = useRestaurantName(workRestaurantId);

  const onLogout = () => {
    try { clearRestaurantSession(); } catch {}
    navigate('/restaurant/login', { replace: true });
  };

  return (
    <div className="min-h-[70vh]">
      <div className="flex">
  {/* Thanh bên (màu xanh lá cho Nhà hàng) */}
        <aside className="w-64 bg-emerald-700 text-white min-h-full">
          <div className="p-4 font-bold text-xl tracking-wide">
            P&Đ Restaurant
            <div className="mt-1 text-xs font-normal opacity-90 truncate" title={restaurantName || ''}>
              {restaurantName ? `Nhà hàng: ${restaurantName}` : 'Nhà hàng: (đang tải...)'}
            </div>
          </div>
          <nav className="px-2 py-2 space-y-1">
            <NavLink to="/restaurant/drones" className={({ isActive }) => `flex items-center gap-2 px-3 py-2 rounded ${isActive ? 'bg-emerald-600' : 'hover:bg-emerald-600/60'}`}>
              <Plane className="w-4 h-4" /> Drone
            </NavLink>
            <NavLink to="/restaurant/products" className={({ isActive }) => `flex items-center gap-2 px-3 py-2 rounded ${isActive ? 'bg-emerald-600' : 'hover:bg-emerald-600/60'}`}>
              <Utensils className="w-4 h-4" /> Sản phẩm
            </NavLink>
            <NavLink to="/restaurant/kitchen" className={({ isActive }) => `flex items-center gap-2 px-3 py-2 rounded ${isActive ? 'bg-emerald-600' : 'hover:bg-emerald-600/60'}`}>
              <ChefHat className="w-4 h-4" /> Bếp
            </NavLink>
            <NavLink to="/restaurant/stats" className={({ isActive }) => `flex items-center gap-2 px-3 py-2 rounded ${isActive ? 'bg-emerald-600' : 'hover:bg-emerald-600/60'}`}>
              <BarChart3 className="w-4 h-4" /> Thống kê hôm nay
            </NavLink>
            <div className="mt-6 border-t border-white/20 pt-3">
              <div className="flex items-center gap-2 px-3 py-2 text-sm opacity-90">
                <User2 className="w-4 h-4" />
                <div className="truncate" title={user?.email || user?.name || ''}>
                  {user?.name || user?.email || 'Chưa đăng nhập'}
                </div>
              </div>
              <button onClick={onLogout} className="mt-2 w-full flex items-center justify-center gap-2 px-3 py-2 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-sm">
                <LogOut className="w-4 h-4" /> Đăng xuất
              </button>
            </div>
          </nav>
        </aside>
  {/* Khu vực nội dung */}
        <main className="flex-1 bg-emerald-50/30">
          <div className="p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
