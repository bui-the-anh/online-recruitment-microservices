# CareerLink — Nền tảng tuyển dụng trực tuyến

CareerLink kết nối Ứng viên (Candidate) với Nhà tuyển dụng (Recruiter), đồng
thời cung cấp cho Quản trị viên (Admin) các công cụ xác minh doanh nghiệp,
kiểm duyệt tin tuyển dụng và quản lý trạng thái tài khoản. Tài liệu nghiệp vụ,
kiến trúc, cấu trúc dữ liệu và hướng dẫn chạy dự án được tập trung tại README này.

## 1. Phạm vi và nghiệp vụ

### 1.1 Vai trò người dùng

| Vai trò | Nghiệp vụ |
| --- | --- |
| **Candidate — Ứng viên** | Đăng ký/đăng nhập; quản lý hồ sơ cá nhân; tìm kiếm, lọc và xem tin tuyển dụng đã công khai; ứng tuyển kèm CV riêng cho từng đơn; xem hồ sơ đã gửi và theo dõi trạng thái; nhận thông báo. |
| **Recruiter — Nhà tuyển dụng** | Đăng ký; tạo và cập nhật hồ sơ công ty; theo dõi xác minh; sau khi tài khoản hoạt động và được xác minh thì tạo, chỉnh sửa, đóng tin; theo dõi kiểm duyệt; xem ứng viên/CV của tin thuộc quyền quản lý; cập nhật trạng thái hồ sơ ứng tuyển; xem số liệu tổng hợp. |
| **Admin — Quản trị viên** | Xem dashboard và danh sách chờ xử lý; xác minh/từ chối xác minh Recruiter; duyệt/từ chối tin; khóa/mở khóa Recruiter; xem trạng thái tài khoản; các thao tác quản trị được ghi vào nhật ký. |

Ẩn nút trên giao diện không thay thế cho xác thực, phân quyền, kiểm tra quyền sở
hữu và kiểm tra điều kiện nghiệp vụ ở Backend.

### 1.2 Quy trình xác minh Recruiter

1. Recruiter đăng ký; tài khoản có `verificationStatus = PENDING_VERIFICATION`.
2. Recruiter gửi thông tin doanh nghiệp qua hồ sơ công ty.
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

1. Candidate xem tin `APPROVED` và gửi `jobId`, `cvUrl`, thư giới thiệu tùy chọn.
2. Mỗi đơn lưu CV tại thời điểm ứng tuyển; CV trong hồ sơ Candidate không tự
   động thay thế CV của một đơn đã gửi.
3. Một Candidate chỉ được nộp một đơn cho mỗi tin tuyển dụng.
4. Recruiter chỉ xem hồ sơ ứng tuyển thuộc các tin do mình quản lý.
5. Thay đổi trạng thái hợp lệ:

   | Trạng thái hiện tại | Trạng thái tiếp theo |
   | --- | --- |
   | `APPLIED` | `VIEWED`, `REJECTED` |
   | `VIEWED` | `INTERVIEW`, `REJECTED` |
   | `INTERVIEW` | `ACCEPTED`, `REJECTED` |
   | `ACCEPTED`, `REJECTED` | Trạng thái kết thúc |

### 1.5 Khóa và mở khóa Recruiter

- Admin khóa bằng cách đặt `accountStatus = SUSPENDED`. Guard từ chối phiên
  đăng nhập hiện có ở yêu cầu tiếp theo; Recruiter không thể tạo/quản lý tin
  hoặc xử lý hồ sơ.
- Mở khóa chuyển `SUSPENDED` về `ACTIVE`; `verificationStatus` không thay đổi.
- Việc khóa tài khoản không tự động đổi trạng thái tin hay đơn ứng tuyển.

### 1.6 Quy tắc bảo mật và quyền

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
│   ├── web/                         # Next.js App Router, Tailwind CSS, shadcn/ui
│   │   ├── app/                     # Trang chủ, đăng nhập, dashboard, việc làm
│   │   ├── components/ui/           # Primitive Button/Card theo shadcn/ui
│   │   └── lib/api.ts               # Axios, cookie credentials, refresh interceptor
│   └── backend/                     # NestJS monorepo
│       ├── prisma/schema.prisma     # PostgreSQL/Supabase schema
│       └── src/
│           ├── common/              # Bootstrap, cookie/JWT guard, lỗi tiếng Việt
│           ├── gateway.controller.ts
│           ├── auth/                # Đăng ký, đăng nhập, refresh, Recruiter/Admin
│           ├── jobs/                # Công ty, tin, kiểm duyệt
│           ├── applications/        # Ứng tuyển, CV, trạng thái
│           ├── notifications/       # Lưu thông báo, Kafka consumer
│           ├── events/              # Kafka producer
│           └── services/            # Entry point cho từng tiến trình Nest
└── README.md
```

### 3.1 Thành phần

- **Next.js** là scaffold frontend, cấu hình Tailwind CSS và các primitive UI
  cơ bản; chưa dựng màn hình nghiệp vụ theo đúng yêu cầu chờ giao diện mẫu. Khi
  triển khai UI, gọi REST API qua Axios (`withCredentials`). Không lưu
  access/refresh token trong `localStorage`, `sessionStorage` hoặc JavaScript
  phía trình duyệt.
- **NestJS API Gateway** cung cấp REST, xác minh cookie access token, kiểm tra
  role/trạng thái tài khoản rồi chuyển tiếp yêu cầu đồng bộ qua TCP.
- **Auth Service** quản lý tài khoản, xác thực, refresh token, trạng thái
  Recruiter và các thao tác Admin liên quan.
- **Job Service** quản lý công ty, tin tuyển dụng và kiểm duyệt.
- **Application Service** quản lý hồ sơ ứng tuyển, CV theo từng đơn và chuyển
  trạng thái hồ sơ.
- **Notification Service** lưu thông báo, nhận sự kiện Kafka và phục vụ truy vấn.
- **Apache Kafka-compatible broker** truyền sự kiện bất đồng bộ giữa các
  service. Các topic hiện dùng: `recruiter.registered`, `recruiter.verified`,
  `recruiter.verification.rejected`, `recruiter.suspended`,
  `recruiter.reactivated`, `job.approved`, `job.rejected`,
  `application.submitted`.
- **Prisma + PostgreSQL** lưu dữ liệu. Schema hiện nằm trong một PostgreSQL
  database trên Supabase; service sở hữu logic và bảng theo bounded context,
  không truy vấn trực tiếp dữ liệu ngoài trách nhiệm nghiệp vụ.

TCP chỉ bind vào `127.0.0.1` mặc định. Khi triển khai các service trên nhiều
máy, cần đặt chúng trong private network và bổ sung xác thực/mã hóa giữa service;
không expose các cổng TCP nội bộ ra Internet.

### 3.2 Xác thực, cookie và mật khẩu

- Đăng ký/đăng nhập trả thông tin người dùng trong JSON; token chỉ được đặt vào
  cookie `HttpOnly`, `SameSite=Lax`.
- Access token có thời hạn 15 phút; refresh token có thời hạn 7 ngày và được
  xoay vòng mỗi lần làm mới phiên.
- Refresh token thô chỉ tồn tại trong cookie; cơ sở dữ liệu chỉ lưu SHA-256
  hash trong `refresh_tokens`. Đăng xuất thu hồi refresh token và xóa cookie.
- Cookie bật `Secure` trong môi trường `production`. CORS chỉ cho phép origin
  frontend được cấu hình và bật credentials.
- Mật khẩu được băm bằng `bcryptjs` với cost factor 12; không lưu mật khẩu thô.
- API Gateway tra cứu trạng thái tài khoản hiện hành cho mỗi yêu cầu riêng tư;
  tài khoản vừa bị khóa sẽ không thể tiếp tục dùng access token cũ.

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

Các lỗi không nhận diện được không trả stack trace hoặc thông báo tiếng Anh cho
client. Frontend dùng `formatApiError` và Axios interceptor tập trung để chuyển
lỗi API, lỗi mạng và lỗi giao diện thành thông báo tiếng Việt.

## 4. Cấu trúc bảng PostgreSQL

Tên bảng thực tế dùng dạng `snake_case`; UUID là khóa chính; các cột thời gian
dùng `TIMESTAMPTZ`. Enum Prisma được lưu thành PostgreSQL enum.

| Bảng | Cột chính | Quan hệ / ràng buộc |
| --- | --- | --- |
| `users` | `id`, `email`, `password_hash`, `full_name`, `role`, `account_status`, `verification_status`, `created_at`, `updated_at` | Email duy nhất; `role` là `CANDIDATE`, `RECRUITER`, `ADMIN`; trạng thái xác minh chỉ áp dụng cho Recruiter. |
| `candidate_profiles` | `id`, `user_id`, `phone`, `location`, `headline`, `created_at`, `updated_at` | `user_id` duy nhất, FK `users`; xóa User thì xóa hồ sơ. |
| `companies` | `id`, `recruiter_id`, `name`, `description`, `website`, `industry`, `location`, `verification_details`, `created_at`, `updated_at` | Mỗi Recruiter sở hữu tối đa một công ty; FK `users`. |
| `jobs` | `id`, `company_id`, `recruiter_id`, `title`, `description`, `requirements`, `location`, `employment_type`, `salary_min`, `salary_max`, `currency`, `status`, `rejection_note`, `published_at`, `expires_at`, `created_at`, `updated_at` | FK `companies` và `users`; chỉ tin `APPROVED` công khai; chỉ Recruiter sở hữu được chỉnh sửa. |
| `applications` | `id`, `job_id`, `candidate_id`, `cv_url`, `cover_letter`, `status`, `created_at`, `updated_at` | FK `jobs` và `users`; duy nhất cặp `(job_id, candidate_id)`; CV được chụp theo từng đơn. |
| `notifications` | `id`, `user_id`, `type`, `title`, `body`, `payload`, `read_at`, `created_at` | FK `users`; index theo người nhận/trạng thái đọc/thời điểm. |
| `audit_logs` | `id`, `actor_id`, `target_id`, `action`, `entity_type`, `entity_id`, `details`, `created_at` | Ghi người thao tác, đối tượng và chi tiết; phục vụ kiểm toán. |
| `refresh_tokens` | `id`, `user_id`, `token_hash`, `expires_at`, `revoked_at`, `created_at` | Chỉ lưu hash SHA-256; `token_hash` duy nhất; FK `users`; index người dùng/thời hạn. |

### 4.1 Enum dữ liệu

- `Role`: `CANDIDATE`, `RECRUITER`, `ADMIN`
- `AccountStatus`: `ACTIVE`, `SUSPENDED`
- `VerificationStatus`: `PENDING_VERIFICATION`, `VERIFIED`, `REJECTED`
- `JobStatus`: `PENDING`, `APPROVED`, `REJECTED`, `CLOSED`
- `EmploymentType`: `FULL_TIME`, `PART_TIME`, `CONTRACT`, `INTERNSHIP`,
  `TEMPORARY`
- `ApplicationStatus`: `APPLIED`, `VIEWED`, `INTERVIEW`, `ACCEPTED`, `REJECTED`

### 4.2 ERD rút gọn

```text
User 1──0..1 CandidateProfile
User 1──0..1 Company 1──N Job 1──N Application N──1 User(Candidate)
User 1──N Notification
User 1──N RefreshToken
User(Admin) 1──N AuditLog(actor); User(target) 0..N AuditLog
```

## 5. REST API

Base URL mặc định: `http://localhost:3001`. Các endpoint nghiệp vụ được đặt
dưới `/api`; login/register/refresh/logout dùng cookie, không nhận hoặc trả
token trong body từ Gateway.

| Method | Endpoint | Quyền | Mục đích |
| --- | --- | --- | --- |
| `GET` | `/health` | Công khai | Kiểm tra DB và kết nối các service TCP. |
| `POST` | `/api/auth/register` | Công khai | Đăng ký Candidate hoặc Recruiter. |
| `POST` | `/api/auth/login` | Công khai | Đăng nhập và đặt cookie phiên. |
| `POST` | `/api/auth/refresh` | Cookie refresh | Xoay vòng phiên và đặt lại cookie. |
| `POST` | `/api/auth/logout` | Công khai | Thu hồi refresh token và xóa cookie. |
| `GET` | `/api/auth/me` | Đã đăng nhập | Lấy người dùng hiện tại. |
| `GET` | `/api/candidate/profile` | Candidate | Xem hồ sơ cá nhân. |
| `PATCH` | `/api/candidate/profile` | Candidate | Cập nhật tên, số điện thoại, địa điểm và tiêu đề hồ sơ. |
| `GET` | `/api/jobs` | Công khai | Danh sách tin đã duyệt; hỗ trợ `search`, `location`, `employmentType`, `page`. |
| `GET` | `/api/jobs/:id` | Công khai | Chi tiết tin đã duyệt. |
| `PUT` | `/api/companies/me` | Recruiter | Tạo/cập nhật hồ sơ công ty. |
| `POST` | `/api/jobs` | Recruiter đã xác minh | Tạo tin chờ kiểm duyệt. |
| `GET` | `/api/recruiter/jobs` | Recruiter | Danh sách tin của nhà tuyển dụng hiện tại. |
| `PATCH` | `/api/jobs/:id` | Recruiter sở hữu tin | Chỉnh tin bị từ chối/chờ duyệt hoặc đóng tin đã duyệt. |
| `POST` | `/api/applications` | Candidate | Ứng tuyển và đính kèm CV. |
| `GET` | `/api/applications` | Candidate/Recruiter/Admin | Danh sách hồ sơ theo phạm vi quyền. |
| `PATCH` | `/api/applications/:id/status` | Recruiter sở hữu tin | Chuyển trạng thái xử lý hồ sơ. |
| `GET` | `/api/notifications` | Đã đăng nhập | Danh sách thông báo của người dùng. |
| `PATCH` | `/api/notifications/:id/read` | Đã đăng nhập | Đánh dấu thông báo của mình đã đọc. |
| `GET` | `/api/dashboard` | Đã đăng nhập | Thống kê tổng hợp theo vai trò. |
| `GET` | `/api/admin/recruiters` | Admin | Danh sách Recruiter và tình trạng xác minh. |
| `GET` | `/api/admin/jobs` | Admin | Hàng đợi tin; mặc định lọc `PENDING`. |
| `PATCH` | `/api/admin/recruiters/:id/verification` | Admin | Xác minh hoặc từ chối xác minh. |
| `PATCH` | `/api/admin/recruiters/:id/account-status` | Admin | Khóa hoặc mở khóa tài khoản. |
| `PATCH` | `/api/admin/jobs/:id/review` | Admin | Duyệt/từ chối tin; từ chối cần `rejectionNote`. |

CV hiện được nhận dưới dạng URL; tích hợp tải tệp và lưu trữ riêng tư (ví dụ
Supabase Storage), kiểm tra MIME/kích thước và URL ký hạn cần được cấu hình trước
khi dùng với CV thật.

## 6. Cài đặt và chạy local

### 6.1 Yêu cầu

- Node.js 20 trở lên và npm.
- Một PostgreSQL database truy cập được; Supabase pooler có thể cấu hình qua
  `DATABASE_URL`.
- Một Kafka-compatible broker đang chạy và truy cập được từ máy chạy ứng dụng.
  Backend dùng broker này để truyền sự kiện bất đồng bộ.

### 6.2 Thiết lập biến môi trường

```bash
npm install
cp .env.example .env
```

Mở `.env` ở Codespace hoặc máy local, điền `DATABASE_URL` và đặt `JWT_SECRET`
ngẫu nhiên có ít nhất 32 ký tự. Không commit `.env`, không dán thông tin đăng nhập vào source,
README, log hoặc URL công khai. Ký tự đặc biệt trong username/password phải
percent-encode; ví dụ dấu `@` nằm **trong mật khẩu** phải viết thành `%40` (dấu
`@` phân tách userinfo với hostname vẫn để nguyên).

`DATABASE_URL` dùng kết nối PostgreSQL Supabase dạng:

```text
postgresql://postgres.<project-ref>:<password-đã-percent-encode>@<supabase-pooler-host>:5432/postgres?schema=public
```

Không đặt URL thật trong `.env.example`. Next.js mặc định gọi Gateway tại
`http://localhost:3001/api`; nếu đổi địa chỉ, cấu hình
`NEXT_PUBLIC_API_URL` trong môi trường chạy Next.js.

### 6.3 Migration và khởi chạy

```bash
npm run db:generate
npm run db:deploy --workspace @recruitment/backend
```

`db:deploy` áp dụng các migration đã được tạo và phù hợp với Supabase/môi trường
triển khai. Chỉ dùng `npm run db:migrate --workspace @recruitment/backend` cho
môi trường phát triển local cần tạo migration mới.

Ứng dụng Next.js và các tiến trình NestJS chạy trực tiếp trên máy local; dữ liệu
PostgreSQL được lưu trên Supabase. Cấu hình `KAFKA_BROKERS` trong `.env` trỏ tới
một Kafka-compatible broker đã được cấp sẵn và truy cập được. Repo không cài
hay tự khởi chạy broker; cần có broker khả dụng để Notification Service khởi
động và các nghiệp vụ phát sự kiện hoạt động đầy đủ. Đây là dịch vụ riêng, không
phải PostgreSQL và không được khởi chạy cùng ứng dụng.

Để tạo Admin ban đầu, đặt `ADMIN_EMAIL`, `ADMIN_FULL_NAME` và mật khẩu mạnh từ
12 ký tự trong `.env`, sau đó chạy:

```bash
npm run db:seed-admin --workspace @recruitment/backend
```

Seed chỉ tạo tài khoản Admin nếu email chưa tồn tại; không tự nâng vai trò của
một tài khoản đang có. Sau khi seed, xóa các giá trị `ADMIN_*` khỏi môi trường
runtime.

Khởi chạy frontend và toàn bộ backend từ thư mục gốc:

```bash
npm run dev
```

`npm run dev` chạy Next.js và năm tiến trình backend: API Gateway, Auth Service,
Job Service, Application Service, Notification Service. API ở
`http://localhost:3001`; giao diện ở `http://localhost:3000`. Endpoint
`http://localhost:3001/health` trả trạng thái database và từng service.

Mỗi tiến trình backend gọi Prisma `$connect` và truy vấn `SELECT 1` trước khi
lắng nghe; thiếu `DATABASE_URL`, URL sai, Supabase không truy cập được hoặc
database từ chối kết nối thì tiến trình kết thúc với mã lỗi và không mở cổng.
Gateway cũng kiểm tra DB của chính nó. Startup log không in URL hay mật khẩu.
Trong Codespace của dự án, kết nối Supabase đã được kiểm tra thành công; schema
`public` ban đầu trống và migration Prisma `20261018000000_init` đã được triển
khai. Migration tạo các bảng, enum, khóa ngoại và chỉ mục theo
`apps/backend/prisma/schema.prisma`. Không đưa credential thật vào source code
hoặc README.

### 6.4 Build

```bash
npm run build
```

Build lần lượt backend (bao gồm `prisma generate`) và frontend. Có thể chạy riêng:

```bash
npm run build --workspace @recruitment/backend
npm run build --workspace @recruitment/web
```

## 7. Ghi chú vận hành

- Không tạo tài khoản Admin qua đăng ký công khai hoặc dữ liệu client gửi lên;
  dùng seed có kiểm soát ở mục 6.
- Trước khi triển khai, đặt `WEB_ORIGIN`, `NEXT_PUBLIC_API_URL`,
  `KAFKA_BROKERS`, `API_PORT`, địa chỉ/port TCP service và `JWT_SECRET` đúng
  môi trường.
- Dùng TLS cho frontend/API; cookie tự bật `Secure` khi `NODE_ENV=production`.
- Dùng Supabase Storage riêng tư và URL ký hạn cho CV; không để file CV công
  khai.
- Với nhiều replica, cần chính sách Kafka retry/idempotency và transactional
  outbox để tránh mất sự kiện khi database commit thành công nhưng broker tạm
  thời gián đoạn.
- Mỗi service đang dùng cùng Prisma schema/database cho bản khởi đầu. Khi mở
  rộng độc lập, tách migration, quyền truy cập và database/schema theo service.
