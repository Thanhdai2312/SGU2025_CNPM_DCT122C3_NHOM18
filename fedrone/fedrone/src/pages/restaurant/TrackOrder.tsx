import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { trackingApi, type TrackingResponse } from '../../api/tracking';
import { MapContainer, TileLayer, Marker, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export default function TrackOrderRestaurant() {
  const { orderId } = useParams();
  const [data, setData] = useState<TrackingResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [halfway, setHalfway] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) return;
    (async () => {
      try {
        const token = localStorage.getItem('adminToken') || undefined; // dùng token quản trị/nhà hàng
        const t = await trackingApi.get(orderId, token);
        setData(t);
        if (t.restaurant && t.destination && t.tracking?.drone) {
          const total = haversineKm(t.restaurant.lat, t.restaurant.lng, t.destination.lat, t.destination.lng);
          const remaining = haversineKm(t.tracking.drone.lat, t.tracking.drone.lng, t.destination.lat, t.destination.lng);
          setHalfway(remaining <= total / 2);
          if (remaining <= total / 2) {
            setToast('Món ăn đã đi được nửa quãng đường.');
            setTimeout(() => setToast(null), 5000);
          }
        }
      } catch (e: any) {
        setError(e?.message || 'Không tải được theo dõi món ăn');
      }
    })();
  }, [orderId]);

  return (
    <div className="container mx-auto px-6 py-8 relative">
      <h2 className="text-2xl font-bold mb-4">Theo dõi món ăn</h2>
      {error && <div className="text-red-600 mb-4">{error}</div>}
      {!error && !data && <div>Đang tải…</div>}
      {data && data.restaurant && data.destination && (
        <div className="bg-white rounded-xl shadow p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-gray-700">Mã đơn: <span className="font-mono">{data.orderId}</span></div>
            {halfway && (
              <div className="px-3 py-1 bg-amber-100 text-amber-800 rounded text-sm">Món ăn đã đi được nửa quãng đường.</div>
            )}
          </div>
          <div className="h-72 w-full rounded overflow-hidden mb-3">
            <MapContainer center={[data.destination.lat, data.destination.lng]} zoom={13} style={{ height: '100%', width: '100%' }}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />
              <Marker position={[data.restaurant.lat, data.restaurant.lng]} />
              <Marker position={[data.destination.lat, data.destination.lng]} />
              {data.tracking.drone && (
                <Marker position={[data.tracking.drone.lat, data.tracking.drone.lng]} />
              )}
              <Polyline positions={[[data.restaurant.lat, data.restaurant.lng], [data.destination.lat, data.destination.lng]]} color="#0ea5e9" />
            </MapContainer>
          </div>
          <RemainingInfo t={data} />
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

function RemainingInfo({ t }: { t: TrackingResponse }) {
  if (!t.restaurant || !t.destination) return null;
  const total = haversineKm(t.restaurant.lat, t.restaurant.lng, t.destination.lat, t.destination.lng);
  const remaining = t.tracking.drone ? haversineKm(t.tracking.drone.lat, t.tracking.drone.lng, t.destination.lat, t.destination.lng) : undefined;
  return (
    <div className="text-sm text-gray-700">
      {typeof remaining === 'number' ? (
        <div>Khoảng cách còn lại: <span className="font-semibold">{remaining.toFixed(2)} km</span> (tổng {total.toFixed(2)} km)</div>
      ) : (
        <div>Chưa có vị trí drone.</div>
      )}
    </div>
  );
}
