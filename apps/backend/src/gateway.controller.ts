import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  Put,
  Req,
  Res,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ClientProxy } from "@nestjs/microservices";
import { Role } from "@prisma/client";
import type { Response } from "express";
import { existsSync, mkdirSync, readFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { firstValueFrom, timeout } from "rxjs";
import {
  APPLICATIONS_SERVICE,
  AUTH_SERVICE,
  JOBS_SERVICE,
  NOTIFICATIONS_SERVICE,
} from "./common/constants";
import { Public, Roles } from "./common/decorators";
import { Actor, startHttpApplication } from "./common/bootstrap";
import { AuthenticatedRequest } from "./common/guards";
import { toHttpException } from "./common/rpc-error";
import { PrismaService } from "./prisma/prisma.service";
import {
  uploadAssetToSupabase,
  uploadCvToSupabase,
} from "./common/supabase-storage";

type UploadedCvFile = {
  originalname: string;
  size: number;
  mimetype: string;
  path: string;
};

const CV_MIME = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);
const IMAGE_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);
const CV_MAX_BYTES = 5 * 1024 * 1024;
const IMAGE_MAX_BYTES = 8 * 1024 * 1024;

function clientIp(request: AuthenticatedRequest): string | undefined {
  const forwarded = request.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) {
    return forwarded.split(",")[0]?.trim();
  }
  return request.ip || request.socket?.remoteAddress || undefined;
}

@Controller()
export class GatewayController {
  constructor(
    @Inject(AUTH_SERVICE) private readonly auth: ClientProxy,
    @Inject(JOBS_SERVICE) private readonly jobs: ClientProxy,
    @Inject(APPLICATIONS_SERVICE)
    private readonly applications: ClientProxy,
    @Inject(NOTIFICATIONS_SERVICE)
    private readonly notifications: ClientProxy,
    private readonly prisma: PrismaService,
  ) {}

  private async request<T>(
    client: ClientProxy,
    pattern: object,
    data: unknown,
    timeoutMs = 10000,
  ): Promise<T> {
    try {
      return await firstValueFrom(
        client.send<T>(pattern, data).pipe(timeout(timeoutMs)),
      );
    } catch (error) {
      throw toHttpException(error);
    }
  }

  private setSessionCookies(
    response: Response,
    session: { accessToken: string; refreshToken: string },
  ) {
    const common = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",
    };
    response.cookie("access_token", session.accessToken, {
      ...common,
      maxAge: 15 * 60 * 1000,
    });
    response.cookie("refresh_token", session.refreshToken, {
      ...common,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }

  private clearSessionCookies(response: Response) {
    const common = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",
    };
    response.clearCookie("access_token", common);
    response.clearCookie("refresh_token", common);
  }

  @Public()
  @Get("health")
  async health() {
    await this.prisma.$queryRaw`SELECT 1`;
    const names = ["auth", "jobs", "applications", "notifications"] as const;
    const clients = [
      this.auth,
      this.jobs,
      this.applications,
      this.notifications,
    ] as const;
    const settled = await Promise.all(
      clients.map(async (client, index) => {
        try {
          const result = await this.request(client, { cmd: "health" }, {}, 3000);
          return { name: names[index], ok: true, result };
        } catch (error) {
          return {
            name: names[index],
            ok: false,
            error: error instanceof Error ? error.message : "unavailable",
          };
        }
      }),
    );
    const allOk = settled.every((row) => row.ok);
    return {
      status: allOk ? "ok" : "degraded",
      database: "connected",
      services: settled,
    };
  }

  @Public()
  @Post("api/auth/register")
  async register(
    @Body() body: unknown,
    @Res({ passthrough: true }) response: Response,
  ) {
    const session = await this.request<{
      user: unknown;
      accessToken: string;
      refreshToken: string;
    }>(this.auth, { cmd: "auth.register" }, body);
    this.setSessionCookies(response, session);
    return { user: session.user };
  }

  @Public()
  @Post("api/auth/login")
  async login(
    @Req() request: AuthenticatedRequest,
    @Body() body: unknown,
    @Res({ passthrough: true }) response: Response,
  ) {
    const session = await this.request<{
      user: unknown;
      accessToken: string;
      refreshToken: string;
    }>(this.auth, { cmd: "auth.login" }, {
      ...(typeof body === "object" && body ? body : {}),
      userAgent: request.headers["user-agent"],
      ipAddress: clientIp(request),
    });
    this.setSessionCookies(response, session);
    return { user: session.user };
  }

  @Public()
  @Post("api/auth/refresh")
  async refresh(
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    const session = await this.request<{
      user: unknown;
      accessToken: string;
      refreshToken: string;
    }>(this.auth, { cmd: "auth.refresh" }, {
      refreshToken: request.cookies?.refresh_token,
      userAgent: request.headers["user-agent"],
      ipAddress: clientIp(request),
    });
    this.setSessionCookies(response, session);
    return { user: session.user };
  }

  @Roles(Role.ADMIN, Role.RECRUITER, Role.CANDIDATE)
  @Get("api/settings")
  getSettings(@Req() request: AuthenticatedRequest) {
    return this.request(this.auth, { cmd: "auth.settings.get" }, this.actor(request));
  }

  @Roles(Role.ADMIN, Role.RECRUITER, Role.CANDIDATE)
  @Patch("api/settings")
  updateSettings(
    @Req() request: AuthenticatedRequest,
    @Body() body: unknown,
  ) {
    return this.request(this.auth, { cmd: "auth.settings.update" }, {
      actor: this.actor(request),
      update: body,
    });
  }

  @Roles(Role.ADMIN, Role.RECRUITER, Role.CANDIDATE)
  @Post("api/auth/change-password")
  changePassword(
    @Req() request: AuthenticatedRequest,
    @Body() body: unknown,
  ) {
    return this.request(this.auth, { cmd: "auth.password.change" }, {
      actor: this.actor(request),
      update: body,
    });
  }

  @Roles(Role.ADMIN, Role.RECRUITER, Role.CANDIDATE)
  @Get("api/auth/sessions")
  listSessions(@Req() request: AuthenticatedRequest) {
    return this.request(this.auth, { cmd: "auth.sessions.list" }, {
      actor: this.actor(request),
      refreshToken: request.cookies?.refresh_token,
    });
  }

  @Roles(Role.ADMIN, Role.RECRUITER, Role.CANDIDATE)
  @Post("api/auth/sessions/revoke-others")
  revokeOtherSessions(@Req() request: AuthenticatedRequest) {
    return this.request(this.auth, { cmd: "auth.sessions.revoke-others" }, {
      actor: this.actor(request),
      refreshToken: request.cookies?.refresh_token,
    });
  }

  @Roles(Role.ADMIN, Role.RECRUITER, Role.CANDIDATE)
  @Post("api/auth/sessions/:id/revoke")
  revokeSession(
    @Req() request: AuthenticatedRequest,
    @Param("id") id: string,
  ) {
    return this.request(this.auth, { cmd: "auth.sessions.revoke" }, {
      actor: this.actor(request),
      id,
    });
  }

  @Public()
  @Post("api/auth/logout")
  async logout(
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.request(
      this.auth,
      { cmd: "auth.logout" },
      { refreshToken: request.cookies?.refresh_token },
    );
    this.clearSessionCookies(response);
    return result;
  }

  @Get("api/auth/me")
  me(@Req() request: AuthenticatedRequest) {
    return this.request(this.auth, { cmd: "auth.me" }, this.actor(request));
  }

  @Roles(Role.CANDIDATE)
  @Get("api/candidate/profile")
  candidateProfile(@Req() request: AuthenticatedRequest) {
    return this.request(
      this.auth,
      { cmd: "auth.candidate-profile.get" },
      this.actor(request),
    );
  }

  @Roles(Role.CANDIDATE)
  @Patch("api/candidate/profile")
  updateCandidateProfile(
    @Req() request: AuthenticatedRequest,
    @Body() body: unknown,
  ) {
    return this.request(this.auth, { cmd: "auth.candidate-profile.update" }, {
      actor: this.actor(request),
      profile: body,
    });
  }

  @Public()
  @Get("api/jobs")
  listJobs(@Query() query: Record<string, string | undefined>) {
    return this.request(this.jobs, { cmd: "jobs.list" }, query);
  }

  @Public()
  @Get("api/companies/featured")
  featuredCompanies(@Query("limit") limit?: string) {
    return this.request(this.jobs, { cmd: "companies.featured" }, { limit });
  }

  @Public()
  @Get("api/companies")
  listCompanies(@Query() query: Record<string, string | undefined>) {
    return this.request(this.jobs, { cmd: "companies.list" }, query);
  }

  @Roles(Role.RECRUITER)
  @Put("api/companies/me")
  saveCompany(
    @Req() request: AuthenticatedRequest,
    @Body() body: unknown,
  ) {
    return this.request(this.jobs, { cmd: "companies.save" }, {
      actor: this.actor(request),
      company: body,
    });
  }

  @Roles(Role.RECRUITER)
  @Get("api/companies/me")
  getCompany(@Req() request: AuthenticatedRequest) {
    return this.request(
      this.jobs,
      { cmd: "companies.get" },
      this.actor(request),
    );
  }

  @Public()
  @Get("api/companies/:id")
  getCompanyPublic(
    @Param("id") id: string,
    @Query("category") category?: string,
  ) {
    return this.request(
      this.jobs,
      { cmd: "companies.get-public" },
      { id, category },
    );
  }

  @Public()
  @Get("api/jobs/:id")
  getJob(@Param("id") id: string) {
    return this.request(this.jobs, { cmd: "jobs.get" }, { id });
  }

  @Roles(Role.RECRUITER)
  @Post("api/jobs")
  createJob(
    @Req() request: AuthenticatedRequest,
    @Body() body: unknown,
  ) {
    return this.request(this.jobs, { cmd: "jobs.create" }, {
      actor: this.actor(request),
      job: body,
    });
  }

  @Roles(Role.RECRUITER)
  @Get("api/recruiter/jobs")
  recruiterJobs(
    @Req() request: AuthenticatedRequest,
    @Query() query: Record<string, string | undefined>,
  ) {
    return this.request(this.jobs, { cmd: "jobs.recruiter-list" }, {
      actor: this.actor(request),
      ...query,
    });
  }

  @Roles(Role.RECRUITER)
  @Patch("api/jobs/:id")
  updateJob(
    @Req() request: AuthenticatedRequest,
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    return this.request(this.jobs, { cmd: "jobs.update" }, {
      actor: this.actor(request),
      id,
      changes: body,
    });
  }

  @Roles(Role.CANDIDATE)
  @Post("api/uploads/cv")
  @UseInterceptors(
    FileInterceptor("file", {
      dest: join(process.cwd(), "uploads"),
      limits: { fileSize: CV_MAX_BYTES },
      fileFilter: (_request, file, callback) => {
        if (!CV_MIME.has(file.mimetype)) {
          callback(
            new BadRequestException(
              "Chỉ chấp nhận CV định dạng PDF hoặc DOCX",
            ) as unknown as Error,
            false,
          );
          return;
        }
        callback(null, true);
      },
    }),
  )
  async uploadCv(
    @Req() request: AuthenticatedRequest,
    @UploadedFile() file?: UploadedCvFile,
  ) {
    if (!file?.path) {
      throw new BadRequestException("Vui lòng chọn tệp CV để tải lên");
    }
    const uploadsDir = join(process.cwd(), "uploads");
    if (!existsSync(uploadsDir)) mkdirSync(uploadsDir, { recursive: true });
    try {
      const buffer = readFileSync(file.path);
      if (!buffer.length) {
        throw new BadRequestException("Tệp CV trống");
      }
      const uploaded = await uploadCvToSupabase({
        buffer,
        originalName: file.originalname,
        mimeType: file.mimetype,
        candidateId: this.actor(request).id,
      });
      return {
        url: uploaded.url,
        path: uploaded.path,
        bucket: uploaded.bucket,
        fileName: file.originalname,
        size: file.size,
        mimeType: file.mimetype,
        uploadedAt: new Date().toISOString(),
      };
    } finally {
      try {
        unlinkSync(file.path);
      } catch {
        // ignore cleanup errors
      }
    }
  }

  @Roles(Role.RECRUITER)
  @Post("api/uploads/company")
  @UseInterceptors(
    FileInterceptor("file", {
      dest: join(process.cwd(), "uploads"),
      limits: { fileSize: IMAGE_MAX_BYTES },
      fileFilter: (_request, file, callback) => {
        if (!IMAGE_MIME.has(file.mimetype) && !CV_MIME.has(file.mimetype)) {
          callback(
            new BadRequestException(
              "Chỉ chấp nhận ảnh (JPG/PNG/WEBP) hoặc PDF giấy phép",
            ) as unknown as Error,
            false,
          );
          return;
        }
        callback(null, true);
      },
    }),
  )
  async uploadCompanyAsset(
    @Req() request: AuthenticatedRequest,
    @UploadedFile() file?: UploadedCvFile,
    @Query("kind") kind?: string,
  ) {
    if (!file?.path) {
      throw new BadRequestException("Vui lòng chọn tệp để tải lên");
    }
    const uploadsDir = join(process.cwd(), "uploads");
    if (!existsSync(uploadsDir)) mkdirSync(uploadsDir, { recursive: true });
    const folderKind =
      kind === "logo"
        ? "logo"
        : kind === "gallery"
          ? "gallery"
          : kind === "license"
            ? "license"
            : "cover";
    try {
      const buffer = readFileSync(file.path);
      if (!buffer.length) {
        throw new BadRequestException("Tệp trống");
      }
      const uploaded = await uploadAssetToSupabase({
        buffer,
        originalName: file.originalname,
        mimeType: file.mimetype,
        folder: `companies/${this.actor(request).id}/${folderKind}`,
      });
      return {
        url: uploaded.url,
        path: uploaded.path,
        bucket: uploaded.bucket,
        kind: folderKind,
        fileName: file.originalname,
        size: file.size,
        mimeType: file.mimetype,
        uploadedAt: new Date().toISOString(),
      };
    } finally {
      try {
        unlinkSync(file.path);
      } catch {
        // ignore
      }
    }
  }

  @Roles(Role.CANDIDATE)
  @Post("api/applications")
  apply(
    @Req() request: AuthenticatedRequest,
    @Body() body: unknown,
  ) {
    return this.request(this.applications, { cmd: "applications.create" }, {
      actor: this.actor(request),
      application: body,
    });
  }

  @Roles(Role.CANDIDATE, Role.RECRUITER, Role.ADMIN)
  @Get("api/applications")
  listApplications(
    @Req() request: AuthenticatedRequest,
    @Query() query: Record<string, string | undefined>,
  ) {
    const actor = this.actor(request);
    if (actor.role === Role.RECRUITER) {
      return this.request(this.applications, { cmd: "applications.list" }, {
        actor,
        ...query,
      });
    }
    return this.request(
      this.applications,
      { cmd: "applications.list" },
      actor,
    );
  }

  @Roles(Role.CANDIDATE, Role.RECRUITER, Role.ADMIN)
  @Get("api/applications/:id")
  getApplication(
    @Req() request: AuthenticatedRequest,
    @Param("id") id: string,
  ) {
    return this.request(this.applications, { cmd: "applications.get" }, {
      actor: this.actor(request),
      id,
    });
  }

  @Roles(Role.RECRUITER)
  @Patch("api/applications/:id/status")
  updateApplication(
    @Req() request: AuthenticatedRequest,
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    return this.request(this.applications, { cmd: "applications.update" }, {
      actor: this.actor(request),
      id,
      status: body,
    });
  }

  @Get("api/notifications")
  listNotifications(@Req() request: AuthenticatedRequest) {
    return this.request(
      this.notifications,
      { cmd: "notifications.list" },
      this.actor(request),
    );
  }

  @Patch("api/notifications/:id/read")
  markNotificationRead(
    @Req() request: AuthenticatedRequest,
    @Param("id") id: string,
  ) {
    return this.request(
      this.notifications,
      { cmd: "notifications.read" },
      { userId: request.user.sub, id },
    );
  }

  @Roles(Role.ADMIN)
  @Get("api/admin/recruiters")
  listRecruiters(@Query() query: Record<string, string | undefined>) {
    return this.request(this.auth, { cmd: "admin.recruiters.list" }, query);
  }

  @Roles(Role.ADMIN)
  @Get("api/admin/audit-logs")
  listAuditLogs(@Req() request: AuthenticatedRequest) {
    return this.request(
      this.auth,
      { cmd: "admin.audit-logs.list" },
      this.actor(request),
    );
  }

  @Roles(Role.ADMIN)
  @Get("api/admin/jobs")
  adminJobs(@Query() query: Record<string, string | undefined>) {
    return this.request(this.jobs, { cmd: "admin.jobs.queue" }, query);
  }

  @Roles(Role.ADMIN)
  @Get("api/admin/recruiters/:id")
  getRecruiterDetail(@Param("id") id: string) {
    return this.request(this.auth, { cmd: "admin.recruiters.get" }, { id });
  }

  @Roles(Role.ADMIN)
  @Patch("api/admin/recruiters/:id/verification")
  verifyRecruiter(
    @Req() request: AuthenticatedRequest,
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    return this.request(this.auth, { cmd: "admin.recruiters.verification" }, {
      actor: this.actor(request),
      id,
      update: body,
    });
  }

  @Roles(Role.ADMIN)
  @Patch("api/admin/recruiters/:id/account-status")
  updateRecruiterAccount(
    @Req() request: AuthenticatedRequest,
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    return this.request(this.auth, { cmd: "admin.recruiters.account" }, {
      actor: this.actor(request),
      id,
      update: body,
    });
  }

  @Roles(Role.ADMIN)
  @Patch("api/admin/jobs/:id/review")
  reviewJob(
    @Req() request: AuthenticatedRequest,
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    return this.request(this.jobs, { cmd: "admin.jobs.review" }, {
      actor: this.actor(request),
      id,
      review: body,
    });
  }

  @Roles(Role.CANDIDATE, Role.RECRUITER, Role.ADMIN)
  @Get("api/dashboard")
  async dashboard(@Req() request: AuthenticatedRequest) {
    const actor = this.actor(request);
    const [accounts, jobs, applications] = await Promise.all([
      this.request(this.auth, { cmd: "auth.dashboard" }, actor),
      this.request(this.jobs, { cmd: "jobs.dashboard" }, actor),
      this.request(this.applications, { cmd: "applications.dashboard" }, actor),
    ]);
    return { accounts, jobs, applications };
  }

  private actor(request: AuthenticatedRequest): Actor {
    return { id: request.user.sub, role: request.user.role };
  }
}

export async function bootstrapGateway(): Promise<void> {
  await startHttpApplication(require("./gateway.module").GatewayModule);
}
