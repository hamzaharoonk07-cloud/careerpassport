import { z } from 'zod';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id');

export const submitQuizSchema = z.object({
  answers: z
    .array(z.object({ questionId: objectId, optionId: objectId }))
    .min(1, 'No answers were submitted')
    .max(50),
});

export const saveCareerSchema = z.object({
  careerId: z.string().trim().min(1, 'A career is required'),
  note: z.string().trim().max(400).optional(),
});

export const journeyStageSchema = z.object({
  stage: z.string().trim().min(1, 'A stage is required'),
});

export const selectFieldSchema = z.object({
  fieldSlug: z.string().trim().min(1, 'A field is required').toLowerCase(),
});
