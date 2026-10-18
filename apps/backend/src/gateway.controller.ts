import {
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
} from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { Role } from "@prisma/client";
import type { Response } from "express";
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
    const services = await Promise.all([
      this.request(this.auth, { cmd: "health" }, {}, 2000),
      this.request(this.jobs, { cmd: "health" }, {}, 2000),
      this.request(this.applications, { cmd: "health" }, {}, 2000),
      this.request(this.notifications, { cmd: "health" }, {}, 2000),
    ]);
    return { status: "ok", database: "connected", services };
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
    @Body() body: unknown,
    @Res({ passthrough: true }) response: Response,
  ) {
    const session = await this.request<{
      user: unknown;
      accessToken: string;
      refreshToken: string;
    }>(this.auth, { cmd: "auth.login" }, body);
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
    }>(
      this.auth,
      { cmd: "auth.refresh" },
      { refreshToken: request.cookies?.refresh_token },
    );
    this.setSessionCookies(response, session);
    return { user: session.user };
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
  @Get("api/jobs/:id")
  getJob(@Param("id") id: string) {
    return this.request(this.jobs, { cmd: "jobs.get" }, { id });
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
    @Query("page") page?: string,
  ) {
    return this.request(this.jobs, { cmd: "jobs.recruiter-list" }, {
      actor: this.actor(request),
      page,
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
  listApplications(@Req() request: AuthenticatedRequest) {
    return this.request(
      this.applications,
      { cmd: "applications.list" },
      this.actor(request),
    );
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
  listRecruiters() {
    return this.request(this.auth, { cmd: "admin.recruiters.list" }, {});
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
  adminJobs(@Query("status") status?: string) {
    return this.request(this.jobs, { cmd: "admin.jobs.queue" }, {
      status,
    });
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
