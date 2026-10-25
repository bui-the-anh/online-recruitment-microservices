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
  WorkMode,
} from "@prisma/client";
import { Actor } from "../common/bootstrap";
import { KafkaEventsService } from "../events/kafka-events.service";
import { PrismaService } from "../prisma/prisma.service";

interface JobInput {
  title?: string;
  description?: string;
  requirements?: string;
  benefits?: string;
  location?: string;
  employmentType?: EmploymentType;
  workMode?: WorkMode;
  category?: string;
  level?: string;
  headcount?: number;
  skills?: string[];
  experienceMin?: number;
  experienceMax?: number;
  fastResponse?: boolean;
  salaryMin?: number;
  salaryMax?: number;
  salaryNegotiable?: boolean;
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
    workMode?: WorkMode;
    category?: string;
    salaryMin?: string;
    salaryMax?: string;
    experienceMin?: string;
    page?: string;
    pageSize?: string;
    sort?: string;
  }) {
    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.min(50, Math.max(1, Number(query.pageSize) || 8));
    const salaryMin = query.salaryMin ? Number(query.salaryMin) : undefined;
    const salaryMax = query.salaryMax ? Number(query.salaryMax) : undefined;
    const experienceMin = query.experienceMin
      ? Number(query.experienceMin)
      : undefined;

    const where = {
      status: JobStatus.APPROVED,
      AND: [
        { OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
        ...(query.search
          ? [
              {
                OR: [
                  {
                    title: {
                      contains: query.search,
                      mode: "insensitive" as const,
                    },
                  },
                  {
                    description: {
                      contains: query.search,
                      mode: "insensitive" as const,
                    },
                  },
                  {
                    requirements: {
                      contains: query.search,
                      mode: "insensitive" as const,
                    },
                  },
                  {
                    company: {
                      name: {
                        contains: query.search,
                        mode: "insensitive" as const,
                      },
                    },
                  },
                ],
              },
            ]
          : []),
        ...(salaryMin !== undefined && !Number.isNaN(salaryMin)
          ? [
              {
                OR: [
                  { salaryMax: { gte: salaryMin } },
                  { salaryMin: { gte: salaryMin } },
                ],
              },
            ]
          : []),
        ...(salaryMax !== undefined && !Number.isNaN(salaryMax)
          ? [
              {
                OR: [
                  { salaryMin: { lte: salaryMax } },
                  { salaryMax: { lte: salaryMax } },
                ],
              },
            ]
          : []),
        ...(experienceMin !== undefined && !Number.isNaN(experienceMin)
          ? [
              {
                OR: [
                  { experienceMax: { gte: experienceMin } },
                  { experienceMin: { gte: experienceMin } },
                  {
                    AND: [
                      { experienceMin: null },
                      { experienceMax: null },
                    ],
                  },
                ],
              },
            ]
          : []),
      ],
      ...(query.location
        ? {
            location: {
              contains: query.location,
              mode: "insensitive" as const,
            },
          }
        : {}),
      ...(query.employmentType ? { employmentType: query.employmentType } : {}),
      ...(query.workMode ? { workMode: query.workMode } : {}),
      ...(query.category
        ? {
            category: {
              equals: query.category,
              mode: "insensitive" as const,
            },
          }
        : {}),
    };

    const orderBy =
      query.sort === "salary_desc"
        ? [{ salaryMax: "desc" as const }, { publishedAt: "desc" as const }]
        : query.sort === "salary_asc"
          ? [{ salaryMin: "asc" as const }, { publishedAt: "desc" as const }]
          : query.sort === "deadline"
            ? [{ expiresAt: "asc" as const }, { publishedAt: "desc" as const }]
            : [{ publishedAt: "desc" as const }];

    const openWhere = {
      status: JobStatus.APPROVED,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    };

    const [items, total, totalOpen, openCategoryRows] =
      await this.prisma.$transaction([
        this.prisma.job.findMany({
          where,
          include: {
            company: {
              select: {
                id: true,
                name: true,
                location: true,
                industry: true,
                recruiter: {
                  select: { verificationStatus: true },
                },
              },
            },
            _count: { select: { applications: true } },
          },
          orderBy,
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        this.prisma.job.count({ where }),
        this.prisma.job.count({ where: openWhere }),
        this.prisma.job.findMany({
          where: openWhere,
          select: { category: true },
        }),
      ]);

    const categoryMap = new Map<string, number>();
    for (const row of openCategoryRows) {
      if (!row.category) continue;
      categoryMap.set(row.category, (categoryMap.get(row.category) ?? 0) + 1);
    }
    const categories = [...categoryMap.entries()]
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);

    return { items, total, totalOpen, page, pageSize, categories };
  }

  private openJobsWhere() {
    return {
      status: JobStatus.APPROVED,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    };
  }

  private mapCompanyCard(
    company: {
      id: string;
      name: string;
      description: string | null;
      location: string | null;
      industry: string | null;
      website: string | null;
      companySize: string | null;
      rating: unknown;
      reviewCount: number;
      benefits: unknown;
      responseRate: unknown;
      coverUrl: string | null;
      featured: boolean;
      recruiter: { verificationStatus: VerificationStatus | null };
    },
    openJobs: number,
  ) {
    return {
      id: company.id,
      name: company.name,
      description: company.description,
      location: company.location,
      industry: company.industry,
      website: company.website,
      companySize: company.companySize,
      rating: company.rating != null ? Number(company.rating) : null,
      reviewCount: company.reviewCount,
      benefits: Array.isArray(company.benefits)
        ? (company.benefits as string[])
        : [],
      responseRate:
        company.responseRate != null ? Number(company.responseRate) : null,
      coverUrl: company.coverUrl,
      featured: company.featured,
      verified:
        company.recruiter.verificationStatus === VerificationStatus.VERIFIED,
      openJobs,
    };
  }

  private companyCardSelect() {
    return {
      id: true,
      name: true,
      description: true,
      location: true,
      industry: true,
      website: true,
      companySize: true,
      rating: true,
      reviewCount: true,
      benefits: true,
      responseRate: true,
      coverUrl: true,
      featured: true,
      recruiter: { select: { verificationStatus: true } },
    } as const;
  }

  async featuredCompanies(limitValue?: string) {
    const limit = Math.min(12, Math.max(1, Number(limitValue) || 6));
    const openJobs = this.openJobsWhere();

    const featured = await this.prisma.company.findMany({
      where: {
        featured: true,
        recruiter: {
          accountStatus: AccountStatus.ACTIVE,
          verificationStatus: VerificationStatus.VERIFIED,
        },
      },
      select: this.companyCardSelect(),
      take: limit,
      orderBy: [{ rating: "desc" }, { reviewCount: "desc" }],
    });

    let companies = featured;
    if (companies.length < limit) {
      const more = await this.prisma.company.findMany({
        where: {
          id: { notIn: companies.map((c) => c.id) },
          recruiter: {
            accountStatus: AccountStatus.ACTIVE,
            verificationStatus: VerificationStatus.VERIFIED,
          },
          jobs: { some: openJobs },
        },
        select: this.companyCardSelect(),
        take: limit - companies.length,
        orderBy: [{ rating: "desc" }, { reviewCount: "desc" }],
      });
      companies = [...companies, ...more];
    }

    if (companies.length === 0) return { items: [] };

    const counts = await this.prisma.job.groupBy({
      by: ["companyId"],
      where: {
        ...openJobs,
        companyId: { in: companies.map((c) => c.id) },
      },
      _count: { id: true },
    });
    const countById = new Map(
      counts.map((row) => [row.companyId, row._count.id]),
    );

    return {
      items: companies.map((company) =>
        this.mapCompanyCard(company, countById.get(company.id) ?? 0),
      ),
    };
  }

  async listCompanies(query: {
    search?: string;
    industry?: string;
    location?: string;
    sort?: string;
    page?: string;
    pageSize?: string;
  }) {
    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.min(24, Math.max(1, Number(query.pageSize) || 6));
    const search = query.search?.trim();
    const industry = query.industry?.trim();
    const location = query.location?.trim();
    const sort = query.sort?.trim() || "featured";
    const openJobs = this.openJobsWhere();

    const where = {
      recruiter: {
        accountStatus: AccountStatus.ACTIVE,
        verificationStatus: VerificationStatus.VERIFIED,
      },
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" as const } },
              {
                description: {
                  contains: search,
                  mode: "insensitive" as const,
                },
              },
              {
                industry: { contains: search, mode: "insensitive" as const },
              },
            ],
          }
        : {}),
      ...(industry
        ? {
            industry: {
              contains: industry,
              mode: "insensitive" as const,
            },
          }
        : {}),
      ...(location
        ? {
            location: {
              contains: location,
              mode: "insensitive" as const,
            },
          }
        : {}),
    };

    const [companies, total, industryRows, locationRows, fastRows] =
      await Promise.all([
        this.prisma.company.findMany({
          where,
          select: this.companyCardSelect(),
          skip: (page - 1) * pageSize,
          take: pageSize,
          orderBy:
            sort === "rating"
              ? [{ rating: "desc" }, { reviewCount: "desc" }]
              : sort === "jobs"
                ? [{ featured: "desc" }, { updatedAt: "desc" }]
                : [
                    { featured: "desc" },
                    { rating: "desc" },
                    { reviewCount: "desc" },
                  ],
        }),
        this.prisma.company.count({ where }),
        this.prisma.company.findMany({
          where: {
            industry: { not: null },
            recruiter: {
              accountStatus: AccountStatus.ACTIVE,
              verificationStatus: VerificationStatus.VERIFIED,
            },
          },
          select: { industry: true },
          distinct: ["industry"],
          orderBy: { industry: "asc" },
        }),
        this.prisma.company.findMany({
          where: {
            location: { not: null },
            recruiter: {
              accountStatus: AccountStatus.ACTIVE,
              verificationStatus: VerificationStatus.VERIFIED,
            },
          },
          select: { location: true },
          distinct: ["location"],
          orderBy: { location: "asc" },
        }),
        this.prisma.company.findMany({
          where: {
            responseRate: { not: null },
            recruiter: {
              accountStatus: AccountStatus.ACTIVE,
              verificationStatus: VerificationStatus.VERIFIED,
            },
          },
          select: {
            id: true,
            name: true,
            responseRate: true,
            industry: true,
          },
          orderBy: { responseRate: "desc" },
          take: 5,
        }),
      ]);

    const counts = companies.length
      ? await this.prisma.job.groupBy({
          by: ["companyId"],
          where: {
            ...openJobs,
            companyId: { in: companies.map((c) => c.id) },
          },
          _count: { id: true },
        })
      : [];
    const countById = new Map(
      counts.map((row) => [row.companyId, row._count.id]),
    );

    let items = companies.map((company) =>
      this.mapCompanyCard(company, countById.get(company.id) ?? 0),
    );
    if (sort === "jobs") {
      items = [...items].sort((a, b) => b.openJobs - a.openJobs);
    }

    const industryTotals = await this.prisma.company.groupBy({
      by: ["industry"],
      where: {
        industry: { not: null },
        recruiter: {
          accountStatus: AccountStatus.ACTIVE,
          verificationStatus: VerificationStatus.VERIFIED,
        },
      },
      _count: { id: true },
    });
    const industryTotalCount = industryTotals.reduce(
      (sum, row) => sum + row._count.id,
      0,
    );
    const favorites = industryTotals
      .filter((row) => row.industry)
      .map((row) => ({
        industry: row.industry as string,
        percent:
          industryTotalCount > 0
            ? Math.round((row._count.id / industryTotalCount) * 100)
            : 0,
        count: row._count.id,
      }))
      .sort((a, b) => b.percent - a.percent)
      .slice(0, 4);

    return {
      items,
      total,
      page,
      pageSize,
      industries: industryRows
        .map((row) => row.industry)
        .filter((value): value is string => Boolean(value)),
      locations: locationRows
        .map((row) => row.location)
        .filter((value): value is string => Boolean(value)),
      fastResponders: fastRows.map((row) => ({
        id: row.id,
        name: row.name,
        industry: row.industry,
        responseRate: row.responseRate != null ? Number(row.responseRate) : 0,
      })),
      favorites,
    };
  }

  async getCompanyPublic(input: { id: string; category?: string }) {
    const id = input.id?.trim();
    if (!id) throw new BadRequestException("Thiếu mã công ty");

    const company = await this.prisma.company.findFirst({
      where: {
        id,
        recruiter: {
          accountStatus: AccountStatus.ACTIVE,
          verificationStatus: VerificationStatus.VERIFIED,
        },
      },
      select: {
        ...this.companyCardSelect(),
        address: true,
        foundedYear: true,
        followersCount: true,
        benefitsDetail: true,
        avgResponseDays: true,
        galleryUrls: true,
        metrics: true,
        cultureValues: true,
        team: true,
        recruiter: {
          select: {
            id: true,
            fullName: true,
            email: true,
            verificationStatus: true,
          },
        },
      },
    });
    if (!company) throw new NotFoundException("Không tìm thấy doanh nghiệp");

    const openJobs = this.openJobsWhere();
    const category = input.category?.trim();
    const jobWhere = {
      companyId: id,
      ...openJobs,
      ...(category
        ? {
            category: {
              contains: category,
              mode: "insensitive" as const,
            },
          }
        : {}),
    };

    const [jobs, openJobsCount, categoryRows] = await Promise.all([
      this.prisma.job.findMany({
        where: jobWhere,
        orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
        take: 50,
        select: {
          id: true,
          title: true,
          location: true,
          employmentType: true,
          workMode: true,
          category: true,
          salaryMin: true,
          salaryMax: true,
          currency: true,
          fastResponse: true,
          publishedAt: true,
          createdAt: true,
          expiresAt: true,
        },
      }),
      this.prisma.job.count({
        where: { companyId: id, ...openJobs },
      }),
      this.prisma.job.findMany({
        where: { companyId: id, ...openJobs, category: { not: null } },
        select: { category: true },
        distinct: ["category"],
        orderBy: { category: "asc" },
      }),
    ]);

    const base = this.mapCompanyCard(company, openJobsCount);
    const asArray = <T>(value: unknown): T[] =>
      Array.isArray(value) ? (value as T[]) : [];

    const teamFromJson = asArray<{
      name: string;
      title?: string;
      email?: string;
    }>(company.team);
    const team =
      teamFromJson.length > 0
        ? teamFromJson
        : [
            {
              name: company.recruiter.fullName,
              title: "Talent Acquisition",
              email: company.recruiter.email,
            },
          ];

    return {
      ...base,
      address: company.address,
      foundedYear: company.foundedYear,
      followersCount: company.followersCount,
      avgResponseDays:
        company.avgResponseDays != null
          ? Number(company.avgResponseDays)
          : null,
      metrics: asArray<{ label: string; value: string }>(company.metrics),
      cultureValues: asArray<{
        title: string;
        description: string;
      }>(company.cultureValues),
      galleryUrls: asArray<string>(company.galleryUrls),
      benefitsDetail: asArray<{
        title: string;
        description: string;
      }>(company.benefitsDetail),
      team,
      categories: categoryRows
        .map((row) => row.category)
        .filter((value): value is string => Boolean(value)),
      jobs: jobs.map((job) => ({
        ...job,
        salaryMin: job.salaryMin != null ? Number(job.salaryMin) : null,
        salaryMax: job.salaryMax != null ? Number(job.salaryMax) : null,
        hot: job.fastResponse,
        highSalary:
          job.salaryMin != null && Number(job.salaryMin) >= 30000000,
      })),
    };
  }

  async recruiterJobs(
    actor: Actor,
    query: {
      page?: string;
      pageSize?: string;
      status?: string;
      search?: string;
      category?: string;
      sort?: string;
    } = {},
  ) {
    if (actor.role !== Role.RECRUITER) {
      throw new ForbiddenException("Chỉ nhà tuyển dụng mới có thể xem danh sách tin này");
    }
    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.min(50, Math.max(1, Number(query.pageSize) || 4));
    const search = query.search?.trim();
    const category = query.category?.trim();
    const statusRaw = query.status?.trim().toUpperCase();
    const status =
      statusRaw && statusRaw !== "ALL"
        ? (statusRaw as JobStatus)
        : undefined;
    if (status && !Object.values(JobStatus).includes(status)) {
      throw new BadRequestException("Trạng thái tin tuyển dụng không hợp lệ");
    }

    const where = {
      recruiterId: actor.id,
      ...(status ? { status } : {}),
      ...(category
        ? {
            category: {
              contains: category,
              mode: "insensitive" as const,
            },
          }
        : {}),
      ...(search
        ? {
            OR: [
              {
                title: { contains: search, mode: "insensitive" as const },
              },
              {
                location: {
                  contains: search,
                  mode: "insensitive" as const,
                },
              },
              {
                category: {
                  contains: search,
                  mode: "insensitive" as const,
                },
              },
            ],
          }
        : {}),
    };

    const [items, total, statusRows, applicationsTotal, categories] =
      await Promise.all([
        this.prisma.job.findMany({
          where,
          include: {
            company: { select: { id: true, name: true } },
            _count: { select: { applications: true } },
          },
          orderBy:
            query.sort === "oldest"
              ? { createdAt: "asc" }
              : query.sort === "salary"
                ? { salaryMax: "desc" }
                : { createdAt: "desc" },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        this.prisma.job.count({ where }),
        this.prisma.job.groupBy({
          by: ["status"],
          where: { recruiterId: actor.id },
          _count: { id: true },
        }),
        this.prisma.application.count({
          where: { job: { recruiterId: actor.id } },
        }),
        this.prisma.job.findMany({
          where: {
            recruiterId: actor.id,
            category: { not: null },
          },
          select: { category: true },
          distinct: ["category"],
          orderBy: { category: "asc" },
        }),
      ]);

    const counts = {
      total: 0,
      approved: 0,
      pending: 0,
      rejected: 0,
      closed: 0,
    };
    for (const row of statusRows) {
      counts.total += row._count.id;
      if (row.status === JobStatus.APPROVED) counts.approved = row._count.id;
      if (row.status === JobStatus.PENDING) counts.pending = row._count.id;
      if (row.status === JobStatus.REJECTED) counts.rejected = row._count.id;
      if (row.status === JobStatus.CLOSED) counts.closed = row._count.id;
    }

    return {
      items: items.map((job) => ({
        ...job,
        code: `JOB-${new Date(job.createdAt).getFullYear()}-${job.id
          .slice(0, 4)
          .toUpperCase()}`,
        salaryMin: job.salaryMin != null ? Number(job.salaryMin) : null,
        salaryMax: job.salaryMax != null ? Number(job.salaryMax) : null,
        applicants: job._count.applications,
      })),
      total,
      page,
      pageSize,
      counts,
      applicationsTotal,
      avgApprovalHours: 1.8,
      firstPassRate: 92.4,
      categories: categories
        .map((row) => row.category)
        .filter((value): value is string => Boolean(value)),
    };
  }

  async adminQueue(query: {
    status?: string;
    search?: string;
    days?: string;
    page?: string;
    pageSize?: string;
  }) {
    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.min(50, Math.max(1, Number(query.pageSize) || 4));
    const search = query.search?.trim();
    const days = query.days ? Number(query.days) : undefined;
    const statusRaw = query.status?.trim().toUpperCase();
    const status =
      statusRaw && statusRaw !== "ALL"
        ? (statusRaw as JobStatus)
        : undefined;

    if (status && !Object.values(JobStatus).includes(status)) {
      throw new BadRequestException("Trạng thái tin tuyển dụng không hợp lệ");
    }

    const createdAtFilter =
      days !== undefined && !Number.isNaN(days) && days > 0
        ? {
            createdAt: {
              gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
            },
          }
        : {};

    const where = {
      ...(status ? { status } : {}),
      ...createdAtFilter,
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: "insensitive" as const } },
              { location: { contains: search, mode: "insensitive" as const } },
              {
                company: {
                  name: { contains: search, mode: "insensitive" as const },
                },
              },
              {
                recruiter: {
                  fullName: {
                    contains: search,
                    mode: "insensitive" as const,
                  },
                },
              },
              {
                recruiter: {
                  email: {
                    contains: search,
                    mode: "insensitive" as const,
                  },
                },
              },
            ],
          }
        : {}),
    };

    const [items, total, statusRows] = await Promise.all([
      this.prisma.job.findMany({
        where,
        include: {
          company: {
            select: {
              id: true,
              name: true,
              industry: true,
              location: true,
              verificationDetails: true,
            },
          },
          recruiter: {
            select: {
              id: true,
              fullName: true,
              email: true,
              verificationStatus: true,
            },
          },
        },
        orderBy: [{ createdAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.job.count({ where }),
      this.prisma.job.groupBy({
        by: ["status"],
        _count: { id: true },
      }),
    ]);

    const counts = {
      pending: 0,
      approved: 0,
      rejected: 0,
      closed: 0,
      total: 0,
    };
    for (const row of statusRows) {
      counts.total += row._count.id;
      if (row.status === JobStatus.PENDING) counts.pending = row._count.id;
      if (row.status === JobStatus.APPROVED) counts.approved = row._count.id;
      if (row.status === JobStatus.REJECTED) counts.rejected = row._count.id;
      if (row.status === JobStatus.CLOSED) counts.closed = row._count.id;
    }

    return {
      items: items.map((job) => ({
        ...job,
        code: `JD-${job.id.slice(0, 8).toUpperCase()}`,
        companyVerified:
          job.recruiter.verificationStatus === VerificationStatus.VERIFIED,
        missingLicense:
          job.recruiter.verificationStatus !== VerificationStatus.VERIFIED ||
          !job.company.verificationDetails ||
          /chờ|pending/i.test(job.company.verificationDetails),
        salaryMin: job.salaryMin != null ? Number(job.salaryMin) : null,
        salaryMax: job.salaryMax != null ? Number(job.salaryMax) : null,
      })),
      total,
      page,
      pageSize,
      counts,
    };
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

    if (actor.role === Role.RECRUITER) {
      const statusMap = Object.fromEntries(
        byStatus.map((row) => [row.status, row._count.id]),
      ) as Partial<Record<JobStatus, number>>;
      const attentionJobs = await this.prisma.job.findMany({
        where: { recruiterId: actor.id },
        orderBy: [{ updatedAt: "desc" }],
        take: 6,
        select: {
          id: true,
          title: true,
          location: true,
          workMode: true,
          status: true,
          salaryMin: true,
          salaryMax: true,
          currency: true,
          expiresAt: true,
          rejectionNote: true,
          createdAt: true,
          updatedAt: true,
          _count: { select: { applications: true } },
        },
      });
      const company = await this.prisma.company.findUnique({
        where: { recruiterId: actor.id },
        select: {
          id: true,
          name: true,
          taxCode: true,
          industry: true,
          location: true,
          verificationDetails: true,
        },
      });
      return {
        total,
        byStatus,
        jobs: {
          total,
          pending: statusMap[JobStatus.PENDING] ?? 0,
          approved: statusMap[JobStatus.APPROVED] ?? 0,
          rejected: statusMap[JobStatus.REJECTED] ?? 0,
          closed: statusMap[JobStatus.CLOSED] ?? 0,
        },
        attentionJobs: attentionJobs.map((job) => ({
          ...job,
          salaryMin: job.salaryMin != null ? Number(job.salaryMin) : null,
          salaryMax: job.salaryMax != null ? Number(job.salaryMax) : null,
          applicants: job._count.applications,
        })),
        company,
      };
    }

    if (actor.role !== Role.ADMIN) {
      return { total, byStatus };
    }

    const statusMap = Object.fromEntries(
      byStatus.map((row) => [row.status, row._count.id]),
    ) as Partial<Record<JobStatus, number>>;

    const pendingJobs = await this.prisma.job.findMany({
      where: { status: JobStatus.PENDING },
      include: {
        company: {
          select: { id: true, name: true, industry: true, location: true },
        },
        recruiter: {
          select: { id: true, fullName: true, email: true },
        },
      },
      orderBy: { createdAt: "asc" },
      take: 8,
    });

    return {
      total,
      byStatus,
      jobs: {
        total,
        pending: statusMap[JobStatus.PENDING] ?? 0,
        approved: statusMap[JobStatus.APPROVED] ?? 0,
        rejected: statusMap[JobStatus.REJECTED] ?? 0,
        closed: statusMap[JobStatus.CLOSED] ?? 0,
      },
      pendingJobs,
    };
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
            recruiter: { select: { verificationStatus: true } },
          },
        },
        _count: { select: { applications: true } },
      },
    });
    if (!job) throw new NotFoundException("Không tìm thấy tin tuyển dụng đang mở");
    return job;
  }

  async saveCompany(input: {
    actor: Actor;
    company: {
      name?: string;
      brandName?: string | null;
      legalName?: string | null;
      description?: string | null;
      website?: string | null;
      industry?: string | null;
      specialties?: string[] | null;
      location?: string | null;
      address?: string | null;
      offices?: Array<{ label?: string; address?: string; city?: string }> | null;
      taxCode?: string | null;
      contactPhone?: string | null;
      contactEmail?: string | null;
      companySize?: string | null;
      foundedYear?: number | null;
      benefits?: string[] | null;
      benefitsDetail?: Array<{ title?: string; description?: string }> | null;
      cultureValues?: Array<{ title?: string; description?: string }> | null;
      coverUrl?: string | null;
      logoUrl?: string | null;
      galleryUrls?: string[] | null;
      verificationDetails?: string | null;
      licenseDocumentUrl?: string | null;
      licenseDocumentName?: string | null;
    };
  }) {
    await this.assertActiveRecruiter(input.actor);
    const name = input.company?.name?.trim();
    if (!name || name.length > 200) {
      throw new BadRequestException("Tên công ty là bắt buộc và không hợp lệ");
    }
    const asStringArray = (value: unknown) =>
      Array.isArray(value)
        ? value
            .filter((item): item is string => typeof item === "string")
            .map((item) => item.trim())
            .filter(Boolean)
        : undefined;
    const cultureValues = Array.isArray(input.company.cultureValues)
      ? input.company.cultureValues
          .filter((row) => row && typeof row.title === "string")
          .map((row) => ({
            title: String(row.title).trim(),
            description: String(row.description || "").trim(),
          }))
          .filter((row) => row.title)
      : undefined;
    const benefitsDetail = Array.isArray(input.company.benefitsDetail)
      ? input.company.benefitsDetail
          .filter((row) => row && typeof row.title === "string")
          .map((row) => ({
            title: String(row.title).trim(),
            description: String(row.description || "").trim(),
          }))
          .filter((row) => row.title)
      : undefined;
    const offices = Array.isArray(input.company.offices)
      ? input.company.offices
          .filter((row) => row && (row.address || row.city || row.label))
          .map((row) => ({
            label: String(row.label || "Văn phòng").trim(),
            address: String(row.address || "").trim(),
            city: String(row.city || "").trim(),
          }))
      : undefined;

    const data = {
      name,
      brandName: input.company.brandName?.trim() || null,
      legalName: input.company.legalName?.trim() || null,
      description: input.company.description?.trim() || null,
      website: input.company.website?.trim() || null,
      industry: input.company.industry?.trim() || null,
      specialties: asStringArray(input.company.specialties) ?? undefined,
      location: input.company.location?.trim() || null,
      address: input.company.address?.trim() || null,
      offices: offices ?? undefined,
      taxCode: input.company.taxCode?.trim() || null,
      contactPhone: input.company.contactPhone?.trim() || null,
      contactEmail: input.company.contactEmail?.trim() || null,
      companySize: input.company.companySize?.trim() || null,
      foundedYear:
        input.company.foundedYear != null && !Number.isNaN(Number(input.company.foundedYear))
          ? Number(input.company.foundedYear)
          : null,
      benefits: asStringArray(input.company.benefits) ?? undefined,
      benefitsDetail: benefitsDetail ?? undefined,
      cultureValues: cultureValues ?? undefined,
      coverUrl: input.company.coverUrl?.trim() || null,
      logoUrl: input.company.logoUrl?.trim() || null,
      galleryUrls: asStringArray(input.company.galleryUrls) ?? undefined,
      verificationDetails: input.company.verificationDetails?.trim() || null,
      licenseDocumentUrl: input.company.licenseDocumentUrl?.trim() || null,
      licenseDocumentName: input.company.licenseDocumentName?.trim() || null,
    };

    const cleaned = Object.fromEntries(
      Object.entries(data).filter(([, value]) => value !== undefined),
    );

    const company = await this.prisma.company.upsert({
      where: { recruiterId: input.actor.id },
      create: { ...cleaned, name, recruiterId: input.actor.id },
      update: cleaned,
      include: {
        recruiter: {
          select: {
            id: true,
            fullName: true,
            email: true,
            verificationStatus: true,
            accountStatus: true,
          },
        },
      },
    });
    return this.mapRecruiterCompany(company);
  }

  async getCompany(actor: Actor) {
    if (actor.role !== Role.RECRUITER) {
      throw new ForbiddenException("Chỉ nhà tuyển dụng mới có thể xem hồ sơ công ty");
    }
    await this.assertActiveRecruiter(actor);
    const company = await this.prisma.company.findUnique({
      where: { recruiterId: actor.id },
      include: {
        recruiter: {
          select: {
            id: true,
            fullName: true,
            email: true,
            verificationStatus: true,
            accountStatus: true,
          },
        },
        _count: { select: { jobs: true } },
      },
    });
    if (!company) return null;
    return this.mapRecruiterCompany(company);
  }

  private mapRecruiterCompany(company: {
    id: string;
    name: string;
    brandName?: string | null;
    legalName?: string | null;
    description: string | null;
    website: string | null;
    industry: string | null;
    specialties?: unknown;
    location: string | null;
    address: string | null;
    offices?: unknown;
    taxCode: string | null;
    contactPhone: string | null;
    contactEmail?: string | null;
    companySize: string | null;
    foundedYear: number | null;
    followersCount: number;
    rating: unknown;
    reviewCount: number;
    benefits: unknown;
    benefitsDetail: unknown;
    responseRate: unknown;
    avgResponseDays: unknown;
    coverUrl: string | null;
    logoUrl?: string | null;
    galleryUrls: unknown;
    metrics: unknown;
    cultureValues: unknown;
    team: unknown;
    featured: boolean;
    verificationDetails: string | null;
    licenseDocumentUrl: string | null;
    licenseDocumentName: string | null;
    createdAt: Date;
    updatedAt: Date;
    recruiter?: {
      id: string;
      fullName: string;
      email: string;
      verificationStatus: VerificationStatus | null;
      accountStatus: AccountStatus;
    } | null;
    _count?: { jobs: number };
  }) {
    const asArray = <T>(value: unknown): T[] =>
      Array.isArray(value) ? (value as T[]) : [];
    const completionChecks = [
      Boolean(company.logoUrl || company.coverUrl),
      Boolean(company.description?.trim()),
      Boolean(company.licenseDocumentUrl),
      asArray(company.benefits).length > 0 ||
        asArray(company.benefitsDetail).length > 0,
      asArray(company.galleryUrls).length > 0,
      Boolean(company.address || company.location),
    ];
    const completionScore = Math.round(
      (completionChecks.filter(Boolean).length / completionChecks.length) * 100,
    );
    return {
      ...company,
      brandName: company.brandName || company.name,
      legalName: company.legalName || company.name,
      specialties: asArray<string>(company.specialties),
      offices: asArray<{ label?: string; address?: string; city?: string }>(
        company.offices,
      ),
      benefits: asArray<string>(company.benefits),
      benefitsDetail: asArray<{ title: string; description?: string }>(
        company.benefitsDetail,
      ),
      cultureValues: asArray<{ title: string; description?: string }>(
        company.cultureValues,
      ),
      galleryUrls: asArray<string>(company.galleryUrls),
      metrics: asArray<{ label: string; value: string }>(company.metrics),
      team: asArray<{ name: string; title?: string; email?: string }>(
        company.team,
      ),
      rating: company.rating != null ? Number(company.rating) : null,
      responseRate:
        company.responseRate != null ? Number(company.responseRate) : null,
      avgResponseDays:
        company.avgResponseDays != null
          ? Number(company.avgResponseDays)
          : null,
      verified:
        company.recruiter?.verificationStatus === VerificationStatus.VERIFIED,
      jobsCount: company._count?.jobs ?? 0,
      completionScore,
      completion: {
        branding: Boolean(company.logoUrl || company.coverUrl),
        description: Boolean(company.description?.trim()),
        legal: Boolean(company.licenseDocumentUrl),
        benefits:
          asArray(company.benefits).length > 0 ||
          asArray(company.benefitsDetail).length > 0,
        gallery: asArray(company.galleryUrls).length > 0,
        location: Boolean(company.address || company.location),
      },
    };
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
    const nextStatus = input.review.status;
    if (
      nextStatus !== JobStatus.APPROVED &&
      nextStatus !== JobStatus.REJECTED &&
      nextStatus !== JobStatus.CLOSED
    ) {
      throw new BadRequestException("Trạng thái duyệt tin không hợp lệ");
    }
    if (
      nextStatus === JobStatus.REJECTED &&
      !input.review.rejectionNote?.trim()
    ) {
      throw new BadRequestException("Cần cung cấp lý do từ chối tin tuyển dụng");
    }
    const job = await this.prisma.job.findUnique({ where: { id: input.id } });
    if (!job) throw new NotFoundException("Không tìm thấy tin tuyển dụng");
    if (nextStatus === JobStatus.CLOSED) {
      if (job.status !== JobStatus.APPROVED) {
        throw new BadRequestException("Chỉ có thể khóa tin đã được phê duyệt");
      }
    } else if (job.status !== JobStatus.PENDING) {
      throw new BadRequestException("Chỉ có thể duyệt tin đang chờ xử lý");
    }
    const updated = await this.prisma.$transaction(async (transaction) => {
      const updated = await transaction.job.update({
        where: { id: job.id },
        data: {
          status: nextStatus!,
          rejectionNote:
            nextStatus === JobStatus.REJECTED
              ? input.review.rejectionNote?.trim()
              : null,
          publishedAt:
            nextStatus === JobStatus.APPROVED ? new Date() : job.publishedAt,
        },
      });
      await transaction.auditLog.create({
        data: {
          actorId: input.actor.id,
          action: `JOB_${nextStatus}`,
          entityType: "Job",
          entityId: job.id,
          details: { rejectionNote: input.review.rejectionNote },
        },
      });
      return updated;
    });
    if (nextStatus === JobStatus.APPROVED || nextStatus === JobStatus.REJECTED) {
      await this.events.publish(
        nextStatus === JobStatus.APPROVED ? "job.approved" : "job.rejected",
        {
          jobId: job.id,
          recruiterId: job.recruiterId,
          title: job.title,
          rejectionNote: input.review.rejectionNote,
        },
      );
    }
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
    const workModes = Object.values(WorkMode);
    if (
      (!partial || input.workMode !== undefined) &&
      input.workMode !== undefined &&
      !workModes.includes(input.workMode)
    ) {
      throw new BadRequestException("Hình thức làm việc (work mode) không hợp lệ");
    }
    if (
      input.experienceMin !== undefined &&
      input.experienceMax !== undefined &&
      input.experienceMin > input.experienceMax
    ) {
      throw new BadRequestException("Kinh nghiệm tối thiểu không thể lớn hơn tối đa");
    }
    const category = input.category?.trim();
    const level = input.level?.trim();
    const benefits = input.benefits?.trim();
    if (
      input.headcount !== undefined &&
      (!Number.isInteger(input.headcount) || input.headcount < 1 || input.headcount > 999)
    ) {
      throw new BadRequestException("Số lượng tuyển phải từ 1 đến 999");
    }
    if (
      input.skills !== undefined &&
      (!Array.isArray(input.skills) ||
        input.skills.some((skill) => typeof skill !== "string" || !skill.trim()))
    ) {
      throw new BadRequestException("Danh sách kỹ năng không hợp lệ");
    }
    return {
      ...(input.title !== undefined ? { title } : {}),
      ...(input.description !== undefined ? { description } : {}),
      ...(input.requirements !== undefined
        ? { requirements: input.requirements }
        : {}),
      ...(input.benefits !== undefined ? { benefits: benefits || null } : {}),
      ...(input.location !== undefined ? { location } : {}),
      ...(input.employmentType !== undefined
        ? { employmentType: input.employmentType }
        : {}),
      ...(input.workMode !== undefined ? { workMode: input.workMode } : {}),
      ...(input.category !== undefined
        ? { category: category || null }
        : {}),
      ...(input.level !== undefined ? { level: level || null } : {}),
      ...(input.headcount !== undefined ? { headcount: input.headcount } : {}),
      ...(input.skills !== undefined
        ? {
            skills: input.skills.map((skill) => skill.trim()).filter(Boolean),
          }
        : {}),
      ...(input.experienceMin !== undefined
        ? { experienceMin: input.experienceMin }
        : {}),
      ...(input.experienceMax !== undefined
        ? { experienceMax: input.experienceMax }
        : {}),
      ...(input.fastResponse !== undefined
        ? { fastResponse: Boolean(input.fastResponse) }
        : {}),
      ...(input.salaryMin !== undefined ? { salaryMin: input.salaryMin } : {}),
      ...(input.salaryMax !== undefined ? { salaryMax: input.salaryMax } : {}),
      ...(input.salaryNegotiable !== undefined
        ? { salaryNegotiable: Boolean(input.salaryNegotiable) }
        : {}),
      ...(input.currency !== undefined ? { currency: input.currency } : {}),
      ...(input.expiresAt !== undefined
        ? { expiresAt: new Date(input.expiresAt) }
        : {}),
    };
  }
}
