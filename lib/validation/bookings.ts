import { z } from "zod";

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date");

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

export const requestBookingSchema = z
  .object({
    itemId: z.uuid(),
    startDate: dateString,
    endDate: dateString,
  })
  .refine((d) => d.startDate >= todayUTC(), {
    message: "Start date can't be in the past",
    path: ["startDate"],
  })
  .refine((d) => d.endDate >= d.startDate, {
    message: "End date must be on or after the start date",
    path: ["endDate"],
  });

export type RequestBookingInput = z.infer<typeof requestBookingSchema>;
