<div align="center">

# 🍔🚁 Drone Fastfood — Hệ thống giao đồ ăn bằng drone

**Nền tảng giao đồ ăn full‑stack kết nối nhà hàng, khách hàng và điều phối giao hàng theo thời gian thực.**

<sub>Học phần: Công nghệ phần mềm — Lớp DCT122C3 — Nhóm 18</sub>

</div>


## ✨ Tính năng chính

- Đăng ký/Đăng nhập, phân quyền (Khách hàng, Quản trị)
- Quản lý nhà hàng và thực đơn (món ăn, đồ uống, tồn kho cơ bản)
- Giỏ hàng, đặt món, thanh toán giả lập, theo dõi đơn hàng thời gian thực
- Điều phối giao hàng bằng “drone” mô phỏng (Socket.IO/WebSocket)
- Trang quản trị: người dùng, đơn hàng, thực đơn, theo dõi giao hàng

## 🧰 Tech Stack

- Frontend: React + Vite + TypeScript, Tailwind
- Backend: Node.js + Express + TypeScript
- CSDL: MySQL + Prisma ORM
- Thời gian thực: Socket.IO

---

## 🚀 Bắt đầu (Chạy bằng npm — không dùng Docker)

Yêu cầu trước:
- Cài Node.js (khuyến nghị v20)
- MySQL 8.0 đang chạy trên máy
- Tạo sẵn database `drone_fastfood` (hoặc để Prisma tạo khi migrate)

### 1) Cấu hình môi trường Backend

Tại thư mục `backend`, sao chép `.env.example` thành `.env` và chỉnh nếu cần. Mặc định dự án sử dụng cổng 3000.

Ví dụ `.env` tối thiểu:

```env
PORT=3000
JWT_SECRET=changeme-in-dev
DATABASE_URL=mysql://root:1234@localhost:3306/drone_fastfood
PAYMENT_WEBHOOK_SECRET=dev-webhook-secret
# OSRM_BASE_URL=https://router.project-osrm.org
```

### 2) Cài dependencies và khởi tạo CSDL

Backend:

```cmd
cd /d C:\CONGNNGHEPHANMEM\backend
npm install
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

Frontend:

```cmd
cd /d C:\CONGNNGHEPHANMEM\fedrone\fedrone
npm install
```

### 3) Chạy chế độ phát triển (hot reload)

- Backend (ts-node):

```cmd
cd /d C:\CONGNNGHEPHANMEM\backend
npm run dev
# Server lắng nghe tại http://localhost:3000
```

- Frontend (Vite):

```cmd
cd /d C:\CONGNNGHEPHANMEM\fedrone\fedrone
set VITE_API_BASE_URL=http://localhost:3000
npm run dev
# Vite tại http://localhost:5173
```

Mở giao diện Dev: http://localhost:5173

### 4) Chạy kiểu “production” trên máy (không Docker)

Build frontend và để backend phục vụ file tĩnh:

```cmd
cd /d C:\CONGNNGHEPHANMEM\fedrone\fedrone
npm run build

cd /d C:\CONGNNGHEPHANMEM\backend
if not exist public mkdir public
robocopy ..\fedrone\fedrone\dist public /E

npm run build
npm run start
# Ứng dụng tại http://localhost:3000
```

### 5) Tài khoản Admin và dữ liệu mẫu

- Sau khi migrate + seed, dữ liệu mẫu (nhà hàng, món) sẽ có sẵn.
- Nếu cần quyền Admin nhanh:

```cmd
mysql -uroot -p1234 -D drone_fastfood -e "UPDATE User SET role='ADMIN' WHERE email='YOUR_EMAIL@EXAMPLE.COM';"
```

- Trang Admin (dev): http://localhost:5173/admin/login
- Trang Admin (prod local): http://localhost:3000/admin/login

---

## 🗂️ Cấu trúc dự án (rút gọn)

```
SGU2025_CNPM_DCT122C3_NHOM18/
├─ backend/                  # API Express + Prisma
│  ├─ src/                   # controllers, services, repositories
│  ├─ prisma/                # schema.prisma, migrations, seed
│  ├─ public/                # (build FE) static files được phục vụ
│  └─ package.json
└─ fedrone/
	└─ fedrone/               # Ứng dụng React + Vite
		├─ src/
		├─ index.html
		└─ package.json
```

## 🧪 Một số API tiêu biểu

- Auth: `POST /api/auth/register`, `POST /api/auth/login`
- Nhà hàng: `GET /api/restaurants`
- Giỏ hàng/Đặt món: `POST /api/orders`, `GET /api/orders/:id`
- Giao hàng: `GET /api/delivery`, theo dõi qua WebSocket

## 🛠️ Khắc phục sự cố nhanh

- “@prisma/client did not initialize yet” → chạy `npm run prisma:generate`
- Không kết nối MySQL → kiểm tra `DATABASE_URL`, MySQL đang chạy, quyền user
- Trùng cổng → đổi `PORT` trong `backend/.env` và cập nhật `VITE_API_BASE_URL`
- Không thấy dữ liệu → chạy `npm run prisma:seed` hoặc dùng nút seed trong Admin UI

---

## 👥 Nhóm thực hiện

- Phan Thành Đại — 3122411036
- Lê Đoàn Hồng Phúc — 3122411155

> Giảng viên hướng dẫn: TS. Nguyễn Quốc Huy
