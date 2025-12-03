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
  const [toast, setToast] = useState<string | null>(null);
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
      // Timed toast when half-way reached for the current selected order
      if (tracking && tracking.restaurant && tracking.destination) {
        const total = haversineKm(tracking.restaurant.lat, tracking.restaurant.lng, tracking.destination.lat, tracking.destination.lng);
        const drone = payload.drone || tracking.tracking.drone;
        if (drone && total > 0) {
          const remaining = haversineKm(drone.lat, drone.lng, tracking.destination.lat, tracking.destination.lng);
          if (remaining <= total / 2 && ['EN_ROUTE','DELIVERING','DISPATCHED','ASSIGNED'].includes(String(payload.status || tracking.tracking.status))) {
            setToast('Món ăn đã đi được nửa quãng đường.');
            setTimeout(() => setToast(null), 5000);
          }
        }
      }
      // Live update tracking map with latest payload (drone, status, eta)
      setTracking((prev) => {
        if (!prev || payload?.orderId !== prev.orderId) return prev;
        const next = {
          ...prev,
          deliveryId: payload.deliveryId ?? prev.deliveryId,
          tracking: {
            ...prev.tracking,
            status: payload.status || prev.tracking.status,
            eta: payload.eta || prev.tracking.eta,
            completedAt: payload.completedAt || prev.tracking.completedAt,
            drone: payload.drone ? { lat: payload.drone.lat, lng: payload.drone.lng } : prev.tracking.drone,
          }
        } as TrackingResponse;
        if (next.restaurant && next.destination && next.tracking.drone) {
          const total = haversineKm(next.restaurant.lat, next.restaurant.lng, next.destination.lat, next.destination.lng);
          const remaining = haversineKm(next.tracking.drone.lat, next.tracking.drone.lng, next.destination.lat, next.destination.lng);
          setHalfway(remaining <= total / 2);
        }
        return next;
      });
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
    <div className="relative">
      <h2 className="text-xl font-semibold mb-4">Theo dõi thời gian thực</h2>
      {/* Bảng sự kiện realtime tạm ẩn theo yêu cầu admin */}
      {/* <div className="bg-white rounded-xl shadow p-4"> ... </div> */}
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
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 bg-amber-100 text-amber-800 border border-amber-300 rounded shadow">{toast}</div>
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
