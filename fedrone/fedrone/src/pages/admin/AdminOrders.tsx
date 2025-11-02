import { useEffect, useMemo, useState } from 'react';
import { ordersApi, type OrderSummary } from '../../api/orders';
import { useNavigate } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';

// Trang Đơn hàng (Admin/Operator)
// - Liệt kê tất cả đơn
// - Liên kết tới chi tiết/dispatch (nếu có)
export default function AdminOrders() {
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [paymentFilter, setPaymentFilter] = useState<string>('ALL');
  const [q, setQ] = useState('');
  const adminToken = useMemo(() => localStorage.getItem('adminToken') || undefined, []);
  const navigate = useNavigate();

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await ordersApi.listAll(adminToken);
      setOrders(data);
    } catch (e: any) {
      setError(e?.message || 'Không thể tải danh sách đơn hàng');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const statusOptions = useMemo(() => ['ALL', ...Array.from(new Set(orders.map(o => (o.status || '').toUpperCase())))], [orders]);
  const paymentOptions = useMemo(() => ['ALL', ...Array.from(new Set(orders.map(o => (o.paymentStatus || '').toUpperCase())))], [orders]);

  const filtered = useMemo(() => {
    return orders.filter(o => {
      const byStatus = statusFilter === 'ALL' || (o.status || '').toUpperCase() === statusFilter;
      const byPayment = paymentFilter === 'ALL' || (o.paymentStatus || '').toUpperCase() === paymentFilter;
      const text = (o.id + ' ' + (o.shippingAddress || '')).toLowerCase();
      const byQuery = !q || text.includes(q.toLowerCase());
      return byStatus && byPayment && byQuery;
    });
  }, [orders, statusFilter, paymentFilter, q]);

  if (loading) return <div>Đang tải...</div>;
  if (error) return <div className="text-red-600">{error}</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Tất cả đơn hàng</h2>
        <div className="flex gap-2">
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Tìm theo ID/địa chỉ" className="px-3 py-1.5 border rounded w-64" />
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-1.5 border rounded">
            {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={paymentFilter} onChange={e => setPaymentFilter(e.target.value)} className="px-3 py-1.5 border rounded">
            {paymentOptions.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button onClick={() => void load()} className="px-3 py-1.5 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 inline-flex items-center gap-1"><RefreshCw className="w-4 h-4"/>Tải lại</button>
        </div>
      </div>
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-rose-100 text-rose-900">
            <tr>
              <th className="text-left p-3">ID</th>
              <th className="text-left p-3">Ngày</th>
              <th className="text-left p-3">Trạng thái</th>
              <th className="text-left p-3">Thanh toán</th>
              <th className="text-right p-3">Tổng</th>
              <th className="text-left p-3">Địa chỉ</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(o => (
              <tr key={o.id} className="border-t hover:bg-rose-50 cursor-pointer" onClick={() => navigate(`/admin/orders/${o.id}`)}>
                <td className="p-3 font-medium">{o.id}</td>
                <td className="p-3">{new Date(o.createdAt).toLocaleString()}</td>
                <td className="p-3">{o.status}</td>
                <td className="p-3">{o.paymentStatus}</td>
                <td className="p-3 text-right">{(o.total || 0).toLocaleString()}₫</td>
                <td className="p-3 max-w-[22rem] truncate">{o.shippingAddress}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
