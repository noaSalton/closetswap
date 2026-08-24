import { z } from "zod";

export const sendMessageSchema = z.object({
  bookingId: z.uuid(),
  body: z.string().trim().min(1, "Message can't be empty").max(2000, "Message is too long"),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;
