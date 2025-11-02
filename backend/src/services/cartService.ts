import { cartRepository } from '../repositories/cartRepository';
import { prisma } from '../repositories/db';
const prismaAny = prisma as any;

export type CartItemInput = { menuItemId: string; qty: number };

export const cartService = {
  // Lấy giỏ hàng của user: tạo giỏ nếu chưa có, trả về kèm chi tiết các menuItem
  get: async (userId: string) => {
    const cart = await cartRepository.getOrCreate(userId);
    const withDetails = await cartRepository.getWithDetails(userId);
    return withDetails ?? cart;
  },

  // Ghi đè danh sách items trong giỏ: validate menuItem tồn tại, kiểm tra tồn kho (nếu có),
  // cập nhật qty hoặc xoá nếu qty <= 0. Các item không còn trong danh sách sẽ bị xoá.
  setItems: async (userId: string, items: CartItemInput[]) => {
    const cart = await cartRepository.getOrCreate(userId);
    // validate menu items tồn tại
    const ids = items.map((i) => i.menuItemId);
    const found = await prisma.menuItem.findMany({ where: { id: { in: ids }, isAvailable: true } });
    const foundIds = new Set(found.map((m) => m.id));
    for (const it of items) {
      if (it.qty < 0) throw Object.assign(new Error('qty must be >= 0'), { status: 400 });
      if (!foundIds.has(it.menuItemId)) throw Object.assign(new Error('menuItem not found'), { status: 404 });
      // stock check (nếu có cấu hình stock)
      const m = found.find(f => f.id === it.menuItemId)! as any;
      if (m.stock != null && typeof m.stock === 'number' && it.qty > m.stock) {
        throw Object.assign(new Error('Số lượng vượt quá tồn kho'), { status: 400 });
      }
      await cartRepository.upsertItem(cart.id, it.menuItemId, it.qty);
    }
    // remove others not in list
  await prismaAny.cartItem.deleteMany({ where: { cartId: cart.id, menuItemId: { notIn: ids } } });
    return cartRepository.getWithDetails(userId);
  },
};
