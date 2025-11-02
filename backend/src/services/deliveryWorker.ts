import { PrismaClient, DeliveryStatus, DroneStatus } from '@prisma/client';
import { prisma } from '../repositories/db';
import { ioInstance } from '../websocket/server';
import { haversineKm } from './distance';

export class DeliveryWorker {
  private timer: NodeJS.Timeout | null = null;
  // in-memory state
  private returning: Map<string, { targetLat: number; targetLng: number; stationId?: string }> = new Map(); // droneId -> return target
  private charging: Set<string> = new Set(); // droneId set charging cycle
  constructor(private readonly db: PrismaClient = prisma) {}

  // Vòng lặp mô phỏng vận hành giao hàng:
  // - ASSIGNED -> EN_ROUTE và phát socket events
  // - EN_ROUTE: di chuyển drone theo từng tick (10s/km), trừ pin 2%/km, hỗ trợ lộ trình nhiều pha:
  //   TO_HOME_FOR_DISPATCH (về trạm), CHARGING_FOR_DISPATCH (sạc đầy), TO_CUSTOMER (đến khách)
  // - Khi giao tới khách: đánh dấu COMPLETED, trừ tồn kho theo orderItems, lên kế hoạch quay về trạm gần nhất
  // - Sau khi quay về: sạc dần đến 100% rồi đổi trạng thái AVAILABLE
  start(intervalMs = 1000) {
    if (this.timer) return; // already running
    this.returning = new Map();
    this.charging = new Set();
    this.timer = setInterval(async () => {
      try {
        const now = new Date();
        // 1) Move ASSIGNED -> EN_ROUTE
        const assigned = await this.db.delivery.findMany({ where: { status: DeliveryStatus.ASSIGNED }, include: { route: true } });
        for (const d of assigned) {
          const initialEta = d.eta ?? new Date(now.getTime() + 60 * 1000);
          const updated = await this.db.delivery.update({
            where: { id: d.id },
            data: { status: DeliveryStatus.EN_ROUTE, eta: initialEta, startedAt: now },
          });
          // Emit order status update
          try {
            ioInstance?.to(`order:${updated.orderId}`).emit('order-update', {
              orderId: updated.orderId,
              deliveryId: updated.id,
              status: updated.status,
              eta: updated.eta,
            });
            ioInstance?.to('admin:drones').emit('delivery-update', {
              deliveryId: updated.id,
              orderId: updated.orderId,
              status: updated.status,
              eta: updated.eta,
            });
          } catch {}
        }

        // 2) Move EN_ROUTE drones step-by-step with 10s/km and drain 2%/km
        const enRoute = await this.db.delivery.findMany({
          where: { status: DeliveryStatus.EN_ROUTE },
          include: { route: true },
        });
        for (const d of enRoute) {
          if (!d.droneId || !d.route) continue;
          const drone = await this.db.drone.findUnique({ where: { id: d.droneId } });
          if (!drone) continue;
          const curLat = Number((drone as any).currentLat ?? 0);
          const curLng = Number((drone as any).currentLng ?? 0);

          // Check phased route in path JSON
          let phase: 'TO_HOME_FOR_DISPATCH' | 'CHARGING_FOR_DISPATCH' | 'TO_CUSTOMER' | undefined;
          let targetLat = Number(d.route.endLat);
          let targetLng = Number(d.route.endLng);
          let pathJson: any = undefined;
          try { pathJson = d.route.path ? (typeof d.route.path === 'string' ? JSON.parse(d.route.path as any) : d.route.path) : undefined; } catch {}
          const phases: any[] = Array.isArray(pathJson?.phases) ? pathJson.phases : [];
          const currentIndex: number = typeof pathJson?.currentIndex === 'number' ? pathJson.currentIndex : 0;
          const currentPhase = phases[currentIndex];
          if (currentPhase && currentPhase.type === 'TO_HOME_FOR_DISPATCH') {
            phase = 'TO_HOME_FOR_DISPATCH';
            targetLat = Number(currentPhase.endLat);
            targetLng = Number(currentPhase.endLng);
          } else if (currentPhase && currentPhase.type === 'CHARGING_FOR_DISPATCH') {
            phase = 'CHARGING_FOR_DISPATCH';
          } else {
            phase = 'TO_CUSTOMER';
            targetLat = Number(d.route.endLat);
            targetLng = Number(d.route.endLng);
          }

          const speedKmPerSec = 0.1; // 10s/km
          const stepKm = speedKmPerSec * (intervalMs / 1000);

          if (phase === 'CHARGING_FOR_DISPATCH') {
            const newBattery = Math.min(100, drone.batteryPercent + 1);
            await this.db.drone.update({ where: { id: drone.id }, data: { batteryPercent: newBattery, status: 'CHARGING' as any } });
            if (newBattery >= 100) {
              // advance phase
              const nextIdx = currentIndex + 1;
              const newPath = { phases, currentIndex: nextIdx };
              await this.db.route.update({ where: { deliveryId: d.id }, data: { path: newPath as any } });
              await this.db.drone.update({ where: { id: drone.id }, data: { status: 'BUSY' as any } });
            }
            // emit live update
            try {
              ioInstance?.to(`order:${d.orderId}`).emit('order-update', {
                orderId: d.orderId,
                deliveryId: d.id,
                status: 'EN_ROUTE',
                phase,
                drone: { lat: curLat, lng: curLng, batteryPercent: drone.batteryPercent },
              });
              ioInstance?.to('admin:drones').emit('delivery-update', { deliveryId: d.id, orderId: d.orderId, status: 'EN_ROUTE', phase });
            } catch {}
            continue; // next delivery
          }

          // movement phase (to home or to customer)
          const remainingKm = haversineKm(curLat, curLng, targetLat, targetLng);
          const arrived = remainingKm <= stepKm;
          let nextLat = targetLat;
          let nextLng = targetLng;
          if (!arrived && remainingKm > 0) {
            const t = stepKm / remainingKm;
            nextLat = curLat + (targetLat - curLat) * t;
            nextLng = curLng + (targetLng - curLng) * t;
          }
          // Chính xác hoá: chỉ trừ đúng quãng đường thực sự bay trong tick này
          const movedKm = arrived ? Math.max(0, remainingKm) : Math.max(0, stepKm);
          const drainPct = Math.min(drone.batteryPercent, movedKm * 2);
          const newBattery = Math.max(0, Math.min(100, Math.round((drone.batteryPercent - drainPct) * 100) / 100));
          await this.db.drone.update({ where: { id: drone.id }, data: { currentLat: nextLat, currentLng: nextLng, batteryPercent: newBattery } as any });

          // emit live update with phase
          try {
            ioInstance?.to(`order:${d.orderId}`).emit('order-update', {
              orderId: d.orderId,
              deliveryId: d.id,
              status: 'EN_ROUTE',
              phase,
              drone: { lat: nextLat, lng: nextLng, batteryPercent: newBattery },
              remainingKm: Math.max(0, arrived ? 0 : remainingKm - stepKm),
            });
            ioInstance?.to('admin:drones').emit('delivery-update', {
              deliveryId: d.id,
              orderId: d.orderId,
              status: 'EN_ROUTE',
              phase,
              drone: { lat: nextLat, lng: nextLng, batteryPercent: newBattery },
            });
          } catch {}

          if (arrived) {
            if (phase === 'TO_HOME_FOR_DISPATCH') {
              // Mark drone at home station and advance to charging phase
              const nextIdx = currentIndex + 1;
              const newPath = { phases, currentIndex: nextIdx };
              await this.db.route.update({ where: { deliveryId: d.id }, data: { path: newPath as any } });
              // Mark currentStationId
              const homeId = phases[ currentIndex ]?.homeStationId || phases.find((p:any)=>p.type==='TO_HOME_FOR_DISPATCH')?.homeStationId;
              if (homeId) await this.db.drone.update({ where: { id: drone.id }, data: ({ currentStationId: String(homeId) } as any) });
            } else {
              // Arrived to customer -> complete delivery and giảm tồn kho theo order items
              const completed = await this.db.$transaction(async (tx) => {
                const upd = await tx.delivery.update({ where: { id: d.id }, data: { status: DeliveryStatus.COMPLETED, completedAt: now } });
                // Decrement inventory for all items in the order (idempotent by single completion transition)
                const items = await tx.orderItem.findMany({ where: { orderId: d.orderId }, select: { menuItemId: true, qty: true } });
                for (const it of items) {
                  const mi = await (tx as any).menuItem.findUnique({ where: { id: it.menuItemId }, select: { stock: true } });
                  const current = (mi as any)?.stock;
                  if (typeof current === 'number') {
                    const next = Math.max(0, current - it.qty);
                    await (tx as any).menuItem.update({ where: { id: it.menuItemId }, data: { stock: next } });
                  }
                }
                return upd;
              });
              // Plan return to nearest station
              const stations = await this.db.restaurant.findMany({ select: { id: true, lat: true, lng: true } });
              const nearest = stations.reduce((best, s) => {
                const dist = haversineKm(targetLat, targetLng, Number(s.lat), Number(s.lng));
                if (!best || dist < best.dist) return { id: s.id, lat: Number(s.lat), lng: Number(s.lng), dist };
                return best;
              }, null as null | { id: string; lat: number; lng: number; dist: number });
              if (drone.status !== DroneStatus.CHARGING) {
                await this.db.drone.update({ where: { id: drone.id }, data: { status: 'BUSY' as any } });
              }
              if (nearest) this.returning.set(drone.id, { targetLat: nearest.lat, targetLng: nearest.lng, stationId: nearest.id });

              try {
                ioInstance?.to(`order:${completed.orderId}`).emit('order-update', {
                  orderId: completed.orderId,
                  deliveryId: completed.id,
                  status: completed.status,
                  completedAt: completed.completedAt,
                  drone: { lat: targetLat, lng: targetLng },
                });
                ioInstance?.to('admin:drones').emit('delivery-update', {
                  deliveryId: completed.id,
                  orderId: completed.orderId,
                  status: completed.status,
                  completedAt: completed.completedAt,
                });
                // thông báo dashboard để cập nhật KPI/doanh thu và tồn kho
                ioInstance?.to('admin:dashboard').emit('dashboard-update', {
                  type: 'delivery-completed',
                  deliveryId: completed.id,
                  orderId: completed.orderId,
                  completedAt: completed.completedAt,
                });
              } catch {}
            }
          }
        }

        // 3) Handle returning drones
        for (const [droneId, ret] of Array.from(this.returning.entries())) {
          const drone = await this.db.drone.findUnique({ where: { id: droneId } });
          if (!drone) { this.returning.delete(droneId); continue; }
          const curLat = Number((drone as any).currentLat ?? 0);
          const curLng = Number((drone as any).currentLng ?? 0);
          const remainingKm = haversineKm(curLat, curLng, ret.targetLat, ret.targetLng);
          const speedKmPerSec = 0.1;
          const stepKm = speedKmPerSec * (intervalMs / 1000);
          const arrived = remainingKm <= stepKm;
          let nextLat = ret.targetLat;
          let nextLng = ret.targetLng;
          if (!arrived && remainingKm > 0) {
            const t = stepKm / remainingKm;
            nextLat = curLat + (ret.targetLat - curLat) * t;
            nextLng = curLng + (ret.targetLng - curLng) * t;
          }
          // Chính xác hoá: chỉ trừ đúng quãng đường thực sự bay trong tick này
          const movedKm = arrived ? Math.max(0, remainingKm) : Math.max(0, stepKm);
          const drainPct = Math.min(drone.batteryPercent, movedKm * 2);
          const newBattery = Math.max(0, Math.min(100, Math.round((drone.batteryPercent - drainPct) * 100) / 100));
          await this.db.drone.update({ where: { id: drone.id }, data: { currentLat: nextLat, currentLng: nextLng, batteryPercent: newBattery } as any });
          if (arrived) {
            this.returning.delete(droneId);
            this.charging.add(droneId);
            await this.db.drone.update({ where: { id: drone.id }, data: ({ status: 'CHARGING' as any, currentStationId: ret.stationId ?? null } as any) });
          }
        }

        // 4) Charging drones
        for (const droneId of Array.from(this.charging.values())) {
          const drone = await this.db.drone.findUnique({ where: { id: droneId } });
          if (!drone) { this.charging.delete(droneId); continue; }
          const newBattery = Math.min(100, drone.batteryPercent + 1);
          await this.db.drone.update({ where: { id: drone.id }, data: { batteryPercent: newBattery } });
          if (newBattery >= 100) {
            this.charging.delete(droneId);
            await this.db.drone.update({ where: { id: drone.id }, data: { status: 'AVAILABLE' as any } });
          }
        }
      } catch (e) {
        // swallow errors to avoid breaking the timer
        // optionally log: console.error('DeliveryWorker error', e);
      }
    }, intervalMs);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  // Public API to request a drone to return to a specific station (gradual movement)
  enqueueReturn(droneId: string, targetLat: number, targetLng: number, stationId?: string) {
    this.returning.set(droneId, { targetLat, targetLng, stationId });
  }
}

// Export a singleton worker instance to allow enqueuing returns from API handlers
export const deliveryWorker = new DeliveryWorker();
