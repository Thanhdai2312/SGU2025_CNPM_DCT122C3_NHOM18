// Trang Giỏ hàng: hiển thị các món đã chọn, chỉnh số lượng, tiếp tục tới Checkout
import { useEffect, useState } from 'react';
import Toast from '../../components/Toast';
import { cartApi, type Cart } from '../../api/cart';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { droneApi } from '../../api/drone';

// Ảnh 12 món giống với trang menu nhà hàng
import imgBurger from '../../../Ảnh/burger.jpg';
import imgCaesar from '../../../Ảnh/caesar salad.jpg';
import imgCheesePizza from '../../../Ảnh/cheese pizza.jpg';
import imgCola from '../../../Ảnh/cola.jpg';
import imgFries from '../../../Ảnh/french-fries.jpg';
import imgFriedChicken from '../../../Ảnh/fried chicken.jpg';
import imgSalmon from '../../../Ảnh/grilled-salmon.jpg';
import imgIcedTea from '../../../Ảnh/iced-tea.jpg';
import imgOrangeJuice from '../../../Ảnh/orange-juice.jpg';
import imgPepperoni from '../../../Ảnh/pepperoni-pizza.jpg';
import imgSpaghetti from '../../../Ảnh/spaghetti-bolognese.jpg';
import imgSushi from '../../../Ảnh/sushi-set.jpg';

export default function Cart() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const loc = useLocation();
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [availability, setAvailability] = useState<{ availableCount: number; maxCapacityKg: number } | null>(null);

  useEffect(() => {
    (async () => {
      if (!user) { navigate('/login', { state: { from: loc } }); return; }
      try {
        const c = await cartApi.get();
        setCart(c);
  // Đã bỏ đồng bộ huy hiệu giỏ hàng trên Header
        // lấy tình trạng drone tổng quan
        const a = await droneApi.availability();
        setAvailability(a);
      } catch (e: any) { setError(e.message || 'Lỗi tải giỏ hàng'); }
      finally { setLoading(false); }
    })();
  }, [user]);

  const updateQty = async (menuItemId: string, qty: number) => {
    try {
      const c = await cartApi.updateQty(menuItemId, qty);
      setCart(c);
      // Đã bỏ huy hiệu số lượng giỏ hàng
    } catch (e) { console.error(e); }
  };

  const [toast, setToast] = useState<{ message: string; tone?: 'error'|'info'|'success'; variant?: 'toast' | 'panel' } | null>(null);

  const showStockToast = (name: string, remaining: number) => {
    const msg = `❗ Món "${name}" chỉ còn ${remaining} phần trong kho, bạn đã chọn vượt quá giới hạn`;
  setToast({ message: msg, tone: 'error', variant: 'panel' });
    window.setTimeout(() => setToast(null), 3500);
  };

  const subtotal = (cart?.items || []).reduce((s, it) => s + it.qty * (it.menuItem.price || 0), 0);
  const totalWeight = (cart?.items || []).reduce((s, it) => s + it.qty * (Number(it.menuItem.weight || 0)), 0);
  const overCapacity = totalWeight > 5; // theo yêu cầu note cứng 5kg
  const noAvailableDrone: boolean = !overCapacity && (availability ? availability.availableCount <= 0 : false);

  const ITEM_IMAGES: Record<string, string> = {
    'fried chicken': imgFriedChicken,
    'cola': imgCola,
    'cheese pizza': imgCheesePizza,
    'pepperoni pizza': imgPepperoni,
    'caesar salad': imgCaesar,
    'spaghetti bolognese': imgSpaghetti,
    'sushi set': imgSushi,
    'grilled salmon': imgSalmon,
    'french fries': imgFries,
    'iced tea': imgIcedTea,
    'orange juice': imgOrangeJuice,
    'crispy chicken burger': imgBurger,
  };
  const imgFor = (name: string) => ITEM_IMAGES[name.toLowerCase()];

  return (
    <div className="container mx-auto px-6 py-10">
      <h2 className="text-3xl font-bold mb-6 text-amber-700">Giỏ hàng</h2>
      {loading && <div>Đang tải…</div>}
      {error && <div className="text-red-600">{error}</div>}
      {!loading && !error && (
  <div className="space-y-4">
          {(cart?.items || []).map((it) => (
            <div key={it.id} className="flex items-center gap-4 bg-white rounded-2xl border border-amber-100 p-4 shadow-sm">
              <div className="w-24 h-20 rounded-xl overflow-hidden flex-shrink-0">
                {imgFor(it.menuItem.name)
                  ? <img src={imgFor(it.menuItem.name)} alt={it.menuItem.name} className="w-full h-full object-cover" />
                  : <div className="w-full h-full bg-gradient-to-br from-yellow-200 via-amber-200 to-yellow-300" />}
              </div>
              <div className="flex-1">
                <div className="text-lg font-semibold text-gray-900">{it.menuItem.name}</div>
                <div className="text-sm text-gray-500">{it.menuItem.weight ? `Trọng lượng: ${it.menuItem.weight}kg` : ''}</div>
                <div className="text-sm font-medium text-amber-700">Giá: {(it.menuItem.price).toLocaleString('vi-VN')} đ</div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => updateQty(it.menuItemId, it.qty - 1)} className="w-8 h-8 rounded-full bg-amber-100 hover:bg-amber-200 text-amber-700 font-bold">-</button>
                <div className="w-10 text-center font-semibold">{it.qty}</div>
                {
                  // Đọc tồn kho từ menuItem.stock do backend trả (nếu có)
                  (() => {
                    const available = (it.menuItem as any).stock;
                    const remaining = typeof available === 'number' ? available : Infinity;
                    const disabledInc = it.qty >= remaining;
                    return (
                      <button
                        onClick={() => {
                          if (disabledInc) {
                            showStockToast(it.menuItem.name, remaining === Infinity ? 0 : remaining);
                            return;
                          }
                          updateQty(it.menuItemId, it.qty + 1);
                        }}
                        className={`w-8 h-8 rounded-full ${disabledInc ? 'bg-gray-100 text-gray-400' : 'bg-amber-100 hover:bg-amber-200 text-amber-700 font-bold'}`}>
                        +
                      </button>
                    );
                  })()
                }
                <button onClick={() => updateQty(it.menuItemId, 0)} className="ml-3 px-3 py-1.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50">Xóa</button>
              </div>
            </div>
          ))}
          <div className="grid gap-3 mt-6">
            <div className="flex items-center justify-between bg-white rounded-2xl border border-amber-100 p-4">
              <div className="text-lg font-semibold">Tạm tính</div>
              <div className="text-2xl font-bold text-amber-700">{subtotal.toLocaleString('vi-VN')} đ</div>
            </div>
            <div className="flex items-center justify-between bg-white rounded-2xl border border-sky-100 p-4">
              <div className="text-lg font-semibold">Tổng trọng lượng</div>
              <div className="text-xl font-bold text-sky-700">{totalWeight.toFixed(2)} kg</div>
            </div>
            {overCapacity && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">
                Drone của nhà hàng chỉ có thể giao &lt;= 5kg. Vui lòng bớt số lượng để tiếp tục.
              </div>
            )}
            {!overCapacity && noAvailableDrone && (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-3 text-sm">
                Hệ thống hiện tại đang hết drone để giao hàng. Vui lòng thử lại sau.
              </div>
            )}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  const lastId = localStorage.getItem('lastRestaurantId');
                  navigate(lastId ? `/restaurants/${lastId}` : '/');
                }}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-white font-semibold shadow hover:shadow-md"
              >
                ← Tiếp tục mua hàng
              </button>
              <button
                onClick={() => navigate('/checkout')}
                disabled={overCapacity || noAvailableDrone}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 text-white font-semibold shadow hover:shadow-md disabled:opacity-60"
              >
                Tiến hành thanh toán ➜
              </button>
            </div>
          </div>
        </div>
      )}
  {toast && <Toast message={toast.message} onClose={() => setToast(null)} tone={toast.tone} variant={toast.variant || 'panel'} />}
    </div>
  );
}
