import { Controller, Get } from "@nestjs/common";
import { APP_NAME } from "@resume-judge/types";

export interface HealthResponse {
  status: "ok";
  service: string;
}

@Controller("health")
export class HealthController {
  @Get()
  check(): HealthResponse {
    return { status: "ok", service: `${APP_NAME} API` };
  }
}
