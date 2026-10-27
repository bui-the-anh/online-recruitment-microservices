# CareerLink — Nền tảng tuyển dụng trực tuyến

CareerLink kết nối Ứng viên (Candidate) với Nhà tuyển dụng (Recruiter), đồng
thời cung cấp cho Quản trị viên (Admin) các công cụ xác minh doanh nghiệp,
kiểm duyệt tin tuyển dụng và quản lý trạng thái tài khoản. Tài liệu nghiệp vụ,
kiến trúc, cấu trúc dữ liệu, hướng dẫn chạy Docker và tài khoản demo được tập
trung tại README này.

## 1. Phạm vi và nghiệp vụ

### 1.1 Vai trò người dùng

| Vai trò | Nghiệp vụ |
| --- | --- |
| **Candidate — Ứng viên** | Đăng ký/đăng nhập; quản lý hồ sơ cá nhân; tìm kiếm, lọc và xem tin/công ty công khai; ứng tuyển kèm CV (upload file); theo dõi đơn và trạng thái; nhận thông báo. |
| **Recruiter — Nhà tuyển dụng** | Đăng ký; xem/sửa hồ sơ công ty (logo, cover, gallery, văn phòng…); theo dõi xác minh; sau khi `ACTIVE` + `VERIFIED` thì tạo/sửa/đóng tin; quản lý pipeline ứng viên; đổi mật khẩu; tùy chọn thông báo; quản lý phiên đăng nhập; xem dashboard. |
| **Admin — Quản trị viên** | Dashboard; hàng đợi xác minh Recruiter và duyệt tin; khóa/mở khóa Recruiter; nhật ký audit; cài đặt thông báo/phiên/mật khẩu. |

Ẩn nút trên giao diện không thay thế cho xác thực, phân quyền, kiểm tra quyền sở
hữu và kiểm tra điều kiện nghiệp vụ ở Backend.

### 1.2 Quy trình xác minh Recruiter

1. Recruiter đăng ký; tài khoản có `verificationStatus = PENDING_VERIFICATION`.
2. Recruiter gửi thông tin doanh nghiệp qua hồ sơ công ty (`PUT /api/companies/me`).
3. Admin rà soát hồ sơ và chọn `VERIFIED` hoặc `REJECTED`.
4. Chỉ Recruiter có `accountStatus = ACTIVE` **và**
   `verificationStatus = VERIFIED` mới được đăng tin.
5. Việc xác minh tài khoản không tự động phê duyệt các tin tuyển dụng.

### 1.3 Quy trình đăng và kiểm duyệt tin

1. Recruiter đủ điều kiện tạo tin; tin mới bắt đầu ở trạng thái `PENDING`.
2. Admin kiểm tra nội dung và chuyển sang `APPROVED` hoặc `REJECTED`.
3. Tin `APPROVED` chưa hết hạn mới xuất hiện trong danh sách công khai và nhận
   đơn ứng tuyển.
4. Khi từ chối, Admin phải nêu lý do; Recruiter chỉnh sửa và gửi lại để kiểm
   duyệt.
5. Recruiter chỉ được đóng tin đã duyệt (`CLOSED`).

### 1.4 Quy trình ứng tuyển

1. Candidate xem tin `APPROVED`, upload CV lên Supabase Storage
   (`POST /api/uploads/cv`), rồi gửi `jobId`, `cvUrl`, thư giới thiệu tùy chọn.
2. Mỗi đơn lưu CV tại thời điểm ứng tuyển; cập nhật hồ sơ Candidate không thay
   thế CV của đơn đã gửi.
3. Một Candidate chỉ được nộp một đơn cho mỗi tin tuyển dụng.
4. Recruiter chỉ xem hồ sơ ứng tuyển thuộc các tin do mình quản lý.
5. Thay đổi trạng thái hợp lệ:

   | Trạng thái hiện tại | Trạng thái tiếp theo |
   | --- | --- |
   | `APPLIED` | `VIEWED`, `REJECTED` |
   | `VIEWED` | `INTERVIEW`, `REJECTED` |
   | `INTERVIEW` | `ACCEPTED`, `REJECTED` |
   | `ACCEPTED`, `REJECTED` | Trạng thái kết thúc |

   Khi chuyển sang `INTERVIEW`, Recruiter có thể gửi
   `interviewScheduledAt` và `interviewDetails`.

### 1.5 Khóa và mở khóa Recruiter

- Admin khóa bằng cách đặt `accountStatus = SUSPENDED`. Guard từ chối phiên
  đăng nhập hiện có ở yêu cầu tiếp theo; Recruiter không thể tạo/quản lý tin
  hoặc xử lý hồ sơ.
- Mở khóa chuyển `SUSPENDED` về `ACTIVE`; `verificationStatus` không thay đổi.
- Việc khóa tài khoản không tự động đổi trạng thái tin hay đơn ứng tuyển.

### 1.6 Cài đặt hệ thống (Admin / Recruiter)

- Đổi mật khẩu (`POST /api/auth/change-password`): mật khẩu mới ≥ 8 ký tự, có
  chữ hoa, chữ thường, số và ký tự đặc biệt.
- Tùy chọn thông báo lưu trong `user_settings` (`GET`/`PATCH /api/settings`).
  - Admin: tin chờ duyệt, Recruiter đăng ký mới, âm báo trình duyệt.
  - Recruiter: ứng viên nộp đơn, Admin duyệt/từ chối tin, nhắc phỏng vấn, báo cáo tuần.
- Quản lý phiên: liệt kê thiết bị/IP/UA từ `refresh_tokens`; thu hồi một phiên
  hoặc tất cả phiên khác.

### 1.7 Quy tắc bảo mật và quyền

- Candidate chỉ đọc/quản lý hồ sơ và đơn ứng tuyển của chính mình.
- Recruiter chỉ quản lý công ty, tin và ứng viên thuộc phạm vi của mình.
- Admin thực hiện thao tác quản trị; hệ thống ghi nhật ký kiểm duyệt tin, xác
  minh và khóa/mở khóa tài khoản.
- Recruiter chưa xác minh hoặc bị tạm khóa không được đăng tin.
- Chỉ tin đã duyệt được truy vấn công khai; CV chỉ trả về cho đúng Recruiter
  quản lý tin hoặc Candidate sở hữu đơn.
- Tài khoản `ADMIN` không được tạo qua API đăng ký công khai.

## 2. Trạng thái nghiệp vụ

Các nhóm trạng thái độc lập, không suy ra lẫn nhau:

| Đối tượng | Trường | Giá trị | Ý nghĩa |
| --- | --- | --- | --- |
| Recruiter | `verificationStatus` | `PENDING_VERIFICATION` | Chờ Admin xác minh |
| Recruiter | `verificationStatus` | `VERIFIED` | Đã xác minh |
| Recruiter | `verificationStatus` | `REJECTED` | Bị từ chối xác minh |
| Người dùng | `accountStatus` | `ACTIVE` | Đang hoạt động |
| Người dùng | `accountStatus` | `SUSPENDED` | Bị khóa/tạm ngưng |
| Tin tuyển dụng | `status` | `PENDING` | Chờ kiểm duyệt |
| Tin tuyển dụng | `status` | `APPROVED` | Đã duyệt, có thể công khai |
| Tin tuyển dụng | `status` | `REJECTED` | Bị từ chối, có thể chỉnh sửa gửi lại |
| Tin tuyển dụng | `status` | `CLOSED` | Đã đóng |
| Đơn ứng tuyển | `status` | `APPLIED` | Đã nộp |
| Đơn ứng tuyển | `status` | `VIEWED` | Đã được xem |
| Đơn ứng tuyển | `status` | `INTERVIEW` | Đang phỏng vấn |
| Đơn ứng tuyển | `status` | `ACCEPTED` | Được chấp nhận |
| Đơn ứng tuyển | `status` | `REJECTED` | Bị từ chối |

Ví dụ: Recruiter có thể đã `VERIFIED` nhưng đang `SUSPENDED`; mở khóa không
thay đổi kết quả xác minh.

## 3. Kiến trúc và cây thư mục

```text
.
├── apps/
│   ├── web/                         # Next.js 15 App Router, Tailwind CSS
│   │   ├── app/
│   │   │   ├── page.tsx             # Đăng nhập (3 tab role + autofill demo)
│   │   │   ├── register/            # Đăng ký Candidate / Recruiter
│   │   │   ├── candidate/           # Tìm việc, apply, đơn, hồ sơ, công ty
│   │   │   ├── recruiter/           # Dashboard, tin, ứng viên, công ty, settings
│   │   │   └── admin/               # Dashboard, duyệt tin, Recruiter, audit, settings
│   │   ├── components/              # Shell theo role, UI primitives
│   │   └── lib/api.ts               # Axios + cookie credentials + refresh
│   └── backend/                     # NestJS monorepo
│       ├── prisma/schema.prisma     # PostgreSQL / Supabase
│       └── src/
│           ├── common/              # Guard JWT/cookie, lỗi tiếng Việt, Supabase upload
│           ├── gateway.controller.ts
│           ├── auth/                # Auth, settings, sessions, Admin Recruiter
│           ├── jobs/                # Công ty, tin, kiểm duyệt
│           ├── applications/        # Ứng tuyển, pipeline trạng thái
│           ├── notifications/       # Thông báo + Kafka consumer
│           ├── events/              # Kafka producer
│           └── services/            # Entry point từng microservice
├── scripts/
│   ├── api-smoke.mjs                # Smoke API 3 role
│   └── api-e2e.mjs                  # E2E create→approve→apply→pipeline
├── docker-compose.yml               # Kafka + Gateway + 4 services + Web
└── README.md
```

### 3.1 Thành phần

- **Next.js (port 3000)** — portal đầy đủ theo 3 role (xem mục 3.4). Gọi API
  Gateway qua Axios (`withCredentials`). Token chỉ nằm trong cookie `HttpOnly`;
  không lưu access/refresh token trong `localStorage` / `sessionStorage`.
- **NestJS API Gateway (port 3001)** — REST, xác minh cookie access token, kiểm
  tra role/trạng thái tài khoản, chuyển tiếp yêu cầu đồng bộ qua TCP tới các
  service; xử lý upload CV/ảnh công ty lên Supabase Storage.
- **Auth Service** — đăng ký/đăng nhập/refresh/logout, hồ sơ Candidate, settings,
  đổi mật khẩu, phiên (`refresh_tokens` + meta thiết bị), thao tác Admin về
  Recruiter/audit.
- **Job Service** — công ty (brand, media, offices…), tin tuyển dụng, kiểm duyệt.
- **Application Service** — đơn ứng tuyển, CV theo đơn, chuyển trạng thái pipeline.
- **Notification Service** — lưu thông báo, consumer Kafka, API danh sách/đọc.
- **Apache Kafka** — broker bất đồng bộ (trong Docker Compose: `apache/kafka`).
  Topic: `recruiter.registered`, `recruiter.verified`,
  `recruiter.verification.rejected`, `recruiter.suspended`,
  `recruiter.reactivated`, `job.approved`, `job.rejected`,
  `application.submitted`, `application.status.updated`.
- **Prisma + PostgreSQL (Supabase)** — một database dùng chung; mỗi service sở
  hữu logic theo bounded context, không truy vấn ngoài trách nhiệm nghiệp vụ.

TCP bind `0.0.0.0` trong Docker Compose (mạng nội bộ container). Không expose
cổng TCP microservice ra Internet.

### 3.2 Xác thực, cookie và mật khẩu

- Đăng ký/đăng nhập trả thông tin người dùng trong JSON; token chỉ đặt vào
  cookie `HttpOnly`, `SameSite=Lax`.
- Access token 15 phút; refresh token 7 ngày, xoay vòng mỗi lần refresh.
- DB chỉ lưu SHA-256 hash trong `refresh_tokens` kèm `user_agent`, `ip_address`,
  `device_label` để quản lý phiên. Đăng xuất / revoke thu hồi token và xóa cookie.
- Cookie bật `Secure` khi `NODE_ENV=production`. CORS chỉ cho phép origin
  frontend cấu hình và bật credentials.
- Mật khẩu băm bằng `bcryptjs` (cost 12).
- Gateway kiểm tra trạng thái tài khoản trên mỗi request riêng tư; tài khoản vừa
  bị khóa không tiếp tục dùng access token cũ.

### 3.3 Chuẩn lỗi tiếng Việt

Backend có exception filter toàn cục; lỗi API có cùng cấu trúc:

```json
{
  "success": false,
  "error": {
    "code": "DU_LIEU_KHONG_HOP_LE",
    "message": "Dữ liệu yêu cầu không hợp lệ"
  },
  "path": "/api/jobs",
  "timestamp": "2026-01-01T00:00:00.000Z"
}
```

Không trả stack trace hay thông báo tiếng Anh thô cho client. Frontend dùng
`formatApiError` và Axios interceptor để hiển thị tiếng Việt.

### 3.4 Giao diện theo role (đã triển khai)

| Role | Route chính |
| --- | --- |
| Public | `/` đăng nhập · `/register` · `/register/recruiter` |
| Candidate | `/candidate` · `/candidate/jobs/:id` · `/candidate/jobs/:id/apply` · `/candidate/applications` · `/candidate/profile` · `/candidate/companies` |
| Recruiter | `/recruiter` · `/recruiter/jobs` · `/recruiter/jobs/new` · `/recruiter/candidates` · `/recruiter/company` · `/recruiter/company/edit` · `/recruiter/settings` |
| Admin | `/admin` · `/admin/jobs` · `/admin/recruiters` · `/admin/recruiters/:id` · `/admin/audit` · `/admin/settings` |

## 4. Cấu trúc bảng PostgreSQL

Tên bảng thực tế dùng `snake_case`; UUID là khóa chính; thời gian dùng
`TIMESTAMPTZ`. Enum Prisma map sang PostgreSQL enum.

| Bảng | Cột chính | Quan hệ / ràng buộc |
| --- | --- | --- |
| `users` | `id`, `email`, `password_hash`, `full_name`, `role`, `account_status`, `verification_status`, `created_at`, `updated_at` | Email duy nhất; role `CANDIDATE` / `RECRUITER` / `ADMIN`. |
| `user_settings` | `user_id`, prefs thông báo Admin/Recruiter, `updated_at` | 1–1 với `users`; cascade delete. |
| `candidate_profiles` | `user_id`, `phone`, `location`, `headline`, `bio`, skills/JSON, mức lương kỳ vọng… | 1–1 với Candidate. |
| `companies` | `recruiter_id`, `name`, brand/legal, mô tả, website, industry, offices/JSON, logo/cover/gallery URL, MST, liên hệ, license document… | Mỗi Recruiter tối đa một công ty. |
| `jobs` | `company_id`, `recruiter_id`, `title`, mô tả/yêu cầu/phúc lợi, `employment_type`, `work_mode`, skills/JSON, lương, `status`, `rejection_note`, `published_at`, `expires_at` | Chỉ tin `APPROVED` công khai. |
| `applications` | `job_id`, `candidate_id`, `cv_url`, `cover_letter`, `status`, `interview_scheduled_at`, `interview_details` | Unique `(job_id, candidate_id)`. |
| `notifications` | `user_id`, `type`, `title`, `body`, `payload`, `read_at` | Index theo người nhận / đọc / thời gian. |
| `audit_logs` | `actor_id`, `target_id`, `action`, `entity_type`, `entity_id`, `details` | Nhật ký thao tác quản trị. |
| `refresh_tokens` | `user_id`, `token_hash`, `expires_at`, `revoked_at`, `user_agent`, `ip_address`, `device_label` | Chỉ lưu hash SHA-256; phục vụ session list/revoke. |

### 4.1 Enum dữ liệu

- `Role`: `CANDIDATE`, `RECRUITER`, `ADMIN`
- `AccountStatus`: `ACTIVE`, `SUSPENDED`
- `VerificationStatus`: `PENDING_VERIFICATION`, `VERIFIED`, `REJECTED`
- `JobStatus`: `PENDING`, `APPROVED`, `REJECTED`, `CLOSED`
- `EmploymentType`: `FULL_TIME`, `PART_TIME`, `CONTRACT`, `INTERNSHIP`, `TEMPORARY`
- `WorkMode`: `ONSITE`, `HYBRID`, `REMOTE`
- `ApplicationStatus`: `APPLIED`, `VIEWED`, `INTERVIEW`, `ACCEPTED`, `REJECTED`

### 4.2 ERD rút gọn

```text
User 1──0..1 CandidateProfile
User 1──0..1 UserSettings
User 1──0..1 Company 1──N Job 1──N Application N──1 User(Candidate)
User 1──N Notification
User 1──N RefreshToken
User(Admin) 1──N AuditLog(actor); User(target) 0..N AuditLog
```

## 5. REST API

Base URL mặc định: `http://localhost:3001`. Endpoint nghiệp vụ dưới `/api`.
Login / register / refresh / logout dùng cookie; Gateway không trả token trong body.

| Method | Endpoint | Quyền | Mục đích |
| --- | --- | --- | --- |
| `GET` | `/health` | Công khai | DB + trạng thái từng service TCP (`ok` / `degraded`). |
| `POST` | `/api/auth/register` | Công khai | Đăng ký Candidate hoặc Recruiter. |
| `POST` | `/api/auth/login` | Công khai | Đăng nhập, đặt cookie phiên. |
| `POST` | `/api/auth/refresh` | Cookie refresh | Xoay vòng phiên. |
| `POST` | `/api/auth/logout` | Đã đăng nhập | Thu hồi refresh token, xóa cookie. |
| `GET` | `/api/auth/me` | Đã đăng nhập | User hiện tại. |
| `POST` | `/api/auth/change-password` | Đã đăng nhập | Đổi mật khẩu. |
| `GET` | `/api/auth/sessions` | Đã đăng nhập | Danh sách phiên đang hoạt động. |
| `POST` | `/api/auth/sessions/:id/revoke` | Đã đăng nhập | Đăng xuất một thiết bị. |
| `POST` | `/api/auth/sessions/revoke-others` | Đã đăng nhập | Đăng xuất mọi thiết bị khác. |
| `GET` / `PATCH` | `/api/settings` | Đã đăng nhập | Đọc/cập nhật tùy chọn thông báo. |
| `GET` / `PATCH` | `/api/candidate/profile` | Candidate | Hồ sơ cá nhân. |
| `GET` | `/api/jobs` | Công khai | Tin đã duyệt (`search`, `location`, `employmentType`, `page`…). |
| `GET` | `/api/jobs/:id` | Công khai | Chi tiết tin đã duyệt. |
| `GET` | `/api/companies` | Công khai | Danh sách công ty. |
| `GET` | `/api/companies/featured` | Công khai | Công ty nổi bật. |
| `GET` | `/api/companies/:id` | Công khai | Chi tiết công ty. |
| `GET` / `PUT` | `/api/companies/me` | Recruiter | Xem / tạo-cập nhật hồ sơ công ty (kèm media URL). |
| `POST` | `/api/jobs` | Recruiter đã xác minh | Tạo tin `PENDING`. |
| `GET` | `/api/recruiter/jobs` | Recruiter | Tin của Recruiter hiện tại. |
| `PATCH` | `/api/jobs/:id` | Recruiter sở hữu | Sửa tin chờ/từ chối hoặc đóng tin đã duyệt. |
| `POST` | `/api/uploads/cv` | Candidate | Upload CV (PDF/DOC/DOCX ≤ 5MB) → Supabase. |
| `POST` | `/api/uploads/company` | Recruiter | Upload ảnh công ty (JPEG/PNG/WebP/GIF ≤ 8MB). |
| `POST` | `/api/applications` | Candidate | Nộp đơn (`jobId`, `cvUrl`, `coverLetter?`). |
| `GET` | `/api/applications` | Candidate/Recruiter/Admin | Danh sách theo phạm vi quyền. |
| `GET` | `/api/applications/:id` | Theo quyền | Chi tiết đơn (Recruiter xem có thể auto `APPLIED`→`VIEWED`). |
| `PATCH` | `/api/applications/:id/status` | Recruiter sở hữu tin | Chuyển trạng thái pipeline. |
| `GET` | `/api/notifications` | Đã đăng nhập | Danh sách thông báo. |
| `PATCH` | `/api/notifications/:id/read` | Đã đăng nhập | Đánh dấu đã đọc. |
| `GET` | `/api/dashboard` | Đã đăng nhập | Thống kê theo role. |
| `GET` | `/api/admin/recruiters` | Admin | Danh sách Recruiter / lọc xác minh. |
| `GET` | `/api/admin/recruiters/:id` | Admin | Chi tiết Recruiter + công ty. |
| `PATCH` | `/api/admin/recruiters/:id/verification` | Admin | Xác minh / từ chối. |
| `PATCH` | `/api/admin/recruiters/:id/account-status` | Admin | Khóa / mở khóa. |
| `GET` | `/api/admin/jobs` | Admin | Hàng đợi tin (mặc định `PENDING`). |
| `PATCH` | `/api/admin/jobs/:id/review` | Admin | Duyệt / từ chối (cần `rejectionNote` khi từ chối). |
| `GET` | `/api/admin/audit-logs` | Admin | Nhật ký thao tác quản trị. |

Kiểm thử tự động: `node scripts/api-smoke.mjs`, `node scripts/api-e2e.mjs`
(Gateway phải đang chạy).

## 6. Cài đặt và chạy

Làm việc trong thư mục monorepo:

```text
online-recruitment-microservices/
```

DB demo đã có sẵn trên **Supabase (production)** — máy mới thường chỉ cần clone,
cấu hình `.env`, bật Docker, rồi đăng nhập bằng tài khoản mục 7 (không cần
migrate/seed lại).

### 6.1 Cách khuyến nghị: Docker Compose

Yêu cầu: Docker Desktop đã bật; file `.env` ở root monorepo (cùng cấp
`docker-compose.yml`).

```bash
cp .env.example .env
# Điền DATABASE_URL, DIRECT_URL, JWT_SECRET, SUPABASE_* (lấy từ team / Supabase)
docker compose up --build
```

Chạy nền:

```bash
docker compose up --build -d
docker compose logs -f
```

| Service | URL |
| --- | --- |
| Frontend | http://localhost:3000 |
| API Gateway | http://localhost:3001 |
| Health | http://localhost:3001/health |

Dừng: `docker compose down` (hoặc `docker compose down -t 5` nếu container Nest
treo ở trạng thái **Stopping**).

Sửa code trong `apps/web` / `apps/backend/src` → container tự reload (Windows đã
bật polling). PostgreSQL = **Supabase cloud** (không chạy Postgres trong
Compose). Kafka trong Compose = `apache/kafka` (`careerlink-kafka`). Upload CV /
ảnh công ty → Supabase Storage.

**Lần đầu trên máy mới** có thể mất vài phút vì phải `pull` image Kafka +
`build` Dockerfile + cài `node_modules` trong volume. Các lần sau nhanh hơn.
Nếu `up -d` kẹt dòng **Stopping** vài phút: mở terminal khác chạy
`docker compose kill` rồi `docker compose up -d`.

**Lỗi `P1001 Can't reach database server ...:6543`:** thường do project Supabase
free bị **pause** sau vài ngày không dùng. Vào Dashboard → **Restore project**,
đợi 1–2 phút, rồi `docker compose up -d`. URL trong `.env` nên có
`connect_timeout=30&pool_timeout=30&sslmode=require`.

### 6.2 Biến môi trường chính

| Biến | Mục đích |
| --- | --- |
| `DATABASE_URL` | Pooler Supabase (thường `:6543` + `pgbouncer=true&connection_limit=1`) |
| `DIRECT_URL` | Kết nối session/direct `:5432` (Prisma migrate) |
| `JWT_SECRET` | ≥ 32 ký tự |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_STORAGE_BUCKET` | Upload CV & ảnh công ty |
| `WEB_ORIGIN` | Origin frontend (CORS), mặc định `http://localhost:3000` |
| `NEXT_PUBLIC_API_URL` | Base API phía Next (mặc định `http://localhost:3001/api`) |
| `KAFKA_BROKERS` | Trong Compose: `kafka:9092` |

Không commit `.env`. Ký tự đặc biệt trong password URL phải percent-encode
(ví dụ `@` trong mật khẩu → `%40`).

### 6.3 Migration / seed (khi cần)

```bash
npm run db:generate
npm run db:deploy --workspace @recruitment/backend
```

Tạo Admin mới (email chưa tồn tại):

```bash
# Đặt ADMIN_EMAIL, ADMIN_FULL_NAME, mật khẩu ≥ 12 ký tự trong .env
npm run db:seed-admin --workspace @recruitment/backend
```

### 6.4 Chạy không Docker (tùy chọn)

Cần Node.js 20+, PostgreSQL (Supabase) và Kafka broker truy cập được:

```bash
npm install
npm run dev
```

`npm run dev` chạy Next.js + Gateway + Auth + Jobs + Applications + Notifications.

### 6.5 Build

```bash
npm run build
# hoặc
npm run build --workspace @recruitment/backend
npm run build --workspace @recruitment/web
```

## 7. Tài khoản demo (smoke / tester)

Mật khẩu chung: **`Demo@123456`**

Mở http://localhost:3000 → chọn tab role → đăng nhập (tab autofill email demo).

| Role | Email | Mật khẩu | Redirect |
| --- | --- | --- | --- |
| **Ứng viên** | `candidate@demo.vn` | `Demo@123456` | `/candidate` |
| **Nhà tuyển dụng** | `hr@vpay.demo` | `Demo@123456` | `/recruiter` |
| **Quản trị** | `admin@demo.vn` | `Demo@123456` | `/admin` |

### 7.1 Candidate khác

| Email | Họ tên |
| --- | --- |
| `minh.an@demo.vn` | Lê Minh An |
| `bao.ngoc@demo.vn` | Phạm Bảo Ngọc |
| `hoang.nam@demo.vn` | Trần Hoàng Nam |
| `thuy.linh@demo.vn` | Đỗ Thùy Linh |

### 7.2 Recruiter — đã xác minh

| Email | Công ty |
| --- | --- |
| `hr@vpay.demo` | FinTech V-Pay Vietnam *(khuyên dùng)* |
| `talent@nexgen.demo` | NexGen Soft |
| `careers@trustcorp.demo` | TrustCorp Capital |
| `jobs@aivision.demo` | AI Vision Labs |
| `hr@pixelcraft.demo` | PixelCraft Studio |
| `hr@cloudnine.demo` | CloudNine Systems |
| `talent@finpulse.demo` | FinPulse Analytics |

### 7.3 Recruiter — chờ / từ chối / đình chỉ (test Admin)

| Email | Công ty | Trạng thái |
| --- | --- | --- |
| `hr@orbitech.demo` | OrbiTech | `PENDING_VERIFICATION` |
| `talent@cubeads.demo` | CubeAds Media | `PENDING_VERIFICATION` |
| `people@freightly.demo` | Freightly Logistics | `PENDING_VERIFICATION` |
| `compliance@shieldpay.demo` | ShieldPay Security | `REJECTED` |
| `people@growthlab.demo` | GrowthLab Media | `SUSPENDED` |

## 8. Ghi chú vận hành

- Không tạo Admin qua đăng ký công khai; dùng seed có kiểm soát.
- Trước khi deploy: đặt đúng `WEB_ORIGIN`, `NEXT_PUBLIC_API_URL`, `KAFKA_BROKERS`,
  port TCP service và `JWT_SECRET`.
- TLS cho frontend/API; cookie tự bật `Secure` khi `NODE_ENV=production`.
- CV và ảnh công ty lưu trên Supabase Storage; cấu hình bucket + service role.
- Nhiều replica: cần Kafka retry/idempotency (hoặc transactional outbox) để tránh
  mất sự kiện khi DB commit thành công nhưng broker gián đoạn.
- Bản khởi đầu dùng chung Prisma schema/database; khi scale độc lập, tách
  migration và quyền truy cập theo service.
