import express from 'express';
import { z } from 'zod';
import { auth } from './middlewares';
import { DeliveryRepository } from '../repositories/deliveryRepository';
import { DroneService } from '../services/droneService';

const router = express.Router();
const repo = new DeliveryRepository();
const droneSvc = new DroneService();

// Danh sách deliveries (chỉ ADMIN/OPERATOR), có thể lọc theo orderId
router.get('/', auth(['ADMIN', 'OPERATOR']), async (req, res, next) => {
  try {
    const orderId = req.query.orderId as string | undefined;
    const items = await repo.list({ orderId });
    res.json(items);
  } catch (e) {
    next(e);
  }
});

router.get('/:id', auth(['ADMIN', 'OPERATOR', 'CUSTOMER']), async (req, res, next) => {
  // Lấy chi tiết 1 delivery cụ thể. CUSTOMER chỉ có thể truy cập nếu thuộc đơn của mình
  try {
    const item = await repo.getById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Not found' });
    res.json(item);
  } catch (e) {
    next(e);
  }
});

router.post('/:id/status', auth(['OPERATOR', 'ADMIN']), async (req, res, next) => {
  // Cập nhật trạng thái delivery thủ công (chỉ OPERATOR/ADMIN). Chủ yếu dùng để điều khiển trong demo/admin.
  try {
    const schema = z.object({ status: z.enum(['QUEUED', 'ASSIGNED', 'EN_ROUTE', 'ARRIVED', 'COMPLETED', 'FAILED']) });
    const { status } = schema.parse(req.body);
    const item = await repo.update(req.params.id, { status });
    res.json(item);
  } catch (e) {
    next(e);
  }
});

// Mô phỏng hoàn tất giao hàng: đặt status = COMPLETED và set completedAt (demo/testing)
router.post('/:id/simulate-complete', auth(['OPERATOR', 'ADMIN']), async (req, res, next) => {
  try {
    const current = await repo.getById(req.params.id);
    if (!current) return res.status(404).json({ message: 'Not found' });
    const updated = await repo.update(req.params.id, { status: 'COMPLETED' as any, completedAt: new Date() });
    res.json(updated);
  } catch (e) {
    next(e);
  }
});

// Admin dispatch: chọn drone và bắt đầu hành trình (set ASSIGNED; worker sẽ chuyển EN_ROUTE và cập nhật tiến độ)
router.post('/:id/dispatch', auth(['OPERATOR', 'ADMIN']), async (req, res, next) => {
  try {
    const result = await droneSvc.dispatchDelivery(req.params.id);
    res.json(result.delivery);
  } catch (e) { next(e); }
});

export default router;
