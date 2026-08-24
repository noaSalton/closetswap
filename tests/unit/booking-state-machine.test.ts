import { describe, expect, it } from "vitest";
import { canTransition } from "@/lib/booking-state-machine";

describe("canTransition", () => {
  it("lets the owner approve a pending booking", () => {
    const result = canTransition("pending", "approve", "owner");
    expect(result).toEqual({ ok: true, next: "approved" });
  });

  it("lets the owner reject a pending booking", () => {
    const result = canTransition("pending", "reject", "owner");
    expect(result).toEqual({ ok: true, next: "rejected" });
  });

  it("does not let the renter approve a pending booking", () => {
    const result = canTransition("pending", "approve", "renter");
    expect(result.ok).toBe(false);
  });

  it("lets the renter pay an approved booking", () => {
    const result = canTransition("approved", "pay", "renter");
    expect(result).toEqual({ ok: true, next: "paid" });
  });

  it("does not let the owner pay an approved booking", () => {
    const result = canTransition("approved", "pay", "owner");
    expect(result.ok).toBe(false);
  });

  it("lets the owner mark a paid booking picked up", () => {
    const result = canTransition("paid", "markPickedUp", "owner");
    expect(result).toEqual({ ok: true, next: "in_progress" });
  });

  it("lets the owner mark an in-progress booking returned", () => {
    const result = canTransition("in_progress", "markReturned", "owner");
    expect(result).toEqual({ ok: true, next: "returned" });
  });

  it("rejects transitions from terminal statuses", () => {
    expect(canTransition("rejected", "approve", "owner").ok).toBe(false);
    expect(canTransition("returned", "markReturned", "owner").ok).toBe(false);
  });

  it("rejects skipping a step in the flow", () => {
    expect(canTransition("pending", "pay", "renter").ok).toBe(false);
    expect(canTransition("approved", "markPickedUp", "owner").ok).toBe(false);
  });

  it("returns a human-readable reason on failure", () => {
    const result = canTransition("pending", "approve", "renter");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toMatch(/owner/i);
    }
  });
});
