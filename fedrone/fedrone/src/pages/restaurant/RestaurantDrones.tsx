import { useEffect, useMemo, useState } from 'react';
import { droneApi, type Drone } from '../../api/drone';
import { RefreshCw } from 'lucide-react';

export default function RestaurantDrones() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<Drone[]>([]);
  const token = useMemo(() => {
    try { return localStorage.getItem('restaurantToken') || undefined; } catch { return undefined; }
  }, []);

  const load = async () => {
    try {
      setLoading(true); setError(null);
      const list = await droneApi.list(token);
      setItems(list);
    } catch (e: any) {
      setError(e?.message || 'Không thể tải danh sách drone');
    } finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Drone của chi nhánh</h2>
        <button onClick={() => void load()} className="px-3 py-1.5 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center gap-1"><RefreshCw className="w-4 h-4" />Tải lại</button>
      </div>
      {error && <div className="mb-3 text-amber-800 bg-amber-50 border border-amber-200 rounded p-2">{error}</div>}
      <div className="bg-white rounded-xl shadow overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-left px-4 py-2">Code</th>
              <th className="text-left px-4 py-2">Tải trọng (kg)</th>
              <th className="text-left px-4 py-2">Tầm bay (km)</th>
              <th className="text-left px-4 py-2">Pin (%)</th>
              <th className="text-left px-4 py-2">Trạng thái</th>
              <th className="text-left px-4 py-2">Đang ở nhà hàng</th>
              <th className="text-left px-4 py-2">Thuộc nhà hàng</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={7} className="px-4 py-6 text-center text-gray-500">Đang tải...</td></tr>
            )}
            {!loading && items.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-6 text-center text-gray-500">Chưa có drone nào</td></tr>
            )}
            {items.map(d => (
              <tr key={d.id} className="border-t">
                <td className="px-4 py-2 font-mono">{d.code}</td>
                <td className="px-4 py-2">{d.capacityKg}</td>
                <td className="px-4 py-2">{d.maxRangeKm}</td>
                <td className="px-4 py-2">{d.batteryPercent}</td>
                <td className="px-4 py-2">
                  <span className="px-2 py-0.5 rounded text-xs bg-gray-100">{d.status}</span>
                </td>
                <td className="px-4 py-2">{d.currentStation?.name || '—'}</td>
                <td className="px-4 py-2">{d.homeStation?.name || '—'}</td>
                <td className="px-4 py-2 text-right">
                  <RecallButton d={d} token={token} onDone={load} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RecallButton({ d, token, onDone }: { d: Drone; token?: string; onDone: () => Promise<void> | void }) {
  const [working, setWorking] = useState(false);
  const eligible = d.status === 'AVAILABLE';
  const onClick = async () => {
    if (!eligible) return;
    try {
      setWorking(true);
      await droneApi.recallToMe(d.id, token);
      await onDone();
    } catch {}
    finally { setWorking(false); }
  };
  return (
    <button disabled={!eligible || working} onClick={() => void onClick()} className={`px-2 py-1 rounded inline-flex items-center gap-1 ${eligible ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-gray-200 text-gray-500 cursor-not-allowed'}`}>
      Gọi drone về
    </button>
  );
}
