import express from 'express';
import { z } from 'zod';
import { auth } from './middlewares';
import { restaurantService } from '../services/restaurantService';
import { ioInstance } from '../websocket/server';

const router = express.Router();

// Liệt kê nhà hàng (ADMIN) - có thể dùng public list nhưng giữ riêng để mở rộng
router.get('/', auth(['ADMIN']), async (_req, res, next) => {
  try {
    const data = await restaurantService.list();
    res.json(data);
  } catch (e) { next(e); }
});

// Tạo nhà hàng mới
router.post('/', auth(['ADMIN']), async (req, res, next) => {
  try {
    const schema = z.object({
      name: z.string().min(1),
      address: z.string().min(1),
      lat: z.number().refine(v => Math.abs(v) <= 90, { message: 'lat invalid' }),
      lng: z.number().refine(v => Math.abs(v) <= 180, { message: 'lng invalid' }),
    });
    const input = schema.parse(req.body);
    const created = await restaurantService.create(input);
    ioInstance?.emit('restaurants-updated', { action: 'created', restaurant: created });
    res.status(201).json(created);
  } catch (e: any) {
    if (e?.message === 'DUPLICATE_RESTAURANT') {
      return res.status(409).json({ message: 'Tên hoặc địa chỉ nhà hàng đã tồn tại' });
    }
    next(e);
  }
});

// Cập nhật thông tin nhà hàng
router.patch('/:id', auth(['ADMIN']), async (req, res, next) => {
  try {
    const schema = z.object({
      name: z.string().min(1).optional(),
      address: z.string().min(1).optional(),
      lat: z.number().refine(v => Math.abs(v) <= 90, { message: 'lat invalid' }).optional(),
      lng: z.number().refine(v => Math.abs(v) <= 180, { message: 'lng invalid' }).optional(),
    });
    const data = schema.parse(req.body);
    const updated = await restaurantService.update(req.params.id, data);
    ioInstance?.emit('restaurants-updated', { action: 'updated', restaurant: updated });
    res.json(updated);
  } catch (e) { next(e); }
});

// Xoá nhà hàng
router.delete('/:id', auth(['ADMIN']), async (req, res, next) => {
  try {
    const result = await restaurantService.remove(req.params.id);
    if (!result.ok) {
      return res.status(409).json({ message: 'Không thể xoá vì đang được sử dụng', details: result });
    }
    ioInstance?.emit('restaurants-updated', { action: 'deleted', restaurantId: req.params.id });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

export default router;
