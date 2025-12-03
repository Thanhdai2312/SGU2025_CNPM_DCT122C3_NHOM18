import { useEffect, useMemo, useState } from 'react';
import { io } from 'socket.io-client';
import { API_BASE } from '../../api/client';
import { MapContainer, TileLayer, Marker, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { trackingApi, type TrackingResponse } from '../../api/tracking';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

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
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [tracking, setTracking] = useState<TrackingResponse | null>(null);
  const [halfway, setHalfway] = useState(false);
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
      // Auto-select the latest order for map view
      if (payload?.orderId) {
        setSelectedOrderId(payload.orderId);
      }
    });
    return () => { socket.disconnect(); };
  }, [adminToken]);

  useEffect(() => {
    (async () => {
      if (!selectedOrderId || !adminToken) return;
      try {
        const t = await trackingApi.get(selectedOrderId, adminToken);
        setTracking(t);
        if (t.restaurant && t.destination && t.tracking?.drone) {
          const total = haversineKm(t.restaurant.lat, t.restaurant.lng, t.destination.lat, t.destination.lng);
          const remaining = haversineKm(t.tracking.drone.lat, t.tracking.drone.lng, t.destination.lat, t.destination.lng);
          setHalfway(remaining <= total / 2);
        } else {
          setHalfway(false);
        }
      } catch { /* ignore */ }
    })();
  }, [selectedOrderId, adminToken]);

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
                  <tr key={`${e.deliveryId}-${idx}`} className="border-t hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedOrderId(e.orderId)}>
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
      {/* Map + remaining distance for selected order */}
      {tracking && tracking.restaurant && tracking.destination && (
        <div className="mt-6 bg-white rounded-xl shadow p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="font-semibold">Đơn đang xem: <span className="font-mono">{tracking.orderId}</span></div>
            {halfway && (
              <div className="px-3 py-1 bg-amber-100 text-amber-800 rounded text-sm">Món ăn đã đi được nửa quãng đường.</div>
            )}
          </div>
          <div className="h-72 w-full rounded overflow-hidden">
            <MapContainer center={[tracking.destination.lat, tracking.destination.lng]} zoom={13} style={{ height: '100%', width: '100%' }}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />
              <Marker position={[tracking.restaurant.lat, tracking.restaurant.lng]} />
              <Marker position={[tracking.destination.lat, tracking.destination.lng]} />
              {tracking.tracking.drone && (
                <Marker position={[tracking.tracking.drone.lat, tracking.tracking.drone.lng]} />
              )}
              <Polyline positions={[[tracking.restaurant.lat, tracking.restaurant.lng], [tracking.destination.lat, tracking.destination.lng]]} color="#0ea5e9" />
            </MapContainer>
          </div>
          <RemainingAdminDistanceInfo t={tracking} />
        </div>
      )}
    </div>
  );
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}
function toRad(x: number) { return x * Math.PI / 180; }

function RemainingAdminDistanceInfo({ t }: { t: TrackingResponse }) {
  if (!t.restaurant || !t.destination) return null;
  const total = haversineKm(t.restaurant.lat, t.restaurant.lng, t.destination.lat, t.destination.lng);
  const remaining = t.tracking.drone ? haversineKm(t.tracking.drone.lat, t.tracking.drone.lng, t.destination.lat, t.destination.lng) : undefined;
  return (
    <div className="mt-3 text-sm text-gray-700">
      {typeof remaining === 'number' ? (
        <div>Khoảng cách còn lại: <span className="font-semibold">{remaining.toFixed(2)} km</span> (tổng {total.toFixed(2)} km)</div>
      ) : (
        <div>Chưa có vị trí drone.</div>
      )}
    </div>
  );
}
