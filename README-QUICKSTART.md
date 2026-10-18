# Chạy dự án trên máy mới

DB đã có sẵn trên **Supabase (production)** — không cần migrate / seed khi chạy local. Chỉ clone, cấu hình `.env`, bật Docker, rồi đăng nhập bằng tài khoản demo bên dưới.

Làm việc trong thư mục:

```text
online-recruitment-microservices/
```

---

## 1. Yêu cầu & cấu hình

- Docker Desktop (đã bật)
- File `.env` ở root monorepo (cùng cấp `docker-compose.yml`)

```bash
cp .env.example .env
```

Điền các biến bắt buộc (lấy từ Supabase / team):

| Biến | Mục đích |
| --- | --- |
| `DATABASE_URL` | Pooler `:6543` + `pgbouncer=true&connection_limit=1` |
| `DIRECT_URL` | Session/direct `:5432` |
| `JWT_SECRET` | ≥ 32 ký tự |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_STORAGE_BUCKET` | Upload CV |

---

## 2. Chạy stack

```bash
docker compose up --build
```

Hoặc nền:

```bash
docker compose up --build -d
docker compose logs -f
```

| Service | URL |
| --- | --- |
| Frontend | http://localhost:3000 |
| API Gateway | http://localhost:3001 |
| Health | http://localhost:3001/health |

Dừng: `docker compose down`

Sửa code trong `apps/web` / `apps/backend/src` → container tự reload.

---

## 3. Tài khoản đăng nhập

Mật khẩu chung: **`Demo@123456`**

Mở http://localhost:3000 → chọn tab role → đăng nhập.

| Role | Email | Mật khẩu | Redirect |
| --- | --- | --- | --- |
| **Ứng viên** | `candidate@demo.vn` | `Demo@123456` | `/candidate` |
| **Nhà tuyển dụng** | `hr@vpay.demo` | `Demo@123456` | `/recruiter` |
| **Quản trị** | `admin@demo.vn` | `Demo@123456` | `/admin` |

### Candidate khác

| Email | Họ tên |
| --- | --- |
| `minh.an@demo.vn` | Lê Minh An |
| `bao.ngoc@demo.vn` | Phạm Bảo Ngọc |
| `hoang.nam@demo.vn` | Trần Hoàng Nam |
| `thuy.linh@demo.vn` | Đỗ Thùy Linh |

### Recruiter — đã xác minh

| Email | Công ty |
| --- | --- |
| `hr@vpay.demo` | FinTech V-Pay Vietnam *(khuyên dùng)* |
| `talent@nexgen.demo` | NexGen Soft |
| `careers@trustcorp.demo` | TrustCorp Capital |
| `jobs@aivision.demo` | AI Vision Labs |
| `hr@pixelcraft.demo` | PixelCraft Studio |
| `hr@cloudnine.demo` | CloudNine Systems |
| `talent@finpulse.demo` | FinPulse Analytics |

### Recruiter — chờ / từ chối / đình chỉ (test admin)

| Email | Công ty | Trạng thái |
| --- | --- | --- |
| `hr@orbitech.demo` | OrbiTech | `PENDING_VERIFICATION` |
| `talent@cubeads.demo` | CubeAds Media | `PENDING_VERIFICATION` |
| `people@freightly.demo` | Freightly Logistics | `PENDING_VERIFICATION` |
| `compliance@shieldpay.demo` | ShieldPay Security | `REJECTED` |
| `people@growthlab.demo` | GrowthLab Media | `SUSPENDED` |

---

## Ghi chú

- PostgreSQL = Supabase cloud, không chạy Postgres trong Docker.
- Kafka trong compose = `apache/kafka`.
- Windows: đã bật polling cho hot-reload.
- CV upload → Supabase Storage.
