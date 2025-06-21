import { z } from 'zod';

export type ChallengeType = 'web' | 'network' | 'crypto' | 'misc';
export type ChallengeDifficulty = 'easy' | 'medium' | 'hard' | 'expert';
export type ChallengeStatus = 'pending' | 'approved' | 'rejected';
export type LabStatus = 'draft' | 'published' | 'archived';
export type LabCategory = 'web' | 'network' | 'crypto' | 'misc' | 'forensics' | 'reverse';
export type LabType = 'docker' | 'vm' | 'external';
export type QuestionType = 'flag' | 'multiple_choice' | 'code';

export interface Challenge {
  id: string;
  title: string;
  description: string;
  challenge_type: ChallengeType;
  difficulty: ChallengeDifficulty;
  points: number;
  created_by: string;
  status: ChallengeStatus;
  feedback?: string;
  approved_at?: string;
  created_at: string;
  updated_at: string;
  completed?: boolean;
  solves?: number;
  icon_url?: string;
  short_description?: string;
  scenario?: string;
  learning_objectives?: string[];
  tools_required?: string[];
  references?: string[];
  prerequisites?: string[];
  target_audience?: string;
  estimated_time?: number;
  author_notes?: string;
  questions?: ChallengeQuestion[];
}

export interface ChallengeQuestion {
  id: string;
  challenge_id: string;
  question_number: number;
  question: string;
  description?: string;
  flag: string;
  points: number;
  hints?: string[];
  solution_explanation?: string;
  difficulty_rating?: number;
}

export interface Lab {
  id: string;
  title: string;
  description: string;
  category: LabCategory;
  difficulty: string;
  points: number;
  estimated_time: number;
  short_intro?: string;
  learning_objectives: string[];
  attack_scenario?: string;
  lab_type: LabType;
  docker_command?: string;
  vm_download_url?: string;
  external_link?: string;
  setup_instructions?: string;
  thumbnail_url?: string;
  suggested_tools: string[];
  pre_reading_links: string[];
  status: LabStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
  completed?: boolean;
  points_earned?: number;
  tags?: {
    tag: {
      id: string;
      name: string;
    };
  }[];
}

export interface LabQuestion {
  id: string;
  lab_id: string;
  question_number: number;
  question: string;
  description?: string;
  answer: string;
  points: number;
  question_type: QuestionType;
  hints: string[];
  options: string[];
  code_template?: string;
}

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  full_name?: string;
  bio?: string;
  location?: string;
  website?: string;
  avatar_url?: string;
  github_username?: string;
  twitter_username?: string;
  linkedin_username?: string;
  skills: string[];
  interests: string[];
  created_at: string;
  updated_at: string;
}