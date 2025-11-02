import { Router, Request, Response, NextFunction } from 'express';
import { authService } from '../services/authService';
import { z } from 'zod';
import { UserRole } from '@prisma/client';

export const router = Router();

// API Xác thực người dùng
// - POST /register: Đăng ký tài khoản mới. Kiểm tra trùng email/số điện thoại, validate đầu vào (zod),
//   sau đó tạo user và trả về token JWT + thông tin user. Mặc định role là CUSTOMER nếu không truyền.
// - POST /login: Đăng nhập bằng email/mật khẩu. Nếu đúng sẽ trả về token JWT + thông tin user.
// Ghi chú:
// - Số điện thoại được kiểm tra theo chuẩn quốc tế/E.164 hoặc 10 số Việt Nam.
// - JWT sẽ chứa sub (id người dùng) và role để middleware auth() xác thực và phân quyền.

// Helper: bắt lỗi async và đưa vào error handler chung
const asyncHandler = <T extends (req: Request, res: Response, next: NextFunction) => any>(
  fn: T
) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

const phoneSchema = z.string()
  .min(8)
  .max(20)
  .refine(v => /^(\+?[1-9]\d{7,14})$/.test(v) || /^(0|\+84)(3|5|7|8|9)\d{8}$/.test(v), {
    message: 'Số điện thoại không hợp lệ',
  });

const registerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: phoneSchema,
  password: z.string().min(6),
  role: z.enum(['CUSTOMER', 'ADMIN']).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

router.post('/register', asyncHandler(async (req: Request, res: Response) => {
  // Đăng ký: validate dữ liệu, gọi authService.register để tạo user và sinh JWT
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Invalid input', issues: parsed.error.issues });
  const { name, email, phone, password, role } = parsed.data;
  const result = await authService.register(name, email, phone, password, role as UserRole | undefined);
  res.status(201).json(result);
}));

router.post('/login', asyncHandler(async (req: Request, res: Response) => {
  // Đăng nhập: kiểm tra thông tin, nếu đúng trả JWT + user
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Invalid input', issues: parsed.error.issues });
  const { email, password } = parsed.data;
  const result = await authService.login(email, password);
  res.status(200).json(result);
}));
