import { describe, expect, it } from "vitest";
import { APP_NAME } from "./index.js";

describe("@resume-judge/types", () => {
  it("exports the app name", () => {
    expect(APP_NAME).toBe("Resume Judge");
  });
});
