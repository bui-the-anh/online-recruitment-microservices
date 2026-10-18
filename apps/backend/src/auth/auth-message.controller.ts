import { Controller } from "@nestjs/common";
import { MessagePattern, Payload } from "@nestjs/microservices";
import { AuthService } from "./auth.service";

@Controller()
export class AuthMessageController {
  constructor(private readonly auth: AuthService) {}

  @MessagePattern({ cmd: "health" })
  health() {
    return { name: "auth", status: "ready" };
  }

  @MessagePattern({ cmd: "auth.register" })
  register(@Payload() payload: Parameters<AuthService["register"]>[0]) {
    return this.auth.register(payload);
  }

  @MessagePattern({ cmd: "auth.login" })
  login(@Payload() payload: Parameters<AuthService["login"]>[0]) {
    return this.auth.login(payload);
  }

  @MessagePattern({ cmd: "auth.refresh" })
  refresh(@Payload() payload: { refreshToken?: string }) {
    return this.auth.refresh(payload.refreshToken);
  }

  @MessagePattern({ cmd: "auth.logout" })
  logout(@Payload() payload: { refreshToken?: string }) {
    return this.auth.logout(payload.refreshToken);
  }

  @MessagePattern({ cmd: "auth.me" })
  me(@Payload() payload: Parameters<AuthService["me"]>[0]) {
    return this.auth.me(payload);
  }

  @MessagePattern({ cmd: "auth.candidate-profile.get" })
  candidateProfile(@Payload() actor: Parameters<AuthService["candidateProfile"]>[0]) {
    return this.auth.candidateProfile(actor);
  }

  @MessagePattern({ cmd: "auth.candidate-profile.update" })
  updateCandidateProfile(
    @Payload()
    payload: {
      actor: Parameters<AuthService["candidateProfile"]>[0];
      profile: {
        fullName?: string;
        phone?: string;
        location?: string;
        headline?: string;
      };
    },
  ) {
    return this.auth.updateCandidateProfile(payload.actor, payload.profile);
  }

  @MessagePattern({ cmd: "auth.dashboard" })
  dashboard(@Payload() actor: Parameters<AuthService["dashboard"]>[0]) {
    return this.auth.dashboard(actor);
  }

  @MessagePattern({ cmd: "admin.recruiters.list" })
  listRecruiters() {
    return this.auth.listRecruiters();
  }

  @MessagePattern({ cmd: "admin.audit-logs.list" })
  listAuditLogs(@Payload() actor: Parameters<AuthService["listAuditLogs"]>[0]) {
    return this.auth.listAuditLogs(actor);
  }

  @MessagePattern({ cmd: "admin.recruiters.verification" })
  updateVerification(@Payload() payload: Parameters<AuthService["updateVerification"]>[0]) {
    return this.auth.updateVerification(payload);
  }

  @MessagePattern({ cmd: "admin.recruiters.account" })
  updateAccount(@Payload() payload: Parameters<AuthService["updateAccount"]>[0]) {
    return this.auth.updateAccount(payload);
  }
}
