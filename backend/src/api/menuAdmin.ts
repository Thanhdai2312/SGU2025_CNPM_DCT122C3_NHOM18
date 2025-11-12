import express from 'express';
import { z } from 'zod';
import { auth } from './middlewares';
import { prisma } from '../repositories/db';

const router = express.Router();

// Liệt kê toàn bộ món của 1 nhà hàng (ADMIN)
router.get('/:restaurantId', auth(['ADMIN','RESTAURANT']), async (req, res, next) => {
  try {
    const me = (req as any).user as { role?: 'ADMIN'|'RESTAURANT'; workRestaurantId?: string };
    let { restaurantId } = req.params as { restaurantId: string };
    if (me.role === 'RESTAURANT') {
      if (!me.workRestaurantId) return res.status(403).json({ message: 'Forbidden' });
      if (restaurantId !== me.workRestaurantId) {
        // ép về nhà hàng của nhân viên, tránh truy cập chéo
        restaurantId = me.workRestaurantId;
      }
    }
    const items = await prisma.menuItem.findMany({ where: { restaurantId }, orderBy: { name: 'asc' } });
    res.json(items);
  } catch (e) { next(e); }
});

// Tạo món mới
router.post('/:restaurantId', auth(['ADMIN','RESTAURANT']), async (req, res, next) => {
  try {
    const me = (req as any).user as { role?: 'ADMIN'|'RESTAURANT'; workRestaurantId?: string };
    let { restaurantId } = req.params as { restaurantId: string };
    if (me.role === 'RESTAURANT') {
      if (!me.workRestaurantId) return res.status(403).json({ message: 'Forbidden' });
      restaurantId = me.workRestaurantId;
    }
    const schema = z.object({
      name: z.string().min(1),
      price: z.number().positive(),
      weight: z.number().nonnegative().optional(),
      isAvailable: z.boolean().optional(),
      type: z.enum(['FOOD', 'DRINK']).optional(),
      imageUrl: z.string().url().optional(),
      stock: z.number().int().min(0).nullable().optional(),
    });
    const input = schema.parse(req.body);
    const created = await prisma.menuItem.create({ data: { restaurantId, ...input } as any });
    res.status(201).json(created);
  } catch (e) { next(e); }
});

// Cập nhật món
router.patch('/item/:id', auth(['ADMIN','RESTAURANT']), async (req, res, next) => {
  try {
    const schema = z.object({
      name: z.string().min(1).optional(),
      price: z.number().positive().optional(),
      weight: z.number().nonnegative().optional(),
      isAvailable: z.boolean().optional(),
      type: z.enum(['FOOD', 'DRINK']).optional(),
      imageUrl: z.string().url().nullable().optional(),
      stock: z.number().int().min(0).nullable().optional(),
    });
    const data = schema.parse(req.body);
    // Nếu RESTAURANT, kiểm tra món thuộc nhà hàng mình
    const me = (req as any).user as { role?: 'ADMIN'|'RESTAURANT'; workRestaurantId?: string };
    if (me.role === 'RESTAURANT') {
      const item = await prisma.menuItem.findUnique({ where: { id: req.params.id }, select: { restaurantId: true } });
      if (!item || item.restaurantId !== me.workRestaurantId) return res.status(403).json({ message: 'Forbidden' });
    }
    const updated = await prisma.menuItem.update({ where: { id: req.params.id }, data: data as any });
    res.json(updated);
  } catch (e) { next(e); }
});

// Xoá món
router.delete('/item/:id', auth(['ADMIN','RESTAURANT']), async (req, res, next) => {
  try {
    const me = (req as any).user as { role?: 'ADMIN'|'RESTAURANT'; workRestaurantId?: string };
    if (me.role === 'RESTAURANT') {
      const item = await prisma.menuItem.findUnique({ where: { id: req.params.id }, select: { restaurantId: true } });
      if (!item || item.restaurantId !== me.workRestaurantId) return res.status(403).json({ message: 'Forbidden' });
    }
    await prisma.menuItem.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

export default router;