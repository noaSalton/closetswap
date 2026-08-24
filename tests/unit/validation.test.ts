import { describe, expect, it } from "vitest";
import { requestBookingSchema } from "@/lib/validation/bookings";
import { createItemSchema } from "@/lib/validation/items";
import { signUpSchema } from "@/lib/validation/auth";

describe("requestBookingSchema", () => {
  const validItemId = "11111111-1111-4111-8111-111111111111";

  it("accepts a valid future date range", () => {
    const result = requestBookingSchema.safeParse({
      itemId: validItemId,
      startDate: "2999-01-10",
      endDate: "2999-01-12",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an end date before the start date", () => {
    const result = requestBookingSchema.safeParse({
      itemId: validItemId,
      startDate: "2999-01-12",
      endDate: "2999-01-10",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a start date in the past", () => {
    const result = requestBookingSchema.safeParse({
      itemId: validItemId,
      startDate: "2000-01-01",
      endDate: "2000-01-02",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a malformed item id", () => {
    const result = requestBookingSchema.safeParse({
      itemId: "not-a-uuid",
      startDate: "2999-01-10",
      endDate: "2999-01-12",
    });
    expect(result.success).toBe(false);
  });
});

describe("createItemSchema", () => {
  const base = {
    title: "Emerald evening gown",
    description: "Worn once.",
    category: "Dresses",
    size: "M",
    pricePerDay: 25,
    imageUrls: ["https://example.com/a.png"],
  };

  it("accepts a valid item", () => {
    expect(createItemSchema.safeParse(base).success).toBe(true);
  });

  it("rejects a non-positive price", () => {
    expect(createItemSchema.safeParse({ ...base, pricePerDay: 0 }).success).toBe(false);
  });

  it("rejects an item with no photos", () => {
    expect(createItemSchema.safeParse({ ...base, imageUrls: [] }).success).toBe(false);
  });

  it("rejects an unknown category", () => {
    expect(createItemSchema.safeParse({ ...base, category: "Hats" }).success).toBe(false);
  });

  it("coerces a numeric string price", () => {
    const result = createItemSchema.safeParse({ ...base, pricePerDay: "25.5" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.pricePerDay).toBe(25.5);
  });
});

describe("signUpSchema", () => {
  it("rejects a short password", () => {
    const result = signUpSchema.safeParse({
      fullName: "Test User",
      email: "test@example.com",
      password: "short",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid email", () => {
    const result = signUpSchema.safeParse({
      fullName: "Test User",
      email: "not-an-email",
      password: "password123",
    });
    expect(result.success).toBe(false);
  });

  it("accepts valid signup input", () => {
    const result = signUpSchema.safeParse({
      fullName: "Test User",
      email: "test@example.com",
      password: "password123",
    });
    expect(result.success).toBe(true);
  });
});
