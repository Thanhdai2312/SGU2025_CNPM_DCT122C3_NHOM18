import { Router, Request, Response, NextFunction } from 'express';
import { auth } from './middlewares';
import { prisma } from '../repositories/db';
import { ioInstance } from '../websocket/server';

export const router = Router();

const asyncHandler = <T extends (req: Request, res: Response, next: NextFunction) => any>(fn: T) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// API Bếp chi nhánh (ADMIN)
// Quy trình:
// 1) Khi đơn đã thanh toán (PAID) và ở trạng thái CONFIRMED/PREPARING → xuất hiện trong danh sách bếp của chi nhánh.
// 2) Bấm "Đang chuẩn bị" → chuyển trạng thái Order về PREPARING, đồng thời gửi thông điệp cho khách.
// 3) Bấm "Hoàn tất" → đánh dấu kitchenDone=true và tạo Delivery (QUEUED) nếu chưa có.
//    Từ lúc này admin mới có thể Dispatch giao hàng cho đơn này.

// Danh sách đơn cho Bếp: các đơn đã thanh toán nhưng chưa hoàn tất bếp (lọc theo restaurantId nếu có)
router.get('/orders', auth(['ADMIN','RESTAURANT']), asyncHandler(async (req, res) => {
  const me = (req as any).user as { role?: 'ADMIN'|'RESTAURANT'; workRestaurantId?: string };
  let restaurantFilter = (req.query.restaurantId as string | undefined)?.trim();
  if (me.role === 'RESTAURANT') {
    if (!me.workRestaurantId) return res.status(403).json({ message: 'Forbidden' });
    restaurantFilter = me.workRestaurantId; // ép về nhà hàng của nhân viên
  }
  const orders = await prisma.order.findMany({
    where: {
      paymentStatus: 'PAID' as any,
      status: { in: ['CONFIRMED','PREPARING'] as any },
      ...(restaurantFilter ? { restaurantId: restaurantFilter } : {}),
    },
    orderBy: { createdAt: 'desc' },
    include: { user: true, orderItems: { include: { menuItem: true } } },
  });
  res.json(orders.map(o => ({
    id: o.id,
    user: { id: o.userId, name: o.user.name, email: o.user.email },
    kitchenDone: (o as any).kitchenDone === true,
    status: o.status,
    createdAt: o.createdAt,
    items: o.orderItems.map(oi => ({ id: oi.id, name: oi.menuItem.name, qty: oi.qty })),
  })));
}));

// Bắt đầu chuẩn bị: set PREPARING, phát thông điệp cho khách
router.post('/orders/:orderId/start', auth(['ADMIN','RESTAURANT']), asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return res.status(404).json({ message: 'Order not found' });
  const me = (req as any).user as { role?: 'ADMIN'|'RESTAURANT'; workRestaurantId?: string };
  if (me.role === 'RESTAURANT' && order.restaurantId !== me.workRestaurantId) return res.status(403).json({ message: 'Forbidden' });
  if (order.paymentStatus !== 'PAID') return res.status(400).json({ message: 'Order chưa thanh toán' });
  if (order.status !== 'CONFIRMED') return res.status(409).json({ message: 'Chỉ bắt đầu từ trạng thái CONFIRMED' });
  const upd = await prisma.order.update({ where: { id: orderId }, data: { status: 'PREPARING' as any } });
  try {
    ioInstance?.to(`order:${orderId}`).emit('order-update', {
      orderId,
      status: 'PREPARING',
      note: 'Bếp đang chế biến món ăn của bạn',
    });
  } catch {}
  res.json({ ok: true, orderId: upd.id, status: upd.status });
}));

// Hoàn tất chuẩn bị: mở giao hàng (tạo delivery QUEUED nếu chưa có), phát thông điệp cho khách
router.post('/orders/:orderId/complete', auth(['ADMIN','RESTAURANT']), asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return res.status(404).json({ message: 'Order not found' });
  const me = (req as any).user as { role?: 'ADMIN'|'RESTAURANT'; workRestaurantId?: string };
  if (me.role === 'RESTAURANT' && order.restaurantId !== me.workRestaurantId) return res.status(403).json({ message: 'Forbidden' });
  if (order.paymentStatus !== 'PAID') return res.status(400).json({ message: 'Order chưa thanh toán' });
  if (!(['CONFIRMED','PREPARING'] as any).includes(order.status)) return res.status(409).json({ message: 'Trạng thái không hợp lệ để hoàn tất bếp' });

  await prisma.$transaction(async (tx) => {
    await tx.order.update({ where: { id: orderId }, data: { status: 'PREPARING' as any, kitchenDone: true } as any });
    const exists = await tx.delivery.findUnique({ where: { orderId } });
    if (!exists) {
      await tx.delivery.create({ data: { orderId, status: 'QUEUED' as any } });
    }
  });

  try {
    ioInstance?.to(`order:${orderId}`).emit('order-update', {
      orderId,
      status: 'PREPARING',
      note: 'Món đã xong, đang chờ drone giao hàng',
    });
  } catch {}

  res.json({ ok: true });
}));

// Thống kê trong ngày cho nhà hàng (RESTAURANT hoặc ADMIN với restaurantId param)
router.get('/stats/today', auth(['ADMIN','RESTAURANT']), asyncHandler(async (req, res) => {
  const me = (req as any).user as { role?: 'ADMIN'|'RESTAURANT'; workRestaurantId?: string };
  let restaurantId = (req.query.restaurantId as string | undefined)?.trim();
  if (me.role === 'RESTAURANT') {
    if (!me.workRestaurantId) return res.status(403).json({ message: 'Forbidden' });
    restaurantId = me.workRestaurantId;
  } else {
    // ADMIN: yêu cầu restaurantId
    if (!restaurantId) return res.status(400).json({ message: 'restaurantId required' });
  }
  // Khoảng thời gian của ngày hiện tại (UTC -> hoặc tạo theo local nếu cần). Ở đây dùng local server time.
  const start = new Date(); start.setHours(0,0,0,0);
  const end = new Date(); end.setHours(23,59,59,999);
  const paidOrders = await prisma.order.findMany({
    where: {
      restaurantId: restaurantId,
      paymentStatus: 'PAID' as any,
      createdAt: { gte: start, lte: end },
    },
    include: { orderItems: true },
  });
  const dishesCount = paidOrders.reduce((sum, o) => sum + o.orderItems.reduce((s, it) => s + it.qty, 0), 0);
  const totalRevenue = paidOrders.reduce((sum, o) => sum + Number(o.total), 0);
  res.json({ restaurantId, dishesCount, totalRevenue });
}));
