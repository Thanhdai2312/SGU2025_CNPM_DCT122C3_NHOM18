import { PrismaClient, DroneStatus } from '@prisma/client';
import { prisma } from './db';

// Repository Drone: CRUD drone và cập nhật vị trí/trạng thái
export class DroneRepository {
  constructor(private readonly db: PrismaClient = prisma) {}

  // Danh sách drone kèm thông tin trạm (home/current)
  async list() {
    return (this.db.drone as any).findMany({ include: { homeStation: { select: { id: true, name: true } }, currentStation: { select: { id: true, name: true } } } });
  }

  // Lấy drone theo id
  async getById(id: string) {
    return this.db.drone.findUnique({ where: { id } });
  }

  // Tạo drone mới; mặc định AVAILABLE và ưu tiên = 1 nếu không truyền
  async create(data: {
    code: string;
    capacityKg: number;
    maxRangeKm: number;
    batteryPercent: number;
    currentLat?: number;
    currentLng?: number;
    homeStationId?: string | null;
    currentStationId?: string | null;
    priority?: number;
    status?: DroneStatus;
  }) {
    return this.db.drone.create({
      data: ({
        status: DroneStatus.AVAILABLE,
        priority: data.priority ?? 1,
        currentLat: data.currentLat ?? 0,
        currentLng: data.currentLng ?? 0,
        homeStationId: data.homeStationId ?? null,
        currentStationId: (data.currentStationId ?? data.homeStationId) ?? null,
        code: data.code,
        capacityKg: data.capacityKg as any,
        maxRangeKm: data.maxRangeKm as any,
        batteryPercent: data.batteryPercent,
      } as any),
    });
  }

  // Cập nhật thuộc tính drone (pin, toạ độ, trạm, ưu tiên, ...)
  async update(id: string, data: Partial<{
    capacityKg: number;
    maxRangeKm: number;
    batteryPercent: number;
    status: DroneStatus;
    currentLat: number;
    currentLng: number;
    homeStationId: string | null;
    currentStationId: string | null;
    priority: number;
  }>) {
    return this.db.drone.update({ where: { id }, data: data as any });
  }
}
