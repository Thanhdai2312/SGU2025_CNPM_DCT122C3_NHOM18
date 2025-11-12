// Trang Thống kê hôm nay cho Nhà hàng
// - Lấy số món đã làm và tổng doanh thu của riêng nhà hàng (theo workRestaurantId) từ API /api/admin/kitchen/stats/today
// - Chỉ dùng trong khu vực /restaurant, token sẽ là restaurantToken
import { useEffect, useState } from 'react';
import { API_BASE } from '../../api/client';

type Stats = { restaurantId: string; dishesCount: number; totalRevenue: number };

export default function RestaurantStats() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Tải dữ liệu thống kê trong ngày
  const load = async () => {
    try {
      setLoading(true); setError(null);
      const token = localStorage.getItem('restaurantToken');
      const res = await fetch(`${API_BASE}/api/admin/kitchen/stats/today`, { headers: token ? { Authorization: `Bearer ${token}` } : undefined });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setStats(data);
    } catch (e: any) {
      setError(e?.message || 'Không thể tải thống kê');
    } finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Thống kê hôm nay</h2>
        <button onClick={() => void load()} className="px-3 py-1.5 rounded bg-gray-100 hover:bg-gray-200 text-gray-700">Tải lại</button>
      </div>
      {error && <div className="mb-3 text-amber-800 bg-amber-50 border border-amber-200 rounded p-2">{error}</div>}
      {loading && <div className="text-gray-600">Đang tải...</div>}
      {!loading && stats && (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl shadow p-4">
            <div className="text-sm text-gray-500">Tổng món đã làm</div>
            <div className="text-3xl font-bold">{stats.dishesCount}</div>
          </div>
          <div className="bg-white rounded-xl shadow p-4">
            <div className="text-sm text-gray-500">Doanh thu (VNĐ)</div>
            <div className="text-3xl font-bold">{stats.totalRevenue.toLocaleString('vi-VN')}</div>
          </div>
        </div>
      )}
    </div>
  );
}
