import { describe, expect, it } from "vitest";
import { AnalysisStatus, createPrismaClient } from "./index.js";

describe("db package", () => {
  it("exposes the generated enums", () => {
    expect(Object.values(AnalysisStatus)).toEqual(["QUEUED", "PROCESSING", "COMPLETED", "FAILED"]);
  });

  it("refuses to build a client without a connection string", () => {
    expect(() => createPrismaClient("")).toThrow("DATABASE_URL is not set");
  });
});
