import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { EventsModule } from "../events/events.module";
import { ApplicationsMessageController } from "./applications-message.controller";
import { ApplicationsService } from "./applications.service";

@Module({
  imports: [PrismaModule, EventsModule],
  controllers: [ApplicationsMessageController],
  providers: [ApplicationsService],
})
export class ApplicationsModule {}
