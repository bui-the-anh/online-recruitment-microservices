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
  JobStatus,
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

  async login(input: {
    email?: string;
    password?: string;
    userAgent?: string;
    ipAddress?: string;
  }) {
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
    return this.issueSession(user, {
      userAgent: input.userAgent,
      ipAddress: input.ipAddress,
    });
  }

  async refresh(input: {
    refreshToken?: string;
    userAgent?: string;
    ipAddress?: string;
  }) {
    const rawToken = input.refreshToken;
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
    return this.issueSession(user, {
      userAgent: input.userAgent || stored.userAgent || undefined,
      ipAddress: input.ipAddress || stored.ipAddress || undefined,
    });
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
    const [profile, applicationsCount] = await Promise.all([
      this.prisma.candidateProfile.findUnique({
        where: { userId: actor.id },
        include: {
          user: {
            select: { id: true, email: true, fullName: true, role: true },
          },
        },
      }),
      this.prisma.application.count({ where: { candidateId: actor.id } }),
    ]);
    if (!profile) throw new NotFoundException("Không tìm thấy hồ sơ ứng viên");
    return { ...profile, applicationsCount };
  }

  async updateCandidateProfile(
    actor: Actor,
    input: {
      fullName?: string;
      phone?: string;
      location?: string;
      headline?: string;
      bio?: string;
      experienceYears?: number;
      level?: string;
      expectedSalaryMin?: number;
      expectedSalaryMax?: number;
      workPreference?: string;
      skills?: string[];
      skillLevels?: Array<{ name: string; percent: number }>;
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
    if (input.bio !== undefined && input.bio.length > 4000) {
      throw new BadRequestException("Giới thiệu bản thân quá dài");
    }
    if (input.level !== undefined && input.level.length > 80) {
      throw new BadRequestException("Cấp bậc không hợp lệ");
    }
    if (
      input.workPreference !== undefined &&
      input.workPreference.length > 240
    ) {
      throw new BadRequestException("Mong muốn làm việc không hợp lệ");
    }
    if (
      input.expectedSalaryMin !== undefined &&
      input.expectedSalaryMax !== undefined &&
      input.expectedSalaryMin > input.expectedSalaryMax
    ) {
      throw new BadRequestException(
        "Mức lương kỳ vọng tối thiểu không thể lớn hơn tối đa",
      );
    }

    const profileData = {
      ...(input.phone !== undefined ? { phone: input.phone } : {}),
      ...(input.location !== undefined ? { location: input.location } : {}),
      ...(input.headline !== undefined ? { headline: input.headline } : {}),
      ...(input.bio !== undefined ? { bio: input.bio } : {}),
      ...(input.experienceYears !== undefined
        ? { experienceYears: input.experienceYears }
        : {}),
      ...(input.level !== undefined ? { level: input.level.trim() } : {}),
      ...(input.expectedSalaryMin !== undefined
        ? { expectedSalaryMin: input.expectedSalaryMin }
        : {}),
      ...(input.expectedSalaryMax !== undefined
        ? { expectedSalaryMax: input.expectedSalaryMax }
        : {}),
      ...(input.workPreference !== undefined
        ? { workPreference: input.workPreference.trim() }
        : {}),
      ...(input.skills !== undefined ? { skills: input.skills } : {}),
      ...(input.skillLevels !== undefined
        ? { skillLevels: input.skillLevels }
        : {}),
    };

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
          ...profileData,
        },
        update: profileData,
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
    const [
      usersByRole,
      recruitersTotal,
      recruitersPending,
      recruitersVerified,
      recruitersSuspended,
      pendingCompanies,
    ] = await Promise.all([
      this.prisma.user.groupBy({
        by: ["role"],
        _count: { id: true },
      }),
      this.prisma.user.count({ where: { role: Role.RECRUITER } }),
      this.prisma.user.count({
        where: {
          role: Role.RECRUITER,
          verificationStatus: VerificationStatus.PENDING_VERIFICATION,
        },
      }),
      this.prisma.user.count({
        where: {
          role: Role.RECRUITER,
          verificationStatus: VerificationStatus.VERIFIED,
        },
      }),
      this.prisma.user.count({
        where: {
          role: Role.RECRUITER,
          accountStatus: AccountStatus.SUSPENDED,
        },
      }),
      this.prisma.user.findMany({
        where: {
          role: Role.RECRUITER,
          verificationStatus: VerificationStatus.PENDING_VERIFICATION,
        },
        select: {
          id: true,
          fullName: true,
          email: true,
          verificationStatus: true,
          createdAt: true,
          company: {
            select: {
              id: true,
              name: true,
              industry: true,
              location: true,
            },
          },
        },
        orderBy: { createdAt: "asc" },
        take: 8,
      }),
    ]);
    return {
      usersByRole,
      recruitersPendingVerification: recruitersPending,
      recruiters: {
        total: recruitersTotal,
        pending: recruitersPending,
        verified: recruitersVerified,
        suspended: recruitersSuspended,
      },
      pendingCompanies,
    };
  }

  async listRecruiters(query: {
    search?: string;
    verification?: string;
    accountStatus?: string;
    page?: string;
    pageSize?: string;
    sort?: string;
  } = {}) {
    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.min(50, Math.max(1, Number(query.pageSize) || 10));
    const search = query.search?.trim();
    const verificationRaw = query.verification?.trim().toUpperCase();
    const accountRaw = query.accountStatus?.trim().toUpperCase();

    const verification =
      verificationRaw &&
      verificationRaw !== "ALL" &&
      Object.values(VerificationStatus).includes(
        verificationRaw as VerificationStatus,
      )
        ? (verificationRaw as VerificationStatus)
        : undefined;
    const accountStatus =
      accountRaw &&
      accountRaw !== "ALL" &&
      Object.values(AccountStatus).includes(accountRaw as AccountStatus)
        ? (accountRaw as AccountStatus)
        : undefined;

    const where = {
      role: Role.RECRUITER,
      ...(verification ? { verificationStatus: verification } : {}),
      ...(accountStatus ? { accountStatus } : {}),
      ...(search
        ? {
            OR: [
              {
                fullName: {
                  contains: search,
                  mode: "insensitive" as const,
                },
              },
              {
                email: { contains: search, mode: "insensitive" as const },
              },
              {
                company: {
                  name: { contains: search, mode: "insensitive" as const },
                },
              },
              {
                company: {
                  taxCode: {
                    contains: search,
                    mode: "insensitive" as const,
                  },
                },
              },
              {
                company: {
                  contactPhone: {
                    contains: search,
                    mode: "insensitive" as const,
                  },
                },
              },
            ],
          }
        : {}),
    };

    const [items, total, pending, verified, suspended, createdThisWeek] =
      await Promise.all([
        this.prisma.user.findMany({
          where,
          select: {
            id: true,
            email: true,
            fullName: true,
            accountStatus: true,
            verificationStatus: true,
            createdAt: true,
            company: {
              select: {
                id: true,
                name: true,
                industry: true,
                location: true,
                address: true,
                taxCode: true,
                contactPhone: true,
                verificationDetails: true,
              },
            },
          },
          orderBy:
            query.sort === "oldest"
              ? { createdAt: "asc" }
              : { createdAt: "desc" },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        this.prisma.user.count({ where }),
        this.prisma.user.count({
          where: {
            role: Role.RECRUITER,
            verificationStatus: VerificationStatus.PENDING_VERIFICATION,
          },
        }),
        this.prisma.user.count({
          where: {
            role: Role.RECRUITER,
            verificationStatus: VerificationStatus.VERIFIED,
          },
        }),
        this.prisma.user.count({
          where: {
            role: Role.RECRUITER,
            accountStatus: AccountStatus.SUSPENDED,
          },
        }),
        this.prisma.user.count({
          where: {
            role: Role.RECRUITER,
            createdAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            },
          },
        }),
      ]);

    const allTotal = await this.prisma.user.count({
      where: { role: Role.RECRUITER },
    });
    const cleanRate =
      allTotal > 0 ? Math.round((verified / allTotal) * 1000) / 10 : 0;

    return {
      items: items.map((item) => ({
        ...item,
        code: `REC-${item.id.replace(/-/g, "").slice(0, 5).toUpperCase()}`,
        phone: item.company?.contactPhone ?? null,
      })),
      total,
      page,
      pageSize,
      counts: {
        total: allTotal,
        pending,
        verified,
        suspended,
        createdThisWeek,
        cleanRate,
      },
    };
  }

  async getRecruiterDetail(id: string) {
    const recruiterId = id?.trim();
    if (!recruiterId) {
      throw new BadRequestException("Thiếu mã nhà tuyển dụng");
    }

    const recruiter = await this.prisma.user.findFirst({
      where: { id: recruiterId, role: Role.RECRUITER },
      select: {
        id: true,
        email: true,
        fullName: true,
        accountStatus: true,
        verificationStatus: true,
        createdAt: true,
        updatedAt: true,
        company: {
          select: {
            id: true,
            name: true,
            description: true,
            website: true,
            industry: true,
            location: true,
            address: true,
            taxCode: true,
            contactPhone: true,
            companySize: true,
            foundedYear: true,
            verificationDetails: true,
            licenseDocumentUrl: true,
            licenseDocumentName: true,
            team: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });
    if (!recruiter) {
      throw new NotFoundException("Không tìm thấy nhà tuyển dụng");
    }

    const jobs = await this.prisma.job.findMany({
      where: { recruiterId: recruiter.id },
      orderBy: [{ createdAt: "desc" }],
      select: {
        id: true,
        title: true,
        location: true,
        workMode: true,
        status: true,
        salaryMin: true,
        salaryMax: true,
        currency: true,
        createdAt: true,
        publishedAt: true,
        _count: { select: { applications: true } },
      },
    });

    const jobCounts = {
      approved: 0,
      pending: 0,
      rejected: 0,
      closed: 0,
      total: jobs.length,
    };
    for (const job of jobs) {
      if (job.status === JobStatus.APPROVED) jobCounts.approved += 1;
      if (job.status === JobStatus.PENDING) jobCounts.pending += 1;
      if (job.status === JobStatus.REJECTED) jobCounts.rejected += 1;
      if (job.status === JobStatus.CLOSED) jobCounts.closed += 1;
    }

    let contactTitle = "Nhà tuyển dụng";
    const team = Array.isArray(recruiter.company?.team)
      ? (recruiter.company.team as Array<{ title?: string; name?: string }>)
      : [];
    const matched = team.find(
      (member) =>
        member.name &&
        member.name.toLowerCase() === recruiter.fullName.toLowerCase(),
    );
    contactTitle = matched?.title || team[0]?.title || contactTitle;

    return {
      id: recruiter.id,
      code: `REC-${recruiter.id.replace(/-/g, "").slice(0, 8).toUpperCase()}`,
      email: recruiter.email,
      fullName: recruiter.fullName,
      contactTitle,
      phone: recruiter.company?.contactPhone ?? null,
      accountStatus: recruiter.accountStatus,
      verificationStatus: recruiter.verificationStatus,
      createdAt: recruiter.createdAt,
      updatedAt: recruiter.updatedAt,
      company: recruiter.company
        ? {
            id: recruiter.company.id,
            name: recruiter.company.name,
            description: recruiter.company.description,
            website: recruiter.company.website,
            industry: recruiter.company.industry,
            location: recruiter.company.location,
            address: recruiter.company.address,
            taxCode: recruiter.company.taxCode,
            contactPhone: recruiter.company.contactPhone,
            companySize: recruiter.company.companySize,
            foundedYear: recruiter.company.foundedYear,
            verificationDetails: recruiter.company.verificationDetails,
            licenseDocumentUrl: recruiter.company.licenseDocumentUrl,
            licenseDocumentName: recruiter.company.licenseDocumentName,
            createdAt: recruiter.company.createdAt,
          }
        : null,
      jobCounts,
      jobs: jobs.map((job) => ({
        id: job.id,
        title: job.title,
        location: job.location,
        workMode: job.workMode,
        status: job.status,
        salaryMin: job.salaryMin != null ? Number(job.salaryMin) : null,
        salaryMax: job.salaryMax != null ? Number(job.salaryMax) : null,
        currency: job.currency,
        createdAt: job.createdAt,
        publishedAt: job.publishedAt,
        applicants: job._count.applications,
      })),
    };
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
    update: { status?: VerificationStatus; note?: string };
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
      include: { company: { select: { id: true } } },
    });
    if (!recruiter) throw new NotFoundException("Không tìm thấy nhà tuyển dụng");
    const note = input.update?.note?.trim();
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
      if (recruiter.company?.id) {
        await transaction.company.update({
          where: { id: recruiter.company.id },
          data: {
            verificationDetails:
              status === VerificationStatus.VERIFIED
                ? note || "Admin đã xác minh hồ sơ doanh nghiệp"
                : note || "GPKD/MST không hợp lệ — bị từ chối xác minh",
          },
        });
      }
      await transaction.auditLog.create({
        data: {
          actorId: input.actor.id,
          targetId: recruiter.id,
          action: `RECRUITER_${status}`,
          entityType: "User",
          entityId: recruiter.id,
          details: note ? { note } : undefined,
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

  async getSettings(actor: Actor) {
    const settings = await this.ensureSettings(actor.id);
    return this.publicSettings(settings);
  }

  async updateSettings(
    actor: Actor,
    update: {
      notifyJobPending?: boolean;
      notifyRecruiterRegistered?: boolean;
      notifyBrowserSound?: boolean;
      notifyNewApplication?: boolean;
      notifyJobModeration?: boolean;
      notifyInterviewReminder?: boolean;
      notifyWeeklyReport?: boolean;
    },
  ) {
    await this.ensureSettings(actor.id);
    const bool = (value: unknown) => typeof value === "boolean";
    const settings = await this.prisma.userSettings.update({
      where: { userId: actor.id },
      data: {
        ...(bool(update.notifyJobPending)
          ? { notifyJobPending: update.notifyJobPending }
          : {}),
        ...(bool(update.notifyRecruiterRegistered)
          ? { notifyRecruiterRegistered: update.notifyRecruiterRegistered }
          : {}),
        ...(bool(update.notifyBrowserSound)
          ? { notifyBrowserSound: update.notifyBrowserSound }
          : {}),
        ...(bool(update.notifyNewApplication)
          ? { notifyNewApplication: update.notifyNewApplication }
          : {}),
        ...(bool(update.notifyJobModeration)
          ? { notifyJobModeration: update.notifyJobModeration }
          : {}),
        ...(bool(update.notifyInterviewReminder)
          ? { notifyInterviewReminder: update.notifyInterviewReminder }
          : {}),
        ...(bool(update.notifyWeeklyReport)
          ? { notifyWeeklyReport: update.notifyWeeklyReport }
          : {}),
      },
    });
    return this.publicSettings(settings);
  }

  async changePassword(
    actor: Actor,
    input: {
      currentPassword?: string;
      newPassword?: string;
    },
  ) {
    const currentPassword = input.currentPassword || "";
    const newPassword = input.newPassword || "";
    if (!currentPassword) {
      throw new BadRequestException("Vui lòng nhập mật khẩu hiện tại");
    }
    if (
      newPassword.length < 8 ||
      !/[A-Z]/.test(newPassword) ||
      !/[a-z]/.test(newPassword) ||
      !/[0-9]/.test(newPassword) ||
      !/[^A-Za-z0-9]/.test(newPassword)
    ) {
      throw new BadRequestException(
        "Mật khẩu mới cần ≥8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt",
      );
    }
    const user = await this.prisma.user.findUnique({ where: { id: actor.id } });
    if (!user) throw new NotFoundException("Không tìm thấy tài khoản");
    if (!(await compare(currentPassword, user.passwordHash))) {
      throw new BadRequestException("Mật khẩu hiện tại không đúng");
    }
    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await hash(newPassword, 12) },
    });
    await this.prisma.auditLog.create({
      data: {
        actorId: actor.id,
        action: "PASSWORD_CHANGED",
        entityType: "User",
        entityId: actor.id,
      },
    });
    return { message: "Đã cập nhật mật khẩu thành công" };
  }

  async listSessions(actor: Actor, currentRefreshToken?: string) {
    const currentHash = currentRefreshToken
      ? this.hashToken(currentRefreshToken)
      : null;
    const rows = await this.prisma.refreshToken.findMany({
      where: {
        userId: actor.id,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    return {
      items: rows.map((row) => ({
        id: row.id,
        current: currentHash != null && row.tokenHash === currentHash,
        deviceLabel: row.deviceLabel || this.deviceLabelFromUa(row.userAgent),
        userAgent: row.userAgent,
        ipAddress: row.ipAddress,
        createdAt: row.createdAt,
        expiresAt: row.expiresAt,
      })),
    };
  }

  async revokeSession(actor: Actor, sessionId: string) {
    const updated = await this.prisma.refreshToken.updateMany({
      where: { id: sessionId, userId: actor.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (updated.count !== 1) {
      throw new NotFoundException("Không tìm thấy phiên đăng nhập");
    }
    return { message: "Đã đăng xuất thiết bị" };
  }

  async revokeOtherSessions(actor: Actor, currentRefreshToken?: string) {
    if (!currentRefreshToken) {
      throw new BadRequestException("Không xác định được phiên hiện tại");
    }
    const currentHash = this.hashToken(currentRefreshToken);
    const result = await this.prisma.refreshToken.updateMany({
      where: {
        userId: actor.id,
        revokedAt: null,
        NOT: { tokenHash: currentHash },
      },
      data: { revokedAt: new Date() },
    });
    return { message: "Đã đăng xuất các thiết bị khác", count: result.count };
  }

  private publicSettings(settings: {
    notifyJobPending: boolean;
    notifyRecruiterRegistered: boolean;
    notifyBrowserSound: boolean;
    notifyNewApplication: boolean;
    notifyJobModeration: boolean;
    notifyInterviewReminder: boolean;
    notifyWeeklyReport: boolean;
    updatedAt: Date;
  }) {
    return {
      notifyJobPending: settings.notifyJobPending,
      notifyRecruiterRegistered: settings.notifyRecruiterRegistered,
      notifyBrowserSound: settings.notifyBrowserSound,
      notifyNewApplication: settings.notifyNewApplication,
      notifyJobModeration: settings.notifyJobModeration,
      notifyInterviewReminder: settings.notifyInterviewReminder,
      notifyWeeklyReport: settings.notifyWeeklyReport,
      updatedAt: settings.updatedAt,
    };
  }

  private async ensureSettings(userId: string) {
    return this.prisma.userSettings.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });
  }

  private deviceLabelFromUa(userAgent?: string | null) {
    const ua = userAgent || "";
    if (/iPhone/i.test(ua)) return "iPhone";
    if (/iPad/i.test(ua)) return "iPad";
    if (/Android/i.test(ua)) return "Android";
    if (/Macintosh|Mac OS/i.test(ua)) return "Mac";
    if (/Windows/i.test(ua)) return "Windows PC";
    if (/Linux/i.test(ua)) return "Linux";
    return "Trình duyệt web";
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
    meta?: { userAgent?: string; ipAddress?: string },
  ) {
    const refreshToken = randomBytes(48).toString("base64url");
    const userAgent = meta?.userAgent?.slice(0, 500) || null;
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: this.hashToken(refreshToken),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        userAgent,
        ipAddress: meta?.ipAddress?.slice(0, 64) || null,
        deviceLabel: this.deviceLabelFromUa(userAgent),
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
