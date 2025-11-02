import { PrismaClient, DeliveryStatus } from '@prisma/client';
import { prisma } from './db';

// Repository Delivery: tạo/cập nhật/lấy thông tin giao hàng và route liên quan
export class DeliveryRepository {
  constructor(private readonly db: PrismaClient = prisma) {}

  // Tạo bản ghi Delivery từ tham số thân thiện etaMinutes -> eta Date
  async create(data: {
    orderId: string;
    droneId: string;
    status?: DeliveryStatus;
    etaMinutes?: number | null; // helper param, will be converted to eta Date
    startedAt?: Date | null;
    completedAt?: Date | null;
  }) {
    const now = new Date();
    const eta = typeof data.etaMinutes === 'number' && data.etaMinutes > 0
      ? new Date(now.getTime() + data.etaMinutes * 60000)
      : null;
    return this.db.delivery.create({
      data: {
        orderId: data.orderId,
        droneId: data.droneId,
        status: data.status ?? DeliveryStatus.QUEUED,
        eta,
        startedAt: data.startedAt ?? null,
        completedAt: data.completedAt ?? null,
      },
    });
  }

  // Cập nhật thuộc tính cơ bản (status, etaMinutes -> backend có thể tự chuyển sang eta nếu cần)
  async update(id: string, data: Partial<{
    status: DeliveryStatus;
    etaMinutes: number | null;
    startedAt: Date | null;
    completedAt: Date | null;
  }>) {
    return this.db.delivery.update({ where: { id }, data });
  }

  // Lấy delivery theo id
  async getById(id: string) {
    return this.db.delivery.findUnique({ where: { id } });
  }

  // Liệt kê delivery theo tiêu chí cơ bản (ví dụ theo orderId)
  async list(filter?: { orderId?: string }) {
    return this.db.delivery.findMany({
      where: {
        orderId: filter?.orderId,
      },
    });
  }
}
