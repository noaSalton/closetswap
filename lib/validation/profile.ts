import { z } from "zod";

export const updateProfileSchema = z.object({
  fullName: z.string().trim().min(2, "Full name must be at least 2 characters").max(80),
  bio: z.string().trim().max(500, "Bio is too long").optional().default(""),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
