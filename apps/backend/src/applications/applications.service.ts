import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  AccountStatus,
  ApplicationStatus,
  JobStatus,
  Role,
} from "@prisma/client";
import { Actor } from "../common/bootstrap";
import { KafkaEventsService } from "../events/kafka-events.service";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ApplicationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: KafkaEventsService,
  ) {}

  async create(input: {
    actor: Actor;
    application: { jobId?: string; cvUrl?: string; coverLetter?: string };
  }) {
    if (input.actor.role !== Role.CANDIDATE) {
      throw new ForbiddenException("Chỉ ứng viên mới có thể ứng tuyển");
    }
    const jobId = input.application?.jobId;
    const cvUrl = input.application?.cvUrl?.trim();
    if (!jobId || !cvUrl || cvUrl.length > 2048) {
      throw new BadRequestException("Vui lòng cung cấp tin tuyển dụng và đường dẫn CV hợp lệ");
    }
    const job = await this.prisma.job.findFirst({
      where: {
        id: jobId,
        status: JobStatus.APPROVED,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      include: { recruiter: { select: { fullName: true } } },
    });
    if (!job) throw new NotFoundException("Không tìm thấy tin tuyển dụng đang mở");
    const application = await this.prisma.application.create({
      data: {
        jobId,
        candidateId: input.actor.id,
        cvUrl,
        coverLetter: input.application.coverLetter,
      },
    });
    await this.events.publish("application.submitted", {
      applicationId: application.id,
      jobId: job.id,
      jobTitle: job.title,
      recruiterId: job.recruiterId,
      candidateId: input.actor.id,
    });
    return application;
  }

  async list(actor: Actor) {
    if (actor.role === Role.CANDIDATE) {
      return this.prisma.application.findMany({
        where: { candidateId: actor.id },
        include: { job: { include: { company: true } } },
        orderBy: { createdAt: "desc" },
      });
    }
    if (actor.role === Role.RECRUITER) {
      const recruiter = await this.prisma.user.findUnique({
        where: { id: actor.id },
        select: { accountStatus: true },
      });
      if (!recruiter || recruiter.accountStatus !== AccountStatus.ACTIVE) {
        throw new ForbiddenException("Tài khoản nhà tuyển dụng không hoạt động");
      }
      return this.prisma.application.findMany({
        where: { job: { recruiterId: actor.id } },
        include: {
          job: { select: { id: true, title: true } },
          candidate: {
            select: {
              id: true,
              fullName: true,
              email: true,
              candidateProfile: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    }
    if (actor.role === Role.ADMIN) {
      return this.prisma.application.findMany({
        orderBy: { createdAt: "desc" },
        take: 100,
      });
    }
    throw new ForbiddenException("Vai trò này không được phép xem hồ sơ ứng tuyển");
  }

  async dashboard(actor: Actor) {
    const where =
      actor.role === Role.CANDIDATE
        ? { candidateId: actor.id }
        : actor.role === Role.RECRUITER
          ? { job: { recruiterId: actor.id } }
          : {};
    const [total, byStatus] = await Promise.all([
      this.prisma.application.count({ where }),
      this.prisma.application.groupBy({
        by: ["status"],
        where,
        _count: { id: true },
      }),
    ]);
    return { total, byStatus };
  }

  async update(input: {
    actor: Actor;
    id: string;
    status: { status?: ApplicationStatus };
  }) {
    if (input.actor.role !== Role.RECRUITER) {
      throw new ForbiddenException("Chỉ nhà tuyển dụng mới có thể cập nhật hồ sơ");
    }
    const status = input.status?.status;
    const allowedStatuses = Object.values(ApplicationStatus);
    if (!allowedStatuses.includes(status as ApplicationStatus)) {
      throw new BadRequestException("Trạng thái hồ sơ ứng tuyển không hợp lệ");
    }
    const application = await this.prisma.application.findFirst({
      where: { id: input.id, job: { recruiterId: input.actor.id } },
    });
    if (!application) throw new NotFoundException("Không tìm thấy hồ sơ ứng tuyển");
    const nextStatuses: Record<ApplicationStatus, ApplicationStatus[]> = {
      APPLIED: [ApplicationStatus.VIEWED, ApplicationStatus.REJECTED],
      VIEWED: [ApplicationStatus.INTERVIEW, ApplicationStatus.REJECTED],
      INTERVIEW: [ApplicationStatus.ACCEPTED, ApplicationStatus.REJECTED],
      ACCEPTED: [],
      REJECTED: [],
    };
    if (!nextStatuses[application.status].includes(status!)) {
      throw new BadRequestException("Không thể chuyển hồ sơ sang trạng thái này");
    }
    const updated = await this.prisma.application.update({
      where: { id: application.id },
      data: { status },
    });
    await this.events.publish("application.status.updated", {
      applicationId: application.id,
      candidateId: application.candidateId,
      jobId: application.jobId,
      status,
    });
    return updated;
  }
}
