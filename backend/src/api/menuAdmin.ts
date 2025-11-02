import express from 'express';
import { z } from 'zod';
import { auth } from './middlewares';
import { prisma } from '../repositories/db';

const router = express.Router();

// Liệt kê toàn bộ món của 1 nhà hàng (ADMIN)
router.get('/:restaurantId', auth(['ADMIN']), async (req, res, next) => {
  try {
    const { restaurantId } = req.params;
    const items = await prisma.menuItem.findMany({ where: { restaurantId }, orderBy: { name: 'asc' } });
    res.json(items);
  } catch (e) { next(e); }
});

// Tạo món mới
router.post('/:restaurantId', auth(['ADMIN']), async (req, res, next) => {
  try {
    const { restaurantId } = req.params;
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
router.patch('/item/:id', auth(['ADMIN']), async (req, res, next) => {
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
    const updated = await prisma.menuItem.update({ where: { id: req.params.id }, data: data as any });
    res.json(updated);
  } catch (e) { next(e); }
});

// Xoá món
router.delete('/item/:id', auth(['ADMIN']), async (req, res, next) => {
  try {
    await prisma.menuItem.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

export default router;