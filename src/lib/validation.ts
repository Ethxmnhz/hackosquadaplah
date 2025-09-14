import { z } from 'zod';
import { ChallengeType, ChallengeDifficulty } from './types';

export const ChallengeQuestionSchema = z.object({
  question: z.string().min(1, 'Question is required'),
  description: z.string().optional(),
  flag: z.string().min(1, 'Flag is required'),
  points: z.number().min(1).max(100),
  hints: z.array(z.string()).optional(),
  solution_explanation: z.string().optional(),
  difficulty_rating: z.number().min(1).max(5).optional(),
  title: z.string().optional()
});

export const TaskQuestionSchema = z.object({
  id: z.string(),
  question_text: z.string().min(1, 'Question text is required'),
  expected_answer: z.string().min(1, 'Expected answer is required'),
  answer_validation: z.enum(['exact', 'regex', 'hash', 'partial']),
  case_sensitive: z.boolean(),
  points: z.number().min(1).max(100),
  hints: z.array(z.object({
    text: z.string(),
    unlock_after_attempts: z.number().min(1).max(10)
  })),
  mcq_options: z.array(z.string()).optional(),
  correct_option: z.number().optional(),
  question_type: z.enum(['text', 'mcq', 'fill_blank', 'drag_drop']),
  solution_explanation: z.string().optional()
});

export const TaskSchema = z.object({
  id: z.string(),
  title: z.string().min(1, 'Task title is required'),
  description: z.string().min(1, 'Task description is required'),
  explanation: z.string().optional(),
  questions: z.array(TaskQuestionSchema).min(1, 'At least one question is required'),
  attachments: z.array(z.object({
    name: z.string(),
    type: z.enum(['file', 'image', 'terminal_output', 'screenshot']),
    url: z.string(),
    description: z.string()
  })).optional()
});

export const LabEnvironmentSchema = z.object({
  enabled: z.boolean(),
  lab_type: z.enum(['web_app', 'docker', 'vm']).optional(),
  web_app_url: z.string().url().optional(),
  docker_image: z.string().optional(),
  vm_template: z.string().optional(),
  vpn_required: z.boolean(),
  attackbox_required: z.boolean(),
  ports: z.array(z.string()),
  startup_script: z.string().optional(),
  setup_instructions: z.string().optional(),
  requirements: z.array(z.string()),
  duration: z.number().min(15).max(240).optional(),
  spawn_per_task: z.boolean().optional()
});

export const ChallengeFormSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  challenge_type: z.enum(['web', 'network', 'crypto', 'misc'] as const),
  difficulty: z.enum(['easy', 'medium', 'hard', 'expert'] as const),
  icon_url: z.string().url().optional().or(z.literal('')),
  short_description: z.string().optional(),
  scenario: z.string().optional(),
  learning_objectives: z.array(z.string()).optional(),
  tools_required: z.array(z.string()).optional(),
  references: z.array(z.string()).optional(),
  prerequisites: z.array(z.string()).optional(),
  target_audience: z.string().optional(),
  estimated_time: z.number().min(5).max(480).optional(),
  author_notes: z.string().optional(),
  questions: z.array(ChallengeQuestionSchema).optional(),
  tasks: z.array(TaskSchema).optional(),
  lab_environment: LabEnvironmentSchema.optional(),
  status: z.enum(['draft', 'review', 'published']).optional(),
  cover_image: z.string().optional()
});

export type ChallengeFormData = z.infer<typeof ChallengeFormSchema>;
export type ChallengeQuestion = z.infer<typeof ChallengeQuestionSchema>;
export type TaskQuestion = z.infer<typeof TaskQuestionSchema>;
export type Task = z.infer<typeof TaskSchema>;
export type LabEnvironment = z.infer<typeof LabEnvironmentSchema>;