import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit(): Promise<void> {
    const maxAttempts = 5;
    let lastError: unknown;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        await this.$connect();
        await this.$queryRaw`SELECT 1`;
        if (attempt > 1) {
          this.logger.log(`Database connected after ${attempt} attempts`);
        }
        return;
      } catch (error) {
        lastError = error;
        this.logger.warn(
          `Database connect attempt ${attempt}/${maxAttempts} failed`,
        );
        if (attempt < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, 1500 * attempt));
        }
      }
    }
    throw lastError;
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
