import { prisma } from './db';

// Repository Restaurant: truy vấn danh sách chi nhánh và menu khả dụng
export const restaurantRepository = {
  // Liệt kê chi nhánh (thông tin hiển thị map/list)
  list: () => prisma.restaurant.findMany({ select: { id: true, name: true, address: true, lat: true, lng: true } }),
  // Lấy menu còn hàng (isAvailable=true) của chi nhánh
  findMenu: (restaurantId: string) =>
    (prisma as any).menuItem.findMany({
      where: { restaurantId, isAvailable: true },
      select: { id: true, name: true, price: true, weight: true, type: true, imageUrl: true, stock: true },
      orderBy: { name: 'asc' },
    }),
};
