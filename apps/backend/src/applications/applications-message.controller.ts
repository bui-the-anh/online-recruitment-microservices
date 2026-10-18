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
  list(@Payload() actor: Parameters<ApplicationsService["list"]>[0]) {
    return this.applications.list(actor);
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
