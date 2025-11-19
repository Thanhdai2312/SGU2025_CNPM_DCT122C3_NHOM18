import { Router } from 'express';
import { prisma } from '../repositories/db';

// Endpoint metrics đơn giản: trả về một số số liệu đếm để kiểm tra nhanh tình trạng hệ thống.
// Nếu đặt METRICS_TOKEN trong env, yêu cầu header x-metrics-token phải khớp.
export const router = Router();

router.get('/', async (req, res) => {
  const requiredToken = process.env.METRICS_TOKEN;
  if (requiredToken) {
    const provided = req.headers['x-metrics-token'];
    if (provided !== requiredToken) {
      return res.status(403).json({ message: 'Forbidden' });
    }
  }
  try {
    const [ordersTotal, deliveriesTotal, deliveriesActive, dronesAvailable, dronesCharging, dronesBusy] = await Promise.all([
      prisma.order.count(),
      prisma.delivery.count(),
      prisma.delivery.count({ where: { status: { in: ['QUEUED', 'ASSIGNED', 'EN_ROUTE'] } } }),
      prisma.drone.count({ where: { status: 'AVAILABLE' as any } }),
      prisma.drone.count({ where: { status: 'CHARGING' as any } }),
      prisma.drone.count({ where: { status: 'BUSY' as any } }),
    ]);
    res.json({
      timestamp: new Date().toISOString(),
      ordersTotal,
      deliveriesTotal,
      deliveriesActive,
      drones: {
        available: dronesAvailable,
        charging: dronesCharging,
        busy: dronesBusy
      }
    });
  } catch (e) {
    res.status(500).json({ message: 'Metrics error' });
  }
});
