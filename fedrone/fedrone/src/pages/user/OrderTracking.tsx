import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import { trackingApi, type TrackingResponse } from '../api/tracking';
import { useAuth } from '../context/AuthContext';
import { API_BASE } from '../api/client';
import { ordersApi } from '../api/orders';

// Bản đồ Leaflet
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

export default function OrderTracking() {
// Trang Theo dõi đơn hàng cho khách
// - Hiển thị thông tin đơn, địa chỉ, phí ship, tổng tiền
// - Trạng thái giao hàng và ghi chú từ Bếp được hiển thị ngay trong dòng trạng thái
// - ETA và vị trí drone giúp khách theo dõi trực quan
  const { orderId } = useParams();
  const { token } = useAuth();
  const [data, setData] = useState<TrackingResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) return;
    (async () => {
      try {
        const t = await trackingApi.get(orderId, token || undefined);
        setData(t);
        // Ghi nhớ order đang hoạt động khi chưa hoàn tất để nút trên header luôn hiển thị
        if (t.tracking.status !== 'COMPLETED') {
          try { localStorage.setItem('lastPaidOrderId', t.orderId); } catch {}
        }
      } catch (e: any) {
        setError(e.message || 'Không tải được theo dõi đơn hàng');
      }
    })();
  }, [orderId, token]);

  useEffect(() => {
    if (!orderId || !token) return;
    const socket = io(API_BASE, {
      transports: ['websocket'],
      extraHeaders: { Authorization: `Bearer ${token}` },
      auth: { token },
    });
    socket.on('connect', () => {
      socket.emit('track-order', orderId);
    });
    socket.on('order-update', (payload: any) => {
      // Cập nhật trạng thái mới nhất vào state cục bộ
      setData((prev) => prev ? {
        ...prev,
        deliveryId: payload.deliveryId ?? prev.deliveryId,
        tracking: {
          ...prev.tracking,
          status: payload.status || prev.tracking.status,
          eta: payload.eta || prev.tracking.eta,
          completedAt: payload.completedAt || prev.tracking.completedAt,
          drone: payload.drone ? { lat: payload.drone.lat, lng: payload.drone.lng } : prev.tracking.drone,
        }
      } : prev);
      if (typeof payload?.note === 'string' && payload.note) {
        setNote(payload.note);
      }
      // Nếu đã hoàn tất, xoá lastPaidOrderId để nút tắt khỏi header
      if (payload?.status === 'COMPLETED') {
        try { localStorage.removeItem('lastPaidOrderId'); } catch {}
      }
    });
    return () => { socket.disconnect(); };
  }, [orderId, token]);

 

  const onCancel = async () => {
    if (!orderId) return;
    try {
      await ordersApi.cancel(orderId);
  setData((d) => d ? { ...d, tracking: { ...d.tracking, status: 'CANCELED' } } : d);
      try { localStorage.removeItem('lastPaidOrderId'); } catch {}
    } catch (e: any) {
      const msg = e?.message || 'Không thể hủy đơn';
      setNote(msg);
    }
  };

  return (
    <div className="container mx-auto px-6 py-8">
      <h2 className="text-3xl font-bold mb-6 text-sky-700">Theo dõi đơn hàng</h2>
      {error && <div className="text-red-600 mb-4">{error}</div>}
      {!error && !data && <div>Đang tải…</div>}
      {data && (
        <div className="bg-white rounded-2xl border p-4">
          <div className="text-sm text-gray-600 mb-2">Mã đơn: <span className="font-mono">{data.orderId}</span></div>
          <div className="flex items-center justify-between gap-4">
            <div className="text-lg font-semibold">Trạng thái: <span className="text-sky-700">{renderStatusText(data.tracking.status, note)}</span></div>
            {![ 'COMPLETED', 'CANCELED' ].includes(String(data.tracking.status)) && (
              <button onClick={onCancel} className="px-4 py-2 text-white bg-rose-600 rounded-lg hover:bg-rose-700">Hủy đơn</button>
            )}
          </div>
          {data.tracking.eta && (
            <div className="text-sm text-gray-600 mt-1">Thời gian dự kiến: {new Date(data.tracking.eta).toLocaleString('vi-VN')}</div>
          )}
          {data.tracking.completedAt && (
            <div className="text-sm text-emerald-700 mt-1">Đã giao: {new Date(data.tracking.completedAt).toLocaleString('vi-VN')}</div>
          )}

          {/* Đã bỏ thanh tiến trình theo yêu cầu */}

          <div className="h-px bg-gray-200 my-4" />
          {/* Bản đồ */}
          {data.restaurant && data.destination && (
            <div className="h-72 w-full rounded-xl overflow-hidden mb-4">
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
          )}
          {data.restaurant && (
            <div className="text-sm text-gray-600 mb-2">Nhà hàng: <span className="text-gray-900">{data.restaurant.name}</span></div>
          )}
          <div className="text-sm text-gray-600 mb-2">Địa chỉ giao: <span className="text-gray-900">{data.address || '—'}</span></div>
          <div className="space-y-2">
            {data.items.map((it, idx) => (
              <div key={idx} className="flex items-center justify-between text-sm">
                <div className="text-gray-700">{it.name} × {it.qty}</div>
                <div className="text-gray-900 font-medium">{(it.price * it.qty).toLocaleString('vi-VN')} đ</div>
              </div>
            ))}
          </div>
          <div className="h-px bg-gray-200 my-3" />
          <div className="flex items-center justify-between text-sm">
            <div className="text-gray-600">Tiền hàng</div>
            <div className="font-semibold">{Number(data.subtotal).toLocaleString('vi-VN')} đ</div>
          </div>
          <div className="flex items-center justify-between text-sm mt-1">
            <div className="text-gray-600">Tiền ship</div>
            <div className="font-semibold">{Number(data.shippingFee).toLocaleString('vi-VN')} đ</div>
          </div>
          <div className="h-px bg-gray-200 my-3" />
          <div className="flex items-center justify-between text-lg">
            <div className="font-semibold">Tổng cộng</div>
            <div className="font-bold text-sky-700">{Number(data.total).toLocaleString('vi-VN')} đ</div>
          </div>
        </div>
      )}
    </div>
  );
}

function renderStatusText(status?: string, note?: string | null) {
  const s = String(status || '').toUpperCase();
  switch (s) {
  // NOTE: Trạng thái đặc biệt "NO_DELIVERY" là giai đoạn ngay sau khi thanh toán thành công
  // hệ thống CHƯA tạo Delivery (chờ bếp xác nhận/hoàn tất). Ta đổi sang thông điệp thân thiện.
    case 'NO_DELIVERY':
    case 'CONFIRMED': // Khi webhook đã xác nhận thanh toán và đơn ở trạng thái CONFIRMED (chưa bếp xử lý)
      return 'Thanh toán thành công — đang chờ bếp xác nhận.';
    case 'PREPARING':
      // Nếu bếp đã gửi thông điệp cụ thể, ưu tiên hiển thị thông điệp đó
      return note || 'Bếp đang chế biến món ăn của bạn.';
    case 'EN_ROUTE':
      return 'Drone đang trên đường đến chỗ bạn.';
    case 'COMPLETED':
      return 'Đơn hàng đã được giao thành công.';
    case 'DISPATCHED':
      return 'Drone đang chuẩn bị cất cánh.';
    case 'DELIVERING':
      return 'Drone đang giao hàng đến bạn.';
    case 'CANCELED':
      return 'Đơn hàng đã được hủy.';
    default:
      return s || '—';
  }
}
