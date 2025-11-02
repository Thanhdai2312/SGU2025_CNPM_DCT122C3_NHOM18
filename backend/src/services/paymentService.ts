import crypto from 'crypto';
import { prisma } from '../repositories/db';
import { calculateDistance } from './distance';
import { DroneService } from './droneService';
const prismaAny = prisma as any;

const WEBHOOK_SECRET = process.env.PAYMENT_WEBHOOK_SECRET || 'dev-webhook-secret';

export type MockChargeInput = { orderId: string; outcome: 'PAID' | 'FAILED' };

// Dịch vụ thanh toán (mock)
// - signPayload: ký HMAC cho payload webhook để mô phỏng cổng thanh toán
// - handleWebhook: xử lý idempotent theo idempotencyKey, cập nhật order/payment
//   Lưu ý: KHÔNG tạo Delivery tại đây; delivery chỉ tạo sau khi Bếp hoàn tất
export const paymentService = {
  // Mock tạo chữ ký cho payload gửi tới webhook
  signPayload: (body: unknown) => {
    const payload = Buffer.from(JSON.stringify(body));
    const sig = crypto.createHmac('sha256', WEBHOOK_SECRET).update(payload).digest('hex');
    return { signature: sig, raw: payload };
  },

  // Xử lý webhook: idempotent theo idempotencyKey để tránh cập nhật trùng
  handleWebhook: async (idempotencyKey: string, orderId: string, status: 'PAID' | 'FAILED') => {
  const exists = await prismaAny.webhookEvent.findUnique({ where: { idempotencyKey } });
    if (exists) return { ok: true, idempotent: true };

    await prisma.$transaction(async (tx) => {
      const txAny = tx as any;
      await txAny.webhookEvent.create({ data: { idempotencyKey, orderId } });
      if (status === 'PAID') {
        await tx.payment.update({ where: { orderId }, data: { status: 'PAID' } });
        await tx.order.update({ where: { id: orderId }, data: { paymentStatus: 'PAID', status: 'CONFIRMED' } });
      } else {
        await tx.payment.update({ where: { orderId }, data: { status: 'FAILED' } });
        await tx.order.update({ where: { id: orderId }, data: { paymentStatus: 'FAILED' } });
      }
    });

    // Trì hoãn tạo Delivery tới khi Bếp hoàn tất (kitchenDone=true)

    // Phát tín hiệu realtime cho Admin Dashboard để cập nhật KPI/doanh thu ngay khi trạng thái thanh toán thay đổi
    try {
      const { ioInstance } = await import('../websocket/server');
      ioInstance?.to('admin:dashboard').emit('dashboard-update', { type: 'payment', orderId, status });
    } catch {}

    return { ok: true };
  },
};
