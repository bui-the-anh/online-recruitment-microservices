import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  AccountStatus,
  EmploymentType,
  JobStatus,
  Role,
  VerificationStatus,
} from "@prisma/client";
import { Actor } from "../common/bootstrap";
import { KafkaEventsService } from "../events/kafka-events.service";
import { PrismaService } from "../prisma/prisma.service";

interface JobInput {
  title?: string;
  description?: string;
  requirements?: string;
  location?: string;
  employmentType?: EmploymentType;
  salaryMin?: number;
  salaryMax?: number;
  currency?: string;
  expiresAt?: string;
}

@Injectable()
export class JobsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: KafkaEventsService,
  ) {}

  async list(query: {
    search?: string;
    location?: string;
    employmentType?: EmploymentType;
    page?: string;
  }) {
    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = 20;
    const where = {
      status: JobStatus.APPROVED,
      AND: [{ OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] }],
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search, mode: "insensitive" as const } },
              {
                description: {
                  contains: query.search,
                  mode: "insensitive" as const,
                },
              },
            ],
          }
        : {}),
      ...(query.location
        ? { location: { contains: query.location, mode: "insensitive" as const } }
        : {}),
      ...(query.employmentType ? { employmentType: query.employmentType } : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.job.findMany({
        where,
        include: { company: { select: { id: true, name: true, location: true } } },
        orderBy: { publishedAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.job.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  async recruiterJobs(actor: Actor, pageValue?: string) {
    if (actor.role !== Role.RECRUITER) {
      throw new ForbiddenException("Chỉ nhà tuyển dụng mới có thể xem danh sách tin này");
    }
    const page = Math.max(1, Number(pageValue) || 1);
    const pageSize = 20;
    const where = { recruiterId: actor.id };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.job.findMany({
        where,
        include: { company: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.job.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  async adminQueue(query: { status?: JobStatus }) {
    const status = query.status ?? JobStatus.PENDING;
    if (!Object.values(JobStatus).includes(status)) {
      throw new BadRequestException("Trạng thái tin tuyển dụng không hợp lệ");
    }
    return this.prisma.job.findMany({
      where: { status },
      include: {
        company: true,
        recruiter: {
          select: { id: true, fullName: true, email: true, verificationStatus: true },
        },
      },
      orderBy: { createdAt: "asc" },
      take: 100,
    });
  }

  async dashboard(actor: Actor) {
    const where =
      actor.role === Role.RECRUITER
        ? { recruiterId: actor.id }
        : actor.role === Role.CANDIDATE
          ? { status: JobStatus.APPROVED }
          : {};
    const [total, byStatus] = await Promise.all([
      this.prisma.job.count({ where }),
      this.prisma.job.groupBy({
        by: ["status"],
        where,
        _count: { id: true },
      }),
    ]);
    return { total, byStatus };
  }

  async get(id: string) {
    const job = await this.prisma.job.findFirst({
      where: {
        id,
        status: JobStatus.APPROVED,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            description: true,
            website: true,
            industry: true,
            location: true,
          },
        },
      },
    });
    if (!job) throw new NotFoundException("Không tìm thấy tin tuyển dụng đang mở");
    return job;
  }

  async saveCompany(input: {
    actor: Actor;
    company: {
      name?: string;
      description?: string;
      website?: string;
      industry?: string;
      location?: string;
      verificationDetails?: string;
    };
  }) {
    await this.assertActiveRecruiter(input.actor);
    const name = input.company?.name?.trim();
    if (!name || name.length > 200) {
      throw new BadRequestException("Tên công ty là bắt buộc và không hợp lệ");
    }
    const data = {
      name,
      description: input.company.description,
      website: input.company.website,
      industry: input.company.industry,
      location: input.company.location,
      verificationDetails: input.company.verificationDetails,
    };
    return this.prisma.company.upsert({
      where: { recruiterId: input.actor.id },
      create: { ...data, recruiterId: input.actor.id },
      update: data,
    });
  }

  async getCompany(actor: Actor) {
    if (actor.role !== Role.RECRUITER) {
      throw new ForbiddenException("Chỉ nhà tuyển dụng mới có thể xem hồ sơ công ty");
    }
    await this.assertActiveRecruiter(actor);
    return this.prisma.company.findUnique({
      where: { recruiterId: actor.id },
    });
  }

  async create(input: { actor: Actor; job: JobInput }) {
    const recruiter = await this.assertActiveRecruiter(input.actor);
    if (recruiter.verificationStatus !== VerificationStatus.VERIFIED) {
      throw new ForbiddenException("Nhà tuyển dụng cần được xác minh trước khi đăng tin");
    }
    const company = await this.prisma.company.findUnique({
      where: { recruiterId: input.actor.id },
    });
    if (!company) {
      throw new BadRequestException("Vui lòng tạo hồ sơ công ty trước khi đăng tin");
    }
    const data = this.validateNewJob(input.job);
    return this.prisma.job.create({
      data: {
        ...data,
        companyId: company.id,
        recruiterId: input.actor.id,
        status: JobStatus.PENDING,
      },
    });
  }

  async update(input: { actor: Actor; id: string; changes: JobInput & { status?: JobStatus } }) {
    const recruiter = await this.assertActiveRecruiter(input.actor);
    if (recruiter.verificationStatus !== VerificationStatus.VERIFIED) {
      throw new ForbiddenException("Nhà tuyển dụng cần được xác minh để quản lý tin tuyển dụng");
    }
    const job = await this.prisma.job.findUnique({ where: { id: input.id } });
    if (!job || job.recruiterId !== input.actor.id) {
      throw new NotFoundException("Không tìm thấy tin tuyển dụng");
    }
    if (input.changes.status === JobStatus.CLOSED) {
      if (job.status !== JobStatus.APPROVED) {
        throw new BadRequestException("Chỉ có thể đóng tin tuyển dụng đã được duyệt");
      }
      return this.prisma.job.update({
        where: { id: job.id },
        data: { status: JobStatus.CLOSED },
      });
    }
    if (job.status !== JobStatus.PENDING && job.status !== JobStatus.REJECTED) {
      throw new BadRequestException("Chỉ có thể chỉnh sửa tin đang chờ hoặc bị từ chối");
    }
    const changes = this.validateJob(input.changes, true);
    return this.prisma.job.update({
      where: { id: job.id },
      data: { ...changes, status: JobStatus.PENDING, rejectionNote: null },
    });
  }

  async review(input: {
    actor: Actor;
    id: string;
    review: { status?: JobStatus; rejectionNote?: string };
  }) {
    if (input.actor.role !== Role.ADMIN) {
      throw new ForbiddenException("Chỉ quản trị viên mới có thể duyệt tin tuyển dụng");
    }
    if (
      input.review.status !== JobStatus.APPROVED &&
      input.review.status !== JobStatus.REJECTED
    ) {
      throw new BadRequestException("Trạng thái duyệt tin không hợp lệ");
    }
    if (
      input.review.status === JobStatus.REJECTED &&
      !input.review.rejectionNote?.trim()
    ) {
      throw new BadRequestException("Cần cung cấp lý do từ chối tin tuyển dụng");
    }
    const job = await this.prisma.job.findUnique({ where: { id: input.id } });
    if (!job) throw new NotFoundException("Không tìm thấy tin tuyển dụng");
    if (job.status !== JobStatus.PENDING) {
      throw new BadRequestException("Chỉ có thể duyệt tin đang chờ xử lý");
    }
    const updated = await this.prisma.$transaction(async (transaction) => {
      const updated = await transaction.job.update({
        where: { id: job.id },
        data: {
          status: input.review.status!,
          rejectionNote:
            input.review.status === JobStatus.REJECTED
              ? input.review.rejectionNote?.trim()
              : null,
          publishedAt:
            input.review.status === JobStatus.APPROVED ? new Date() : null,
        },
      });
      await transaction.auditLog.create({
        data: {
          actorId: input.actor.id,
          action: `JOB_${input.review.status}`,
          entityType: "Job",
          entityId: job.id,
          details: { rejectionNote: input.review.rejectionNote },
        },
      });
      return updated;
    });
    await this.events.publish(
      input.review.status === JobStatus.APPROVED
        ? "job.approved"
        : "job.rejected",
      {
        jobId: job.id,
        recruiterId: job.recruiterId,
        title: job.title,
        rejectionNote: input.review.rejectionNote,
      },
    );
    return updated;
  }

  private async assertActiveRecruiter(actor: Actor) {
    if (actor.role !== Role.RECRUITER) {
      throw new ForbiddenException("Chỉ nhà tuyển dụng mới được thực hiện thao tác này");
    }
    const user = await this.prisma.user.findUnique({
      where: { id: actor.id },
      select: { accountStatus: true, verificationStatus: true },
    });
    if (!user || user.accountStatus !== AccountStatus.ACTIVE) {
      throw new ForbiddenException("Tài khoản nhà tuyển dụng không hoạt động");
    }
    return user;
  }

  private validateNewJob(input: JobInput) {
    const data = this.validateJob(input);
    if (
      !data.title ||
      !data.description ||
      !data.location ||
      !data.employmentType
    ) {
      throw new BadRequestException("Thông tin tin tuyển dụng chưa đầy đủ");
    }
    return {
      ...data,
      title: data.title,
      description: data.description,
      location: data.location,
      employmentType: data.employmentType,
    };
  }

  private validateJob(input: JobInput, partial = false) {
    const title = input.title?.trim();
    const description = input.description?.trim();
    const location = input.location?.trim();
    const employmentTypes = Object.values(EmploymentType);
    if (
      (!partial || input.title !== undefined) &&
      (!title || title.length > 200)
    ) {
      throw new BadRequestException("Tiêu đề tin tuyển dụng là bắt buộc");
    }
    if ((!partial || input.description !== undefined) && !description) {
      throw new BadRequestException("Mô tả công việc là bắt buộc");
    }
    if ((!partial || input.location !== undefined) && !location) {
      throw new BadRequestException("Địa điểm làm việc là bắt buộc");
    }
    if (
      (!partial || input.employmentType !== undefined) &&
      !employmentTypes.some((type) => type === input.employmentType)
    ) {
      throw new BadRequestException("Hình thức làm việc không hợp lệ");
    }
    if (
      input.salaryMin !== undefined &&
      input.salaryMax !== undefined &&
      input.salaryMin > input.salaryMax
    ) {
      throw new BadRequestException("Mức lương tối thiểu không thể lớn hơn mức lương tối đa");
    }
    if (
      input.expiresAt !== undefined &&
      Number.isNaN(Date.parse(input.expiresAt))
    ) {
      throw new BadRequestException("Ngày hết hạn không hợp lệ");
    }
    return {
      ...(input.title !== undefined ? { title } : {}),
      ...(input.description !== undefined ? { description } : {}),
      ...(input.requirements !== undefined
        ? { requirements: input.requirements }
        : {}),
      ...(input.location !== undefined ? { location } : {}),
      ...(input.employmentType !== undefined
        ? { employmentType: input.employmentType }
        : {}),
      ...(input.salaryMin !== undefined ? { salaryMin: input.salaryMin } : {}),
      ...(input.salaryMax !== undefined ? { salaryMax: input.salaryMax } : {}),
      ...(input.currency !== undefined ? { currency: input.currency } : {}),
      ...(input.expiresAt !== undefined
        ? { expiresAt: new Date(input.expiresAt) }
        : {}),
    };
  }
}
