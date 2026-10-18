import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { NotificationsKafkaController } from "./notifications-message.controller";
import { NotificationsService } from "./notifications.service";

@Module({
  imports: [PrismaModule],
  controllers: [NotificationsKafkaController],
  providers: [NotificationsService],
})
export class NotificationsKafkaModule {}
