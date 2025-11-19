import express from 'express';
import dotenv from 'dotenv';
import morgan from 'morgan';
import cors from 'cors';
import { createServer } from 'http';
import path from 'path';
import fs from 'fs';

import { router as healthRouter } from './api/health';
import { router as metricsRouter } from './api/metrics';
import { router as restaurantsRouter } from './api/restaurants';
import { router as authRouter } from './api/auth';
import { router as cartRouter } from './api/cart';
import { router as checkoutRouter } from './api/checkout';
import { router as paymentRouter } from './api/payment';
import ordersRouter from './api/orders';
import droneRouter from './api/drone';
import deliveryRouter from './api/delivery';
import trackingRouter from './api/tracking';
import menuAdminRouter from './api/menuAdmin';
import { router as usersAdminRouter } from './api/usersAdmin';
import { router as kitchenAdminRouter } from './api/kitchenAdmin';
import { deliveryWorker } from './services/deliveryWorker';
import { rateLimit } from './api/middlewares';
import { initWebSocket } from './websocket/server';

dotenv.config();

// Log uncaught/unhandled errors để chẩn đoán quá trình thoát bất thường
process.on('uncaughtException', (err) => {
  console.error('[fatal] uncaughtException:', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[fatal] unhandledRejection:', reason);
});

const app = express();
// CORS nhiều máy: cấu hình danh sách origin qua env CORS_ORIGINS=origin1,origin2
const allowedOrigins = (process.env.CORS_ORIGINS || '*')
  .split(',')
  .map(o => o.trim())
  .filter(o => o.length > 0);
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());
app.use(morgan('dev'));
// Áp dụng rate limit cơ bản cho toàn bộ API (có thể tinh chỉnh window & max qua env)
app.use(rateLimit());

// Định tuyến API chính của hệ thống
app.use('/api/health', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/metrics', metricsRouter);
app.use('/api/restaurants', restaurantsRouter);
app.use('/api/cart', cartRouter);
app.use('/api/checkout', checkoutRouter);
app.use('/api/payment', paymentRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/drone', droneRouter);
app.use('/api/delivery', deliveryRouter);
app.use('/api/tracking', trackingRouter);
app.use('/api/admin/menu', menuAdminRouter);
app.use('/api/admin/users', usersAdminRouter);
app.use('/api/admin/kitchen', kitchenAdminRouter);

// Phục vụ frontend (demo một cổng): thử các vị trí thường gặp của bản build
(() => {
  const candidates = [
    // chạy từ thư mục gốc repo
    path.resolve(process.cwd(), 'frontend', 'dist'),
    // ứng dụng fedrone (từ gốc repo)
    path.resolve(process.cwd(), 'fedrone', 'fedrone', 'dist'),
    // chạy từ thư mục backend
    path.resolve(process.cwd(), '..', 'frontend', 'dist'),
    // ứng dụng fedrone (từ thư mục backend)
    path.resolve(process.cwd(), '..', 'fedrone', 'fedrone', 'dist'),
    // dự phòng: thư mục public trong backend
    path.resolve(process.cwd(), 'public')
  ];
  const staticDir = candidates.find(p => fs.existsSync(p));
  if (staticDir) {
    app.use(express.static(staticDir));
    // SPA fallback: chỉ áp dụng cho route không phải /api
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) return next();
      res.sendFile(path.join(staticDir, 'index.html'));
    });
    console.log(`[static] Phục vụ frontend từ: ${staticDir}`);
  } else {
    console.log('[static] Không tìm thấy dist/public của frontend, bỏ qua bước static serve');
  }
})();

// Trình xử lý lỗi chuẩn trả về JSON { message }
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  // Xác định status và message từ đối tượng lỗi
  type ErrWithStatus = { status?: number };
  const status = (typeof err === 'object' && err && 'status' in err && typeof (err as ErrWithStatus).status === 'number')
    ? (err as ErrWithStatus).status as number
    : 500;
  const message = (err instanceof Error) ? err.message : 'Internal Server Error';
  res.status(status).json({ message });
});

const port = process.env.PORT || 3000;
const host = process.env.HOST || '0.0.0.0';
const httpServer = createServer(app);
initWebSocket(httpServer);

// Dummy keep-alive interval đề phòng môi trường thực thi tự đóng khi không phát hiện handle
setInterval(() => {}, 60_000);
// Heartbeat để xác nhận process còn sống (debug môi trường tự kill) mỗi 10s
setInterval(() => {
  console.log('[heartbeat] alive', new Date().toISOString());
}, 10_000);

httpServer.listen(Number(port), host, () => {
  console.log(`HTTP + WebSocket server lắng nghe tại http://${host === '0.0.0.0' ? 'YOUR_IP' : host}:${port}`);
  console.log(`CORS origins: ${allowedOrigins.join(', ')}`);
  const disableWorker = process.env.DISABLE_WORKER === '1';
  if (disableWorker) {
    console.log('[worker] DeliveryWorker bị vô hiệu hoá (DISABLE_WORKER=1).');
  } else {
    try {
      deliveryWorker.start(1000);
      console.log('[worker] DeliveryWorker started.');
    } catch (e) {
      console.error('[worker] Lỗi khởi động DeliveryWorker', e);
    }
  }
});
