import { Router, Request, Response } from 'express';
import { checkoutService, CheckoutInput } from '../services/checkoutService';
import { auth } from './middlewares';
import { prisma } from '../repositories/db';
import { calculateDistance } from '../services/distance';

export const router = Router();

// API Checkout tạo đơn hàng từ giỏ hàng
// - POST /: Nhận thông tin giao hàng (nhà hàng, địa chỉ, toạ độ, items), kiểm tra hợp lệ và tạo Order + Payment (mock)
//   Lưu ý: KHÔNG tự tạo Delivery tại đây; Delivery chỉ được tạo khi bếp hoàn tất (kitchenDone) ở /api/admin/kitchen.
// - GET /estimate: Ước tính phí ship trước khi đặt, không tạo đơn.

router.post('/', auth(), async (req: Request, res: Response) => {
  try {
    const user = (req as unknown as Request & { user: { id: string } }).user;
    const input = req.body as CheckoutInput;
    const result = await checkoutService.checkout(user.id, input);
    res.status(201).json(result);
  } catch (e: any) {
    const status = typeof e?.status === 'number' ? e.status : 400;
    res.status(status).json({ message: e?.message || 'Checkout failed' });
  }
});

// Ước tính phí ship (không tạo đơn) để hiển thị trước khi xác nhận
router.get('/estimate', auth(), async (req: Request, res: Response) => {
  const restaurantId = req.query.restaurantId as string;
  const destLat = Number(req.query.destLat);
  const destLng = Number(req.query.destLng);
  if (!restaurantId || Number.isNaN(destLat) || Number.isNaN(destLng)) {
    return res.status(400).json({ message: 'Missing restaurantId/destLat/destLng' });
  }
  const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId } });
  if (!restaurant) return res.status(404).json({ message: 'Restaurant not found' });
  const { distanceKm } = await calculateDistance(restaurant.lat, restaurant.lng, destLat, destLng);
  const shippingFee = Math.max(10000, Math.round(distanceKm * 5000));
  // Luôn trả estimate để FE hiển thị phí ship bình thường, kèm cờ overLimit cho cảnh báo UI
  const overLimit = distanceKm > 15;
  res.json({
    distanceKm,
    shippingFee,
    formula: 'Phí ship = tối thiểu 10.000đ hoặc 5.000đ/km (lấy mức cao hơn)',
    overLimit
  });
});
