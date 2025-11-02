/// <reference types="node" />
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const r1 = await prisma.restaurant.upsert({
    where: { id: 'seed-restaurant-1' },
    update: {
      name: 'P&Đ CN1',
      address: '213A Nguyễn Văn Cừ, Phường 03, Quận 5, Thành phố Hồ Chí Minh 72700, Vietnam',
      lat: 10.7609095388662,
      lng: 106.68327793988335,
    },
    create: {
      id: 'seed-restaurant-1',
      name: 'P&Đ CN1',
      address: '213A Nguyễn Văn Cừ, Phường 03, Quận 5, Thành phố Hồ Chí Minh 72700, Vietnam',
      lat: 10.7609095388662,
      lng: 106.68327793988335,
      menuItems: { create: [] },
    },
  });

  const r2 = await prisma.restaurant.upsert({
    where: { id: 'seed-restaurant-2' },
    update: {
      name: 'P&Đ CN2',
      address: '230 Âu Dương Lân, Phường Rạch Ông, Quận 8, Thành phố Hồ Chí Minh, Vietnam',
      lat: 10.74502767292537,
      lng: 106.68409306135402,
    },
    create: {
      id: 'seed-restaurant-2',
      name: 'P&Đ CN2',
      address: '230 Âu Dương Lân, Phường Rạch Ông, Quận 8, Thành phố Hồ Chí Minh, Vietnam',
      lat: 10.74502767292537,
      lng: 106.68409306135402,
      menuItems: { create: [] }
    }
  });

  const r3 = await prisma.restaurant.upsert({
    where: { id: 'seed-restaurant-3' },
    update: {
      name: 'P&Đ CN3',
      address: '254/21 Bến Vân Đồn, Phường 2, Quận 4, Thành phố Hồ Chí Minh, Vietnam',
      lat: 10.759341158742572,
      lng: 106.6960281771455,
    },
    create: {
      id: 'seed-restaurant-3',
      name: 'P&Đ CN3',
      address: '254/21 Bến Vân Đồn, Phường 2, Quận 4, Thành phố Hồ Chí Minh, Vietnam',
      lat: 10.759341158742572,
      lng: 106.6960281771455,
      menuItems: { create: [] }
    }
  });

  // Seed 3 drones, mỗi chi nhánh 1 drone, priority 1..3, vị trí tại trạm
  await prisma.drone.upsert({
    where: { code: 'DRN-001' },
  update: ({ homeStationId: r1.id, priority: 1, currentLat: r1.lat, currentLng: r1.lng, currentStationId: r1.id } as any),
    create: {
      code: 'DRN-001',
      capacityKg: 2.0,
  maxRangeKm: 50.0,
      batteryPercent: 100,
      homeStationId: r1.id,
      priority: 1,
      currentLat: r1.lat,
      currentLng: r1.lng,
      currentStationId: r1.id,
    } as any,
  });

  await prisma.drone.upsert({
    where: { code: 'DRN-002' },
  update: ({ homeStationId: r2.id, priority: 2, currentLat: r2.lat, currentLng: r2.lng, currentStationId: r2.id, maxRangeKm: 50.0 } as any),
    create: {
      code: 'DRN-002',
      capacityKg: 2.5,
  maxRangeKm: 50.0,
      batteryPercent: 100,
      homeStationId: r2.id,
      priority: 2,
      currentLat: r2.lat,
      currentLng: r2.lng,
      currentStationId: r2.id,
    } as any,
  });

  await prisma.drone.upsert({
    where: { code: 'DRN-003' },
  update: ({ homeStationId: r3.id, priority: 3, currentLat: r3.lat, currentLng: r3.lng, currentStationId: r3.id, maxRangeKm: 50.0 } as any),
    create: {
      code: 'DRN-003',
      capacityKg: 3.0,
  maxRangeKm: 50.0,
      batteryPercent: 100,
      homeStationId: r3.id,
      priority: 3,
      currentLat: r3.lat,
      currentLng: r3.lng,
      currentStationId: r3.id,
    } as any,
  });

  await ensureMenu(r1.id);
  await ensureMenu(r2.id);
  await ensureMenu(r3.id);
  console.log('Seeded:', r1.name, r2.name, r3.name);
}

const FULL_MENU_12 = [
  { name: 'Fried Chicken', price: 70000, weight: 0.5 },
  { name: 'Cola', price: 15000, weight: 0.3 },
  { name: 'Cheese Pizza', price: 89000, weight: 0.4 },
  { name: 'Pepperoni Pizza', price: 99000, weight: 0.45 },
  { name: 'Caesar Salad', price: 60000, weight: 0.25 },
  { name: 'Spaghetti Bolognese', price: 95000, weight: 0.5 },
  { name: 'Sushi Set', price: 120000, weight: 0.4 },
  { name: 'Grilled Salmon', price: 140000, weight: 0.45 },
  { name: 'French Fries', price: 30000, weight: 0.2 },
  { name: 'Iced Tea', price: 20000, weight: 0.3 },
  { name: 'Orange Juice', price: 25000, weight: 0.3 },
  { name: 'Crispy Chicken Burger', price: 65000, weight: 0.35 }
];

async function ensureMenu(restaurantId: string) {
  // Đảm bảo chỉ còn đúng 12 món như FULL_MENU_12 (xóa món không liên quan và tạo lại chính xác)
  // Xóa phụ thuộc trước để tránh lỗi khóa ngoại
  const existingIds = await prisma.menuItem.findMany({ where: { restaurantId }, select: { id: true } });
  const idList = existingIds.map(i => i.id);
  if (idList.length) {
    await prisma.cartItem.deleteMany({ where: { menuItemId: { in: idList } } });
    await prisma.orderItem.deleteMany({ where: { menuItemId: { in: idList } } });
    await prisma.menuItem.deleteMany({ where: { id: { in: idList } } });
  }
  await prisma.menuItem.createMany({ data: FULL_MENU_12.map(m => ({ ...m, restaurantId, type: inferType(m.name), stock: 100 })) });
}

function inferType(name: string): any {
  const n = name.toLowerCase();
  return /(cola|sprite|soda|tea|juice|milk|coffee|latte|cappuccino)/.test(n) ? 'DRINK' : 'FOOD';
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
