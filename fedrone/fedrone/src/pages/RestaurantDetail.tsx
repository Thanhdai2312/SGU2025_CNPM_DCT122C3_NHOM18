// Trang chi tiết Nhà hàng: liệt kê menu và cho phép thêm món vào giỏ
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { restaurantsApi, type MenuItem, type Restaurant } from '../api/restaurants';
import { cartApi } from '../api/cart';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Toast from '../components/Toast';

// Ảnh món ăn/đồ uống (12 món chuẩn)
import imgBurger from '../../Ảnh/burger.jpg';
import imgCaesar from '../../Ảnh/caesar salad.jpg';
import imgCheesePizza from '../../Ảnh/cheese pizza.jpg';
import imgCola from '../../Ảnh/cola.jpg';
import imgFries from '../../Ảnh/french-fries.jpg';
import imgFriedChicken from '../../Ảnh/fried chicken.jpg';
import imgSalmon from '../../Ảnh/grilled-salmon.jpg';
import imgIcedTea from '../../Ảnh/iced-tea.jpg';
import imgOrangeJuice from '../../Ảnh/orange-juice.jpg';
import imgPepperoni from '../../Ảnh/pepperoni-pizza.jpg';
import imgSpaghetti from '../../Ảnh/spaghetti-bolognese.jpg';
import imgSushi from '../../Ảnh/sushi-set.jpg';

const IMAGE_MAP: Record<string, string> = {
  'seed-restaurant-1': 'https://images.pexels.com/photos/1639562/pexels-photo-1639562.jpeg?auto=compress&cs=tinysrgb&w=1600',
  'seed-restaurant-2': 'https://images.pexels.com/photos/941861/pexels-photo-941861.jpeg?auto=compress&cs=tinysrgb&w=1600',
  'seed-restaurant-3': 'https://images.pexels.com/photos/262978/pexels-photo-262978.jpeg?auto=compress&cs=tinysrgb&w=1600'
};

export default function RestaurantDetail() {
  const { id = '' } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const heroImage = useMemo(() => IMAGE_MAP[id] || IMAGE_MAP['seed-restaurant-1'], [id]);

  useEffect(() => {
    (async () => {
      try {
        const [restaurants, menuItems] = await Promise.all([
          restaurantsApi.list(),
          restaurantsApi.menu(id)
        ]);
        setRestaurant(restaurants.find(r => r.id === id) || null);
        // Loại bỏ món "Classic Burger" nếu có trong seed để tránh trùng lặp
        setMenu(menuItems.filter(m => m.name.toLowerCase() !== 'classic burger'));
      } catch (e: any) { setError(e.message || 'Load failed'); }
      finally { setLoading(false); }
    })();
    // lưu lại nhà hàng gần nhất để nút "Tiếp tục mua hàng" dùng
    if (id) localStorage.setItem('lastRestaurantId', id);
  }, [id]);

  const isDrinkName = (name: string) => {
    const n = name.toLowerCase();
    return /(cola|sprite|soda|tea|juice|milkshake|latte|cappuccino|coffee)/.test(n);
  };
  const foods = menu.filter(m => m.type ? m.type === 'FOOD' : !isDrinkName(m.name));
  const drinks = menu.filter(m => m.type ? m.type === 'DRINK' : isDrinkName(m.name));

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

  const onAdd = async (menuItemId: string) => {
    try {
      if (!user) { navigate('/login', { state: { from: location } }); return; }
  // Kiểm tra phía client: không cho thêm vượt quá số lượng tồn kho
      const current = await cartApi.get();
      const existing = current.items.find(i => i.menuItemId === menuItemId);
      const qty = existing ? existing.qty : 0;
      const menuItem = menu.find(m => m.id === menuItemId);
      const stock = (menuItem as any)?.stock;
      if (typeof stock === 'number' && qty >= stock) {
        // Hiển thị toast thân thiện cho người dùng
        setToast({ message: `❗ Món "${menuItem?.name || ''}" chỉ còn ${stock} phần trong kho, bạn đã chọn vượt quá giới hạn`, tone: 'error', variant: 'panel' });
        window.setTimeout(() => setToast(null), 3500);
        return;
      }
      await cartApi.addOne(menuItemId);
    } catch (e) {
      // Không chặn luồng; tuỳ chọn có thể hiển thị thông báo nhỏ sau
      console.error(e);
    }
  };

  const [toast, setToast] = useState<{ message: string; tone?: 'error'|'info'|'success'; variant?: 'toast' | 'panel' } | null>(null);

  return (
    <div>
  {/* Ảnh hero với nền mờ */}
      <div className="relative h-72 md:h-96 w-full overflow-hidden">
        <img src={heroImage} alt={restaurant?.name || id}
             className="absolute inset-0 w-full h-full object-cover scale-110 blur-sm" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent" />
        <div className="relative h-full flex items-end">
          <div className="container mx-auto px-6 pb-6">
            <h1 className="text-3xl md:text-5xl font-bold text-white drop-shadow">
              {restaurant?.name || 'Restaurant'}
            </h1>
            <p className="text-yellow-300/90 mt-2">{restaurant?.address}</p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-10 space-y-10">
        {loading && <div>Đang tải menu…</div>}
        {error && <div className="text-red-600">{error}</div>}

        {!loading && !error && (
          <>
            {/* Khu vực đồ ăn */}
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-amber-700">Đồ ăn</h2>
              <div className="h-1.5 w-full max-w-5xl bg-gradient-to-r from-amber-400 to-yellow-400 rounded-full my-3" />
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {foods.map((m) => (
                  <div key={m.id} className="group bg-white rounded-2xl shadow-md hover:shadow-xl border border-yellow-100 overflow-hidden transition-all">
                    <div className="h-40 overflow-hidden">
                      {(m.imageUrl || imgFor(m.name))
                        ? <img src={(m.imageUrl || imgFor(m.name))!} alt={m.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                        : <div className="h-full w-full bg-gradient-to-br from-yellow-200 via-amber-200 to-yellow-300" />}
                    </div>
                    <div className="p-5">
                      <h3 className="text-xl font-bold text-gray-900 group-hover:text-amber-600 transition-colors">{m.name}</h3>
                      <div className="mt-2 text-gray-500 text-sm">{m.weight ? `Trọng lượng: ${m.weight}kg` : ''}</div>
                      <div className="mt-1 font-semibold text-amber-700">Giá: {(m.price).toLocaleString('vi-VN')} đ</div>
                      <button onClick={() => onAdd(m.id)} disabled={m.stock != null && m.stock <= 0}
                              className={`mt-4 w-full py-2.5 rounded-xl shadow transition-all ${m.stock != null && m.stock <= 0 ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-gradient-to-r from-amber-500 to-yellow-500 text-white hover:shadow-lg'}`}>
                        {m.stock != null && m.stock <= 0 ? 'Hết hàng' : 'Thêm vào giỏ'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Khu vực thức uống */}
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-sky-700">Thức uống</h2>
              <div className="h-1.5 w-full max-w-5xl bg-gradient-to-r from-sky-400 to-blue-500 rounded-full my-3" />
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {drinks.map((m) => (
                  <div key={m.id} className="group bg-white rounded-2xl shadow-md hover:shadow-xl border border-sky-100 overflow-hidden transition-all">
                    <div className="h-40 overflow-hidden">
                      {(m.imageUrl || imgFor(m.name))
                        ? <img src={(m.imageUrl || imgFor(m.name))!} alt={m.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                        : <div className="h-full w-full bg-gradient-to-br from-sky-200 via-blue-200 to-sky-300" />}
                    </div>
                    <div className="p-5">
                      <h3 className="text-xl font-bold text-gray-900 group-hover:text-sky-700 transition-colors">{m.name}</h3>
                      <div className="mt-2 text-gray-500 text-sm">{m.weight ? `Trọng lượng: ${m.weight}kg` : ''}</div>
                      <div className="mt-1 font-semibold text-sky-700">Giá: {(m.price).toLocaleString('vi-VN')} đ</div>
                      <button onClick={() => onAdd(m.id)} disabled={m.stock != null && m.stock <= 0}
                              className={`mt-4 w-full py-2.5 rounded-xl shadow transition-all ${m.stock != null && m.stock <= 0 ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-gradient-to-r from-sky-500 to-blue-500 text-white hover:shadow-lg'}`}>
                        {m.stock != null && m.stock <= 0 ? 'Hết hàng' : 'Thêm vào giỏ'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
  {toast && <Toast message={toast.message} onClose={() => setToast(null)} tone={toast.tone} variant={toast.variant || 'panel'} />}
    </div>
  );
}
