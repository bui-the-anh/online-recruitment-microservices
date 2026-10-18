import { Module } from "@nestjs/common";
import { APP_FILTER, APP_GUARD } from "@nestjs/core";
import { ClientsModule, Transport } from "@nestjs/microservices";
import { JwtModule } from "@nestjs/jwt";
import {
  APPLICATIONS_SERVICE,
  AUTH_SERVICE,
  JOBS_SERVICE,
  NOTIFICATIONS_SERVICE,
} from "./common/constants";
import { AccessTokenGuard, RolesGuard } from "./common/guards";
import { GatewayController } from "./gateway.controller";
import { VietnameseHttpExceptionFilter } from "./common/http-exception.filter";
import { PrismaModule } from "./prisma/prisma.module";

function tcpClient(hostVariable: string, portVariable: string, port: number) {
  return {
    transport: Transport.TCP as const,
    options: {
      host: process.env[hostVariable] ?? "127.0.0.1",
      port: Number(process.env[portVariable] ?? port),
    },
  };
}

@Module({
  imports: [
    PrismaModule,
    JwtModule.registerAsync({
      useFactory: () => ({ secret: process.env.JWT_SECRET }),
    }),
    ClientsModule.register([
      {
        name: AUTH_SERVICE,
        ...tcpClient("AUTH_SERVICE_HOST", "AUTH_SERVICE_PORT", 4001),
      },
      {
        name: JOBS_SERVICE,
        ...tcpClient("JOBS_SERVICE_HOST", "JOBS_SERVICE_PORT", 4002),
      },
      {
        name: APPLICATIONS_SERVICE,
        ...tcpClient(
          "APPLICATIONS_SERVICE_HOST",
          "APPLICATIONS_SERVICE_PORT",
          4003,
        ),
      },
      {
        name: NOTIFICATIONS_SERVICE,
        ...tcpClient(
          "NOTIFICATIONS_SERVICE_HOST",
          "NOTIFICATIONS_SERVICE_PORT",
          4004,
        ),
      },
    ]),
  ],
  controllers: [GatewayController],
  providers: [
    { provide: APP_GUARD, useClass: AccessTokenGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_FILTER, useClass: VietnameseHttpExceptionFilter },
  ],
})
export class GatewayModule {}
