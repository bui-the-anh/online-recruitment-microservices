import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { EventsModule } from "../events/events.module";
import { JobsMessageController } from "./jobs-message.controller";
import { JobsService } from "./jobs.service";

@Module({
  imports: [PrismaModule, EventsModule],
  controllers: [JobsMessageController],
  providers: [JobsService],
})
export class JobsModule {}
