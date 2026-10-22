import { describe, expect, it } from "vitest";
import {
  catchUpMinutes,
  catchUpPercent,
  MAX_RESUME_TURNS,
} from "../../../src/client/mobile/SaveStore";

describe("catch-up estimates", () => {
  it("waits at least a minute, and an hour of game takes about four", () => {
    expect(catchUpMinutes(100)).toBe(1);
    expect(catchUpMinutes(36000)).toBe(4);
    expect(catchUpMinutes(MAX_RESUME_TURNS)).toBe(3);
  });

  it("reports 0 to 99, never 100 before the replay is done", () => {
    expect(catchUpPercent(0, 1000)).toBe(0);
    expect(catchUpPercent(500, 1000)).toBe(50);
    expect(catchUpPercent(1000, 1000)).toBe(99);
    expect(catchUpPercent(5, 0)).toBe(0);
  });
});
