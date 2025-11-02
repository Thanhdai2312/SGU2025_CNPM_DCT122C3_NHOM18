import { DroneStatus } from '@prisma/client';
import { DroneRepository } from '../repositories/droneRepository';
import { DeliveryRepository } from '../repositories/deliveryRepository';
import { prisma } from '../repositories/db';
import { calculateDistance, haversineKm } from './distance';

// Dịch vụ quản lý Drone
// - list/create/update: CRUD cơ bản cho drone
// - assignDroneToOrder: chọn drone khả dụng (đơn giản) dựa vào tầm bay, tải trọng, pin
// - getAvailability: thống kê nhanh số drone rảnh và tải trọng tối đa
// - dispatchDelivery: luồng dispatch nâng cao, kiểm tra kitchenDone, chọn drone theo priority & ràng buộc,
//   tạo lộ trình nhiều pha (về trạm, sạc, đến khách) và set trạng thái ASSIGNED
export class DroneService {
  constructor(
    private readonly drones = new DroneRepository(),
    private readonly deliveries = new DeliveryRepository(),
  ) {}

  // Lấy danh sách drone hiện có
  async list() {
    return this.drones.list();
  }

  // Tạo drone mới, tự động set vị trí theo trạm nếu không nhập currentLat/Lng
  async create(input: {
    code: string;
    capacityKg: number;
    maxRangeKm: number;
    batteryPercent: number;
    homeStationId?: string | null;
    currentStationId?: string | null;
    priority?: number;
    currentLat?: number;
    currentLng?: number;
  }) {
    let currentLat = input.currentLat ?? 0;
    let currentLng = input.currentLng ?? 0;
    // Nếu có chọn currentStationId thì ưu tiên đặt toạ độ theo trạm hiện tại; nếu không thì theo homeStationId
    if (input.currentStationId && (currentLat === 0 && currentLng === 0)) {
      try {
        const s = await prisma.restaurant.findUnique({ where: { id: input.currentStationId } });
        if (s) { currentLat = Number(s.lat); currentLng = Number(s.lng); }
      } catch {}
    } else if (input.homeStationId && (currentLat === 0 && currentLng === 0)) {
      try {
        const s = await prisma.restaurant.findUnique({ where: { id: input.homeStationId } });
        if (s) { currentLat = Number(s.lat); currentLng = Number(s.lng); }
      } catch {}
    }
    return this.drones.create({ ...input, currentLat, currentLng, status: DroneStatus.AVAILABLE });
  }

  // Cập nhật một số thuộc tính drone (không cho sửa code/owner ở đây)
  async update(id: string, data: Partial<{
    capacityKg: number;
    maxRangeKm: number;
    batteryPercent: number;
    status: DroneStatus;
    currentStationId: string | null;
    homeStationId: string | null;
    priority: number;
    currentLat: number;
    currentLng: number;
  }>) {
    return this.drones.update(id, data);
  }

  // Chọn drone đơn giản: drone AVAILABLE đầu tiên đủ pin, đủ tải, đủ tầm bay
  async assignDroneToOrder(params: {
    orderId: string;
    requiredRangeKm: number;
    requiredWeightKg: number;
  }) {
  const all = await this.drones.list();
  const candidate = (all as any[]).find((d: any) => {
      const maxRange = (d as any).maxRangeKm?.toNumber ? (d as any).maxRangeKm.toNumber() : (d as any).maxRangeKm;
      const capacity = (d as any).capacityKg?.toNumber ? (d as any).capacityKg.toNumber() : (d as any).capacityKg;
      return (
        d.status === DroneStatus.AVAILABLE &&
        maxRange >= params.requiredRangeKm &&
        capacity >= params.requiredWeightKg &&
        d.batteryPercent >= 30
      );
    });
    if (!candidate) return null;

    await this.drones.update(candidate.id, { status: DroneStatus.BUSY });
    const delivery = await this.deliveries.create({
      orderId: params.orderId,
      droneId: candidate.id,
      status: undefined,
      etaMinutes: Math.ceil(params.requiredRangeKm / 0.5), // simple estimate
      startedAt: new Date(),
    });
    return delivery;
  }

  // Trả về số drone AVAILABLE và tải trọng tối đa (để hiển thị dashboard nhanh)
  async getAvailability() {
  const all = await this.drones.list();
  const available = (all as any[]).filter((d: any) => d.status === DroneStatus.AVAILABLE);
  const maxCapacityKg = (all as any[]).reduce((max: number, d: any) => {
      const cap = d.capacityKg?.toNumber ? d.capacityKg.toNumber() : d.capacityKg;
      return Math.max(max, Number(cap || 0));
    }, 0);
    return { availableCount: available.length, maxCapacityKg };
  }

  // Admin dispatch: chọn drone theo priority, khoảng cách, pin; tạo route nhiều pha và set ASSIGNED
  async dispatchDelivery(deliveryId: string) {
    const delivery = await prisma.delivery.findUnique({ where: { id: deliveryId } });
    if (!delivery) throw Object.assign(new Error('Delivery not found'), { status: 404 });
    if (delivery.status !== 'QUEUED') throw Object.assign(new Error('Delivery not in QUEUED state'), { status: 400 });

    const order = await prisma.order.findUnique({
      where: { id: delivery.orderId },
      include: {
        orderItems: { include: { menuItem: { select: { weight: true } } } },
        restaurant: true,
      },
    });
    if (!order || order.destLat == null || order.destLng == null || !order.restaurant) {
      throw Object.assign(new Error('Order destination/restaurant missing'), { status: 400 });
    }
    // Gate: chỉ cho dispatch khi bếp đã Hoàn tất
    if (!(order as any).kitchenDone) {
      throw Object.assign(new Error('Kitchen has not completed this order yet'), { status: 409 });
    }
    const totalWeight = order.orderItems.reduce((s, it) => s + Number(it.menuItem?.weight || 0) * it.qty, 0);

  // Chỉ chọn drone thuộc sở hữu của nhà hàng đặt món và đang AVAILABLE
  const allDrones = await prisma.drone.findMany({ where: { status: DroneStatus.AVAILABLE, homeStationId: order.restaurantId } });
    if (allDrones.length === 0) throw Object.assign(new Error('No available drone'), { status: 409 });

    // sort by priority asc
    allDrones.sort((a: any, b: any) => (a.priority ?? 999) - (b.priority ?? 999));

  // Tìm trạm gần điểm giao nhất để dự tính quãng đường về (return leg)
    const stations = await prisma.restaurant.findMany({ select: { id: true, lat: true, lng: true } });
    const destLat = Number(order.destLat);
    const destLng = Number(order.destLng);
    const nearestStation = stations.reduce((best, s) => {
      const d = haversineKm(destLat, destLng, Number(s.lat), Number(s.lng));
      if (!best || d < best.distKm) return { id: s.id, lat: Number(s.lat), lng: Number(s.lng), distKm: d };
      return best;
    }, null as null | { id: string; lat: number; lng: number; distKm: number });

    let selected: any | null = null;
    let distanceKmToDest = 0;
    let distanceKmReturn = 0;
    for (const d of allDrones) {
      const cap = (d as any).capacityKg?.toNumber ? (d as any).capacityKg.toNumber() : (d as any).capacityKg;
      const maxRange = (d as any).maxRangeKm?.toNumber ? (d as any).maxRangeKm.toNumber() : (d as any).maxRangeKm;
      if (Number(cap || 0) < totalWeight) continue;
      const curLat = Number((d as any).currentLat ?? 0);
      const curLng = Number((d as any).currentLng ?? 0);
      const { distanceKm } = await calculateDistance(curLat, curLng, destLat, destLng);
      const rtKm = nearestStation ? haversineKm(destLat, destLng, nearestStation.lat, nearestStation.lng) : 0;
  const needBatteryPct = (distanceKm + rtKm) * 2; // 2%/km cho cả hai chặng
      if (d.batteryPercent < Math.ceil(needBatteryPct)) continue;
      if (Number(maxRange || 0) < (distanceKm + rtKm)) continue;
      selected = d; distanceKmToDest = distanceKm; distanceKmReturn = rtKm; break;
    }
    if (!selected) throw Object.assign(new Error('No drone satisfies constraints'), { status: 409 });

    const now = new Date();
  // ETA cơ bản cho chặng tới khách; nếu có chặng về trạm trước sẽ cộng thêm
    let etaSeconds = Math.max(1, Math.round(distanceKmToDest * 10)); // 10s/km
    const eta = new Date(now.getTime() + etaSeconds * 1000);

    const updated = await prisma.$transaction(async (tx) => {
      const d = await tx.delivery.update({ where: { id: deliveryId }, data: { droneId: selected!.id, status: 'ASSIGNED' as any, eta } });
      // create or upsert route
      const existsRoute = await tx.route.findUnique({ where: { deliveryId: d.id } });
      const startLat = Number((selected as any).currentLat ?? order.restaurant.lat);
      const startLng = Number((selected as any).currentLng ?? order.restaurant.lng);

  // Chuẩn bị lộ trình nhiều pha: nếu drone không ở đúng trạm sở hữu, bay về trạm, sạc đầy rồi mới đi khách
      const home = await tx.restaurant.findUnique({ where: { id: order.restaurantId } });
      const phases: any[] = [];
      const currentStationId = (selected as any).currentStationId || null;
      if (home && String(currentStationId || '') !== String(home.id)) {
        phases.push({ type: 'TO_HOME_FOR_DISPATCH', startLat, startLng, endLat: Number(home.lat), endLng: Number(home.lng), homeStationId: home.id });
        etaSeconds += Math.round(haversineKm(startLat, startLng, Number(home.lat), Number(home.lng)) * 10);
      }
      if (home) {
        phases.push({ type: 'CHARGING_FOR_DISPATCH', targetBattery: 100, homeStationId: home.id });
      }
      phases.push({ type: 'TO_CUSTOMER' });
      const path = { phases, currentIndex: 0 };

      if (existsRoute) {
        await tx.route.update({ where: { deliveryId: d.id }, data: { startLat, startLng, endLat: destLat, endLng: destLng, path: path as any } });
      } else {
        await tx.route.create({ data: { deliveryId: d.id, startLat, startLng, endLat: destLat, endLng: destLng, path: path as any } });
      }
      await tx.drone.update({ where: { id: selected!.id }, data: { status: 'BUSY' as any } });
      return d;
    });

    return { delivery: updated, distanceKmToDest, distanceKmReturn };
  }
}
