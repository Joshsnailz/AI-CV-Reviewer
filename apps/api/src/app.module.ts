import { Module } from "@nestjs/common";
import { DatabaseModule } from "./database/database.module.js";
import { HealthController } from "./health/health.controller.js";
import { ResumesModule } from "./resumes/resumes.module.js";
import { StorageModule } from "./storage/storage.module.js";

@Module({
  imports: [DatabaseModule, StorageModule, ResumesModule],
  controllers: [HealthController],
})
export class AppModule {}
