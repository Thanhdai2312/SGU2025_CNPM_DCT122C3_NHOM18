import { useEffect, useMemo, useState } from 'react';
// Trang Đơn của tôi: lịch sử đặt hàng của khách
import { ordersApi, type OrderSummary } from '../api/orders';
import { Link, useNavigate } from 'react-router-dom';
import { Calendar, ChevronRight, Clock, Receipt, Truck } from 'lucide-react';

export default function MyOrders() {
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'ALL' | 'ONGOING' | 'COMPLETED' | 'CANCELED'>('ALL');
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const data = await ordersApi.listMine();
        if (!mounted) return;
        setOrders(data);
      } catch (e: any) {
        setError(e?.message || 'Không thể tải danh sách đơn hàng');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const sorted = useMemo(() => {
    const list = [...orders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    if (filter === 'ALL') return list;
    return list.filter(o => {
      const d = o.delivery?.status;
      const os = (o.status || '').toUpperCase();
  if (filter === 'CANCELED') return os === 'CANCELED';
      if (filter === 'COMPLETED') return (d || '').toUpperCase() === 'COMPLETED';
      // ONGOING
  return os !== 'CANCELED' && (d ? ['ASSIGNED', 'EN_ROUTE'].includes(d.toUpperCase()) : true);
    });
  }, [orders, filter]);

  if (loading) {
    return (
      <div className="container mx-auto px-6 py-10">
        <div className="animate-pulse text-gray-500">Đang tải đơn hàng...</div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="container mx-auto px-6 py-10">
        <div className="text-red-600">{error}</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Đơn hàng của tôi</h1>
        <p className="text-gray-500">Tất cả đơn đã đặt và thanh toán sẽ hiển thị ở đây.</p>
      </div>

  {/* Bộ lọc */}
      <div className="flex gap-2 mb-4">
        {[
          { key: 'ALL', label: 'Tất cả' },
          { key: 'ONGOING', label: 'Đang giao' },
          { key: 'COMPLETED', label: 'Hoàn thành' },
          { key: 'CANCELED', label: 'Đã hủy' },
        ].map(t => (
          <button key={t.key} onClick={() => setFilter(t.key as any)}
            className={`px-3 py-1.5 rounded-lg text-sm border ${filter === t.key ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {sorted.length === 0 ? (
        <div className="bg-white rounded-xl shadow p-6 text-center text-gray-600">
          Bạn chưa có đơn hàng nào. <Link to="/" className="text-blue-600 hover:underline">Đặt món ngay</Link>.
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <ul className="divide-y">
            {sorted.map((o) => (
              <li key={o.id} className="p-4 hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/orders/${o.id}`)}>
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <Receipt className="w-5 h-5 text-blue-600" />
                      <div className="font-semibold text-gray-900 truncate">Đơn #{o.id}</div>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-6 gap-y-1 text-sm text-gray-600">
                      <div className="flex items-center gap-1"><Calendar className="w-4 h-4" />{new Date(o.createdAt).toLocaleString()}</div>
                      <div className="flex items-center gap-1"><Clock className="w-4 h-4" />Trạng thái: <span className="ml-1 font-medium">{o.status}</span></div>
                      <div className="flex items-center gap-1"><Truck className="w-4 h-4" />Thanh toán: <span className="ml-1 font-medium">{o.paymentStatus}</span></div>
                      <div className="flex items-center gap-1">Tổng: <span className="ml-1 font-semibold text-gray-900">{(o.total || 0).toLocaleString()}₫</span></div>
                    </div>
                    <div className="mt-1 text-sm text-gray-500 truncate">Địa chỉ: {o.shippingAddress}</div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
