import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { userRepository } from '../repositories/userRepository';
import { UserRole } from '@prisma/client';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

export const authService = {
  // Đăng ký người dùng mới: kiểm tra trùng email/phone, băm mật khẩu, tạo user, sinh JWT
  register: async (name: string, email: string, phone: string, password: string, role?: UserRole) => {
    const [existsEmail, existsPhone] = await Promise.all([
      userRepository.findByEmail(email),
      userRepository.findByPhone(phone)
    ]);
    if (existsEmail) throw Object.assign(new Error('Email already exists'), { status: 409 });
    if (existsPhone) throw Object.assign(new Error('Phone already exists'), { status: 409 });
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await userRepository.create({ name, email, phone, passwordHash, role });
    const token = jwt.sign({ sub: user.id, role: user.role }, JWT_SECRET, { expiresIn: '2h' });
    return { user: { id: user.id, name: user.name, email: user.email, role: user.role, phone: (user as any).phone as string | undefined }, accessToken: token };
  },
  // Đăng nhập: xác thực email/mật khẩu, trả về JWT
  login: async (email: string, password: string) => {
    const user = await userRepository.findByEmail(email);
    if (!user) throw Object.assign(new Error('Invalid credentials'), { status: 401 });
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw Object.assign(new Error('Invalid credentials'), { status: 401 });
    const token = jwt.sign({ sub: user.id, role: user.role }, JWT_SECRET, { expiresIn: '2h' });
    return { user: { id: user.id, name: user.name, email: user.email, role: user.role }, accessToken: token };
  },
};
