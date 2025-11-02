import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { trackingApi, type TrackingResponse } from '../../api/tracking';

export default function AdminOrderDetail() {
  const { orderId } = useParams();
  const [data, setData] = useState<TrackingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) return;
    (async () => {
      try {
        setLoading(true);
        const adminToken = localStorage.getItem('adminToken') || undefined;
        const t = await trackingApi.get(orderId, adminToken);
        setData(t);
      } catch (e: any) {
        setError(e?.message || 'Không tải được chi tiết đơn hàng');
      } finally {
        setLoading(false);
      }
    })();
  }, [orderId]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Chi tiết đơn hàng</h2>
        <Link to="/admin/orders" className="text-sm text-rose-700 hover:underline">← Quay lại danh sách</Link>
      </div>
      {loading && <div>Đang tải...</div>}
      {error && <div className="text-red-600">{error}</div>}
      {!loading && !error && data && (
        <div className="bg-white rounded-xl shadow p-6 space-y-4">
          <div className="text-sm text-gray-600">Mã đơn: <span className="font-mono">{data.orderId}</span></div>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <div className="text-gray-900 font-semibold mb-2">Thông tin</div>
              {data.restaurant && (
                <div className="text-sm text-gray-600 mb-1">Nhà hàng: <span className="text-gray-900">{data.restaurant.name}</span></div>
              )}
              <div className="text-sm text-gray-600 mb-1">Địa chỉ giao: <span className="text-gray-900">{data.address || '—'}</span></div>
              {data.tracking?.status && (
                <div className="text-sm text-gray-600">Trạng thái giao: <span className="text-gray-900 font-medium">{data.tracking.status}</span></div>
              )}
              {data.tracking?.eta && (
                <div className="text-xs text-gray-500 mt-1">ETA: {new Date(data.tracking.eta).toLocaleString('vi-VN')}</div>
              )}
            </div>
            <div>
              <div className="text-gray-900 font-semibold mb-2">Tổng kết</div>
              <div className="flex items-center justify-between text-sm"><span className="text-gray-600">Tiền hàng</span><span className="font-medium">{Number(data.subtotal).toLocaleString('vi-VN')} đ</span></div>
              <div className="flex items-center justify-between text-sm"><span className="text-gray-600">Tiền ship</span><span className="font-medium">{Number(data.shippingFee).toLocaleString('vi-VN')} đ</span></div>
              <div className="h-px bg-gray-200 my-2" />
              <div className="flex items-center justify-between text-base"><span className="font-semibold">Tổng cộng</span><span className="font-bold text-rose-700">{Number(data.total).toLocaleString('vi-VN')} đ</span></div>
            </div>
          </div>
          <div>
            <div className="text-gray-900 font-semibold mb-2">Danh sách món</div>
            <div className="divide-y">
              {data.items.map((it, idx) => (
                <div key={idx} className="py-2 flex items-center justify-between text-sm">
                  <div className="text-gray-700">{it.name} × {it.qty}</div>
                  <div className="text-gray-900 font-medium">{(it.price * it.qty).toLocaleString('vi-VN')} đ</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
