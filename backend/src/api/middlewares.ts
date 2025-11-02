import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

export function auth(requiredRoles?: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Middleware xác thực & phân quyền dựa trên JWT:
    // - Đọc token từ header Authorization: Bearer <jwt>
    // - Giải mã token, gắn user { id, role } vào req
    // - Nếu truyền requiredRoles, kiểm tra quyền có hợp lệ không
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
    if (!token) return res.status(401).json({ message: 'Unauthorized' });
    try {
  const payload = jwt.verify(token, JWT_SECRET) as { sub: string; role?: 'CUSTOMER' | 'ADMIN' | 'OPERATOR' };
  (req as unknown as Request & { user: { id: string; role?: 'CUSTOMER' | 'ADMIN' | 'OPERATOR' } }).user = { id: payload.sub, role: payload.role };
      if (requiredRoles && requiredRoles.length && (!payload.role || !requiredRoles.includes(payload.role))) {
        return res.status(403).json({ message: 'Forbidden' });
      }
      next();
    } catch {
      return res.status(401).json({ message: 'Unauthorized' });
    }
  };
}
