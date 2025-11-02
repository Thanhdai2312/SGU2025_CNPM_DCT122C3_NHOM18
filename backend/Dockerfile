# Build nhiều giai đoạn: build frontend (Vite) và backend (TypeScript), sau đó chạy server Node

# ---------- Build frontend (Vite) ----------
FROM node:20-alpine AS frontend-builder
WORKDIR /app/fedrone/fedrone

# Cài đặt dependencies (sử dụng cài đặt sạch - npm ci)
COPY fedrone/fedrone/package*.json ./
RUN npm ci

# Sao chép mã nguồn và build
COPY fedrone/fedrone/ .
# Tùy chọn: đặt API base về cùng origin bằng cách để trống VITE_API_BASE_URL
# ENV VITE_API_BASE_URL=""
RUN npm run build

# ---------- Build backend (TypeScript) ----------
FROM node:20-alpine AS backend-builder
WORKDIR /app/backend

# Cài đặt dependencies cho backend
COPY backend/package*.json ./
RUN npm ci

# Sao chép schema Prisma để tạo client lúc build
COPY backend/prisma ./prisma
RUN npx prisma generate

# Sao chép mã nguồn backend và build
COPY backend/tsconfig.json ./
COPY backend/src ./src
RUN npm run build

# ---------- Ảnh runtime ----------
FROM node:20-alpine AS runtime
WORKDIR /app/backend

# Chỉ cài đặt dependencies cho production
COPY backend/package*.json ./
RUN npm ci --omit=dev

# Sao chép thư mục dist đã build và các artifact của Prisma
COPY --from=backend-builder /app/backend/dist ./dist
COPY --from=backend-builder /app/backend/prisma ./prisma

# Sao chép bản build frontend vào thư mục public để backend phục vụ static
COPY --from=frontend-builder /app/fedrone/fedrone/dist ./public

# Biến môi trường
ENV NODE_ENV=production
EXPOSE 3000

# Entrypoint đơn giản: generate Prisma client, chạy migration rồi khởi động server
# (DATABASE_URL phải được cung cấp khi chạy)
# Dùng npx để gọi prisma CLI mà không cần cài đặt trong prod deps
CMD sh -c "npx --yes prisma generate && npx prisma migrate deploy && node dist/server.js"
