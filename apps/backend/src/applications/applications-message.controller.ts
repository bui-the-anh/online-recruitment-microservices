import { Controller } from "@nestjs/common";
import { MessagePattern, Payload } from "@nestjs/microservices";
import { ApplicationsService } from "./applications.service";

@Controller()
export class ApplicationsMessageController {
  constructor(private readonly applications: ApplicationsService) {}

  @MessagePattern({ cmd: "health" })
  health() {
    return { name: "applications", status: "ready" };
  }

  @MessagePattern({ cmd: "applications.create" })
  create(@Payload() payload: Parameters<ApplicationsService["create"]>[0]) {
    return this.applications.create(payload);
  }

  @MessagePattern({ cmd: "applications.list" })
  list(
    @Payload()
    payload:
      | import("../common/bootstrap").Actor
      | {
          actor: import("../common/bootstrap").Actor;
          jobId?: string;
          status?: string;
          search?: string;
          page?: string;
          pageSize?: string;
        },
  ) {
    if (payload && typeof payload === "object" && "actor" in payload) {
      const { actor, ...query } = payload;
      return this.applications.list(actor, query);
    }
    return this.applications.list(
      payload as import("../common/bootstrap").Actor,
    );
  }

  @MessagePattern({ cmd: "applications.get" })
  get(
    @Payload()
    payload: { actor: import("../common/bootstrap").Actor; id: string },
  ) {
    return this.applications.get(payload);
  }

  @MessagePattern({ cmd: "applications.dashboard" })
  dashboard(@Payload() actor: Parameters<ApplicationsService["dashboard"]>[0]) {
    return this.applications.dashboard(actor);
  }

  @MessagePattern({ cmd: "applications.update" })
  update(@Payload() payload: Parameters<ApplicationsService["update"]>[0]) {
    return this.applications.update(payload);
  }
}
