import "reflect-metadata";
import { describe, expect, it } from "vitest";
import { Test } from "@nestjs/testing";
import { HealthController } from "./health.controller.js";

describe("HealthController", () => {
  it("reports the API as healthy", async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
    }).compile();

    expect(moduleRef.get(HealthController).check()).toEqual({
      status: "ok",
      service: "Resume Judge API",
    });
  });
});
