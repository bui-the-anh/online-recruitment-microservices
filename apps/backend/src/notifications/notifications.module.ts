import { Module } from "@nestjs/common";
import { EventsModule } from "../events/events.module";
import { PrismaModule } from "../prisma/prisma.module";
import { NotificationsMessageController } from "./notifications-message.controller";
import { NotificationsService } from "./notifications.service";

@Module({
  imports: [PrismaModule, EventsModule],
  controllers: [NotificationsMessageController],
  providers: [NotificationsService],
})
export class NotificationsModule {}
