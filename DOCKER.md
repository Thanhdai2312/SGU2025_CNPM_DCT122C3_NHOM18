# Docker Deployment (Server + Client)

This repo includes a multi-stage Dockerfile (backend/Dockerfile) that builds both the frontend (Vite) and backend (Express). You can deploy a single container that serves the built frontend and the API, plus a MySQL container.

## Option A — One server (recommended)
- Server machine runs `docker compose up -d` and exposes port 3000.
- Clients open `http://<SERVER_IP>:3000` in a browser to use the app (no dev FE required).

### Steps (Server)
```cmd
cd C:\CONGNNGHEPHANMEM
REM Adjust IPs/origins in docker-compose.yml if needed (CORS_ORIGINS)
docker compose build
docker compose up -d
```
- The app is available at `http://<SERVER_IP>:3000`.
- MySQL is on `db:3306` inside the compose network, and forwarded to `localhost:3306` on server.

### Update CORS (if you will use dev FE on another machine)
Edit `docker-compose.yml`:
```
CORS_ORIGINS: "http://<CLIENT_IP>:5173,http://<SERVER_IP>:3000"
```
Restart:
```cmd
docker compose up -d --build
```

## Option B — Client runs FE dev, Server runs API
- Server: run `docker compose up -d` (same as above).
- Client: run FE dev and point API base to server IP.

### Steps (Client)
```cmd
cd fedrone\fedrone
echo VITE_API_BASE=http://<SERVER_IP>:3000 > .env
npm install
npm run dev
```
Open `http://localhost:5173` on client. The FE will call the server API.

## Useful commands
```cmd
REM See logs
docker compose logs -f app

docker compose logs -f db

REM Stop & remove
docker compose down

REM Rebuild after code changes
docker compose build --no-cache
```

## Notes
- The backend image runs `prisma generate` and `prisma migrate deploy` on start. Ensure `DATABASE_URL` is set correctly (compose sets it to `mysql://root:1234@db:3306/drone_fastfood`).
- For production, change `JWT_SECRET`, `PAYMENT_WEBHOOK_SECRET`, `METRICS_TOKEN`, and consider `DISABLE_WORKER=0`.
- If using public networks, secure ports and consider HTTPS (reverse proxy like Caddy/NGINX).
