import { z } from 'zod';

export const questionSchema = z.object({
  question: z.string().min(1, 'Question is required'),
  description: z.string().optional(),
  flag: z.string().min(1, 'Flag is required'),
  points: z.number()
    .min(1, 'Points must be between 1 and 5')
    .max(5, 'Points must be between 1 and 5'),
  hints: z.array(z.string()).optional(),
  solution_explanation: z.string().optional(),
  difficulty_rating: z.number().min(1).max(5).optional()
});

export const challengeSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  challenge_type: z.enum(['web', 'network', 'crypto', 'misc'], {
    errorMap: () => ({ message: 'Invalid challenge type' })
  }),
  difficulty: z.enum(['easy', 'medium', 'hard', 'expert'], {
    errorMap: () => ({ message: 'Invalid difficulty level' })
  }),
  icon_url: z.string().url().optional().or(z.literal('')),
  short_description: z.string().optional(),
  scenario: z.string().optional(),
  learning_objectives: z.array(z.string()).optional(),
  tools_required: z.array(z.string()).optional(),
  references: z.array(z.string()).optional(),
  prerequisites: z.array(z.string()).optional(),
  target_audience: z.string().optional(),
  estimated_time: z.number().optional(),
  author_notes: z.string().optional(),
  questions: z.array(questionSchema)
    .min(1, 'At least one question is required')
});

export type ChallengeFormData = z.infer<typeof challengeSchema>;
export type QuestionFormData = z.infer<typeof questionSchema>;