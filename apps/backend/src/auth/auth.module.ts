import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PrismaModule } from "../prisma/prisma.module";
import { EventsModule } from "../events/events.module";
import { AuthService } from "./auth.service";
import { AuthMessageController } from "./auth-message.controller";

@Module({
  imports: [
    PrismaModule,
    EventsModule,
    JwtModule.registerAsync({
      useFactory: () => ({ secret: process.env.JWT_SECRET }),
    }),
  ],
  controllers: [AuthMessageController],
  providers: [AuthService],
})
export class AuthModule {}
