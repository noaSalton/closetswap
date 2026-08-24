import { z } from "zod";

export const submitRatingSchema = z.object({
  bookingId: z.uuid(),
  score: z.coerce.number().int().min(1, "Choose a rating").max(5),
  comment: z.string().trim().max(1000, "Comment is too long").optional().default(""),
});

export type SubmitRatingInput = z.infer<typeof submitRatingSchema>;
