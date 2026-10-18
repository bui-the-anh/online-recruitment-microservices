import { BadRequestException, Type, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import {
  MicroserviceOptions,
  Transport,
} from "@nestjs/microservices";
import cookieParser from "cookie-parser";
import { HttpToRpcExceptionFilter } from "./rpc-exception.filter";
export interface Actor {
  id: string;
  role: import("@prisma/client").Role;
}

export function requireRuntimeEnvironment(): void {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required");
  }
  const parsed = new URL(connectionString);
  if (parsed.protocol !== "postgresql:" && parsed.protocol !== "postgres:") {
    throw new Error("DATABASE_URL must use the PostgreSQL protocol");
  }
  if (!parsed.hostname || !parsed.username || !parsed.password) {
    throw new Error("DATABASE_URL must include a host and credentials");
  }
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new Error("JWT_SECRET must contain at least 32 characters");
  }
}

export async function startHttpApplication(
  rootModule: Type<unknown>,
): Promise<void> {
  requireRuntimeEnvironment();
  const app = await NestFactory.create(rootModule);
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      exceptionFactory: () =>
        new BadRequestException("Dữ liệu yêu cầu không hợp lệ"),
    }),
  );
  app.enableCors({
    origin: process.env.WEB_ORIGIN ?? "http://localhost:3000",
    credentials: true,
  });
  await app.listen(Number(process.env.API_PORT ?? 3001), "0.0.0.0");
}

export async function startTcpMicroservice(
  rootModule: Type<unknown>,
  serviceName: string,
  hostVariable: string,
  portVariable: string,
  defaultPort: number,
): Promise<void> {
  requireRuntimeEnvironment();
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    rootModule,
    {
      transport: Transport.TCP,
      options: {
        host: process.env[hostVariable] ?? "127.0.0.1",
        port: Number(process.env[portVariable] ?? defaultPort),
      },
    },
  );
  app.useGlobalFilters(new HttpToRpcExceptionFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      exceptionFactory: () =>
        new BadRequestException("Dữ liệu yêu cầu không hợp lệ"),
    }),
  );
  await app.listen();
  console.log(`${serviceName} đang lắng nghe`);
}

export async function startKafkaMicroservice(
  rootModule: Type<unknown>,
): Promise<void> {
  requireRuntimeEnvironment();
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    rootModule,
    {
      transport: Transport.KAFKA,
      options: {
        client: {
          clientId: "careerlink-notifications",
          brokers: (process.env.KAFKA_BROKERS ?? "localhost:9092").split(","),
        },
        consumer: { groupId: "careerlink-notifications" },
      },
    },
  );
  app.useGlobalFilters(new HttpToRpcExceptionFilter());
  await app.listen();
  console.log("Bộ nhận sự kiện Kafka đang lắng nghe");
}

export function reportStartupFailure(serviceName: string, error: unknown): void {
  const kind = error instanceof Error ? error.name : "UnknownError";
  console.error(
    `${serviceName} không thể khởi động (${kind}). Hãy kiểm tra DATABASE_URL, JWT_SECRET và khả năng kết nối cơ sở dữ liệu.`,
  );
  process.exit(1);
}
