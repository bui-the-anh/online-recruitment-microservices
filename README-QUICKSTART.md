# Chạy dự án trên máy mới

## Yêu cầu

- Git, Node.js 20 trở lên và npm.
- Thông tin kết nối tới Supabase PostgreSQL.
- Một Kafka-compatible broker đang chạy và có thể truy cập được. KafkaJS trong
  backend là thư viện client, không phải broker; dự án không dùng Docker để chạy
  broker.

## Cài đặt

```bash
git clone https://github.com/bui-the-anh/online-recruitment-microservices.git
cd online-recruitment-microservices
npm install
cp .env.example .env
```

Mở `.env`, điền `DATABASE_URL` bằng connection string Supabase, thay
`JWT_SECRET` bằng chuỗi ngẫu nhiên dài ít nhất 32 ký tự và đặt `KAFKA_BROKERS`
theo địa chỉ broker của bạn. Nếu mật khẩu PostgreSQL có ký tự đặc biệt, hãy
URL-encode ký tự đó (ví dụ `@` thành `%40`). Không commit hoặc chia sẻ `.env`.

## Database

Schema khởi tạo đã được migrate lên Supabase của dự án. Máy mới không cần chạy
migration nếu dùng đúng database đó. Nếu kết nối tới một database mới, xác nhận
đúng project và quyền truy cập trước, rồi chạy migration đã có:

```bash
npm run db:generate
npm run db:deploy
```

Không chạy migration lên database production dùng chung nếu chưa được người quản
lý database cho phép.

## Chạy frontend và backend

```bash
npm run dev
```

- Frontend Next.js: `http://localhost:3000`
- API Gateway: `http://localhost:3001`
- Kiểm tra API, database và service: `http://localhost:3001/health`

Ứng dụng web và các tiến trình NestJS chạy local; PostgreSQL vẫn ở Supabase.
Để toàn bộ backend khởi động và xử lý sự kiện, broker Kafka-compatible phải
đang chạy ở địa chỉ trong `KAFKA_BROKERS`.

## Ghi chú

- Để tạo tài khoản Admin đầu tiên, điền `ADMIN_EMAIL`, `ADMIN_FULL_NAME` và
  `ADMIN_PASSWORD` trong `.env`, sau đó chạy:

  ```bash
  npm run db:seed-admin --workspace @recruitment/backend
  ```

- Kiểm tra production build bằng `npm run build`.
- Frontend hiện là scaffold Next.js/Tailwind, chưa có giao diện nghiệp vụ.
- Xem [README.md](./README.md) để biết thêm chi tiết về nghiệp vụ, kiến trúc và
  cấu trúc database.
