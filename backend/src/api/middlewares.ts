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
      const payload = jwt.verify(token, JWT_SECRET) as { sub: string; role?: 'CUSTOMER' | 'ADMIN' | 'RESTAURANT'; workRestaurantId?: string };
      (req as unknown as Request & { user: { id: string; role?: 'CUSTOMER' | 'ADMIN' | 'RESTAURANT'; workRestaurantId?: string } }).user = { id: payload.sub, role: payload.role, workRestaurantId: (payload as any).workRestaurantId };
      if (requiredRoles && requiredRoles.length && (!payload.role || !requiredRoles.includes(payload.role))) {
        return res.status(403).json({ message: 'Forbidden' });
      }
      next();
    } catch {
      return res.status(401).json({ message: 'Unauthorized' });
    }
  };
}

// Rate limiter đơn giản per-IP (in-memory). Sản xuất nên dùng Redis.
export function rateLimit(options?: { windowMs?: number; max?: number }) {
  const windowMs = options?.windowMs ?? Number(process.env.RATE_LIMIT_WINDOW || 60000);
  const max = options?.max ?? Number(process.env.RATE_LIMIT_MAX || 120);
  const hits = new Map<string, { count: number; resetAt: number }>();
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const entry = hits.get(ip);
    if (!entry || entry.resetAt < now) {
      hits.set(ip, { count: 1, resetAt: now + windowMs });
      return next();
    }
    entry.count += 1;
    if (entry.count > max) {
      const retrySec = Math.ceil((entry.resetAt - now) / 1000);
      res.setHeader('Retry-After', String(retrySec));
      return res.status(429).json({ message: 'Too Many Requests', retryAfterSeconds: retrySec });
    }
    next();
  };
}
