## Hướng dẫn đóng góp (Backend)

Tài liệu này mô tả kiến trúc backend, vòng đời giao hàng bằng drone, luồng Bếp, và cách phát triển. Toàn bộ chú thích dùng tiếng Việt để dễ tiếp cận.

### Kiến trúc tổng quan
- Nền tảng: Node.js + Express + TypeScript
- ORM: Prisma (MySQL)
- Realtime: Socket.io
- Xác thực: JWT
- Cấu trúc thư mục chính:
  - `src/api`: Tuyến API (auth, cart, checkout, orders, drone, delivery, kitchenAdmin, tracking, ...)
  - `src/services`: Nghiệp vụ (authService, cartService, checkoutService, droneService, deliveryWorker, distance/osrm, ...)
  - `src/repositories`: Lớp truy cập dữ liệu (user/order/restaurant/delivery/drone/cart)
  - `src/websocket`: Khởi tạo Socket.io, quản lý rooms
  - `prisma`: schema và migrations

### Vòng đời giao hàng (Customer)
1) Khách tạo đơn (Checkout): POST /api/checkout
   - Kiểm tra tồn kho/cân nặng/tầm bay, lưu Order + Payment(PENDING)
2) Khách thanh toán (Webhook): POST /api/payment/webhook
   - Idempotent + HMAC; nếu PAID → Order.paymentStatus=PAID, status=CONFIRMED
3) Bếp chi nhánh xử lý:
   - Start: /api/admin/kitchen/orders/:id/start → PREPARING + gửi note realtime cho khách
   - Complete: /api/admin/kitchen/orders/:id/complete → kitchenDone=true; tạo Delivery QUEUED nếu chưa có
4) Dispatch (Admin/Operator): /api/delivery/:id/dispatch
   - Chỉ khi kitchenDone=true; chọn drone phù hợp; tạo route nhiều pha; set ASSIGNED
5) Worker mô phỏng: `deliveryWorker`
   - Di chuyển drone mỗi “tick”, trừ pin 2%/km, đổi trạng thái EN_ROUTE/ARRIVED/COMPLETED
   - Về trạm gần nhất, sạc về 100%, đặt status=AVAILABLE

### Vòng đời vận hành (Admin)
- Quản lý món/chi nhánh: menuAdmin/restaurants
- Quản lý người dùng: usersAdmin
- Quản lý drone: drone (create/update/return-home, theo dõi realtime)
- Giao hàng: delivery (list/get/updateStatus/dispatch)
- Bếp chi nhánh: kitchenAdmin (lọc theo chi nhánh)

### Socket rooms
- `order:<id>`: khách nhận cập nhật trạng thái/ghi chú
- `admin:drones`: admin theo dõi drone realtime
- `admin:dashboard`: admin tổng hợp KPI

### Nguyên tắc phát triển
- Dùng Service để gom nghiệp vụ, Repository để giao tiếp DB
- Đặt tên biến/hàm rõ nghĩa, comment giải thích luồng bất thường
- Webhook luôn idempotent; không tạo Delivery tại webhook
- Dispatch gate: bắt buộc kitchenDone=true

### Chạy dự án
1) Cấu hình `.env` cho DB và JWT_SECRET
2) Migrate/generate prisma: `npm run prisma:generate` và `npm run prisma:migrate`
3) Dev: `npm run dev` (port 3000)

### Kiểm thử nhanh
- Gọi /api/checkout để tạo đơn → /api/payment/mock/charge để lấy chữ ký → /api/payment/webhook (PAID)
- Mở /api/admin/kitchen... để start/complete
- Dispatch delivery và theo dõi qua /api/tracking/:orderId
