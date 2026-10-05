import { Global, Inject, Injectable, Module, type OnModuleDestroy } from "@nestjs/common";
import { createPrismaClient, type PrismaClient } from "@resume-judge/db";

export const PRISMA = Symbol("PRISMA");

@Injectable()
class PrismaShutdown implements OnModuleDestroy {
  constructor(@Inject(PRISMA) private readonly prisma: PrismaClient) {}

  async onModuleDestroy(): Promise<void> {
    await this.prisma.$disconnect();
  }
}

// The client connects lazily on first query, so the API boots without a database.
@Global()
@Module({
  providers: [{ provide: PRISMA, useFactory: () => createPrismaClient() }, PrismaShutdown],
  exports: [PRISMA],
})
export class DatabaseModule {}
