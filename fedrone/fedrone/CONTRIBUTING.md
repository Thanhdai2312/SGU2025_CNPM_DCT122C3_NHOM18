## Hướng dẫn đóng góp (Frontend - Fedrone)

Ứng dụng SPA bằng React + Vite + TypeScript. Giao diện gồm 2 vai trò chính: Khách hàng và Admin.

### Kiến trúc giao diện
- Router: `react-router-dom`
- State nhẹ: `useState/useEffect` + Context `AuthContext`
- Giao tiếp backend: thư mục `src/api/*`
- Trang: `src/pages` (khách) và `src/pages/admin` (quản trị)
- Thành phần dùng chung: `src/components`

### Luồng Khách hàng (Customer)
1) Duyệt nhà hàng và menu → thêm món vào Giỏ (`Cart`)
2) `Checkout`: nhập địa chỉ; FE gọi `/api/checkout/estimate` để ước tính phí ship; sau đó `POST /api/checkout` để tạo đơn
3) Thanh toán (mock): FE có thể gọi trang test để tạo webhook → Order về `CONFIRMED`
4) Theo dõi đơn (`OrderTracking`):
   - Nhận status/ETA/progress+vị trí drone
   - Ghi chú Bếp được hiển thị ngay trong dòng Trạng thái

### Luồng Quản trị (Admin)
- Bếp chi nhánh (`AdminKitchen`):
  - Lọc theo chi nhánh; Start (PREPARING) → Complete (kitchenDone=true; mở Delivery QUEUED)
- Giao hàng (`AdminDeliveries`):
  - Dispatch delivery (sau kitchenDone), cập nhật trạng thái
- Drone (`AdminDrones`):
  - Thêm/Sửa drone; chọn `Thuộc nhà hàng`/`Đang ở nhà hàng` bằng combobox
  - Nút “Trả về nhà hàng” khi đủ điều kiện
- Đơn hàng (`AdminOrders`):
  - Liệt kê toàn bộ đơn
- Người dùng (`AdminUsers`):
  - Tìm kiếm, lọc theo vai trò, xoá người dùng
- Sản phẩm (`AdminProducts`):
  - Quản lý menu từng chi nhánh

### Realtime
- Kênh `order:<id>`: khách theo dõi đơn
- `admin:drones`, `admin:dashboard`: Admin theo dõi drone/KPI

### Quy ước code
- Toàn bộ comment dùng tiếng Việt để dễ đọc
- API client đặt ở `src/api` và chỉ chịu trách nhiệm fetch/parse
- Trang chịu trách nhiệm UI/UX, hạn chế logic nặng
- Sử dụng combobox cho các trường chọn chi nhánh (ví dụ: drone stations)

### Chạy frontend
1) Sao chép `.env.example` thành `.env` và chỉnh `VITE_API_BASE_URL` nếu cần
2) Cài gói và build/dev:
   - Dev: `npm run dev`
   - Build: `npm run build`

### Gợi ý mở rộng
- Thêm bản đồ trực quan (Leaflet/Mapbox) để hiển thị đường bay
- Thêm i18n nếu muốn hỗ trợ đa ngôn ngữ
