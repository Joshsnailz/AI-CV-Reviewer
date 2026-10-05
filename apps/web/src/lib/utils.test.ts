import { describe, expect, it } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
  it("merges conflicting Tailwind classes, keeping the last", () => {
    expect(cn("px-2 py-1", undefined, "px-4")).toBe("py-1 px-4");
  });
});
