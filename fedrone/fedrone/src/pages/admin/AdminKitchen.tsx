// Trang Bếp chi nhánh (Admin + Restaurant)
// - ADMIN: Có combobox chọn chi nhánh để xem đơn đang chờ bếp
// - RESTAURANT: Tự động cố định vào workRestaurantId, ẩn combobox và chỉ xem đơn của nhà hàng mình
// - Chức năng: Bắt đầu chuẩn bị (set PREPARING) → Hoàn tất (kitchenDone=true, tạo delivery QUEUED nếu chưa có)
// - Sau khi Hoàn tất, Admin mới có thể Dispatch ở màn giao hàng
import { useEffect, useMemo, useState } from 'react';
import { kitchenAdminApi, type KitchenOrder } from '../../api/kitchenAdmin';
import { CheckCircle2, Timer, User, Coffee } from 'lucide-react';
import { restaurantsApi, type Restaurant } from '../../api/restaurants';
import { getActiveAdminArea } from '../../utils/adminAuth';
import { useRestaurantName } from '../../hooks/useRestaurantName';

export default function AdminKitchen() {
  const [items, setItems] = useState<KitchenOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [branches, setBranches] = useState<Restaurant[]>([]);
  const [branchId, setBranchId] = useState<string>(() => localStorage.getItem('adminKitchenBranchId') || '');

  const { role, session } = useMemo(() => getActiveAdminArea(), []); // Lấy thông tin phiên hiện tại (admin hoặc restaurant)
  const isRestaurant = role === 'restaurant';
  const workRestaurantId = (session?.user as any)?.workRestaurantId as string | undefined;
  const { name: myRestaurantName } = useRestaurantName(workRestaurantId);

  const load = async (restaurantId?: string) => {
    try {
      setLoading(true); setError(null);
      const data = await kitchenAdminApi.listOrders(restaurantId);
      setItems(data);
    }
    catch (e: any) { setError(e?.message || 'Không tải được danh sách đơn cho bếp'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    (async () => {
      try {
        if (isRestaurant) {
          if (workRestaurantId) {
            setBranchId(workRestaurantId);
            await load(workRestaurantId);
          } else {
            setError('Không xác định được nhà hàng làm việc của bạn');
          }
          return;
        }
        const rs = await restaurantsApi.list();
        setBranches(rs);
        if (!branchId && rs[0]?.id) {
          setBranchId(rs[0].id);
          try { localStorage.setItem('adminKitchenBranchId', rs[0].id); } catch {}
          await load(rs[0].id);
          return;
        }
        await load(branchId || undefined);
      } catch (e: any) {
        setError(e?.message || 'Không tải được danh sách chi nhánh');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!branchId) return;
    try { localStorage.setItem('adminKitchenBranchId', branchId); } catch {}
    void load(branchId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId]);

  // Bắt đầu chế biến đơn (chuyển status CONFIRMED -> PREPARING)
  const onStart = async (id: string) => { try { await kitchenAdminApi.start(id); await load(branchId || undefined); } catch (e:any){ alert(e?.message || 'Không thể cập nhật'); } };
  // Hoàn tất chế biến (đánh dấu kitchenDone, tạo delivery nếu chưa có)
  const onComplete = async (id: string) => { try { await kitchenAdminApi.complete(id); await load(branchId || undefined); } catch (e:any){ alert(e?.message || 'Không thể cập nhật'); } };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Bếp chi nhánh</h2>
        {!isRestaurant ? (
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Chi nhánh:</label>
            <select
              className="px-3 py-1.5 rounded-lg border border-amber-200 bg-white"
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
            >
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
        ) : (
          <div className="px-3 py-1.5 rounded-lg border border-amber-200 bg-white text-sm text-gray-700" title={myRestaurantName || ''}>
            {myRestaurantName || 'Nhà hàng của tôi'}
          </div>
        )}
      </div>
      {error && <div className="mb-3 text-amber-800 bg-amber-50 border border-amber-200 rounded p-2">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading && <div className="text-gray-500">Đang tải…</div>}
        {!loading && items.length === 0 && <div className="text-gray-500">Chưa có đơn cần chế biến</div>}
        {items.map(o => (
          <div key={o.id} className="rounded-xl overflow-hidden shadow border ring-1 ring-amber-100">
            <div className="px-4 py-2 bg-gradient-to-r from-amber-50 to-white text-amber-800 border-b border-amber-100 flex items-center justify-between">
              <div className="font-semibold">Đơn: <span className="font-mono">{o.id}</span></div>
              <div className="text-sm flex items-center gap-1"><Timer className="w-4 h-4" />{new Date(o.createdAt).toLocaleString('vi-VN')}</div>
            </div>
            <div className="p-4">
              <div className="text-sm text-gray-600 flex items-center gap-2 mb-2"><User className="w-4 h-4" />Khách: <span className="text-gray-900">{o.user.name}</span></div>
              <div className="text-sm text-gray-600 mb-2">Món:</div>
              <ul className="text-sm text-gray-800 list-disc ml-5 mb-3">
                {o.items.map(it => (<li key={it.id}>{it.name} × {it.qty}</li>))}
              </ul>
              <div className="text-sm text-gray-600 mb-3">Trạng thái: <span className="font-medium">PAID</span></div>
              <div className="flex items-center gap-3">
                <button
                  className={`px-3 py-2 rounded border inline-flex items-center gap-2 ${o.status==='CONFIRMED' ? 'bg-amber-50 hover:bg-amber-100 border-amber-200 text-amber-800' : 'bg-gray-100 text-gray-400 cursor-not-allowed'} `}
                  disabled={o.status !== 'CONFIRMED'}
                  onClick={() => onStart(o.id)}
                >
                  <Coffee className="w-4 h-4" /> Đang chuẩn bị
                </button>
                <button
                  className={`px-3 py-2 rounded border inline-flex items-center gap-2 ${o.status==='PREPARING' && !o.kitchenDone ? 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-700' : 'bg-gray-100 text-gray-400 cursor-not-allowed'} `}
                  disabled={!(o.status==='PREPARING' && !o.kitchenDone)}
                  onClick={() => onComplete(o.id)}
                >
                  <CheckCircle2 className="w-4 h-4" /> Hoàn tất
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
