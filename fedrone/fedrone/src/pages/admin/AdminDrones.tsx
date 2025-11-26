// Trang Quản lý Drone (Admin)
// - Xem danh sách, tình trạng, trạm hiện tại và trạm sở hữu
// - Thêm/Sửa drone với combobox chọn chi nhánh (home/current station)
// - Nút Trả về nhà hàng: yêu cầu worker đưa drone về trạm sở hữu khi đủ điều kiện
import { useEffect, useMemo, useState } from 'react';
import { droneApi, type Drone, type Availability } from '../../api/drone';
import { restaurantsApi, type Restaurant } from '../../api/restaurants';
import { Pencil, Plus, RefreshCw, Save, X, Trash2 } from 'lucide-react';

type FormState = {
  id?: string;
  code: string;
  capacityKg: string;
  maxRangeKm: string;
  batteryPercent: string;
  status?: Drone['status'];
  homeStationId?: string;
  currentStationId?: string;
};

export default function AdminDrones() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<Drone[]>([]);
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>({ code: '', capacityKg: '', maxRangeKm: '', batteryPercent: '' });

  const adminToken = useMemo(() => {
    try { return localStorage.getItem('adminToken') || undefined; } catch { return undefined; }
  }, []);

  const loadAll = async () => {
    try {
      setLoading(true); setError(null);
      const [list, avail, branches] = await Promise.all([
        droneApi.list(adminToken),
        droneApi.availability(),
        restaurantsApi.list(),
      ]);
      setItems(list);
      setAvailability(avail);
      setRestaurants(branches);
    } catch (e: any) {
      setError(e?.message || 'Không thể tải danh sách drone');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadAll(); }, []);

  const onCreate = () => {
    setForm({ code: '', capacityKg: '', maxRangeKm: '', batteryPercent: '', homeStationId: '', currentStationId: '' });
    setShowForm(true);
  };
  const onEdit = (d: Drone) => {
    setForm({ id: d.id, code: d.code, capacityKg: String(d.capacityKg), maxRangeKm: String(d.maxRangeKm), batteryPercent: String(d.batteryPercent), status: d.status, homeStationId: d.homeStation?.id, currentStationId: d.currentStation?.id });
    setShowForm(true);
  };
  const onCancel = () => { setShowForm(false); };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      if (!form.code) throw new Error('Vui lòng nhập code');
      const payload: any = {
        code: form.code.trim(),
        capacityKg: Number(form.capacityKg),
        maxRangeKm: Number(form.maxRangeKm),
        batteryPercent: Number(form.batteryPercent),
      };
      if (form.homeStationId) payload.homeStationId = form.homeStationId;
      if (form.currentStationId) payload.currentStationId = form.currentStationId;
      if (form.id) {
        // update: backend có thể không hỗ trợ field 'name' trong Prisma schema hiện tại
        // loại bỏ cả 'code' và 'name' khỏi payload khi PATCH để tránh lỗi Prisma
        const { code, ...updateData } = payload as any;
        await droneApi.update(form.id, { ...updateData, status: form.status, homeStationId: form.homeStationId ?? null, currentStationId: form.currentStationId ?? null }, adminToken);
      } else {
        await droneApi.create(payload, adminToken);
      }
      setShowForm(false);
      await loadAll();
    } catch (e: any) {
      setError(e?.message || 'Không thể lưu drone');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Quản lý Drone</h2>
        <div className="flex gap-2">
          <button onClick={() => void loadAll()} className="px-3 py-1.5 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center gap-1"><RefreshCw className="w-4 h-4" />Tải lại</button>
          <button onClick={onCreate} className="px-3 py-1.5 rounded bg-rose-600 hover:bg-rose-500 text-white flex items-center gap-1"><Plus className="w-4 h-4" />Thêm Drone</button>
        </div>
      </div>
      {error && <div className="mb-3 text-amber-800 bg-amber-50 border border-amber-200 rounded p-2">{error}</div>}

      <div className="grid md:grid-cols-3 gap-4 mb-4">
        <div className="bg-white rounded-xl shadow p-4">
          <div className="text-sm text-gray-500">Sẵn sàng</div>
          <div className="text-2xl font-bold">{availability ? availability.availableCount : '–'}</div>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <div className="text-sm text-gray-500">Tải trọng tối đa</div>
          <div className="text-2xl font-bold">{availability ? `${availability.maxCapacityKg} kg` : '–'}</div>
        </div>
      </div>

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
                <td className="px-4 py-2 text-right space-x-2">
                  <button onClick={() => onEdit(d)} className="px-2 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white inline-flex items-center gap-1"><Pencil className="w-4 h-4" />Sửa</button>
                  <ReturnHomeButton d={d} onDone={loadAll} />
                  <DeleteDroneButton d={d} onDone={loadAll} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-lg rounded-xl shadow-lg p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="text-lg font-semibold">{form.id ? 'Cập nhật Drone' : 'Thêm Drone'}</div>
              <button onClick={onCancel} className="p-1 rounded hover:bg-gray-100"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={onSubmit} className="space-y-3">
              {!form.id && (
                <div>
                  <label className="block text-sm text-gray-600">Code</label>
                  <input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} className="mt-1 w-full border rounded px-3 py-2" placeholder="DRN-001" />
                </div>
              )}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm text-gray-600">Tải trọng (kg)</label>
                  <input value={form.capacityKg} onChange={e => setForm(f => ({ ...f, capacityKg: e.target.value }))} type="number" min={0} step={0.1} className="mt-1 w-full border rounded px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm text-gray-600">Tầm bay (km)</label>
                  <input value={form.maxRangeKm} onChange={e => setForm(f => ({ ...f, maxRangeKm: e.target.value }))} type="number" min={0} step={0.1} className="mt-1 w-full border rounded px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm text-gray-600">Pin (%)</label>
                  <input value={form.batteryPercent} onChange={e => setForm(f => ({ ...f, batteryPercent: e.target.value }))} type="number" min={0} max={100} step={1} className="mt-1 w-full border rounded px-3 py-2" />
                </div>
              </div>
              {form.id && (
                <div>
                  <label className="block text-sm text-gray-600">Trạng thái</label>
                  <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as Drone['status'] }))} className="mt-1 w-full border rounded px-3 py-2">
                    {['AVAILABLE','BUSY','CHARGING','MAINTENANCE','OFFLINE'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-600">Thuộc nhà hàng</label>
                  <select value={form.homeStationId || ''} onChange={e => setForm(f => ({ ...f, homeStationId: e.target.value || undefined }))} className="mt-1 w-full border rounded px-3 py-2">
                    <option value="">-- Chọn chi nhánh --</option>
                    {restaurants.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-600">Đang ở nhà hàng</label>
                  <select value={form.currentStationId || ''} onChange={e => setForm(f => ({ ...f, currentStationId: e.target.value || undefined }))} className="mt-1 w-full border rounded px-3 py-2">
                    <option value="">-- Chọn chi nhánh --</option>
                    {restaurants.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={onCancel} className="px-3 py-1.5 rounded border border-gray-300 hover:bg-gray-50">Hủy</button>
                <button type="submit" className="px-3 py-1.5 rounded bg-rose-600 hover:bg-rose-500 text-white inline-flex items-center gap-1"><Save className="w-4 h-4" />Lưu</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function ReturnHomeButton({ d, onDone }: { d: Drone; onDone: () => Promise<void> | void }) {
  const [working, setWorking] = useState(false);
  const adminToken = useMemo(() => {
    try { return localStorage.getItem('adminToken') || undefined; } catch { return undefined; }
  }, []);
  const eligible = d.status === 'AVAILABLE' && d.batteryPercent === 100 && !!d.homeStation?.id && d.currentStation?.id !== d.homeStation?.id;
  const onClick = async () => {
    if (!eligible) return;
    try {
      setWorking(true);
      await droneApi.returnHome(d.id, adminToken);
      await onDone();
    } catch (e) {
      // Không làm gì; màn hình cha sẽ hiển thị lỗi chung nếu cần khi tải lại
    } finally {
      setWorking(false);
    }
  };
  return (
    <button disabled={!eligible || working} onClick={() => void onClick()} className={`px-2 py-1 rounded inline-flex items-center gap-1 ${eligible ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-gray-200 text-gray-500 cursor-not-allowed'}`}>
      Trả về nhà hàng
    </button>
  );
}

function DeleteDroneButton({ d, onDone }: { d: Drone; onDone: () => Promise<void> | void }) {
  const [working, setWorking] = useState(false);
  const token = useMemo(() => {
    try { return localStorage.getItem('adminToken') || undefined; } catch { return undefined; }
  }, []);
  const disabled = d.status === 'BUSY';
  const onClick = async () => {
    if (disabled) return;
    if (!confirm(`Xoá drone ${d.code}?`)) return;
    try {
      setWorking(true);
      await droneApi.remove(d.id, token);
      await onDone();
    } catch (e: any) {
      alert(e?.message || 'Không thể xoá drone');
    } finally {
      setWorking(false);
    }
  };
  return (
    <button disabled={disabled || working} onClick={() => void onClick()} className={`px-2 py-1 rounded inline-flex items-center gap-1 ${disabled ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-red-600 hover:bg-red-500 text-white'}`}>
      <Trash2 className="w-4 h-4" /> Xoá
    </button>
  );
}
