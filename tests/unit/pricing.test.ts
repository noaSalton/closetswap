import { describe, expect, it } from "vitest";
import { rentalDays, rentalTotal } from "@/lib/pricing";

describe("rentalDays", () => {
  it("counts a same-day rental as 1 day", () => {
    expect(rentalDays("2026-01-10", "2026-01-10")).toBe(1);
  });

  it("counts inclusively across multiple days", () => {
    expect(rentalDays("2026-01-10", "2026-01-12")).toBe(3);
  });

  it("handles month boundaries", () => {
    expect(rentalDays("2026-01-30", "2026-02-01")).toBe(3);
  });
});

describe("rentalTotal", () => {
  it("multiplies days by the daily price", () => {
    expect(rentalTotal("2026-01-10", "2026-01-12", 20)).toBe(60);
  });

  it("rounds to the nearest cent", () => {
    expect(rentalTotal("2026-01-10", "2026-01-10", 19.995)).toBe(20);
  });
});
