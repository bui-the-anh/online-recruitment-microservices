import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { createHash, randomBytes } from "node:crypto";
import {
  AccountStatus,
  Role,
  VerificationStatus,
} from "@prisma/client";
import type { User } from "@prisma/client";
import { compare, hash } from "bcryptjs";
import { Actor } from "../common/bootstrap";
import { KafkaEventsService } from "../events/kafka-events.service";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly events: KafkaEventsService,
  ) {}

  async register(input: {
    email?: string;
    fullName?: string;
    password?: string;
    role?: Role;
  }) {
    const email = input.email?.trim().toLowerCase();
    const fullName = input.fullName?.trim();
    const password = input.password;
    const role = input.role;
    if (
      !email ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      !fullName ||
      fullName.length > 160 ||
      !password ||
      password.length < 8 ||
      (role !== Role.CANDIDATE && role !== Role.RECRUITER)
    ) {
      throw new BadRequestException(
        "Vui lòng nhập email hợp lệ, họ tên, mật khẩu từ 8 ký tự và chọn vai trò ứng viên hoặc nhà tuyển dụng",
      );
    }
    if (await this.prisma.user.findUnique({ where: { email } })) {
      throw new ConflictException("Email này đã được đăng ký");
    }
    const passwordHash = await hash(password, 12);
    const user = await this.prisma.user.create({
      data: {
        email,
        fullName,
        passwordHash,
        role,
        verificationStatus:
          role === Role.RECRUITER
            ? VerificationStatus.PENDING_VERIFICATION
            : null,
        candidateProfile:
          role === Role.CANDIDATE ? { create: {} } : undefined,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        accountStatus: true,
        verificationStatus: true,
      },
    });
    if (role === Role.RECRUITER) {
      await this.events.publish("recruiter.registered", {
        recruiterId: user.id,
        email: user.email,
        fullName: user.fullName,
      });
    }
    return this.issueSession(user);
  }

  async login(input: { email?: string; password?: string }) {
    const email = input.email?.trim().toLowerCase();
    if (!email || !input.password) {
      throw new BadRequestException("Vui lòng nhập email và mật khẩu");
    }
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !(await compare(input.password, user.passwordHash))) {
      throw new UnauthorizedException("Email hoặc mật khẩu không chính xác");
    }
    if (user.accountStatus !== AccountStatus.ACTIVE) {
      throw new UnauthorizedException("Tài khoản này đang bị tạm khóa");
    }
    return this.issueSession(user);
  }

  async refresh(rawToken?: string) {
    if (!rawToken) {
      throw new UnauthorizedException("Phiên đăng nhập đã hết hạn");
    }
    const tokenHash = this.hashToken(rawToken);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
    });
    if (!stored) {
      throw new UnauthorizedException("Phiên đăng nhập không hợp lệ");
    }
    if (stored.revokedAt) {
      await this.prisma.refreshToken.updateMany({
        where: { userId: stored.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException("Phiên đăng nhập đã bị thu hồi");
    }
    const now = new Date();
    const claimed = await this.prisma.refreshToken.updateMany({
      where: { id: stored.id, revokedAt: null, expiresAt: { gt: now } },
      data: { revokedAt: now },
    });
    if (claimed.count !== 1) {
      throw new UnauthorizedException("Phiên đăng nhập đã hết hạn");
    }
    const user = await this.prisma.user.findUnique({ where: { id: stored.userId } });
    if (!user || user.accountStatus !== AccountStatus.ACTIVE) {
      throw new UnauthorizedException("Tài khoản không hoạt động");
    }
    return this.issueSession(user);
  }

  async logout(rawToken?: string) {
    if (rawToken) {
      await this.prisma.refreshToken.updateMany({
        where: { tokenHash: this.hashToken(rawToken), revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    return { message: "Đã đăng xuất thành công" };
  }

  async me(actor: Actor) {
    const user = await this.prisma.user.findUnique({ where: { id: actor.id } });
    if (!user) throw new NotFoundException("Không tìm thấy tài khoản");
    if (user.accountStatus !== AccountStatus.ACTIVE) {
      throw new UnauthorizedException("Tài khoản này đang bị tạm khóa");
    }
    return this.publicUser(user);
  }

  async candidateProfile(actor: Actor) {
    if (actor.role !== Role.CANDIDATE) {
      throw new UnauthorizedException("Chỉ ứng viên mới có thể xem hồ sơ này");
    }
    const profile = await this.prisma.candidateProfile.findUnique({
      where: { userId: actor.id },
      include: {
        user: {
          select: { id: true, email: true, fullName: true, role: true },
        },
      },
    });
    if (!profile) throw new NotFoundException("Không tìm thấy hồ sơ ứng viên");
    return profile;
  }

  async updateCandidateProfile(
    actor: Actor,
    input: {
      fullName?: string;
      phone?: string;
      location?: string;
      headline?: string;
    },
  ) {
    if (actor.role !== Role.CANDIDATE) {
      throw new UnauthorizedException("Chỉ ứng viên mới có thể cập nhật hồ sơ này");
    }
    const fullName = input.fullName?.trim();
    if (fullName !== undefined && (!fullName || fullName.length > 160)) {
      throw new BadRequestException("Họ tên không hợp lệ");
    }
    if (input.phone && input.phone.length > 32) {
      throw new BadRequestException("Số điện thoại không hợp lệ");
    }
    if (input.location && input.location.length > 160) {
      throw new BadRequestException("Địa điểm không hợp lệ");
    }
    if (input.headline && input.headline.length > 200) {
      throw new BadRequestException("Tiêu đề hồ sơ không hợp lệ");
    }
    return this.prisma.$transaction(async (transaction) => {
      if (fullName !== undefined) {
        await transaction.user.update({
          where: { id: actor.id },
          data: { fullName },
        });
      }
      return transaction.candidateProfile.upsert({
        where: { userId: actor.id },
        create: {
          userId: actor.id,
          phone: input.phone,
          location: input.location,
          headline: input.headline,
        },
        update: {
          ...(input.phone !== undefined ? { phone: input.phone } : {}),
          ...(input.location !== undefined ? { location: input.location } : {}),
          ...(input.headline !== undefined ? { headline: input.headline } : {}),
        },
        include: {
          user: {
            select: { id: true, email: true, fullName: true, role: true },
          },
        },
      });
    });
  }

  async dashboard(actor: Actor) {
    if (actor.role !== Role.ADMIN) {
      return { role: actor.role };
    }
    const [users, recruitersPendingVerification] = await Promise.all([
      this.prisma.user.groupBy({
        by: ["role"],
        _count: { id: true },
      }),
      this.prisma.user.count({
        where: {
          role: Role.RECRUITER,
          verificationStatus: VerificationStatus.PENDING_VERIFICATION,
        },
      }),
    ]);
    return { usersByRole: users, recruitersPendingVerification };
  }

  async listRecruiters() {
    return this.prisma.user.findMany({
      where: { role: Role.RECRUITER },
      select: {
        id: true,
        email: true,
        fullName: true,
        accountStatus: true,
        verificationStatus: true,
        createdAt: true,
        company: { select: { id: true, name: true, verificationDetails: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async listAuditLogs(actor: Actor) {
    if (actor.role !== Role.ADMIN) {
      throw new UnauthorizedException("Bạn không có quyền thực hiện thao tác này");
    }
    return this.prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        actor: { select: { id: true, email: true, fullName: true, role: true } },
        target: { select: { id: true, email: true, fullName: true, role: true } },
      },
    });
  }

  async updateVerification(input: {
    actor: Actor;
    id: string;
    update: { status?: VerificationStatus };
  }) {
    const status = input.update?.status;
    if (
      status !== VerificationStatus.VERIFIED &&
      status !== VerificationStatus.REJECTED
    ) {
      throw new BadRequestException("Trạng thái xác minh không hợp lệ");
    }
    if (input.actor.role !== Role.ADMIN) {
      throw new UnauthorizedException("Bạn không có quyền thực hiện thao tác này");
    }
    const recruiter = await this.prisma.user.findFirst({
      where: { id: input.id, role: Role.RECRUITER },
    });
    if (!recruiter) throw new NotFoundException("Không tìm thấy nhà tuyển dụng");
    const updated = await this.prisma.$transaction(async (transaction) => {
      const user = await transaction.user.update({
        where: { id: recruiter.id },
        data: { verificationStatus: status },
        select: {
          id: true,
          email: true,
          role: true,
          accountStatus: true,
          verificationStatus: true,
        },
      });
      await transaction.auditLog.create({
        data: {
          actorId: input.actor.id,
          targetId: recruiter.id,
          action: `RECRUITER_${status}`,
          entityType: "User",
          entityId: recruiter.id,
        },
      });
      return user;
    });
    await this.events.publish(
      status === VerificationStatus.VERIFIED
        ? "recruiter.verified"
        : "recruiter.verification.rejected",
      { recruiterId: recruiter.id },
    );
    return updated;
  }

  async updateAccount(input: {
    actor: Actor;
    id: string;
    update: { status?: AccountStatus };
  }) {
    const status = input.update?.status;
    if (status !== AccountStatus.ACTIVE && status !== AccountStatus.SUSPENDED) {
      throw new BadRequestException("Trạng thái tài khoản không hợp lệ");
    }
    if (input.actor.role !== Role.ADMIN) {
      throw new UnauthorizedException("Bạn không có quyền thực hiện thao tác này");
    }
    const recruiter = await this.prisma.user.findFirst({
      where: { id: input.id, role: Role.RECRUITER },
    });
    if (!recruiter) throw new NotFoundException("Không tìm thấy nhà tuyển dụng");
    const updated = await this.prisma.$transaction(async (transaction) => {
      const user = await transaction.user.update({
        where: { id: recruiter.id },
        data: { accountStatus: status },
        select: {
          id: true,
          email: true,
          role: true,
          accountStatus: true,
          verificationStatus: true,
        },
      });
      await transaction.auditLog.create({
        data: {
          actorId: input.actor.id,
          targetId: recruiter.id,
          action: `RECRUITER_${status}`,
          entityType: "User",
          entityId: recruiter.id,
        },
      });
      return user;
    });
    await this.events.publish(
      status === AccountStatus.SUSPENDED
        ? "recruiter.suspended"
        : "recruiter.reactivated",
      { recruiterId: recruiter.id },
    );
    return updated;
  }

  private async issueSession(
    user: Pick<
      User,
      | "id"
      | "email"
      | "fullName"
      | "role"
      | "accountStatus"
      | "verificationStatus"
    >,
  ) {
    const refreshToken = randomBytes(48).toString("base64url");
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: this.hashToken(refreshToken),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
    return {
      user: this.publicUser(user),
      accessToken: await this.jwt.signAsync(
        { sub: user.id, role: user.role },
        { expiresIn: "15m" },
      ),
      refreshToken,
    };
  }

  private publicUser(
    user: Pick<
      User,
      | "id"
      | "email"
      | "fullName"
      | "role"
      | "accountStatus"
      | "verificationStatus"
    >,
  ) {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      accountStatus: user.accountStatus,
      verificationStatus: user.verificationStatus,
    };
  }

  private hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }
}
