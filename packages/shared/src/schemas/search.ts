import { z } from 'zod';

export const searchRequestSchema = z.object({
  query: z.string().trim().min(1, 'Search query cannot be empty').max(1000, 'Search query is too long'),
  topK: z.number().int().min(1).max(20).optional().default(5),
  minSimilarity: z.number().min(0).max(1).optional().default(0.1),
  generateAnswer: z.boolean().optional().default(true),
});

export type SearchRequestInput = z.infer<typeof searchRequestSchema>;

export const searchFeedbackSchema = z.object({
  queryId: z.string().uuid(),
  feedback: z.enum(['helpful', 'not_helpful']),
});

export type SearchFeedbackInput = z.infer<typeof searchFeedbackSchema>;
