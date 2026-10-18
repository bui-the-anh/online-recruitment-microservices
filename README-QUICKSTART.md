# Chạy dự án trên máy mới

## Yêu cầu

- Docker Desktop
- File `.env` với `DATABASE_URL` (Supabase) và `JWT_SECRET` (≥32 ký tự)

## Chạy toàn bộ (FE + BE + Apache Kafka)

```bash
docker compose up --build
```

Hoặc nền:

```bash
docker compose up --build -d
docker compose logs -f
```

| Service | URL / cổng |
| --- | --- |
| Frontend (Next.js watch) | http://localhost:3000 |
| API Gateway | http://localhost:3001 |
| Health | http://localhost:3001/health |
| Apache Kafka | container `careerlink-kafka` |

Sửa code trong `apps/web` hoặc `apps/backend/src` trên máy → container tự reload (volume mount + `nest start --watch` / `next dev`).

Dừng:

```bash
docker compose down
```

## Ghi chú

- PostgreSQL dùng Supabase (`DATABASE_URL`), không chạy Postgres trong Docker.
- Kafka là `apache/kafka` (Apache Kafka), không phải Redpanda.
- Windows: compose đã bật `CHOKIDAR_USEPOLLING` / `WATCHPACK_POLLING` để hot-reload ổn định.
