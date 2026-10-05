import { describe, expect, it } from "vitest";
import { describeApp } from "./index.js";

describe("analysisWorker placeholder", () => {
  it("builds against the shared types package", () => {
    expect(describeApp()).toContain("Resume Judge");
  });
});
