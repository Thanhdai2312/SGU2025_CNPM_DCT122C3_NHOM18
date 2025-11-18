// Bảo vệ khu vực /restaurant
// - Chỉ cho phép truy cập nếu người dùng có role RESTAURANT
// - Nếu chưa đăng nhập đúng vai trò, chuyển hướng về /restaurant/login
import { Navigate, useLocation } from 'react-router-dom';
import { PropsWithChildren } from 'react';

export default function RestaurantGuard({ children }: PropsWithChildren) {
  const location = useLocation();
  let role = '';
  try {
    const raw = localStorage.getItem('restaurantUser');
    const u = raw ? JSON.parse(raw) : undefined;
    role = (u?.role || '').toLowerCase();
  } catch {}
  const allowed = role === 'restaurant';
  if (!allowed) {
    return <Navigate to="/restaurant/login" replace state={{ from: location }} />;
  }
  return <>{children}</>;
}
