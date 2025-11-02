import { prisma } from './db';
const prismaAny = prisma as any;

// Repository Cart: quản lý giỏ hàng và item của người dùng
export const cartRepository = {
  // Lấy giỏ theo user hoặc tạo mới nếu chưa có
  getOrCreate: async (userId: string) => {
    let cart = await prismaAny.cart.findUnique({ where: { userId }, include: { items: true } });
    if (!cart) cart = await prismaAny.cart.create({ data: { userId }, include: { items: true } });
    return cart;
  },
  // Thêm/sửa số lượng item (qty<=0 thì xoá)
  upsertItem: async (cartId: string, menuItemId: string, qty: number) => {
    if (qty <= 0) {
      await prismaAny.cartItem.deleteMany({ where: { cartId, menuItemId } });
      return;
    }
    await prismaAny.cartItem.upsert({
      where: { cartId_menuItemId: { cartId, menuItemId } },
      update: { qty },
      create: { cartId, menuItemId, qty },
    });
  },
  // Lấy giỏ với chi tiết món (để tính tiền và hiển thị)
  getWithDetails: (userId: string) =>
    prismaAny.cart.findUnique({ where: { userId }, include: { items: { include: { menuItem: true } } } }),
  // Xoá toàn bộ item trong giỏ
  clear: (cartId: string) => prismaAny.cartItem.deleteMany({ where: { cartId } }),
};
