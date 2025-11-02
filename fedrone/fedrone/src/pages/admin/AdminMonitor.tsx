import { useEffect, useMemo, useState } from 'react';
import { io } from 'socket.io-client';
import { API_BASE } from '../../api/client';

type DeliveryEvent = {
  deliveryId: string;
  orderId: string;
  status: string;
  eta?: string;
  completedAt?: string;
  at: number;
  phase?: string;
};

export default function AdminMonitor() {
  const [events, setEvents] = useState<DeliveryEvent[]>([]);
  const adminToken = useMemo(() => {
    try { return localStorage.getItem('adminToken') || undefined; } catch { return undefined; }
  }, []);

  useEffect(() => {
    if (!adminToken) return;
    const socket = io(API_BASE, {
      transports: ['websocket'],
      extraHeaders: { Authorization: `Bearer ${adminToken}` },
      auth: { token: adminToken },
    });
    socket.on('connect', () => {
      socket.emit('track-all-drones');
    });
    socket.on('delivery-update', (payload: any) => {
      setEvents((prev) => [{ ...payload, at: Date.now() }, ...prev].slice(0, 100));
    });
    return () => { socket.disconnect(); };
  }, [adminToken]);

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Theo dõi thời gian thực</h2>
      <div className="bg-white rounded-xl shadow p-4">
        {events.length === 0 ? (
          <div className="text-gray-600">Chưa có sự kiện realtime nào.</div>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left px-4 py-2">Thời điểm</th>
                  <th className="text-left px-4 py-2">Delivery</th>
                  <th className="text-left px-4 py-2">Order</th>
                  <th className="text-left px-4 py-2">Trạng thái</th>
                  <th className="text-left px-4 py-2">Giai đoạn</th>
                  <th className="text-left px-4 py-2">ETA</th>
                  <th className="text-left px-4 py-2">Hoàn tất</th>
                </tr>
              </thead>
              <tbody>
                {events.map((e, idx) => (
                  <tr key={`${e.deliveryId}-${idx}`} className="border-t">
                    <td className="px-4 py-2">{new Date(e.at).toLocaleTimeString('vi-VN')}</td>
                    <td className="px-4 py-2 font-mono">{e.deliveryId}</td>
                    <td className="px-4 py-2 font-mono">{e.orderId}</td>
                    <td className="px-4 py-2"><span className="px-2 py-0.5 rounded text-xs bg-gray-100">{e.status}</span></td>
                    <td className="px-4 py-2 text-xs text-gray-600">{e.phase || '—'}</td>
                    <td className="px-4 py-2">{e.eta ? new Date(e.eta).toLocaleString('vi-VN') : '—'}</td>
                    <td className="px-4 py-2">{e.completedAt ? new Date(e.completedAt).toLocaleString('vi-VN') : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
