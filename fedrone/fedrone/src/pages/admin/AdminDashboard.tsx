// Trang Dashboard (Admin)
// - Kết nối socket để nhận cập nhật doanh thu, số đơn, số drone sẵn sàng
// - Có thể mở rộng thêm các biểu đồ theo thời gian thực
import { useEffect, useMemo, useState } from 'react';
import { TrendingUp, PackageCheck, Truck, Bot, RefreshCcw } from 'lucide-react';
import { ordersApi, type OrderSummary } from '../../api/orders';
import { deliveryApi, type Delivery } from '../../api/delivery';
import { droneApi, type Drone } from '../../api/drone';
import { restaurantsApi } from '../../api/restaurants';
import { menuAdminApi, type MenuItemAdmin } from '../../api/menuAdmin';
import { io } from 'socket.io-client';
import { API_BASE } from '../../api/client';

type StatCard = { label: string; value: string; sub?: string; tone?: 'primary' | 'success' | 'warning' | 'danger'; Icon?: any };

export default function AdminDashboard() {
  const adminToken = useMemo(() => localStorage.getItem('adminToken') || undefined, []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [drones, setDrones] = useState<Drone[]>([]);
  const [lowStock, setLowStock] = useState<Array<MenuItemAdmin & { restaurantName: string }>>([]);
  // Khoảng ngày cho báo cáo doanh thu/đơn đã giao
  const initEnd = useMemo(() => new Date(), []);
  // Mặc định: báo cáo theo NGÀY HIỆN TẠI để khớp với "Doanh thu hôm nay"
  const initStart = useMemo(() => new Date(), []);
  const [startDate, setStartDate] = useState<string>(() => toInputDate(initStart));
  const [endDate, setEndDate] = useState<string>(() => toInputDate(initEnd));
  // Báo cáo luôn ở chế độ doanh thu (PAID)

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const [ordersRes, delivRes, dronesRes, restRes] = await Promise.all([
          ordersApi.listAll(adminToken),
          deliveryApi.list({}, adminToken),
          droneApi.list(adminToken),
          restaurantsApi.list(),
        ]);
        setOrders(ordersRes);
        setDeliveries(delivRes);
        setDrones(dronesRes);
  // Lấy danh sách món sắp hết hàng ở tất cả chi nhánh (<= 5)
        const lows: Array<MenuItemAdmin & { restaurantName: string }> = [];
        for (const r of restRes) {
          try {
            const items = await menuAdminApi.list(r.id, adminToken);
            items.filter(i => i.stock != null && Number(i.stock) <= 5).forEach(i => lows.push({ ...i, restaurantName: r.name }));
          } catch {}
        }
  // Sắp xếp theo tồn kho tăng dần rồi theo tên
        lows.sort((a, b) => (Number(a.stock ?? 0) - Number(b.stock ?? 0)) || a.name.localeCompare(b.name));
        setLowStock(lows.slice(0, 10));
      } catch (e: any) {
        setError(e?.message || 'Không thể tải dữ liệu Dashboard');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [adminToken]);

  // Cập nhật thời gian thực cho KPI và doanh thu của dashboard
  useEffect(() => {
    if (!adminToken) return;
    const socket = io(API_BASE, {
      transports: ['websocket'],
      extraHeaders: { Authorization: `Bearer ${adminToken}` },
      auth: { token: adminToken },
    });
    socket.on('connect', () => {
      socket.emit('track-dashboard');
    });
  // Gom các sự kiện và tải lại nhẹ khi có cập nhật dashboard
    let reloadTimer: any = null;
    const scheduleReload = () => {
      if (reloadTimer) return;
      reloadTimer = setTimeout(() => {
        reloadTimer = null;
        void reload();
      }, 400);
    };
    socket.on('dashboard-update', (_payload: any) => {
      scheduleReload();
    });
    // Nghe thêm sự kiện delivery-update để chắc chắn
    socket.on('delivery-update', (_payload: any) => {
      scheduleReload();
    });
    return () => { socket.disconnect(); };
  }, [adminToken]);

  const today = new Date();
  const isSameDay = (d: string) => {
    const nd = new Date(d);
    return nd.getFullYear() === today.getFullYear() && nd.getMonth() === today.getMonth() && nd.getDate() === today.getDate();
  };

  // Metrics
  const ordersToday = orders.filter(o => isSameDay(o.createdAt));
  // Căn chỉnh: doanh thu hôm nay dựa trên đơn đã GIAO xong hôm nay và đã thanh toán (PAID)
  const deliveriesCompletedToday = deliveries.filter(d => d.status === 'COMPLETED' && d.completedAt && isSameDay(d.completedAt));
  const revenueToday = deliveriesCompletedToday.reduce((sum, d) => {
    const ord = orders.find(o => o.id === d.orderId);
    if (!ord) return sum;
    if ((ord.paymentStatus || '').toUpperCase() !== 'PAID') return sum;
    return sum + Number(ord.total || 0);
  }, 0);

  const activeDeliveries = deliveries.filter(d => d.status !== 'COMPLETED' && d.status !== 'FAILED');
  const availableDrones = drones.filter(d => d.status === 'AVAILABLE');
  const lowBatteryDrones = drones.filter(d => Number(d.batteryPercent) < 20);

  const statCards: StatCard[] = [
    { label: 'Đơn hàng hôm nay', value: String(ordersToday.length), sub: `Tổng: ${orders.length}`, tone: 'primary', Icon: PackageCheck },
    { label: 'Doanh thu hôm nay', value: `${revenueToday.toLocaleString('vi-VN')}₫`, tone: 'success', Icon: TrendingUp },
  { label: 'Đang giao', value: String(activeDeliveries.length), sub: `Tổng delivery: ${deliveries.length}`, tone: 'primary', Icon: Truck },
  { label: 'Đã giao hôm nay', value: String(deliveries.filter(d => d.status === 'COMPLETED' && isSameDay(d.completedAt || '')).length), tone: 'primary', Icon: PackageCheck },
    { label: 'Drone sẵn sàng', value: String(availableDrones.length), sub: `${lowBatteryDrones.length} pin yếu`, tone: 'warning', Icon: Bot },
  ];

  // Aggregations
  const deliveryStatusCounts = groupCounts(deliveries.map(d => d.status));
  const droneStatusCounts = groupCounts(drones.map(d => d.status));

  const recentOrders = [...orders].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)).slice(0, 8);

  // Báo cáo theo khoảng: nhóm theo ngày (Delivery COMPLETED trong khoảng) và chỉ tính đơn đã thanh toán (PAID)
  type DayRow = { date: string; total: number; count: number; orders: Array<{ order: OrderSummary; completedAt: string }> };
  const { paidTotal, paidDaily } = useMemo(() => {
    const start = inputDateToStartOfDay(startDate);
    const end = inputDateToEndOfDay(endDate);
    const inRange = (d?: string | null) => {
      if (!d) return false;
      const t = new Date(d).getTime();
      return t >= start.getTime() && t <= end.getTime();
    };
    const completedDeliveries = deliveries.filter(d => d.status === 'COMPLETED' && inRange(d.completedAt));

  // Chỉ PAID (doanh thu thực tế)
    const mapPaid = new Map<string, DayRow>();
    for (const d of completedDeliveries) {
      const ord = orders.find(o => o.id === d.orderId);
      if (!ord) continue;
      if ((ord.paymentStatus || '').toUpperCase() !== 'PAID') continue;
      const key = toInputDate(new Date(d.completedAt!));
      const rec = mapPaid.get(key) || { date: key, total: 0, count: 0, orders: [] };
      rec.total += Number(ord.total || 0);
      rec.count += 1;
      rec.orders.push({ order: ord, completedAt: d.completedAt! });
      mapPaid.set(key, rec);
    }
    const paidRows = Array.from(mapPaid.values()).sort((a, b) => (a.date < b.date ? 1 : -1));
    const paidTotal = paidRows.reduce((s, r) => s + r.total, 0);

  // Tất cả đơn hoàn tất (để so sánh với báo cáo giao hàng)
    const mapAll = new Map<string, DayRow>();
    for (const d of completedDeliveries) {
      const ord = orders.find(o => o.id === d.orderId);
      if (!ord) continue;
      const key = toInputDate(new Date(d.completedAt!));
      const rec = mapAll.get(key) || { date: key, total: 0, count: 0, orders: [] };
      rec.total += Number(ord.total || 0);
      rec.count += 1;
      rec.orders.push({ order: ord, completedAt: d.completedAt! });
      mapAll.set(key, rec);
    }
    // Không còn dùng allRows/allTotal vì báo cáo chỉ hiển thị PAID
    return { paidTotal, paidDaily: paidRows };
  }, [orders, deliveries, startDate, endDate]);

  // Chọn dữ liệu hiển thị theo chế độ
  const daily: DayRow[] = paidDaily;
  const rangeTotal: number = paidTotal;

  if (loading) return <div>Đang tải Dashboard…</div>;
  if (error) return <div className="text-red-600">{error}</div>;

  const reload = async () => {
    try {
      setLoading(true);
      setError(null);
      const [ordersRes, delivRes, dronesRes, restRes] = await Promise.all([
        ordersApi.listAll(adminToken),
        deliveryApi.list({}, adminToken),
        droneApi.list(adminToken),
        restaurantsApi.list(),
      ]);
      setOrders(ordersRes);
      setDeliveries(delivRes);
      setDrones(dronesRes);
      const lows: Array<MenuItemAdmin & { restaurantName: string }> = [];
      for (const r of restRes) {
        try {
          const items = await menuAdminApi.list(r.id, adminToken);
          items.filter(i => i.stock != null && Number(i.stock) <= 5).forEach(i => lows.push({ ...i, restaurantName: r.name }));
        } catch {}
      }
      lows.sort((a, b) => (Number(a.stock ?? 0) - Number(b.stock ?? 0)) || a.name.localeCompare(b.name));
      setLowStock(lows.slice(0, 10));
    } catch (e: any) {
      setError(e?.message || 'Không thể tải dữ liệu Dashboard');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Tổng quan</h2>
        <button onClick={() => void reload()} className="px-3 py-2 rounded-md bg-sky-600 hover:bg-sky-700 text-white flex items-center gap-2">
          <RefreshCcw size={16} />
          Tải lại
        </button>
      </div>

  {/* Thẻ thống kê */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {statCards.map((s, idx) => {
          const ts = toneStyles(s.tone);
          const Icon = s.Icon;
          return (
            <div key={idx} className={`rounded-xl border ${ts.border} bg-white shadow-sm hover:shadow-md transition-shadow p-5`}> 
              <div className="flex items-center justify-between">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${ts.iconBg}`}>
                  {Icon && <Icon size={18} className={ts.iconText} />}
                </div>
              </div>
              <div className="mt-2 text-sm text-gray-500">{s.label}</div>
              <div className={`mt-1 text-2xl font-semibold ${ts.valueText}`}>{s.value}</div>
              {s.sub && <div className="text-xs text-gray-400 mt-1">{s.sub}</div>}
            </div>
          );
        })}
      </div>

  {/* Hai cột: Trạng thái giao hàng và Trạng thái drone */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
        <Panel title="Trạng thái giao hàng">
          <StatusList data={deliveryStatusCounts} palette="rose" />
        </Panel>
        <Panel title="Trạng thái drone">
          <StatusList data={droneStatusCounts} palette="sky" />
        </Panel>
      </div>

  {/* Đơn gần đây + Sắp hết hàng */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Panel title="Đơn hàng gần đây">
          <table className="min-w-full text-sm">
            <thead className="text-gray-600">
              <tr>
                <th className="text-left px-3 py-2">ID</th>
                <th className="text-left px-3 py-2">Ngày</th>
                <th className="text-left px-3 py-2">Trạng thái</th>
                <th className="text-left px-3 py-2">Thanh toán</th>
                <th className="text-right px-3 py-2">Tổng</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map(o => (
                <tr key={o.id} className="border-t odd:bg-gray-50">
                  <td className="px-3 py-2 font-medium">{o.id}</td>
                  <td className="px-3 py-2">{new Date(o.createdAt).toLocaleString()}</td>
                  <td className="px-3 py-2">{o.status}</td>
                  <td className="px-3 py-2">{o.paymentStatus}</td>
                  <td className="px-3 py-2 text-right">{Number(o.total || 0).toLocaleString('vi-VN')}₫</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>

        <Panel title="Sản phẩm gần hết hàng">
          <table className="min-w-full text-sm">
            <thead className="text-gray-600">
              <tr>
                <th className="text-left px-3 py-2">Nhà hàng</th>
                <th className="text-left px-3 py-2">Tên</th>
                <th className="text-left px-3 py-2">Loại</th>
                <th className="text-right px-3 py-2">Tồn</th>
              </tr>
            </thead>
            <tbody>
              {lowStock.length === 0 && (
                <tr><td colSpan={4} className="px-3 py-4 text-center text-gray-500">Không có món nào gần hết hàng</td></tr>
              )}
              {lowStock.map((m, idx) => (
                <tr key={`${m.id}-${idx}`} className="border-t odd:bg-gray-50">
                  <td className="px-3 py-2">{m.restaurantName}</td>
                  <td className="px-3 py-2">{m.name}</td>
                  <td className="px-3 py-2">{m.type}</td>
                  <td className="px-3 py-2 text-right">{m.stock ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      </div>

  {/* Doanh thu và đơn đã giao theo ngày */}
      <div className="mt-6">
        <Panel title="Báo cáo theo ngày" tone="emerald">
          <div className="flex flex-wrap items-end gap-3 mb-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Từ ngày</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="border rounded px-2 py-1" />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Đến ngày</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="border rounded px-2 py-1" />
            </div>
            <div className="flex-1" />
            <div className="flex items-end gap-2">
              <button
                onClick={() => { const t = new Date(); setStartDate(toInputDate(t)); setEndDate(toInputDate(t)); }}
                className="px-2.5 py-1.5 border rounded text-sm hover:bg-gray-50"
              >Hôm nay</button>
              <button
                onClick={() => { const t = new Date(); const s = new Date(); s.setDate(t.getDate() - 6); setStartDate(toInputDate(s)); setEndDate(toInputDate(t)); }}
                className="px-2.5 py-1.5 border rounded text-sm hover:bg-gray-50"
              >7 ngày</button>
              <button
                onClick={() => { const t = new Date(); const s = new Date(t.getFullYear(), t.getMonth(), 1); setStartDate(toInputDate(s)); setEndDate(toInputDate(t)); }}
                className="px-2.5 py-1.5 border rounded text-sm hover:bg-gray-50"
              >Tháng này</button>
            </div>
            <div className="ml-2 text-right">
              <div className="text-sm text-gray-500">Tổng doanh thu (PAID) trong khoảng</div>
              <div className="text-2xl font-semibold text-emerald-700">{rangeTotal.toLocaleString('vi-VN')}₫</div>
            </div>
          </div>

          {daily.length === 0 ? (
            <div className="text-sm text-gray-500">Không có đơn hoàn tất trong khoảng thời gian này.</div>
          ) : (
            <div className="space-y-5">
              {daily.map(day => (
                <div key={day.date} className="border rounded-lg overflow-hidden">
                  <div className="px-4 py-2 bg-gray-50 flex items-center justify-between">
                    <div className="font-medium">{formatVNDate(day.date)}</div>
                    <div className="text-emerald-700 font-semibold">{day.total.toLocaleString('vi-VN')}₫</div>
                  </div>
                  <div className="p-3">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="text-gray-600">
                          <th className="text-left px-2 py-1">ID</th>
                          <th className="text-left px-2 py-1">Hoàn tất lúc</th>
                          <th className="text-right px-2 py-1">Tổng</th>
                        </tr>
                      </thead>
                      <tbody>
                        {day.orders
                          .sort((a, b) => +new Date(b.completedAt) - +new Date(a.completedAt))
                          .map(({ order: o, completedAt }) => (
                            <tr key={o.id} className="border-t odd:bg-gray-50">
                              <td className="px-2 py-1">{o.id}</td>
                              <td className="px-2 py-1">{new Date(completedAt).toLocaleTimeString()}</td>
                              <td className="px-2 py-1 text-right">{Number(o.total || 0).toLocaleString('vi-VN')}₫</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}

function groupCounts<T extends string>(arr: T[]): Record<T, number> {
  return arr.reduce((acc, k) => {
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {} as Record<T, number>);
}

function toneStyles(tone?: StatCard['tone']) {
  switch (tone) {
    case 'primary':
      return { border: 'border-sky-200', iconBg: 'bg-sky-100', iconText: 'text-sky-600', valueText: 'text-sky-700' };
    case 'success':
      return { border: 'border-emerald-200', iconBg: 'bg-emerald-100', iconText: 'text-emerald-600', valueText: 'text-emerald-700' };
    case 'warning':
      return { border: 'border-amber-200', iconBg: 'bg-amber-100', iconText: 'text-amber-600', valueText: 'text-amber-700' };
    case 'danger':
      return { border: 'border-rose-200', iconBg: 'bg-rose-100', iconText: 'text-rose-600', valueText: 'text-rose-700' };
    default:
      return { border: 'border-gray-200', iconBg: 'bg-gray-100', iconText: 'text-gray-600', valueText: 'text-gray-800' };
  }
}

function Panel({ title, children, tone }: { title: string; children: React.ReactNode; tone?: 'default' | 'emerald' | 'sky' | 'rose' }) {
  return (
    <div className="bg-white rounded-xl shadow overflow-hidden">
      <div className={`px-4 py-3 font-semibold border-b ${
        tone === 'emerald' ? 'bg-gradient-to-r from-emerald-50 to-white text-emerald-800 border-emerald-100'
        : tone === 'sky' ? 'bg-gradient-to-r from-sky-50 to-white text-sky-800 border-sky-100'
        : tone === 'rose' ? 'bg-gradient-to-r from-rose-50 to-white text-rose-800 border-rose-100'
        : 'text-gray-800 bg-gray-50 border-gray-100'
      }`}>{title}</div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function StatusList({ data, palette }: { data: Record<string, number>; palette: 'rose' | 'sky' }) {
  const total = Object.values(data).reduce((s, n) => s + n, 0) || 1;
  const keys = Object.keys(data);
  const color = (idx: number) => palette === 'rose'
    ? ['bg-rose-600','bg-rose-500','bg-rose-400','bg-rose-300','bg-rose-200'][idx % 5]
    : ['bg-sky-600','bg-sky-500','bg-sky-400','bg-sky-300','bg-sky-200'][idx % 5];
  return (
    <div className="space-y-2">
      {keys.length === 0 && <div className="text-sm text-gray-500">Không có dữ liệu</div>}
      {keys.map((k, idx) => (
        <div key={k} className="flex items-center gap-3">
          <div className={`w-2 h-2 rounded-full ${color(idx)}`} />
          <div className="flex-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-700">{k}</span>
              <span className="text-gray-500">{data[k]} ({Math.round((data[k] / total) * 100)}%)</span>
            </div>
            <div className="mt-1 h-2 bg-gray-100 rounded">
              <div className={`h-2 rounded ${color(idx)}`} style={{ width: `${(data[k] / total) * 100}%` }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Hàm tiện ích xử lý ngày tháng
function toInputDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function inputDateToStartOfDay(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 0, 0, 0, 0);
}

function inputDateToEndOfDay(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 23, 59, 59, 999);
}

function formatVNDate(input: string): string {
  // Đầu vào dạng YYYY-MM-DD
  const [y, m, d] = input.split('-').map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  return dt.toLocaleDateString('vi-VN');
}
