import express from 'express';
import { z } from 'zod';
import { auth } from './middlewares';
import { DroneService } from '../services/droneService';
import { prisma } from '../repositories/db';
import { deliveryWorker } from '../services/deliveryWorker';

const router = express.Router();
const service = new DroneService();

router.get('/', auth(['ADMIN', 'RESTAURANT']), async (req, res, next) => {
  // ADMIN: xem tất cả
  // RESTAURANT: chỉ xem drone thuộc/đang ở nhà hàng của mình
  try {
    const me = (req as any).user as { role?: 'ADMIN' | 'RESTAURANT'; workRestaurantId?: string };
    if (me.role === 'RESTAURANT') {
      const rid = me.workRestaurantId;
      if (!rid) return res.status(403).json({ message: 'Forbidden' });
      const items = await prisma.drone.findMany({
        where: { OR: [{ homeStationId: rid }, { currentStationId: rid }] },
        include: { homeStation: { select: { id: true, name: true } }, currentStation: { select: { id: true, name: true } } },
      });
      return res.json(items);
    }
    const items = await service.list();
    res.json(items);
  } catch (e) {
    next(e);
  }
});

// Tổng quan khả dụng drone cho UI khách (public)
router.get('/availability', async (_req, res, next) => {
  try {
    const a = await service.getAvailability();
    res.json(a);
  } catch (e) {
    next(e);
  }
});

router.post('/', auth(['ADMIN']), async (req, res, next) => {
  // Tạo drone mới (ADMIN).
  // Lưu ý cho UI: "Thuộc nhà hàng" (homeStationId) và "Đang ở nhà hàng" (currentStationId) là combobox chọn từ danh sách chi nhánh (GET /restaurants).
  // Backend chấp nhận homeStationId/currentStationId dưới dạng id, và nếu không truyền toạ độ hiện tại thì sẽ tự đặt theo trạm được chọn.
  try {
    const schema = z.object({
      code: z.string().min(2),
      capacityKg: z.number().positive(),
      maxRangeKm: z.number().positive(),
      batteryPercent: z.number().min(0).max(100),
      homeStationId: z.string().optional(),
      currentStationId: z.string().optional(),
      priority: z.number().int().min(1).max(100).optional(),
      currentLat: z.number().optional(),
      currentLng: z.number().optional(),
    });
    const input = schema.parse(req.body);
    const item = await service.create(input);
    res.status(201).json(item);
  } catch (e) {
    next(e);
  }
});

router.patch('/:id', auth(['ADMIN']), async (req, res, next) => {
  // Cập nhật thuộc tính drone (ADMIN)
  try {
    const schema = z.object({
      capacityKg: z.number().positive().optional(),
      maxRangeKm: z.number().positive().optional(),
      batteryPercent: z.number().min(0).max(100).optional(),
      status: z.enum(['AVAILABLE', 'BUSY', 'CHARGING', 'MAINTENANCE', 'OFFLINE']).optional(),
      homeStationId: z.string().nullable().optional(),
      currentStationId: z.string().nullable().optional(),
      priority: z.number().int().min(1).max(100).optional(),
      currentLat: z.number().optional(),
      currentLng: z.number().optional(),
    });
    const data = schema.parse(req.body);
    const item = await service.update(req.params.id, data as any);
    res.json(item);
  } catch (e) {
    next(e);
  }
});

router.delete('/:id', auth(['ADMIN']), async (req, res, next) => {
  // Xoá drone (ADMIN) nếu đủ điều kiện
  try {
    const result = await service.remove(req.params.id);
    if (!result.ok) {
      const status = result.reason === 'NOT_FOUND' ? 404 : 409;
      const message = result.reason === 'BUSY' ? 'Drone đang bận, không thể xoá' : (result.reason === 'HAS_DELIVERY' ? 'Drone có liên kết giao hàng' : 'Không tìm thấy drone');
      return res.status(status).json({ message });
    }
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

router.post('/assign', auth(['ADMIN']), async (req, res, next) => {
  // Gán drone cho đơn hàng dựa trên nhu cầu tải/trọng lượng/tầm với (OPERATOR/ADMIN)
  try {
    const schema = z.object({
      orderId: z.string(),
      requiredRangeKm: z.number().positive(),
      requiredWeightKg: z.number().positive(),
    });
    const params = schema.parse(req.body);
    const delivery = await service.assignDroneToOrder(params);
    if (!delivery) return res.status(409).json({ message: 'No available drone' });
    res.status(201).json(delivery);
  } catch (e) {
    next(e);
  }
});

export default router;

// Admin: Trả drone về nhà hàng sở hữu (cân bằng phân bổ)
router.post('/:id/return-home', auth(['ADMIN']), async (req, res, next) => {
  // Trả drone về nhà hàng sở hữu (rebalance). Worker sẽ di chuyển drone và tiêu hao pin mô phỏng.
  try {
    const id = req.params.id;
    const d = await prisma.drone.findUnique({ where: { id }, include: { homeStation: true } });
    if (!d) return res.status(404).json({ message: 'Drone not found' });
    if (d.status !== 'AVAILABLE') {
      return res.status(400).json({ message: 'Drone phải ở trạng thái AVAILABLE để trả về (đang rảnh).' });
    }
    if (!d.homeStation) {
      return res.status(400).json({ message: 'Drone không có nhà hàng sở hữu' });
    }
    // Enqueue a gradual return - worker sẽ di chuyển drone về nhà hàng và tiêu hao pin theo quy tắc
    await prisma.drone.update({ where: { id: d.id }, data: ({ status: 'BUSY' as any } as any) });
    deliveryWorker.enqueueReturn(d.id, Number(d.homeStation.lat), Number(d.homeStation.lng), d.homeStationId ?? undefined);
    res.json({ message: 'Yêu cầu trả drone về nhà hàng đã được gửi. Drone sẽ di chuyển và tiêu hao pin.' });
  } catch (e) { next(e); }
});

// Restaurant: Gọi drone về chi nhánh của tôi
router.post('/:id/recall-to-me', auth(['RESTAURANT']), async (req, res, next) => {
  try {
    const me = (req as any).user as { role?: 'RESTAURANT'; workRestaurantId?: string };
    const rid = me.workRestaurantId;
    if (!rid) return res.status(403).json({ message: 'Forbidden' });
    const id = req.params.id;
    const d = await prisma.drone.findUnique({ where: { id }, include: { currentStation: true } });
    if (!d) return res.status(404).json({ message: 'Drone not found' });
    // Chỉ cho phép recall khi drone đang rảnh
    if (d.status !== 'AVAILABLE') {
      return res.status(400).json({ message: 'Drone phải ở trạng thái AVAILABLE để gọi về.' });
    }
    // Lấy toạ độ chi nhánh của tôi
    const station = await prisma.restaurant.findUnique({ where: { id: rid }, select: { id: true, lat: true, lng: true } });
    if (!station) return res.status(404).json({ message: 'Restaurant not found' });
    // Đánh dấu BUSY và enqueue di chuyển về chi nhánh của tôi
    await prisma.drone.update({ where: { id: d.id }, data: ({ status: 'BUSY' as any } as any) });
    deliveryWorker.enqueueReturn(d.id, Number(station.lat), Number(station.lng), station.id);
    res.json({ message: 'Đã gửi yêu cầu gọi drone về chi nhánh của bạn.' });
  } catch (e) { next(e); }
});
