import { Router, Request, Response } from 'express';
import { paymentService } from '../services/paymentService';

export const router = Router();

// Mock tạo chữ ký để bạn có thể thử gọi webhook thủ công
router.post('/mock/charge', async (req: Request, res: Response) => {
  const { orderId, outcome } = req.body as { orderId: string; outcome: 'PAID' | 'FAILED' };
  const body = { orderId, status: outcome };
  const sig = paymentService.signPayload(body);
  res.json({ body, signature: sig.signature });
});

// Webhook thanh toán (idempotent + HMAC signature)
// - Kiểm tra header: idempotency-key và x-signature
// - Xác minh chữ ký HMAC để tránh giả mạo
// - Ghi nhận trạng thái thanh toán (PAID/FAILED) theo cơ chế idempotent
// Lưu ý: Không tự tạo Delivery ở đây; Delivery sẽ được mở sau khi bếp hoàn tất.
router.post('/webhook', async (req: Request, res: Response) => {
  const idempotencyKey = (req.headers['idempotency-key'] as string) || '';
  const signature = (req.headers['x-signature'] as string) || '';
  if (!idempotencyKey || !signature) return res.status(400).json({ message: 'Missing headers' });

  const raw = Buffer.from(JSON.stringify(req.body));
  const expected = paymentService.signPayload(req.body).signature;
  if (signature !== expected) return res.status(401).json({ message: 'Invalid signature' });

  const { orderId, status } = req.body as { orderId: string; status: 'PAID' | 'FAILED' };
  const result = await paymentService.handleWebhook(idempotencyKey, orderId, status);
  res.json(result);
});
