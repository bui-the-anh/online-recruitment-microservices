import { Controller } from "@nestjs/common";
import {
  EventPattern,
  MessagePattern,
  Payload,
} from "@nestjs/microservices";
import { NotificationsService } from "./notifications.service";

@Controller()
export class NotificationsMessageController {
  constructor(private readonly notifications: NotificationsService) {}

  @MessagePattern({ cmd: "health" })
  health() {
    return { name: "notifications", status: "ready" };
  }

  @MessagePattern({ cmd: "notifications.list" })
  list(@Payload() actor: { id: string }) {
    return this.notifications.list(actor.id);
  }

  @MessagePattern({ cmd: "notifications.create" })
  create(@Payload() payload: Parameters<NotificationsService["create"]>[0]) {
    return this.notifications.create(payload);
  }

  @MessagePattern({ cmd: "notifications.read" })
  markRead(@Payload() payload: { userId: string; id: string }) {
    return this.notifications.markRead(payload);
  }
}

@Controller()
export class NotificationsKafkaController {
  constructor(private readonly notifications: NotificationsService) {}

  @EventPattern("application.submitted")
  applicationSubmitted(
    @Payload() payload: Parameters<NotificationsService["handleEvent"]>[1],
  ) {
    return this.notifications.handleEvent("application.submitted", payload);
  }

  @EventPattern("application.status.updated")
  applicationStatusUpdated(
    @Payload() payload: Parameters<NotificationsService["handleEvent"]>[1],
  ) {
    return this.notifications.handleEvent("application.status.updated", payload);
  }

  @EventPattern("recruiter.registered")
  recruiterRegistered(
    @Payload() payload: Parameters<NotificationsService["handleEvent"]>[1],
  ) {
    return this.notifications.handleEvent("recruiter.registered", payload);
  }

  @EventPattern("job.approved")
  jobApproved(
    @Payload() payload: Parameters<NotificationsService["handleEvent"]>[1],
  ) {
    return this.notifications.handleEvent("job.approved", payload);
  }

  @EventPattern("job.rejected")
  jobRejected(
    @Payload() payload: Parameters<NotificationsService["handleEvent"]>[1],
  ) {
    return this.notifications.handleEvent("job.rejected", payload);
  }

  @EventPattern("recruiter.verified")
  recruiterVerified(
    @Payload() payload: Parameters<NotificationsService["handleEvent"]>[1],
  ) {
    return this.notifications.handleEvent("recruiter.verified", payload);
  }

  @EventPattern("recruiter.verification.rejected")
  recruiterRejected(
    @Payload() payload: Parameters<NotificationsService["handleEvent"]>[1],
  ) {
    return this.notifications.handleEvent(
      "recruiter.verification.rejected",
      payload,
    );
  }

  @EventPattern("recruiter.suspended")
  recruiterSuspended(
    @Payload() payload: Parameters<NotificationsService["handleEvent"]>[1],
  ) {
    return this.notifications.handleEvent("recruiter.suspended", payload);
  }

  @EventPattern("recruiter.reactivated")
  recruiterReactivated(
    @Payload() payload: Parameters<NotificationsService["handleEvent"]>[1],
  ) {
    return this.notifications.handleEvent("recruiter.reactivated", payload);
  }
}
