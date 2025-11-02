import { prisma } from './db';

// Repository Order: chịu trách nhiệm truy vấn/ghi dữ liệu Order và quan hệ liên quan
export const orderRepository = {
  // Tìm chi tiết Order theo id (kèm items, restaurant, payment, delivery)
  findById: (id: string) =>
    prisma.order.findUnique({
      where: { id },
      include: {
        orderItems: {
          include: {
            menuItem: { select: { name: true } },
          },
        },
        restaurant: { select: { name: true, lat: true, lng: true } },
        payment: true,
        delivery: true,
      },
    }),
  // Danh sách đơn theo User (rút gọn để hiển thị lịch sử)
  listByUser: (userId: string) =>
    prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        createdAt: true,
        status: true,
        paymentStatus: true,
        total: true,
        shippingFee: true,
        shippingAddress: true,
        delivery: { select: { status: true } },
      },
    }),
  // Danh sách tất cả đơn cho admin
  listAll: () =>
    prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        createdAt: true,
        status: true,
        paymentStatus: true,
        total: true,
        shippingFee: true,
        shippingAddress: true,
        userId: true,
      },
    }),
};
