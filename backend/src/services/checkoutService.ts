import { prisma } from '../repositories/db';
import { calculateDistance } from './distance';

export type CheckoutInput = {
  restaurantId: string; // will be validated/derived from items to avoid mismatch
  address: string;
  destLat: number;
  destLng: number;
  items: { menuItemId: string; qty: number }[];
};

export const checkoutService = {
  // Tạo đơn hàng từ giỏ: xác định nhà hàng từ items, tính subtotal, tính phí ship,
  // kiểm tra bán kính 15km, sau đó tạo Order + OrderItems + Payment (PENDING).
  // Lưu ý: Delivery chưa được tạo ở đây; sẽ được tạo khi bếp hoàn tất (kitchenDone).
  checkout: async (userId: string, input: CheckoutInput) => {
    // Load items first (ignore restaurant filter to avoid mismatch with stale localStorage)
    const ids = input.items.map((i) => i.menuItemId);
  const menuItems = await prisma.menuItem.findMany({ where: { id: { in: ids }, isAvailable: true } });
    const menuMap = new Map(menuItems.map((m) => [m.id, m] as const));

  // Suy ra restaurant từ items và đảm bảo tất cả items thuộc cùng một nhà hàng
    const rids = Array.from(new Set(menuItems.map(m => m.restaurantId)));
    if (rids.length !== 1) {
      throw Object.assign(new Error('Cart items belong to different or unknown restaurants'), { status: 400 });
    }
    const restaurantId = rids[0]!;
    const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId } });
    if (!restaurant) throw Object.assign(new Error('Restaurant not found'), { status: 404 });

  // Tính subtotal và kiểm tra tồn kho ngay tại thời điểm checkout
    let subtotal = 0;
    for (const it of input.items) {
      const m = menuMap.get(it.menuItemId) as any;
      if (!m) throw Object.assign(new Error('Menu item not found or unavailable'), { status: 400 });
      // Check stock again at checkout time
      if (m.stock != null && typeof m.stock === 'number' && it.qty > m.stock) {
        throw Object.assign(new Error(`Sản phẩm "${m.name}" không đủ tồn kho`), { status: 400 });
      }
      subtotal += Number(m.price) * it.qty;
    }

    // Tính khoảng cách (OSRM nếu có, fallback Haversine) với đơn giá mẫu 5,000đ/km, tối thiểu 10,000đ
  const { distanceKm } = await calculateDistance(restaurant.lat, restaurant.lng, input.destLat, input.destLng);
    // Giới hạn bán kính giao hàng cho khách: 15km
    if (distanceKm > 15) {
      throw Object.assign(new Error('Phạm vi bạn chọn quá giới hạn bay của chúng tôi, chúng tôi chỉ có thể giao bán kính 15km đổ lại'), { status: 400 });
    }
    const shippingFee = Math.max(10000, Math.round(distanceKm * 5000));
    const total = subtotal + shippingFee;

  // Tạo Order + OrderItems + Payment PENDING trong một transaction để đảm bảo nhất quán
    const order = await prisma.$transaction(async (tx) => {
      const ord = await tx.order.create({
        data: {
          userId,
          restaurantId,
          total,
          shippingFee,
          shippingAddress: input.address,
          destLat: input.destLat,
          destLng: input.destLng,
          status: 'CREATED',
          paymentStatus: 'PENDING',
        } as any,
      });

      await tx.orderItem.createMany({
        data: input.items.map((it) => ({
          orderId: ord.id,
          menuItemId: it.menuItemId,
          qty: it.qty,
          price: Number(menuMap.get(it.menuItemId)!.price),
        })),
      });

      await tx.payment.create({
        data: { orderId: ord.id, amount: total, provider: 'MOCK', status: 'PENDING' },
      });

      return ord;
    });

    return { orderId: order.id, total, shippingFee };
  },
};
