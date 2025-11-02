// Wrapper điều kiện: chỉ hiển thị con nếu là Admin, ngược lại chuyển hướng tới đăng nhập Admin
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PropsWithChildren } from 'react';

export default function RequireAdmin({ children }: PropsWithChildren) {
  const { user } = useAuth();
  const location = useLocation();
  const role = (user?.role || '').toLowerCase();
  const allowed = role === 'admin' || role === 'operator';
  if (!allowed) {
    return <Navigate to="/" replace state={{ from: location }} />;
  }
  return <>{children}</>;
}
