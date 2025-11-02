import { Server as HttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import type { Socket } from 'socket.io';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

export function initWebSocket(httpServer: HttpServer): SocketIOServer {
  const io = new SocketIOServer(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
  });

  io.use((socket: Socket, next: (err?: Error) => void) => {
    try {
      const header = (socket.handshake.headers['authorization'] as string) || '';
      const token = (socket.handshake.auth as any)?.token || (header.startsWith('Bearer ') ? header.slice(7) : undefined);
      if (!token) return next(new Error('No token'));
      const decoded = jwt.verify(token, JWT_SECRET) as { sub: string; role?: 'CUSTOMER' | 'ADMIN' | 'OPERATOR' };
      (socket.data as any).userId = decoded.sub;
      (socket.data as any).role = decoded.role;
      next();
    } catch (e) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    // Client có thể join room order để nhận cập nhật real-time
    socket.on('track-order', (orderId: string) => {
      if (!orderId) return;
      socket.join(`order:${orderId}`);
    });

    // Admin có thể xem tất cả drones
    socket.on('track-all-drones', () => {
      if ((socket.data as any).role !== 'ADMIN') return;
      socket.join('admin:drones');
    });

    // Admin dashboard tổng hợp (doanh thu, đơn, tồn kho)
    socket.on('track-dashboard', () => {
      if ((socket.data as any).role !== 'ADMIN') return;
      socket.join('admin:dashboard');
    });
  });

  setIOInstance(io);
  return io;
}

export let ioInstance: SocketIOServer | null = null;
export function setIOInstance(io: SocketIOServer) {
  ioInstance = io;
}
