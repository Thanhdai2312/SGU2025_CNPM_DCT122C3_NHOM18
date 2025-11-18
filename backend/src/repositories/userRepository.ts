import { prisma } from './db';
import { UserRole } from '@prisma/client';

// Repository User: truy vấn người dùng, thống kê theo vai trò, và xoá cascade
export const userRepository = {
  findByEmail: (email: string) => prisma.user.findUnique({ where: { email } }),
  // Dùng findFirst để tránh phụ thuộc WhereUniqueInput khi type cache chưa cập nhật
  findByPhone: (phone: string) => prisma.user.findFirst({ where: { phone } as any }),
  create: (params: { name: string; email: string; phone?: string | null; passwordHash: string; role?: UserRole }) =>
    prisma.user.create({ data: { name: params.name, email: params.email, passwordHash: params.passwordHash, role: params.role ?? 'CUSTOMER', phone: params.phone ?? null } as any }),
  // Tìm kiếm theo role và chuỗi tìm kiếm đơn giản cho Admin
  list: (opts: { search?: string; role?: UserRole }) => {
    const where: any = {};
    if (opts.role) where.role = opts.role;
    if (opts.search && opts.search.trim()) {
      const q = opts.search.trim();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q, mode: 'insensitive' } },
      ];
    }
    return prisma.user.findMany({ where, orderBy: { createdAt: 'desc' } }).then(rows => rows.map(u => ({
      id: u.id, name: u.name, email: u.email, phone: (u as any).phone ?? null, role: u.role, createdAt: u.createdAt,
    })));
  },
  // Đếm số lượng theo vai trò để hiển thị dashboard
  countsByRole: async () => {
    const [admins, customers, restaurants] = await Promise.all([
      prisma.user.count({ where: { role: { equals: 'ADMIN' as UserRole } } }),
      prisma.user.count({ where: { role: { equals: 'CUSTOMER' as UserRole } } }),
      prisma.user.count({ where: { role: { equals: 'RESTAURANT' as UserRole } } }),
    ]);
    return { admins, customers, restaurants };
  },
  // Tạo nhân viên nhà hàng (RESTARUANT) gán vào 1 nhà hàng
  createStaff: (params: { name: string; email: string; phone?: string | null; passwordHash: string; restaurantId: string }) =>
    prisma.user.create({ data: { name: params.name, email: params.email, passwordHash: params.passwordHash, role: 'RESTAURANT' as any, phone: params.phone ?? null, workRestaurantId: params.restaurantId } as any }),
  // Xoá toàn bộ dữ liệu liên quan và cuối cùng xoá user (transactional)
  removeByIdCascade: async (userId: string) => {
    // Xoá toàn bộ dữ liệu phụ thuộc trước rồi xoá user
    await prisma.$transaction(async (tx) => {
      // Delete cart items and cart
      await tx.cartItem.deleteMany({ where: { cart: { userId } } });
      await tx.cart.deleteMany({ where: { userId } });

      // Delete routes linked to deliveries of orders of user
      await tx.route.deleteMany({ where: { delivery: { order: { userId } } } });
      // Delete deliveries
      await tx.delivery.deleteMany({ where: { order: { userId } } });
      // Delete payments
      await tx.payment.deleteMany({ where: { order: { userId } } });
      // Delete order items then orders
      await tx.orderItem.deleteMany({ where: { order: { userId } } });
      await tx.order.deleteMany({ where: { userId } });

      // Finally delete user
      await tx.user.delete({ where: { id: userId } });
    });
  },
};
