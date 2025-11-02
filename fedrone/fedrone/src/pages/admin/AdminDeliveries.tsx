// Trang Giao hàng (Admin/Operator)
// - Liệt kê Delivery, cập nhật trạng thái, và Dispatch
// - Dispatch sẽ kiểm tra kitchenDone trước khi cho phép
import { useEffect, useMemo, useState } from 'react';
import { deliveryApi, type Delivery } from '../../api/delivery';
import { RefreshCw, Save } from 'lucide-react';

const ALL_STATUSES: Delivery['status'][] = ['QUEUED', 'ASSIGNED', 'EN_ROUTE', 'ARRIVED', 'COMPLETED', 'FAILED'];

export default function AdminDeliveries() {
  const [items, setItems] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Delivery['status'] | 'ALL'>('ALL');
  const [draftStatus, setDraftStatus] = useState<Record<string, Delivery['status']>>({});

  const adminToken = useMemo(() => {
    try { return localStorage.getItem('adminToken') || undefined; } catch { return undefined; }
  }, []);

  const load = async () => {
    try { setLoading(true); setError(null); setItems(await deliveryApi.list(undefined, adminToken)); }
    catch (e: any) { setError(e?.message || 'Không tải được danh sách giao hàng'); }
    finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => items.filter(d => filter === 'ALL' ? true : d.status === filter), [items, filter]);

  const onSave = async (id: string) => {
    try {
      const status = draftStatus[id];
      if (!status) return;
      await deliveryApi.updateStatus(id, status, adminToken);
      await load();
    } catch (e: any) {
      setError(e?.message || 'Không thể cập nhật trạng thái');
    }
  };

  const onDispatch = async (id: string) => {
    try {
      await deliveryApi.dispatch(id, adminToken);
      await load();
    } catch (e: any) {
      setError(e?.message || 'Không thể dispatch giao hàng');
    }
  };

  const onChangeDraft = (id: string, status: Delivery['status']) => {
    setDraftStatus(s => ({ ...s, [id]: status }));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Quản lý Giao hàng</h2>
        <div className="flex gap-2">
          <select value={filter} onChange={e => setFilter((e.target.value as any) || 'ALL')} className="px-3 py-1.5 border rounded">
            <option value="ALL">Tất cả</option>
            {ALL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button onClick={() => void load()} className="px-3 py-1.5 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center gap-1"><RefreshCw className="w-4 h-4" />Tải lại</button>
        </div>
      </div>
      {error && <div className="mb-3 text-amber-800 bg-amber-50 border border-amber-200 rounded p-2">{error}</div>}

      <div className="bg-white rounded-xl shadow overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-left px-4 py-2">Delivery ID</th>
              <th className="text-left px-4 py-2">Order ID</th>
              <th className="text-left px-4 py-2">Drone</th>
              <th className="text-left px-4 py-2">Trạng thái</th>
              <th className="text-left px-4 py-2">ETA</th>
              <th className="text-left px-4 py-2">Bắt đầu</th>
              <th className="text-left px-4 py-2">Hoàn tất</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={8} className="px-4 py-6 text-center text-gray-500">Đang tải…</td></tr>}
            {!loading && filtered.length === 0 && <tr><td colSpan={8} className="px-4 py-6 text-center text-gray-500">Không có bản ghi</td></tr>}
            {filtered.map(d => (
              <tr key={d.id} className="border-t">
                <td className="px-4 py-2 font-mono truncate max-w-[12rem]" title={d.id}>{d.id}</td>
                <td className="px-4 py-2 font-mono truncate max-w-[12rem]" title={d.orderId}>{d.orderId}</td>
                <td className="px-4 py-2 font-mono truncate max-w-[8rem]" title={d.droneId || ''}>{d.droneId || '—'}</td>
                <td className="px-4 py-2">
                  <span className="px-2 py-0.5 rounded text-xs bg-gray-100 mr-2">{d.status}</span>
                  <select value={draftStatus[d.id] || d.status} onChange={e => onChangeDraft(d.id, e.target.value as Delivery['status'])} className="px-2 py-1 border rounded text-xs">
                    {ALL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
                <td className="px-4 py-2">{d.eta ? new Date(d.eta).toLocaleString('vi-VN') : '—'}</td>
                <td className="px-4 py-2">{d.startedAt ? new Date(d.startedAt).toLocaleString('vi-VN') : '—'}</td>
                <td className="px-4 py-2">{d.completedAt ? new Date(d.completedAt).toLocaleString('vi-VN') : '—'}</td>
                <td className="px-4 py-2 text-right space-x-2">
                  {d.status === 'QUEUED' && (
                    <button onClick={() => void onDispatch(d.id)} className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white inline-flex items-center gap-1">Dispatch</button>
                  )}
                  <button onClick={() => void onSave(d.id)} className="px-2 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white inline-flex items-center gap-1"><Save className="w-4 h-4" />Lưu</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
