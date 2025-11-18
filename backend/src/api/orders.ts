import express from 'express';
import { auth } from './middlewares';
import { orderRepository } from '../repositories/orderRepository';
import { prisma } from '../repositories/db';
import { ioInstance } from '../websocket/server';

const router = express.Router();

// GET /api/orders/mine - liệt kê đơn hàng của chính người dùng (yêu cầu đăng nhập)
router.get('/mine', auth(['CUSTOMER', 'ADMIN', 'RESTAURANT']), async (req, res, next) => {
  try {
    const me = (req as any).user as { id: string };
    const items = await orderRepository.listByUser(me.id);
    res.json(items);
  } catch (e) { next(e); }
});

// GET /api/orders - liệt kê tất cả đơn hàng (ADMIN/OPERATOR)
router.get('/', auth(['ADMIN', 'RESTAURANT']), async (req, res, next) => {
  try {
    const me = (req as any).user as { role?: 'ADMIN' | 'RESTAURANT'; workRestaurantId?: string };
    if (me.role === 'RESTAURANT') {
      const rid = me.workRestaurantId;
      if (!rid) return res.status(403).json({ message: 'Forbidden' });
      const items = await (orderRepository as any).listByRestaurantId?.(rid) ?? [];
      return res.json(items);
    }
    const items = await orderRepository.listAll();
    res.json(items);
  } catch (e) { next(e); }
});

// POST /api/orders/:id/cancel - khách hủy đơn trong vòng 60s kể từ khi tạo (chỉ được nếu là chủ đơn)
router.post('/:id/cancel', auth(['CUSTOMER']), async (req, res, next) => {
  try {
    const { id } = req.params;
    const me = (req as any).user as { id: string };
    const order = await orderRepository.findById(id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.userId !== me.id) return res.status(403).json({ message: 'Forbidden' });
    const status = String((order as any).status || '');
  if (status === 'CANCELED' || status === 'COMPLETED') {
      return res.status(400).json({ message: 'Không thể hủy đơn này' });
    }
    const createdAt = (order as any).createdAt ? new Date((order as any).createdAt).getTime() : Date.now();
    const elapsed = (Date.now() - createdAt) / 1000;
    if (elapsed > 60) {
      return res.status(400).json({ message: 'Đã qua thời gian hủy đơn' });
    }
  await prisma.order.update({ where: { id }, data: { status: 'CANCELED' as any } });
    try {
  ioInstance?.to(`order:${id}`).emit('order-update', { orderId: id, status: 'CANCELED' });
    } catch {}
    res.json({ ok: true });
  } catch (e) { next(e); }
});

export default router;
