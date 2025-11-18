import { useEffect, useMemo, useState } from 'react';
// Trang Sản phẩm/Món (Admin)
// - Liệt kê món theo chi nhánh, thêm/sửa/xoá
// - Hỗ trợ trường ảnh, tồn kho, loại món
import { menuAdminApi, type MenuItemAdmin } from '../../api/menuAdmin';
import { restaurantsApi, type Restaurant } from '../../api/restaurants';
import { getActiveAdminArea } from '../../utils/adminAuth';
import { useRestaurantName } from '../../hooks/useRestaurantName';
import { Plus, Save, Trash2, RefreshCw } from 'lucide-react';

export default function AdminProducts() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [restaurantId, setRestaurantId] = useState<string>('');
  const [items, setItems] = useState<MenuItemAdmin[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Partial<MenuItemAdmin> & { id?: string }>({ name: '', price: 0, type: 'FOOD', isAvailable: true, stock: 100 });

  const adminToken = useMemo(() => {
    try { return localStorage.getItem('adminToken') || undefined; } catch { return undefined; }
  }, []);

  // Xác định khu vực đang hoạt động (admin hay restaurant) để ép phạm vi nhà hàng nếu là restaurant
  const { role, session } = useMemo(() => getActiveAdminArea(), []);
  const isRestaurant = role === 'restaurant';
  const workRestaurantId = (session?.user as any)?.workRestaurantId as string | undefined;
  const { name: myRestaurantName } = useRestaurantName(workRestaurantId);

  const loadRestaurants = async () => {
    if (isRestaurant) return; // Người dùng nhà hàng không cần danh sách combobox chi nhánh
    const list = await restaurantsApi.list();
    setRestaurants(list);
    if (!restaurantId && list.length) setRestaurantId(list[0].id);
  };
  const loadItems = async () => {
  // Chế độ restaurant: luôn ép về workRestaurantId của user
    const rid = isRestaurant ? (workRestaurantId || '') : restaurantId;
    if (!rid) return;
    setLoading(true); setError(null);
    try {
      const list = await menuAdminApi.list(rid, adminToken);
      setItems(list);
    } catch (e: any) {
      setError(e?.message || 'Không tải được sản phẩm');
    } finally { setLoading(false); }
  };

  useEffect(() => {
  // Khởi tạo restaurantId cho người dùng nhà hàng (ẩn combobox chọn chi nhánh)
    if (isRestaurant && workRestaurantId) {
      setRestaurantId(workRestaurantId);
    }
    void loadRestaurants();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { void loadItems(); }, [restaurantId, isRestaurant, workRestaurantId]);

  const onCreate = () => { setForm({ name: '', price: 0, type: 'FOOD', isAvailable: true, stock: 100 }); setShowForm(true); };
  const onEdit = (m: MenuItemAdmin) => { setForm({ ...m }); setShowForm(true); };
  const onDelete = async (id: string) => { if (!confirm('Xóa sản phẩm này?')) return; await menuAdminApi.remove(id, adminToken); await loadItems(); };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(null);
    try {
      if (!restaurantId) throw new Error('Chọn nhà hàng');
      if (!form.name || !form.price) throw new Error('Tên và giá là bắt buộc');
      const payload = { name: form.name.trim(), price: Number(form.price), weight: form.weight ? Number(form.weight) : undefined, type: form.type, imageUrl: form.imageUrl || undefined, isAvailable: !!form.isAvailable, stock: form.stock == null ? null : Number(form.stock) };
      if (form.id) await menuAdminApi.update(form.id, payload, adminToken);
      else await menuAdminApi.create(restaurantId, payload, adminToken);
      setShowForm(false);
      await loadItems();
    } catch (e: any) { setError(e?.message || 'Không thể lưu'); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Quản lý Sản phẩm</h2>
        <div className="flex gap-2 items-center">
          {!isRestaurant ? (
            <select value={restaurantId} onChange={e => setRestaurantId(e.target.value)} className="px-3 py-1.5 border rounded">
              {restaurants.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          ) : (
            <div className="px-3 py-1.5 border rounded bg-white text-gray-700 text-sm" title={myRestaurantName || ''}>
              {myRestaurantName || 'Nhà hàng của tôi'}
            </div>
          )}
          <button onClick={() => void loadItems()} className="px-3 py-1.5 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 inline-flex items-center gap-1"><RefreshCw className="w-4 h-4"/>Tải lại</button>
          <button onClick={onCreate} className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white inline-flex items-center gap-1"><Plus className="w-4 h-4"/>Thêm sản phẩm</button>
        </div>
      </div>
      {error && <div className="mb-3 text-amber-800 bg-amber-50 border border-amber-200 rounded p-2">{error}</div>}

      {/* Đồ ăn (FOOD) ở phía trên */}
      <div className="bg-white rounded-xl shadow overflow-auto mb-6">
        <div className="px-4 pt-3 pb-2 font-semibold text-gray-700">Đồ ăn</div>
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-left px-4 py-2">Tên</th>
              <th className="text-left px-4 py-2">Giá</th>
              <th className="text-left px-4 py-2">Khối lượng (kg)</th>
              <th className="text-left px-4 py-2">Tồn kho</th>
              <th className="text-left px-4 py-2">Hiển thị</th>
              <th className="text-left px-4 py-2">Ảnh</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={7} className="px-4 py-6 text-center text-gray-500">Đang tải…</td></tr>}
            {!loading && items.filter(i => i.type === 'FOOD').length === 0 && (
              <tr><td colSpan={7} className="px-4 py-6 text-center text-gray-500">Chưa có sản phẩm Đồ ăn</td></tr>
            )}
            {items.filter(i => i.type === 'FOOD').map(m => (
              <tr key={m.id} className="border-t">
                <td className="px-4 py-2">{m.name}</td>
                <td className="px-4 py-2">{Number(m.price).toLocaleString('vi-VN')} đ</td>
                <td className="px-4 py-2">{m.weight ?? '—'}</td>
                <td className="px-4 py-2">{m.stock ?? '∞'}</td>
                <td className="px-4 py-2">{m.isAvailable ? 'Có' : 'Ẩn'}</td>
                <td className="px-4 py-2 truncate max-w-[12rem]" title={m.imageUrl || ''}>{m.imageUrl ? 'URL' : '—'}</td>
                <td className="px-4 py-2 text-right space-x-2">
                  <button onClick={() => onEdit(m)} className="px-2 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white inline-flex items-center gap-1"><Save className="w-4 h-4"/>Sửa</button>
                  <button onClick={() => void onDelete(m.id)} className="px-2 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white inline-flex items-center gap-1"><Trash2 className="w-4 h-4"/>Xóa</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Thức uống (DRINK) ở phía dưới */}
      <div className="bg-white rounded-xl shadow overflow-auto">
        <div className="px-4 pt-3 pb-2 font-semibold text-gray-700">Thức uống</div>
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-left px-4 py-2">Tên</th>
              <th className="text-left px-4 py-2">Giá</th>
              <th className="text-left px-4 py-2">Khối lượng (kg)</th>
              <th className="text-left px-4 py-2">Tồn kho</th>
              <th className="text-left px-4 py-2">Hiển thị</th>
              <th className="text-left px-4 py-2">Ảnh</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={7} className="px-4 py-6 text-center text-gray-500">Đang tải…</td></tr>}
            {!loading && items.filter(i => i.type === 'DRINK').length === 0 && (
              <tr><td colSpan={7} className="px-4 py-6 text-center text-gray-500">Chưa có sản phẩm Thức uống</td></tr>
            )}
            {items.filter(i => i.type === 'DRINK').map(m => (
              <tr key={m.id} className="border-t">
                <td className="px-4 py-2">{m.name}</td>
                <td className="px-4 py-2">{Number(m.price).toLocaleString('vi-VN')} đ</td>
                <td className="px-4 py-2">{m.weight ?? '—'}</td>
                <td className="px-4 py-2">{m.stock ?? '∞'}</td>
                <td className="px-4 py-2">{m.isAvailable ? 'Có' : 'Ẩn'}</td>
                <td className="px-4 py-2 truncate max-w-[12rem]" title={m.imageUrl || ''}>{m.imageUrl ? 'URL' : '—'}</td>
                <td className="px-4 py-2 text-right space-x-2">
                  <button onClick={() => onEdit(m)} className="px-2 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white inline-flex items-center gap-1"><Save className="w-4 h-4"/>Sửa</button>
                  <button onClick={() => void onDelete(m.id)} className="px-2 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white inline-flex items-center gap-1"><Trash2 className="w-4 h-4"/>Xóa</button>
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
              <div className="text-lg font-semibold">{form.id ? 'Cập nhật sản phẩm' : 'Thêm sản phẩm'}</div>
              <button onClick={() => setShowForm(false)} className="p-1 rounded hover:bg-gray-100">✕</button>
            </div>
            <form onSubmit={onSubmit} className="space-y-3">
              <div>
                <label className="block text-sm text-gray-600">Tên</label>
                <input value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="mt-1 w-full border rounded px-3 py-2" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-600">Giá</label>
                  <input value={form.price ?? 0} onChange={e => setForm(f => ({ ...f, price: Number(e.target.value) }))} type="number" min={0} step={1000} className="mt-1 w-full border rounded px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm text-gray-600">Khối lượng (kg)</label>
                  <input value={form.weight ?? ''} onChange={e => setForm(f => ({ ...f, weight: e.target.value ? Number(e.target.value) : undefined }))} type="number" min={0} step={0.05} className="mt-1 w-full border rounded px-3 py-2" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-600">Loại</label>
                  <select value={form.type || 'FOOD'} onChange={e => setForm(f => ({ ...f, type: e.target.value as any }))} className="mt-1 w-full border rounded px-3 py-2">
                    <option value="FOOD">Đồ ăn</option>
                    <option value="DRINK">Thức uống</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-600">Tồn kho (để trống = không quản lý)</label>
                  <input value={form.stock ?? ''} onChange={e => setForm(f => ({ ...f, stock: e.target.value === '' ? null : Number(e.target.value) }))} type="number" min={0} step={1} className="mt-1 w-full border rounded px-3 py-2" />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-600">Ảnh (URL)</label>
                <input value={form.imageUrl || ''} onChange={e => setForm(f => ({ ...f, imageUrl: e.target.value }))} className="mt-1 w-full border rounded px-3 py-2" placeholder="https://..." />
              </div>
              <div className="flex items-center gap-2">
                <input id="isAvailable" type="checkbox" checked={!!form.isAvailable} onChange={e => setForm(f => ({ ...f, isAvailable: e.target.checked }))} />
                <label htmlFor="isAvailable" className="text-sm text-gray-700">Hiển thị cho khách</label>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="px-3 py-1.5 rounded border border-gray-300 hover:bg-gray-50">Hủy</button>
                <button type="submit" className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white inline-flex items-center gap-1"><Save className="w-4 h-4"/>Lưu</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
