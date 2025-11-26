import { prisma } from './db';

// Repository Restaurant: truy vấn danh sách chi nhánh và menu khả dụng
export const restaurantRepository = {
  // Liệt kê chi nhánh (thông tin hiển thị map/list)
  list: () => prisma.restaurant.findMany({ select: { id: true, name: true, address: true, lat: true, lng: true }, orderBy: { id: 'asc' } }),
  // Lấy menu còn hàng (isAvailable=true) của chi nhánh
  findMenu: (restaurantId: string) =>
    (prisma as any).menuItem.findMany({
      where: { restaurantId, isAvailable: true },
      select: { id: true, name: true, price: true, weight: true, type: true, imageUrl: true, stock: true },
      orderBy: { name: 'asc' },
    }),
  // Tìm 1 nhà hàng có menu để dùng làm template (ưu tiên seed-1,2,3)
  findTemplateRestaurantId: async () => {
    for (const rid of ['seed-restaurant-1','seed-restaurant-2','seed-restaurant-3']) {
      const cnt = await (prisma as any).menuItem.count({ where: { restaurantId: rid } });
      if (cnt > 0) return rid;
    }
    const first = await (prisma as any).menuItem.findFirst({ select: { restaurantId: true } });
    return first?.restaurantId as string | undefined;
  },
  // Clone toàn bộ menu từ template sang nhà hàng mới (nếu chưa có)
  cloneMenuFrom: async (templateRestaurantId: string, targetRestaurantId: string) => {
    const existing = await (prisma as any).menuItem.count({ where: { restaurantId: targetRestaurantId } });
    if (existing > 0) return { created: 0 };
    const sourceItems = await (prisma as any).menuItem.findMany({
      where: { restaurantId: templateRestaurantId },
      select: { name: true, price: true, weight: true, type: true, imageUrl: true, stock: true, isAvailable: true },
    });
    if (!sourceItems.length) return { created: 0 };
    await (prisma as any).menuItem.createMany({
      data: sourceItems.map((m: any) => ({
        restaurantId: targetRestaurantId,
        name: m.name,
        price: m.price,
        weight: m.weight,
        type: m.type,
        imageUrl: m.imageUrl || null,
        stock: typeof m.stock === 'number' ? m.stock : 100,
        isAvailable: m.isAvailable ?? true,
      }))
    });
    return { created: sourceItems.length };
  },
  // Tạo nhà hàng mới
  create: (data: { name: string; address: string; lat: number; lng: number }) =>
    prisma.restaurant.create({ data }),
  // Cập nhật thông tin nhà hàng
  update: (id: string, data: Partial<{ name: string; address: string; lat: number; lng: number }>) =>
    prisma.restaurant.update({ where: { id }, data }),
  // Xoá nhà hàng (chỉ khi không có phụ thuộc quan trọng)
  delete: async (id: string) => {
    // Kiểm tra phụ thuộc: đơn hàng, drone, menu
    const [ordersCount, dronesCount, menuCount] = await Promise.all([
      prisma.order.count({ where: { restaurantId: id } }),
      prisma.drone.count({ where: { OR: [{ homeStationId: id }, { currentStationId: id }] } }),
      (prisma as any).menuItem.count({ where: { restaurantId: id } }),
    ]);
    if (ordersCount > 0 || dronesCount > 0) {
      return { ok: false, reason: 'IN_USE', ordersCount, dronesCount, menuCount };
    }
    // Cho phép xoá khi chỉ còn menu items: xoá menu trước
    if (menuCount > 0) {
      await (prisma as any).menuItem.deleteMany({ where: { restaurantId: id } });
    }
    await prisma.restaurant.delete({ where: { id } });
    return { ok: true };
  },
};
