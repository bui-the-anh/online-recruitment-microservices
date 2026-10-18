import { Controller } from "@nestjs/common";
import { MessagePattern, Payload } from "@nestjs/microservices";
import { JobsService } from "./jobs.service";

@Controller()
export class JobsMessageController {
  constructor(private readonly jobs: JobsService) {}

  @MessagePattern({ cmd: "health" })
  health() {
    return { name: "jobs", status: "ready" };
  }

  @MessagePattern({ cmd: "jobs.list" })
  list(@Payload() payload: Parameters<JobsService["list"]>[0]) {
    return this.jobs.list(payload);
  }

  @MessagePattern({ cmd: "jobs.recruiter-list" })
  recruiterJobs(
    @Payload()
    payload: { actor: import("../common/bootstrap").Actor; page?: string },
  ) {
    return this.jobs.recruiterJobs(payload.actor, payload.page);
  }

  @MessagePattern({ cmd: "admin.jobs.queue" })
  adminQueue(@Payload() payload: Parameters<JobsService["adminQueue"]>[0]) {
    return this.jobs.adminQueue(payload);
  }

  @MessagePattern({ cmd: "jobs.dashboard" })
  dashboard(@Payload() actor: Parameters<JobsService["dashboard"]>[0]) {
    return this.jobs.dashboard(actor);
  }

  @MessagePattern({ cmd: "jobs.get" })
  get(@Payload() payload: { id: string }) {
    return this.jobs.get(payload.id);
  }

  @MessagePattern({ cmd: "companies.save" })
  saveCompany(@Payload() payload: Parameters<JobsService["saveCompany"]>[0]) {
    return this.jobs.saveCompany(payload);
  }

  @MessagePattern({ cmd: "companies.get" })
  getCompany(@Payload() actor: Parameters<JobsService["getCompany"]>[0]) {
    return this.jobs.getCompany(actor);
  }

  @MessagePattern({ cmd: "jobs.create" })
  create(@Payload() payload: Parameters<JobsService["create"]>[0]) {
    return this.jobs.create(payload);
  }

  @MessagePattern({ cmd: "jobs.update" })
  update(@Payload() payload: Parameters<JobsService["update"]>[0]) {
    return this.jobs.update(payload);
  }

  @MessagePattern({ cmd: "admin.jobs.review" })
  review(@Payload() payload: Parameters<JobsService["review"]>[0]) {
    return this.jobs.review(payload);
  }
}
