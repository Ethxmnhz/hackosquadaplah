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
  // Enhanced task structure
  tasks?: ChallengeTask[];
  lab_environment?: LabEnvironment;
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

export interface ChallengeTask {
  id: string;
  title: string;
  description: string;
  explanation?: string;
  questions: TaskQuestion[];
  attachments?: TaskAttachment[];
}

export interface TaskQuestion {
  id: string;
  question_text: string;
  expected_answer: string;
  answer_validation: 'exact' | 'regex' | 'hash' | 'partial';
  case_sensitive: boolean;
  points: number;
  hints: Array<{
    text: string;
    unlock_after_attempts: number;
  }>;
  mcq_options?: string[];
  correct_option?: number;
  question_type: 'text' | 'mcq' | 'fill_blank' | 'drag_drop';
  solution_explanation?: string;
}

export interface TaskAttachment {
  name: string;
  type: 'file' | 'image' | 'terminal_output' | 'screenshot';
  url: string;
  description: string;
}

export interface LabEnvironment {
  enabled: boolean;
  lab_type?: 'web_app' | 'docker' | 'vm';
  web_app_url?: string;
  docker_image?: string;
  vm_template?: string;
  vpn_required: boolean;
  attackbox_required: boolean;
  ports: string[];
  startup_script?: string;
  setup_instructions: string;
  requirements: string[];
  duration?: number;
  spawn_per_task?: boolean;
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

export interface SkillPath {
  id: string;
  title: string;
  description: string;
  short_description?: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  estimated_duration: number; // in hours
  total_points: number;
  category: string;
  prerequisites?: string[];
  learning_objectives: string[];
  cover_image?: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  created_by: string;
  
  // Relations - using both database field name and interface field name for compatibility
  skill_path_items?: SkillPathItem[]; // Database field name
  path_items?: SkillPathItem[]; // Interface field name for backward compatibility
  user_progress?: SkillPathProgress;
  enrolled_count?: number;
  completion_rate?: number;
}

// Certification feature extension
export type ExamType = 'challenge_bundle' | 'timed_exam' | 'lab_practical' | 'hybrid';
export type DeliveryMode = 'proctored' | 'unproctored' | 'auto';

export interface Certification extends SkillPath {
  // Newly added columns (nullable until populated)
  code?: string; // unique slug / code e.g. NET-101
  icon_url?: string;
  certificate_image_url?: string;
  exam_type?: ExamType;
  exam_duration_minutes?: number | null;
  passing_score_percent?: number | null;
  max_attempts?: number | null;
  cooldown_hours_between_attempts?: number | null;
  validity_period_days?: number | null; // null = lifetime
  recommended_experience?: string | null;
  delivery_mode?: DeliveryMode;
  certificate_title_override?: string | null;
  certificate_subtitle?: string | null;
  issuer_name?: string | null;
  issuer_signature_url?: string | null;
  metadata_json?: Record<string, any> | null;
  is_featured?: boolean;
  tags?: string[];
}

// Backward compatibility alias (existing code treating SkillPath as Certification)
export type SkillPathLike = SkillPath | Certification;

export interface SkillPathItem {
  id: string;
  skill_path_id: string;
  item_type: 'challenge' | 'lab';
  item_id: string;
  order_index: number;
  is_required: boolean;
  unlock_after?: string[]; // IDs of items that must be completed first
  
  // Populated data
  challenge?: Challenge;
  lab?: Lab;
}

export interface SkillPathProgress {
  id: string;
  user_id: string;
  skill_path_id: string;
  enrolled_at: string;
  started_at?: string;
  completed_at?: string;
  current_item_id?: string;
  status: 'enrolled' | 'in_progress' | 'completed' | 'paused';
  completed_items: string[];
  total_points_earned: number;
  progress_percentage: number;
  
  // Relations
  skill_path?: SkillPath;
  item_progress?: SkillPathItemProgress[];
}

export interface SkillPathItemProgress {
  id: string;
  user_id: string;
  skill_path_id: string;
  item_id: string;
  item_type: 'challenge' | 'lab';
  completed_at?: string;
  points_earned: number;
  attempts: number;
}