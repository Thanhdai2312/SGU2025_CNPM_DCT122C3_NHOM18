# Kiến trúc backend 3 lớp – mô tả chi tiết (Dự án Drone Fastfood)

Tài liệu này giải thích cách phần backend đang tổ chức theo kiến trúc 3 lớp (Presentation/API → Service → Repository) và chúng liên kết với nhau như thế nào, dựa trên mã nguồn thực tế trong thư mục `backend/`.

- Môi trường: Node.js + Express + TypeScript
- ORM: Prisma (MySQL)
- Realtime: Socket.IO
- Cấu trúc chính:
  - Presentation/API (controller, middleware, websocket): `src/api/**`, `src/server.ts`, `src/websocket/**`
  - Service (business logic): `src/services/**`
  - Repository (data access): `src/repositories/**`, `prisma/schema.prisma`

---

## 1) Tổng quan cấu trúc thư mục

```
backend/
└─ src/
   ├─ api/                # Lớp Presentation/API (Express routers + middlewares)
   │  ├─ auth.ts
   │  ├─ cart.ts
   │  ├─ checkout.ts
   │  ├─ delivery.ts
   │  ├─ drone.ts
   │  ├─ health.ts
   │  ├─ kitchenAdmin.ts
   │  ├─ menuAdmin.ts
   │  ├─ orders.ts
   │  ├─ payment.ts
   │  ├─ restaurants.ts
   │  ├─ tracking.ts
   │  └─ middlewares.ts   # auth() – JWT & phân quyền
   │
   ├─ services/           # Lớp Service (nghiệp vụ)
   │  ├─ authService.ts
   │  ├─ cartService.ts
   │  ├─ checkoutService.ts
   │  ├─ deliveryWorker.ts
   │  ├─ distance.ts      # Haversine + OSRM fallback
   │  ├─ droneService.ts
   │  ├─ osrmService.ts
   │  ├─ paymentService.ts
   │  └─ restaurantService.ts
   │
   ├─ repositories/       # Lớp Repository (Prisma – truy cập DB)
   │  ├─ db.ts            # PrismaClient singleton
   │  ├─ cartRepository.ts
   │  ├─ deliveryRepository.ts
   │  ├─ droneRepository.ts
   │  ├─ orderRepository.ts
   │  ├─ restaurantRepository.ts
   │  └─ userRepository.ts
   │
   ├─ websocket/
   │  └─ server.ts        # Khởi tạo Socket.IO, xác thực JWT cho socket
   │
   └─ server.ts           # Express app, gắn routers, serve frontend, error handler

prisma/
└─ schema.prisma          # Mô hình dữ liệu (User/Order/Payment/Delivery/Drone/...)
```

---

## 2) Lớp Presentation/API (Express)

Vai trò: nhận HTTP request, validate đầu vào (zod nơi cần), xác thực & phân quyền (JWT), chuyển tiếp sang Service; chuẩn hoá phản hồi và lỗi.

- Điểm vào ứng dụng: `src/server.ts`
  - Nạp `.env`, cấu hình middleware: CORS, JSON, morgan.
  - Gắn các router: `/api/auth`, `/api/restaurants`, `/api/cart`, `/api/checkout`, `/api/payment`, `/api/orders`, `/api/drone`, `/api/delivery`, `/api/tracking`, `/api/admin/*`.
  - Phục vụ static frontend nếu tìm thấy `dist/` (SPA fallback) – hữu ích khi chạy một cổng duy nhất.
  - Khởi tạo WebSocket `initWebSocket()` và background worker `deliveryWorker.start()`.
  - Error handler cuối cùng trả JSON `{ message }` với status tương ứng.

- Middleware xác thực: `src/api/middlewares.ts`
  - `auth(requiredRoles?)`: 
    - Tách token từ header `Authorization: Bearer <jwt>`.
    - `jwt.verify()` lấy `{ sub, role }` và gắn vào `req.user`.
    - Nếu truyền `requiredRoles`, kiểm tra role; nếu không đủ quyền trả `403`.

- Ví dụ router tiêu biểu:
  - `src/api/auth.ts`
    - POST `/register` và `/login` sử dụng `zod` validate rồi gọi `authService`.
  - `src/api/checkout.ts`
    - POST `/` tạo đơn (gọi `checkoutService.checkout()`); GET `/estimate` tính phí ship tạm tính.
  - `src/api/payment.ts`
    - POST `/mock/charge` ký HMAC để mô phỏng cổng thanh toán.
    - POST `/webhook` xác thực chữ ký & idempotency, giao cho `paymentService.handleWebhook()`.
  - `src/api/kitchenAdmin.ts`
    - Bắt đầu chế biến `/orders/:orderId/start`, hoàn tất bếp `/orders/:orderId/complete` (mở Delivery QUEUED nếu chưa có), bắn realtime cho khách.
  - `src/api/drone.ts`
    - CRUD/Update drone, tra cứu khả dụng, gán drone cho đơn, dispatch delivery… gọi `DroneService` và `DeliveryRepository`.
  - `src/api/orders.ts`
    - Liệt kê đơn của tôi, liệt kê tất cả (ADMIN/OPERATOR), huỷ đơn (kiểm tra chủ sở hữu, trạng thái, time limit).

- WebSocket (giao diện realtime): `src/websocket/server.ts`
  - Khởi tạo Socket.IO trên HTTP server.
  - Xác thực JWT ở handshake; đặt `socket.data.userId/role`.
  - Các “rooms”/kênh:
    - `order:<orderId>`: khách theo dõi đơn.
    - `admin:drones`, `admin:dashboard`: admin theo dõi drone & KPI.

Kết luận: Lớp Presentation tập trung làm “adapter” HTTP/WebSocket – tách khỏi business logic (service) và data (repository).

---

## 3) Lớp Service (Business Logic)

Vai trò: chứa quy tắc nghiệp vụ, điều phối nhiều repository, tính toán, kiểm tra điều kiện, phát sự kiện realtime khi cần.

Các service chính:

- `authService.ts`
  - `register()`: kiểm tra trùng email/phone (qua `userRepository`), băm mật khẩu (bcrypt), tạo user, sinh JWT.
  - `login()`: xác thực mật khẩu, sinh JWT.

- `cartService.ts`
  - `get(userId)`: lấy/khởi tạo giỏ, trả chi tiết items.
  - `setItems(userId, items)`: validate tồn tại menuItem, kiểm tra tồn kho, upsert từng dòng, xoá các dòng không còn.

- `checkoutService.ts`
  - Nhận input (nhà hàng, địa chỉ, tọa độ, items), tự suy ra `restaurantId` từ các `menuItemId` hiện hành, đảm bảo tất cả thuộc cùng một nhà hàng.
  - Tính `subtotal` (giá x số lượng, kiểm tra tồn kho thời điểm checkout), tính khoảng cách (`distance.ts`) → phí ship = max(10.000đ, 5.000đ/km).
  - Giới hạn bán kính 15km; nếu vượt báo lỗi (để UI chặn).
  - Tạo Order + OrderItems + Payment(PENDING) trong 1 transaction. KHÔNG tạo Delivery ở đây.

- `paymentService.ts`
  - `signPayload(body)`: HMAC SHA256 với `PAYMENT_WEBHOOK_SECRET` để mô phỏng chữ ký webhook.
  - `handleWebhook(idempotencyKey, orderId, status)`: 
    - Idempotent theo `WebhookEvent(idempotencyKey)`.
    - Nếu `PAID`: cập nhật Payment và Order (`paymentStatus=PAID`, `status=CONFIRMED`). Nếu `FAILED`: đánh dấu thất bại.
    - Phát sự kiện `admin:dashboard` để cập nhật KPI/doanh thu.
    - KHÔNG tạo Delivery – chỉ khi bếp hoàn tất.

- `droneService.ts` (tóm tắt)
  - Danh sách / tạo / cập nhật drone (qua `DroneRepository`).
  - `assignDroneToOrder`/`dispatchDelivery`: chọn drone phù hợp (trọng lượng, tầm bay, pin, ưu tiên), tạo `Delivery`, tạo/điều chỉnh `Route`.

- `deliveryWorker.ts` (worker nền – mô phỏng hành trình)
  - Vòng lặp định kỳ:
    - `ASSIGNED → EN_ROUTE` (set `startedAt`, `eta`, bắn socket).
    - Với `EN_ROUTE`: tính bước di chuyển theo tốc độ giả lập (10s/km), giảm pin (2%/km), hỗ trợ nhiều pha: về trạm sạc, sạc, đi khách… Cập nhật `drone.currentLat/Long/battery` + socket.
    - Khi “đến khách”: set `COMPLETED`, trừ tồn kho theo `orderItems`, lên kế hoạch “quay về trạm gần nhất” và sạc cho tới `AVAILABLE`.

- `distance.ts`/`osrmService.ts`
  - Tính khoảng cách Haversine, có thể gọi OSRM nếu cấu hình.

Ghi chú: Một số logic nhỏ còn lại ở API (ví dụ `orders.ts` xử lý huỷ đơn) – có thể chuyển dần vào `orderService` nếu muốn tách triệt để.

---

## 4) Lớp Repository (Data Access – Prisma)

Vai trò: đóng gói thao tác DB (CRUD, truy vấn tổng hợp), không chứa nghiệp vụ thuần tuý.

- `repositories/db.ts`
  - `export const prisma = new PrismaClient()` dùng chung.

- Ví dụ repositories:
  - `orderRepository.ts`: `findById`, `listByUser`, `listAll` (kèm include/select tối ưu cho UI).
  - `userRepository.ts`: tìm theo email/phone, tạo user, liệt kê theo role/tìm kiếm, đếm theo vai trò, xoá cascade toàn bộ dữ liệu liên quan.
  - `deliveryRepository.ts`: tạo/cập nhật/lấy Delivery, helper `etaMinutes` → `eta Date`.
  - `droneRepository.ts`: list kèm thông tin trạm, tạo, cập nhật thuộc tính drone.
  - `cartRepository.ts`, `restaurantRepository.ts`: quản lý giỏ, nhà hàng/menu.

- Mô hình dữ liệu (trích `prisma/schema.prisma`):
  - `User` (role: CUSTOMER/ADMIN), `Restaurant`, `MenuItem` (tồn kho tuỳ chọn), `Order` (status + paymentStatus + kitchenDone), `OrderItem`, `Payment`, `Drone` (status/pin/vị trí/trạm), `Delivery` (status/eta/timestamps), `Route` (path JSON phases), `Cart`/`CartItem`, `WebhookEvent` (idempotency).

---

## 5) Dòng chảy end-to-end tiêu biểu (request → response)

1) Đăng ký/Đăng nhập
- API `POST /api/auth/register|login` (Presentation)
- Gọi `authService.register|login` (Service) → `userRepository` (Repository) → Prisma
- Trả JWT; mọi API sau đi qua `auth()` để xác thực/phân quyền.

2) Quản lý giỏ và đặt hàng (Checkout)
- Khách thêm/sửa giỏ qua `cartService` (Service) → `cartRepository` (Repository).
- `POST /api/checkout`: Presentation gọi `checkoutService.checkout()`:
  - Load `menuItem` hiện hành → suy ra `restaurantId` → tính `subtotal`, `shippingFee` (giới hạn 15km) → transaction tạo `Order + Items + Payment(PENDING)`.
  - Trả `{ orderId, total, shippingFee }` cho FE để hiển thị & tiến hành thanh toán mock.

3) Thanh toán (Webhook)
- Bên ngoài gọi `POST /api/payment/webhook` với `idempotency-key` + `x-signature`.
- API xác minh chữ ký → `paymentService.handleWebhook()` idempotent:
  - `PAID`: `Order.status=CONFIRMED`, `Order.paymentStatus=PAID`.
  - Phát socket cho `admin:dashboard`.

4) Bếp hoàn tất (Kitchen → mở giao hàng)
- Admin vào `/api/admin/kitchen/orders` (Presentation) để xem các đơn đã thanh toán chưa hoàn tất bếp.
- `POST /api/admin/kitchen/orders/:id/start`: set `PREPARING`, bắn socket cho phòng `order:<id>`.
- `POST /api/admin/kitchen/orders/:id/complete`: set `kitchenDone=true`, tạo `Delivery(QUEUED)` nếu chưa có.

5) Dispatch & vận hành giao hàng
- Operator/Admin gọi `POST /api/delivery/:id/dispatch`:
  - `DroneService.dispatchDelivery` chọn drone phù hợp, set `ASSIGNED` và tạo/điều chỉnh `Route`.
- `DeliveryWorker` tick nền:
  - `ASSIGNED → EN_ROUTE` (đặt `eta`, `startedAt`, bắn socket `order-update` + `admin:drones`).
  - Di chuyển nhiều pha, giảm pin, cập nhật toạ độ, bắn realtime.
  - Khi tới khách: `COMPLETED`, trừ tồn kho, lập kế hoạch quay về trạm gần nhất, sạc → `AVAILABLE`.

6) Huỷ đơn (khách)
- `POST /api/orders/:id/cancel`: kiểm tra chủ sở hữu, trạng thái, thời gian kể từ `createdAt` <= 60s, nếu hợp lệ set `CANCELED` và bắn socket cho phòng `order:<id>`.

---

## 6) Cách các lớp liên kết với nhau

- Presentation gọi Service qua các hàm thuần TypeScript, chuyển dữ liệu đã được validate và thông tin xác thực từ `req.user`.
- Service gọi Repository để truy cập dữ liệu; gói nhiều thao tác vào transaction khi cần tính nhất quán (Prisma `$transaction`).
- Service có thể phát realtime qua `ioInstance` (Socket.IO) khi trạng thái thay đổi quan trọng.
- Repository chỉ thao tác DB, không áp điều kiện nghiệp vụ (ví dụ giới hạn 15km nằm ở Service, không ở Repository).

Sơ đồ luồng (ví dụ Checkout):
```
[Client] --POST /api/checkout--> [API Controller]
  -> validate + auth -> [checkoutService]
    -> read MenuItem/Restaurant (Repository)
    -> tính phí/giới hạn -> $transaction tạo Order/Items/Payment
  <- { orderId, total, shippingFee }
```

---

## 7) Chuẩn lỗi, validate, bảo mật

- JWT: `auth()` gắn `req.user` và kiểm soát quyền theo role.
- Validate: `zod` dùng trong các API quan trọng (auth, drone, delivery…). Có thể mở rộng áp dụng cho tất cả endpoints (DTO input/output).
- Idempotency + Signature: `payment/webhook` dùng `idempotency-key` và HMAC SHA256.
- Error handler: mọi lỗi cuối cùng trả JSON `{ message }` và status (mặc định 500 nếu không khai báo).

---

## 8) Mở rộng/đóng góp theo 3 lớp

Khi thêm một nghiệp vụ mới, quy trình khuyến nghị:
- Repository: thêm hàm truy vấn/ghi dữ liệu tối thiểu cần thiết; giữ pure data access.
- Service: thêm hàm triển khai quy tắc nghiệp vụ, kết hợp nhiều repo/transaction, ném lỗi có `status` rõ ràng.
- API: 
  - validate đầu vào bằng `zod`/schema
  - gọi service và map lỗi → HTTP code hợp lý
  - kiểm soát quyền qua `auth(requiredRoles)` nếu cần
- Realtime: nếu cần thông báo UI ngay, phát sự kiện qua `ioInstance` tới room phù hợp.

Ví dụ khung mẫu:
```ts
// repositories/fooRepository.ts
export const fooRepository = { findById: (id: string) => prisma.foo.findUnique({ where: { id } }) };

// services/fooService.ts
export const fooService = { doX: async (p: X) => { /* nghiệp vụ + repo */ } };

// api/foo.ts
router.post('/x', auth(['ADMIN']), asyncHandler(async (req, res) => {
  const input = schema.parse(req.body);
  const result = await fooService.doX(input);
  res.status(201).json(result);
}));
```

---

## 9) Những điểm đã làm tốt vs có thể cải tiến

- Đã tốt
  - Phân lớp rõ: router mỏng – service chịu nghiệp vụ – repository chịu dữ liệu.
  - Dùng transaction cho thao tác liên quan (checkout, webhook, hoàn tất giao…).
  - Realtime socket rooms phân tách cho khách và admin.
  - Idempotency webhook + chữ ký HMAC, hạn chế race condition.

- Có thể cải tiến
  - Tách `orderService` gom các thay đổi trạng thái đơn (cancel, confirm, prepare, delivered…) để API mỏng hơn nữa.
  - Chuẩn hoá DTO + validate cho tất cả endpoints (hiện mới áp dụng nhiều ở auth/drone/delivery/checkout).
  - Áp dụng Dependency Injection (ví dụ qua factory) để dễ unit test service/repo.
  - Viết unit test cho service quan trọng: `checkoutService`, `paymentService`, `droneService`.
  - Thêm policy kiểm soát rate-limit cho các endpoint nhạy (login, webhook).

---

## 10) Phụ lục: Bảng mapping nhanh

| Tính năng                  | API (Presentation)           | Service                 | Repository/DB                         |
|----------------------------|------------------------------|-------------------------|---------------------------------------|
| Đăng ký/Đăng nhập          | `api/auth.ts`                | `authService.ts`        | `userRepository.ts` + Prisma          |
| Giỏ hàng                   | `api/cart.ts`                | `cartService.ts`        | `cartRepository.ts`                   |
| Checkout                   | `api/checkout.ts`            | `checkoutService.ts`    | Prisma (Order/OrderItem/Payment)      |
| Thanh toán (webhook)       | `api/payment.ts`             | `paymentService.ts`     | `WebhookEvent`, `Payment`, `Order`    |
| Bếp (start/complete)       | `api/kitchenAdmin.ts`        | (logic tại API + Prisma)| Prisma (Order, Delivery)              |
| Drone (CRUD, assign, dispatch)| `api/drone.ts`            | `droneService.ts`       | `droneRepository.ts`, `deliveryRepository.ts` |
| Giao hàng (list/detail)    | `api/delivery.ts`            | `DroneService`/Repo     | `deliveryRepository.ts`               |
| Đơn hàng (mine/all/cancel) | `api/orders.ts`              | (nên tách `orderService`)| `orderRepository.ts`                 |
| Realtime                   | `websocket/server.ts`        | (phát từ Service/Worker)| Socket.IO + io rooms                  |

---

Tài liệu này phản ánh đúng mã nguồn tại thời điểm hiện tại trên nhánh `main`. Nếu bạn muốn, mình có thể bổ sung sơ đồ trình tự (sequence diagram) cho từng luồng hoặc triển khai ngay các cải tiến đã nêu (DTO + validate đồng nhất, tách `orderService`, thêm unit tests).