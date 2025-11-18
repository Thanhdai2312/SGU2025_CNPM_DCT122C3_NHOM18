// Thành phần bảo vệ route Admin: kiểm tra token/quyền và chuyển hướng nếu không hợp lệ
import { Navigate, useLocation } from 'react-router-dom';
import { PropsWithChildren } from 'react';
import { getAdminSession } from '../utils/adminAuth';

export default function AdminGuard({ children }: PropsWithChildren) {
  const location = useLocation();
  const s = getAdminSession();
  const role = (s?.user.role || '').toLowerCase();
  const allowed = role === 'admin';
  if (!allowed) {
    return <Navigate to="/admin/login" replace state={{ from: location }} />;
  }
  return <>{children}</>;
}
