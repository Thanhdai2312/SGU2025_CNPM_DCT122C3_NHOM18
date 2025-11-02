import { Router, Request, Response, NextFunction } from 'express';
import { auth } from './middlewares';
import { userRepository } from '../repositories/userRepository';
import { z } from 'zod';
import { UserRole } from '@prisma/client';

export const router = Router();

const asyncHandler = <T extends (req: Request, res: Response, next: NextFunction) => any>(
  fn: T
) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Liệt kê người dùng, hỗ trợ tìm kiếm theo tên/email và lọc theo vai trò
router.get('/', auth(['ADMIN']), asyncHandler(async (req, res) => {
  const schema = z.object({ search: z.string().optional(), role: z.enum(['ADMIN','CUSTOMER']).optional() });
  const parsed = schema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ message: 'Invalid query' });
  const { search, role } = parsed.data;
  const users = await userRepository.list({ search, role: role as UserRole | undefined });
  res.json(users);
}));

// Thống kê số lượng theo vai trò
router.get('/stats', auth(['ADMIN']), asyncHandler(async (_req, res) => {
  const counts = await userRepository.countsByRole();
  res.json(counts);
}));

// Xoá người dùng theo id (cascade): xoá cart, đơn liên quan theo logic repo
router.delete('/:id', auth(['ADMIN']), asyncHandler(async (req, res) => {
  const id = req.params.id;
  if (!id) return res.status(400).json({ message: 'Missing id' });
  await userRepository.removeByIdCascade(id);
  res.status(204).send();
}));
