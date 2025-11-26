import { useEffect, useState } from 'react';
import { getAdminSession } from '../../utils/adminAuth';

type Restaurant = { id: string; name: string; address: string; lat: number; lng: number };

export default function AdminRestaurants() {
  const [items, setItems] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<Partial<Restaurant>>({ name: '', address: '', lat: 0, lng: 0 });
  const session = getAdminSession();
  const token = session?.token;

  const apiBase = (import.meta.env.VITE_API_BASE && !String(import.meta.env.VITE_API_BASE).includes('localhost'))
    ? String(import.meta.env.VITE_API_BASE)
    : window.location.origin;

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/admin/restaurants`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } finally { setLoading(false); }
  }

  useEffect(() => {
    load();
  }, []);

  async function createRestaurant() {
    if (!form.name || !form.address || form.lat === undefined || form.lng === undefined) return alert('Nhập đủ tên, địa chỉ, lat/lng');
    const res = await fetch(`${apiBase}/api/admin/restaurants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: form.name, address: form.address, lat: Number(form.lat), lng: Number(form.lng) })
    });
    if (!res.ok) { const err = await res.json().catch(() => ({})); return alert(err?.message || 'Tạo thất bại'); }
    await load();
    setForm({ name: '', address: '', lat: 0, lng: 0 });
  }

  async function updateRestaurant(id: string, data: Partial<Restaurant>) {
    const res = await fetch(`${apiBase}/api/admin/restaurants/${id}` , {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(data)
    });
    if (!res.ok) { const err = await res.json().catch(() => ({})); return alert(err?.message || 'Cập nhật thất bại'); }
    await load();
  }

  async function deleteRestaurant(id: string) {
    if (!confirm('Bạn có chắc muốn xoá nhà hàng này?')) return;
    const res = await fetch(`${apiBase}/api/admin/restaurants/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) { const err = await res.json().catch(() => ({})); return alert(err?.message || 'Không thể xoá (có thể đang được sử dụng)'); }
    await load();
  }

  

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Quản lý nhà hàng</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="p-4 border rounded">
          <h2 className="font-semibold mb-2">Thêm nhà hàng</h2>
          <div className="space-y-2">
            <input className="w-full border rounded p-2" placeholder="Tên nhà hàng" value={form.name || ''} onChange={e=>setForm(f=>({ ...f, name: e.target.value }))} />
            <input className="w-full border rounded p-2" placeholder="Địa chỉ" value={form.address || ''} onChange={e=>setForm(f=>({ ...f, address: e.target.value }))} />
            {/* Đã bỏ trường ảnh (URL) khi hoàn tác yêu cầu hình ảnh) */}
            <div className="grid grid-cols-2 gap-2">
              <input className="w-full border rounded p-2" placeholder="Vĩ độ (lat)" type="number" value={form.lat ?? 0} onChange={e=>setForm(f=>({ ...f, lat: Number(e.target.value) }))} />
              <input className="w-full border rounded p-2" placeholder="Kinh độ (lng)" type="number" value={form.lng ?? 0} onChange={e=>setForm(f=>({ ...f, lng: Number(e.target.value) }))} />
            </div>
            <button className="px-4 py-2 bg-rose-600 text-white rounded" onClick={createRestaurant}>Thêm</button>
          </div>
        </div>

        <div className="p-4 border rounded">
          <h2 className="font-semibold mb-2">Danh sách nhà hàng {loading && '(đang tải...)'}</h2>
          <div className="space-y-2">
            {items.map(r => (
              <div key={r.id} className="p-3 border rounded flex items-center justify-between gap-3">
                <div className="flex-1">
                  <div className="font-semibold">{r.name}</div>
                  <div className="text-sm opacity-80">{r.address}</div>
                  <div className="text-xs opacity-70">lat: {r.lat} • lng: {r.lng}</div>
                </div>
                <div className="flex gap-2">
                  <button className="px-3 py-1 text-sm border rounded" onClick={()=>{
                    const name = prompt('Tên mới', r.name) || undefined;
                    const address = prompt('Địa chỉ mới', r.address) || undefined;
                    const lat = Number(prompt('lat', String(r.lat)) || r.lat);
                    const lng = Number(prompt('lng', String(r.lng)) || r.lng);
                    updateRestaurant(r.id, { name, address, lat, lng });
                  }}>Sửa</button>
                  <button className="px-3 py-1 text-sm border rounded text-red-700" onClick={()=>deleteRestaurant(r.id)}>Xoá</button>
                </div>
              </div>
            ))}
            {!items.length && <div className="text-sm opacity-70">Chưa có nhà hàng</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
