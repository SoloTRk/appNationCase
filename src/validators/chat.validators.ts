import { z } from 'zod';

export const chatIdParamsSchema = z.object({
  chatId: z.string().uuid('Invalid chat ID format'),
});

export const chatListQuerySchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const completionBodySchema = z.object({
  message: z.string().min(1, 'Message cannot be empty').max(10000, 'Message too long'),
});

export type CompletionBody = z.infer<typeof completionBodySchema>;
