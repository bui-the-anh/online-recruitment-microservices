import {
  BadRequestException,
  ConflictException,
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
import { Prisma } from "@prisma/client";
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
    try {
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
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new ConflictException(
          "Bạn đã nộp hồ sơ cho tin tuyển dụng này rồi",
        );
      }
      throw error;
    }
  }

  async list(
    actor: Actor,
    query: {
      jobId?: string;
      status?: string;
      search?: string;
      page?: string;
      pageSize?: string;
    } = {},
  ) {
    if (actor.role === Role.CANDIDATE) {
      return this.prisma.application.findMany({
        where: { candidateId: actor.id },
        include: {
          job: {
            include: {
              company: {
                select: {
                  id: true,
                  name: true,
                  location: true,
                  industry: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    }
    if (actor.role === Role.RECRUITER) {
      return this.listForRecruiter(actor, query);
    }
    if (actor.role === Role.ADMIN) {
      // Admin theo dõi trạng thái đơn; không được xem CV (README §1.6).
      return this.prisma.application.findMany({
        select: {
          id: true,
          jobId: true,
          candidateId: true,
          coverLetter: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          job: { select: { id: true, title: true, recruiterId: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      });
    }
    throw new ForbiddenException("Vai trò này không được phép xem hồ sơ ứng tuyển");
  }

  private async listForRecruiter(
    actor: Actor,
    query: {
      jobId?: string;
      status?: string;
      search?: string;
      page?: string;
      pageSize?: string;
    },
  ) {
    const recruiter = await this.prisma.user.findUnique({
      where: { id: actor.id },
      select: { accountStatus: true },
    });
    if (!recruiter || recruiter.accountStatus !== AccountStatus.ACTIVE) {
      throw new ForbiddenException("Tài khoản nhà tuyển dụng không hoạt động");
    }

    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.min(50, Math.max(1, Number(query.pageSize) || 8));
    const search = query.search?.trim();
    const jobId = query.jobId?.trim();
    const statusRaw = query.status?.trim().toUpperCase();
    const status =
      statusRaw && statusRaw !== "ALL"
        ? (statusRaw as ApplicationStatus)
        : undefined;
    if (status && !Object.values(ApplicationStatus).includes(status)) {
      throw new BadRequestException("Trạng thái hồ sơ không hợp lệ");
    }

    const baseWhere = {
      job: {
        recruiterId: actor.id,
        ...(jobId ? { id: jobId } : {}),
      },
    };
    const where = {
      ...baseWhere,
      ...(status ? { status } : {}),
      ...(search
        ? {
            OR: [
              {
                candidate: {
                  fullName: {
                    contains: search,
                    mode: "insensitive" as const,
                  },
                },
              },
              {
                candidate: {
                  email: {
                    contains: search,
                    mode: "insensitive" as const,
                  },
                },
              },
              {
                candidate: {
                  candidateProfile: {
                    headline: {
                      contains: search,
                      mode: "insensitive" as const,
                    },
                  },
                },
              },
            ],
          }
        : {}),
    };

    const [items, total, statusRows, jobs] = await Promise.all([
      this.prisma.application.findMany({
        where,
        include: {
          job: {
            select: {
              id: true,
              title: true,
              location: true,
              workMode: true,
              skills: true,
              requirements: true,
              category: true,
            },
          },
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
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.application.count({ where }),
      this.prisma.application.groupBy({
        by: ["status"],
        where: baseWhere,
        _count: { id: true },
      }),
      this.prisma.job.findMany({
        where: {
          recruiterId: actor.id,
          status: { in: [JobStatus.APPROVED, JobStatus.CLOSED] },
        },
        select: {
          id: true,
          title: true,
          status: true,
          _count: { select: { applications: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const counts = {
      total: 0,
      applied: 0,
      viewed: 0,
      interview: 0,
      accepted: 0,
      rejected: 0,
    };
    for (const row of statusRows) {
      counts.total += row._count.id;
      if (row.status === ApplicationStatus.APPLIED) counts.applied = row._count.id;
      if (row.status === ApplicationStatus.VIEWED) counts.viewed = row._count.id;
      if (row.status === ApplicationStatus.INTERVIEW)
        counts.interview = row._count.id;
      if (row.status === ApplicationStatus.ACCEPTED)
        counts.accepted = row._count.id;
      if (row.status === ApplicationStatus.REJECTED)
        counts.rejected = row._count.id;
    }

    return {
      items: items.map((item) => ({
        ...item,
        matchScore: this.computeMatchScore(
          item.candidate.candidateProfile,
          item.job,
        ),
      })),
      total,
      page,
      pageSize,
      counts,
      jobs: jobs.map((job) => ({
        id: job.id,
        title: job.title,
        status: job.status,
        applicants: job._count.applications,
      })),
    };
  }

  private computeMatchScore(
    profile: {
      skills?: unknown;
      experienceYears?: unknown;
      headline?: string | null;
    } | null,
    job: {
      skills?: unknown;
      requirements?: string | null;
      category?: string | null;
    },
  ): number {
    const profileSkills = Array.isArray(profile?.skills)
      ? profile!.skills.map((s) => String(s).toLowerCase())
      : [];
    const jobSkills = Array.isArray(job.skills)
      ? job.skills.map((s) => String(s).toLowerCase())
      : [];
    const requirementTokens = (job.requirements ?? "")
      .toLowerCase()
      .split(/[^a-z0-9+#./]+/i)
      .filter((token) => token.length > 2);
    const haystack = new Set([...jobSkills, ...requirementTokens]);
    if (haystack.size === 0 && profileSkills.length === 0) return 72;
    if (haystack.size === 0) return 68;
    let hits = 0;
    for (const skill of profileSkills) {
      for (const token of haystack) {
        if (skill.includes(token) || token.includes(skill)) {
          hits += 1;
          break;
        }
      }
    }
    const base =
      profileSkills.length > 0
        ? Math.round((hits / profileSkills.length) * 100)
        : 55;
    const experienceBoost =
      profile?.experienceYears != null
        ? Math.min(12, Number(profile.experienceYears) * 1.5)
        : 0;
    return Math.max(48, Math.min(98, Math.round(base * 0.85 + 15 + experienceBoost)));
  }

  async get(input: { actor: Actor; id: string }) {
    const application = await this.prisma.application.findUnique({
      where: { id: input.id },
      include: {
        job: {
          include: {
            company: {
              select: {
                id: true,
                name: true,
                description: true,
                website: true,
                industry: true,
                location: true,
                recruiter: {
                  select: {
                    fullName: true,
                    verificationStatus: true,
                  },
                },
              },
            },
          },
        },
        candidate: {
          select: {
            id: true,
            fullName: true,
            email: true,
            candidateProfile: true,
          },
        },
      },
    });
    if (!application) {
      throw new NotFoundException("Không tìm thấy hồ sơ ứng tuyển");
    }

    if (input.actor.role === Role.CANDIDATE) {
      if (application.candidateId !== input.actor.id) {
        throw new ForbiddenException("Bạn không có quyền xem đơn ứng tuyển này");
      }
      const { candidate: _candidate, ...safe } = application;
      return safe;
    }

    if (input.actor.role === Role.RECRUITER) {
      if (application.job.recruiterId !== input.actor.id) {
        throw new ForbiddenException("Bạn không có quyền xem đơn ứng tuyển này");
      }
      let current = application;
      if (application.status === ApplicationStatus.APPLIED) {
        current = await this.prisma.application.update({
          where: { id: application.id },
          data: { status: ApplicationStatus.VIEWED },
          include: {
            job: {
              include: {
                company: {
                  select: {
                    id: true,
                    name: true,
                    description: true,
                    website: true,
                    industry: true,
                    location: true,
                    recruiter: {
                      select: {
                        fullName: true,
                        verificationStatus: true,
                      },
                    },
                  },
                },
              },
            },
            candidate: {
              select: {
                id: true,
                fullName: true,
                email: true,
                candidateProfile: true,
              },
            },
          },
        });
        await this.events.publish("application.status.updated", {
          applicationId: current.id,
          candidateId: current.candidateId,
          jobId: current.jobId,
          status: ApplicationStatus.VIEWED,
        });
      }
      return {
        ...current,
        matchScore: this.computeMatchScore(
          current.candidate.candidateProfile,
          current.job,
        ),
      };
    }

    if (input.actor.role === Role.ADMIN) {
      const { cvUrl: _cvUrl, candidate: _candidate, ...safe } = application;
      return safe;
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

    if (actor.role !== Role.RECRUITER) {
      return { total, byStatus };
    }

    const weekStart = new Date();
    weekStart.setHours(0, 0, 0, 0);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const now = new Date();

    const statusMap = Object.fromEntries(
      byStatus.map((row) => [row.status, row._count.id]),
    ) as Partial<Record<ApplicationStatus, number>>;
    const unviewed = statusMap[ApplicationStatus.APPLIED] ?? 0;
    const responded =
      total -
      unviewed;
    const responseRate =
      total > 0 ? Math.round((responded / total) * 1000) / 10 : 0;

    const [newApplications, interviewsThisWeek, recentApplications, upcomingInterviews] =
      await Promise.all([
        this.prisma.application.count({
          where: {
            job: { recruiterId: actor.id },
            createdAt: { gte: sevenDaysAgo },
          },
        }),
        this.prisma.application.count({
          where: {
            job: { recruiterId: actor.id },
            interviewScheduledAt: { gte: weekStart, lt: weekEnd },
          },
        }),
        this.prisma.application.findMany({
          where: {
            job: { recruiterId: actor.id },
            status: ApplicationStatus.APPLIED,
          },
          orderBy: { createdAt: "desc" },
          take: 8,
          select: {
            id: true,
            status: true,
            cvUrl: true,
            createdAt: true,
            job: { select: { id: true, title: true } },
            candidate: {
              select: {
                id: true,
                fullName: true,
                email: true,
              },
            },
          },
        }),
        this.prisma.application.findMany({
          where: {
            job: { recruiterId: actor.id },
            interviewScheduledAt: { gte: now },
          },
          orderBy: { interviewScheduledAt: "asc" },
          take: 5,
          select: {
            id: true,
            interviewScheduledAt: true,
            interviewDetails: true,
            job: { select: { id: true, title: true } },
            candidate: {
              select: { id: true, fullName: true, email: true },
            },
          },
        }),
      ]);

    return {
      total,
      byStatus,
      stats: {
        newApplications,
        interviewsThisWeek,
        unviewed,
        responseRate,
      },
      recentApplications,
      upcomingInterviews,
    };
  }

  async update(input: {
    actor: Actor;
    id: string;
    status: {
      status?: ApplicationStatus;
      interviewScheduledAt?: string;
      interviewDetails?: string;
    };
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
    const interviewScheduledAt = input.status.interviewScheduledAt
      ? new Date(input.status.interviewScheduledAt)
      : undefined;
    if (
      interviewScheduledAt &&
      Number.isNaN(interviewScheduledAt.getTime())
    ) {
      throw new BadRequestException("Thời gian phỏng vấn không hợp lệ");
    }
    const updated = await this.prisma.application.update({
      where: { id: application.id },
      data: {
        status,
        ...(status === ApplicationStatus.INTERVIEW
          ? {
              ...(interviewScheduledAt
                ? { interviewScheduledAt }
                : {}),
              ...(input.status.interviewDetails !== undefined
                ? {
                    interviewDetails:
                      input.status.interviewDetails?.trim() || null,
                  }
                : {}),
            }
          : {}),
      },
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
