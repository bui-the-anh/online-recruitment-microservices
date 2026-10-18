const path = require("node:path");
const { config } = require("dotenv");
const { PrismaClient, Role, AccountStatus } = require("@prisma/client");
const { hash } = require("bcryptjs");

config({ path: path.resolve(__dirname, "../../../.env") });

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const fullName = process.env.ADMIN_FULL_NAME?.trim();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !fullName || !password || password.length < 12) {
    throw new Error(
      "Cần ADMIN_EMAIL, ADMIN_FULL_NAME và ADMIN_PASSWORD (ít nhất 12 ký tự) trong .env",
    );
  }

  const prisma = new PrismaClient();
  try {
    await prisma.$connect();
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      if (existing.role !== Role.ADMIN) {
        throw new Error("Email đã tồn tại và không phải tài khoản quản trị");
      }
      console.log("Tài khoản quản trị đã tồn tại; không thay đổi dữ liệu.");
      return;
    }
    await prisma.user.create({
      data: {
        email,
        fullName,
        passwordHash: await hash(password, 12),
        role: Role.ADMIN,
        accountStatus: AccountStatus.ACTIVE,
      },
    });
    console.log("Đã tạo tài khoản quản trị.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  const errorName = error instanceof Error ? error.name : "Lỗi không xác định";
  console.error(`Không thể tạo tài khoản quản trị (${errorName}).`);
  process.exitCode = 1;
});
