// Thành phần bảo vệ route Admin: kiểm tra token/quyền và chuyển hướng nếu không hợp lệ
import { Navigate, useLocation } from 'react-router-dom';
import { PropsWithChildren } from 'react';

export default function AdminGuard({ children }: PropsWithChildren) {
  const location = useLocation();
  let role = '';
  try {
    const raw = localStorage.getItem('adminUser');
    const u = raw ? JSON.parse(raw) : undefined;
    role = (u?.role || '').toLowerCase();
  } catch {}
  const allowed = role === 'admin' || role === 'operator';
  if (!allowed) {
    return <Navigate to="/admin/login" replace state={{ from: location }} />;
  }
  return <>{children}</>;
}
