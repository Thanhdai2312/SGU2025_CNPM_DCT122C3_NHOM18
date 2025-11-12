import express from 'express';
import { auth } from './middlewares';
import { orderRepository } from '../repositories/orderRepository';
import { prisma } from '../repositories/db';

const router = express.Router();

// API Theo dõi đơn hàng cho khách hàng và admin/operator
// Trả về thông tin đơn, các item, phí ship, tổng tiền; kèm theo trạng thái delivery,
// ETA, thời điểm bắt đầu/hoàn tất, tiến độ ước tính và vị trí drone (nếu có).
// GET /api/tracking/:orderId
// Trả về thông tin theo dõi giao hàng cho 1 đơn hàng
// - CUSTOMER: chỉ xem đơn hàng của chính mình
// - ADMIN/OPERATOR: xem bất kỳ đơn hàng nào
router.get('/:orderId', auth(['CUSTOMER', 'ADMIN', 'RESTAURANT']), async (req, res, next) => {
  try {
    const { orderId } = req.params;
  const me = (req as any).user as { id: string; role?: 'CUSTOMER' | 'ADMIN' | 'RESTAURANT'; workRestaurantId?: string };

  const order = await orderRepository.findById(orderId);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    // CUSTOMER chỉ được xem đơn của chính mình
  const isPrivileged = me?.role === 'ADMIN' || (me?.role === 'RESTAURANT' && order.restaurantId === me.workRestaurantId);
    if (!isPrivileged && order.userId !== me?.id) {
      return res.status(403).json({ message: 'Forbidden' });
    }

  const delivery = order.delivery;
    const items = order.orderItems.map((it: any) => ({
      name: it.menuItem?.name || 'Món',
      qty: it.qty,
      price: Number(it.price || 0),
    }));
    const subtotal = items.reduce((s, i) => s + i.qty * i.price, 0);
    const basePayload: any = {
      orderId: order.id,
      items,
      address: order.shippingAddress || '',
      shippingFee: Number((order as any).shippingFee || 0),
      subtotal,
      total: subtotal + Number((order as any).shippingFee || 0),
      restaurant: order.restaurant ? { name: order.restaurant.name, lat: Number(order.restaurant.lat), lng: Number(order.restaurant.lng) } : undefined,
      destination: (order as any).destLat && (order as any).destLng ? { lat: Number((order as any).destLat), lng: Number((order as any).destLng) } : undefined,
    };

    if (!delivery) {
      return res.json({
        ...basePayload,
        tracking: {
          status: 'NO_DELIVERY',
        },
      });
    }

    // Compute progress and pseudo-drone location
    let progress = undefined as number | undefined;
    const now = Date.now();
    const startedAt = delivery.startedAt ? new Date(delivery.startedAt).getTime() : undefined;
    const eta = delivery.eta ? new Date(delivery.eta).getTime() : undefined;
    if (delivery.status === 'COMPLETED') progress = 100;
    else if (startedAt && eta && eta > startedAt) {
      const p = ((now - startedAt) / (eta - startedAt)) * 100;
      progress = Math.max(0, Math.min(100, Math.round(p)));
    } else if (delivery.status === 'ASSIGNED') progress = 0;

    // Get real-time drone position if available
    let drone: any = undefined;
    if (delivery.droneId) {
      try {
        const d = await prisma.drone.findUnique({ where: { id: delivery.droneId } });
        if (d && (d as any).currentLat != null && (d as any).currentLng != null) {
          drone = { lat: Number((d as any).currentLat), lng: Number((d as any).currentLng), batteryPercent: d.batteryPercent };
        }
      } catch {}
    }

    return res.json({
      ...basePayload,
      deliveryId: delivery.id,
      tracking: {
        status: delivery.status,
        eta: delivery.eta,
        startedAt: delivery.startedAt,
        completedAt: delivery.completedAt,
        droneId: delivery.droneId,
        progress,
        drone,
      },
    });
  } catch (e) {
    next(e);
  }
});

export default router;
