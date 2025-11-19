# Hướng dẫn chạy đa máy (2 máy khách + 1 backend)

## 1. Chuẩn bị Backend
1. Chọn máy làm server (máy S) và cài Node.js + MySQL.
2. Cấu hình `.env` trong `backend/` (ví dụ):
```
PORT=3000
HOST=0.0.0.0
JWT_SECRET=dev-secret
CORS_ORIGINS=http://<IP_S>:5173,http://<IP_S>:3000,http://<IP_CLIENT1>:5173,http://<IP_CLIENT2>:5173
PAYMENT_WEBHOOK_SECRET=dev-webhook-secret
```
- `<IP_S>`: địa chỉ LAN của máy server (xem bằng `ipconfig`).
- Thêm IP/máy domain frontend cần truy cập.

3. Khởi động backend:
```cmd
cd backend
npm install
npm run prisma:migrate   (nếu có script, hoặc: npx prisma migrate deploy)
npm run build
npm start
```
Backend log sẽ hiển thị: `HTTP + WebSocket server lắng nghe tại http://YOUR_IP:3000`.

## 2. Chuẩn bị Frontend trên mỗi máy client (C1, C2)
1. Tạo file `.env` trong `fedrone/fedrone/`:
```
VITE_API_BASE=http://<IP_S>:3000
```
2. Cài và chạy:
```cmd
cd fedrone\fedrone
npm install
npm run dev
```
3. Truy cập: `http://localhost:5173` trên mỗi máy → FE sẽ gọi API về máy S.

## 3. WebSocket & Realtime
- Socket.IO dùng cùng domain `http://<IP_S>:3000`.
- Không cần cấu hình thêm nếu FE dùng `VITE_API_BASE` vì client code lấy chung base.
- Các kênh: `order:<orderId>`, `admin:drones`, `admin:dashboard`.

## 4. Quy trình kiểm thử đa máy
1. Máy C1: đăng ký / đăng nhập dưới vai trò CUSTOMER, tạo giỏ, checkout → xuất hiện Order `CREATED`.
2. Gọi webhook/payment mock (hoặc thao tác UI nếu có) → Order chuyển sang `PAID/CONFIRMED`.
3. Máy C2 (Admin hoặc Restaurant): mở trang Bếp `/admin` hoặc `/restaurant` → thấy đơn ở trạng thái `CONFIRMED`.
4. Máy C2: Start → Order `PREPARING` (C1 tracking thấy realtime nếu đang ở trang theo dõi).
5. Máy C2: Complete → tạo Delivery `QUEUED`.
6. Máy C2 (Admin): Dispatch → Delivery `ASSIGNED`, Worker chuyển `EN_ROUTE` → C1 nhận cập nhật vị trí drone.
7. Worker hoàn tất → trạng thái `COMPLETED`, giảm tồn kho; Dashboard cập nhật.

## 5. Những lỗi thường gặp & Khắc phục
| Vấn đề | Nguyên nhân | Cách xử lý |
|--------|-------------|-----------|
| FE không gọi được API | Sai `VITE_API_BASE` hoặc firewall chặn cổng 3000 | Kiểm tra IP, mở firewall cho Node hoặc dùng `netsh advfirewall` add rule |
| Không thấy đơn ở máy Admin | Webhook chưa được gửi / thanh toán chưa xác nhận | Kiểm tra Payment Service log hoặc gọi lại mock webhook |
| RESTAURANT không thấy đơn | Sai `workRestaurantId` hoặc đăng nhập role khác | Đảm bảo account có `workRestaurantId` đúng chi nhánh |
| WebSocket không realtime | Trình duyệt chặn hoặc backend log lỗi token | Kiểm tra token gửi qua handshake; mở DevTools tab Network (WS) |
| CORS lỗi | Chưa thêm origin frontend vào `CORS_ORIGINS` | Bổ sung origin vào env và restart backend |

## 6. Bảo mật tối thiểu
- Không để `CORS_ORIGINS=*` trong production; giới hạn domain/IP cụ thể.
- Dùng HTTPS/ngrok khi test webhook từ internet.
- Thay `JWT_SECRET`, `PAYMENT_WEBHOOK_SECRET` bằng giá trị mạnh hơn.

## 7. Thay đổi mã liên quan
- `backend/src/server.ts`: thêm CORS_ORIGINS và HOST=0.0.0.0.
- `backend/src/websocket/server.ts`: dùng chung danh sách origins.
- `fedrone/fedrone/src/api/client.ts`: hỗ trợ cả `VITE_API_BASE` và `VITE_API_BASE_URL`.
- `fedrone/fedrone/.env.example`: thêm biến `VITE_API_BASE`.

## 8. Lệnh nhanh tổng hợp
Máy Server:
```cmd
cd backend
npm install
npm run build
npm start
```
Máy Client:
```cmd
cd fedrone\fedrone
npm install
echo VITE_API_BASE=http://<IP_S>:3000 > .env
npm run dev
```

## 10. Ví dụ cấu hình thực tế (máy này làm Server)
Giả sử IP Wi-Fi của máy Server: `10.61.71.220` (xem bằng `ipconfig`).

File `backend/.env` mẫu:
```env
PORT=3000
HOST=0.0.0.0
JWT_SECRET=dev-secret-change
PAYMENT_WEBHOOK_SECRET=dev-webhook-secret-change
CORS_ORIGINS=http://10.61.71.220:5173
RATE_LIMIT_WINDOW=60000
RATE_LIMIT_MAX=120
METRICS_TOKEN=secret-metrics-token
DATABASE_URL=mysql://root:1234@localhost:3306/drone_fastfood
```

Khởi động backend:
```cmd
cd backend
npm install
npm run prisma:migrate
npm run build
npm start
```

Trên mỗi máy client tạo `.env`:
```env
VITE_API_BASE=http://10.61.71.220:3000
```
Sau đó:
```cmd
cd fedrone\fedrone
npm install
npm run dev
```

Kiểm tra metrics (cần header nếu đặt token):
```cmd
curl -H "x-metrics-token: secret-metrics-token" http://10.61.71.220:3000/api/metrics
```

Nếu dùng mạng VPN (Radmin) thay IP Wi-Fi hãy thay `10.61.71.220` bằng IP VPN (ví dụ `26.181.61.232`).

## 9. Gợi ý mở rộng
- Thêm script `npm run dev:lan` tự động in địa chỉ IP.
- Thêm health check `/api/health` hiển thị thời gian chạy worker.
- Thêm metrics endpoint `/api/metrics` cho Prometheus.

---
Tài liệu này hỗ trợ demo đa máy: một backend dùng chung, nhiều frontend truy cập và nhận realtime update.
