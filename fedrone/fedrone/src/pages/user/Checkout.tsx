// Trang Checkout
// - Nhập địa chỉ giao hàng, chọn chi nhánh
// - Hiển thị ước tính phí ship theo công thức backend trả về
// - Đặt hàng và chuyển sang luồng thanh toán/mock webhook
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cartApi, type Cart } from '../api/cart';
import { checkoutApi } from '../api/checkout';
import { paymentApi } from '../api/payment';
import { useAuth } from '../context/AuthContext';

// Leaflet (bản đồ)
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L, { LeafletMouseEvent } from 'leaflet';

// Khắc phục lỗi icon mặc định của Leaflet khi dùng với webpack/vite
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function ClickMarker({ onSet }: { onSet: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e: LeafletMouseEvent) {
      onSet(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function Checkout() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [address, setAddress] = useState('');
  const [suggestions, setSuggestions] = useState<Array<{ display_name: string; lat: string; lon: string }>>([]);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [lat, setLat] = useState<number | undefined>();
  const [lng, setLng] = useState<number | undefined>();
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ orderId: string; total: number; shippingFee: number } | null>(null);
  const [estimate, setEstimate] = useState<{ distanceKm: number; shippingFee: number; formula: string } | null>(null);
  const overLimit = useMemo(() => (estimate ? estimate.distanceKm > 15 || (estimate as any).overLimit === true : false), [estimate]);
  const [paid, setPaid] = useState<boolean>(false);

  useEffect(() => {
    (async () => {
      try {
        const c = await cartApi.get();
        setCart(c);
      } catch (e: any) {
        setError(e.message || 'Không tải được giỏ hàng');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const subtotal = useMemo(() => (cart?.items || []).reduce((s, it) => s + it.qty * (it.menuItem.price || 0), 0), [cart]);
  const totalWeight = useMemo(() => (cart?.items || []).reduce((s, it) => s + it.qty * (Number(it.menuItem.weight || 0)), 0), [cart]);
  const restaurantId = useMemo(() => localStorage.getItem('lastRestaurantId') || '', []);

  const onUseCurrentLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      setLat(pos.coords.latitude);
      setLng(pos.coords.longitude);
      reverseGeocode(pos.coords.latitude, pos.coords.longitude);
    });
  };

  const reverseGeocode = async (la: number, lo: number) => {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${la}&lon=${lo}&accept-language=vi`;
      const res = await fetch(url, { headers: { 'accept-language': 'vi' } });
      const data = await res.json();
      if (data?.display_name) setAddress(data.display_name);
    } catch {}
  };

  // Debounce fetch gợi ý địa chỉ từ Nominatim (OSM)
  useEffect(() => {
    const q = address?.trim();
    if (!q || q.length < 3) { setSuggestions([]); setSuggestOpen(false); return; }
    setSuggestLoading(true);
    const t = setTimeout(async () => {
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(q)}&addressdetails=1&limit=5&accept-language=vi&countrycodes=vn`;
        const res = await fetch(url, { headers: { 'accept-language': 'vi' } });
        const data = await res.json();
        setSuggestions(Array.isArray(data) ? data : []);
        setSuggestOpen(true);
      } catch (e) {
        setSuggestions([]);
        setSuggestOpen(false);
      } finally {
        setSuggestLoading(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [address]);

  const onPickSuggestion = (s: { display_name: string; lat: string; lon: string }) => {
    setAddress(s.display_name);
    setLat(parseFloat(s.lat));
    setLng(parseFloat(s.lon));
    setSuggestOpen(false);
    setSuggestions([]);
  };

  // Tự động ước tính khi có lat/lng (debounce nhẹ)
  useEffect(() => {
    const la = lat, lo = lng;
    if (!restaurantId || !la || !lo) return;
    const t = setTimeout(async () => {
      try {
        const est = await checkoutApi.estimate({ restaurantId, destLat: la, destLng: lo }, token || undefined);
        setEstimate(est as any);
      } catch (e: any) {
        // Nếu backend trả lỗi, giữ estimate hiện tại và hiển thị thông báo lỗi tổng quát
        // Nhưng do ta đã sửa backend trả estimate kể cả vượt limit, nên nhánh này hiếm khi xảy ra
        setError(e.message || 'Không ước tính được phí ship');
      }
    }, 300);
    return () => clearTimeout(t);
  }, [lat, lng, restaurantId, token]);

  const onConfirm = async () => {
    if (!cart) return;
    if (!lat || !lng) { setError('Vui lòng chọn vị trí giao hàng trên bản đồ'); return; }
    if (overLimit) { setError('Phạm vi bạn chọn quá giới hạn bay của chúng tôi, chúng tôi chỉ có thể giao bán kính 15km đổ lại'); return; }
    setSubmitting(true);
    setProgress(10);
    try {
      const items = cart.items.map((i) => ({ menuItemId: i.menuItemId, qty: i.qty }));
  const res = await checkoutApi.create({ restaurantId, address, destLat: lat, destLng: lng, items }, token || undefined);
  setResult({ orderId: res.orderId, total: Number(res.total), shippingFee: Number(res.shippingFee) });
      // fake progress
      for (const p of [40, 70, 100]) {
        await new Promise(r => setTimeout(r, 500));
        setProgress(p);
      }
    } catch (e: any) {
      setError(e.message || 'Thanh toán thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-6 py-8">
      <h2 className="text-3xl font-bold mb-6 text-sky-700">Thanh toán</h2>
      {loading && <div>Đang tải…</div>}
      {error && <div className="text-red-600 mb-4">{error}</div>}
      {!loading && !error && cart && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Bản đồ & địa chỉ */}
          <div className="lg:col-span-2 bg-white rounded-2xl border p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="font-semibold text-gray-900">Vị trí giao hàng</div>
              <button onClick={onUseCurrentLocation} className="px-3 py-1.5 rounded-lg bg-sky-100 text-sky-700 hover:bg-sky-200">Lấy vị trí hiện tại</button>
            </div>
            <div className="h-[360px] rounded-xl overflow-hidden border">
              <MapContainer center={[10.776, 106.700]} zoom={13} style={{ height: '100%', width: '100%' }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />
                {lat && lng && <Marker position={[lat, lng]} />}
                <ClickMarker onSet={(la, lo) => { setLat(la); setLng(lo); reverseGeocode(la, lo); }} />
              </MapContainer>
            </div>
            <div className="mt-4 relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">Địa chỉ chính xác (tùy chọn)</label>
              <input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                onFocus={() => suggestions.length && setSuggestOpen(true)}
                className="w-full px-4 py-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-sky-500"
                placeholder="Số nhà, tên đường, phường/xã, quận/huyện…"
              />
              {suggestOpen && (
                <div className="absolute z-20 mt-1 w-full bg-white border rounded-xl shadow max-h-64 overflow-auto">
                  {suggestLoading && <div className="px-3 py-2 text-sm text-gray-500">Đang gợi ý…</div>}
                  {!suggestLoading && suggestions.length === 0 && (
                    <div className="px-3 py-2 text-sm text-gray-500">Không có gợi ý phù hợp</div>
                  )}
                  {!suggestLoading && suggestions.map((s, idx) => (
                    <button
                      key={`${s.lat}-${s.lon}-${idx}`}
                      type="button"
                      onClick={() => onPickSuggestion(s)}
                      className="block w-full text-left px-3 py-2 hover:bg-sky-50 text-sm"
                    >
                      {s.display_name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {lat && lng && (
              <div className="mt-3 flex items-center justify-end">
                <button
                  type="button"
                  onClick={async () => {
                    if (lat === undefined || lng === undefined) return;
                    try {
                      const est = await checkoutApi.estimate({ restaurantId, destLat: lat, destLng: lng }, token || undefined);
                      setEstimate(est);
                    } catch (e: any) {
                      setError(e.message || 'Không ước tính được phí ship');
                    }
                  }}
                  className="px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                >
                  Xác nhận dùng vị trí này
                </button>
              </div>
            )}
          </div>

          {/* Xem lại đơn hàng */}
          <div className="bg-white rounded-2xl border p-4">
            <div className="font-semibold text-gray-900 mb-3">Xem lại đơn hàng</div>
            <div className="space-y-3 max-h-[320px] overflow-auto pr-1">
              {cart.items.map((it) => (
                <div key={it.id} className="flex items-center justify-between text-sm">
                  <div className="text-gray-700">{it.menuItem.name} × {it.qty}</div>
                  <div className="text-gray-900 font-medium">{(it.menuItem.price * it.qty).toLocaleString('vi-VN')} đ</div>
                </div>
              ))}
            </div>
            <div className="h-px bg-gray-200 my-3" />
            <div className="flex items-center justify-between text-sm">
              <div className="text-gray-600">Tiền hàng</div>
              <div className="font-semibold">{subtotal.toLocaleString('vi-VN')} đ</div>
            </div>
            {(result || estimate) && (
              <div className="flex items-center justify-between text-sm mt-1">
                <div className="text-gray-600">Tiền ship</div>
                <div className="font-semibold">{Number((result ? result.shippingFee : estimate?.shippingFee) || 0).toLocaleString('vi-VN')} đ</div>
              </div>
            )}
            {estimate && (
              <div className="text-xs text-gray-500 mt-1">
                Ghi chú: {estimate.formula} (khoảng cách ≈ {estimate.distanceKm.toFixed(2)} km)
              </div>
            )}
            {estimate && overLimit && (
              <div className="mt-2 p-3 rounded-lg border text-sm bg-red-50 border-red-200 text-red-800">
                Phạm vi bạn chọn quá giới hạn bay của chúng tôi. Chúng tôi chỉ có thể giao bán kính 15km đổ lại.
                Vui lòng chọn vị trí gần hơn để tiếp tục đặt hàng.
              </div>
            )}
            <div className="flex items-center justify-between text-sm mt-1">
              <div className="text-gray-600">Tổng trọng lượng</div>
              <div className="font-semibold">{totalWeight.toFixed(2)} kg</div>
            </div>
            <div className="h-px bg-gray-200 my-3" />
            <div className="flex items-center justify-between text-lg">
              <div className="font-semibold">Tổng cộng</div>
              <div className="font-bold text-sky-700">{((result ? result.total : (subtotal + (estimate?.shippingFee || 0)))).toLocaleString('vi-VN')} đ</div>
            </div>

            {/* Tiến trình */}
            {submitting || result ? (
              <div className="mt-4">
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-sky-500 to-blue-600" style={{ width: `${progress}%` }} />
                </div>
                <div className="text-xs text-gray-500 mt-1">Đang xử lý… {progress}%</div>
              </div>
            ) : null}

            {/* Thanh toán mô phỏng + hành động */}
            {result && (
              <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm">
                Đơn hàng đã tạo: <span className="font-semibold">{result.orderId}</span>{paid ? ' — Đã thanh toán' : ' — Chưa thanh toán'}
              </div>
            )}

            <div className="mt-4 flex items-center justify-end gap-3">
              <button onClick={() => navigate('/cart')} className="px-4 py-2.5 rounded-xl bg-amber-100 text-amber-700 hover:bg-amber-200">Quay lại giỏ hàng</button>
              {!result && (
                <button onClick={onConfirm} disabled={submitting || !lat || !lng || totalWeight > 5 || overLimit} className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 text-white font-semibold shadow hover:shadow-md disabled:opacity-60">Xác nhận</button>
              )}
              {result && !paid && (
                <button
                  onClick={async () => {
                    try {
                      const mc = await paymentApi.mockCharge(result.orderId, 'PAID');
                      await paymentApi.sendWebhook(mc.body, mc.signature);
                      setPaid(true);
                      try { localStorage.setItem('lastPaidOrderId', result.orderId); } catch {}
                      // Xoá giỏ hàng sau khi thanh toán thành công để tránh mua trùng
                      await cartApi.setItems([]);
                      // Đã bỏ huy hiệu số lượng giỏ hàng nên không cần reset/sự kiện
                      navigate(`/orders/${result.orderId}`);
                    } catch (e: any) {
                      setError(e.message || 'Thanh toán mô phỏng thất bại');
                    }
                  }}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold shadow hover:shadow-md"
                >
                  Thanh toán (mô phỏng)
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
