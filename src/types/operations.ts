export interface Lab {
  id: string;
  name: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  estimated_duration: number; // in minutes
  category: string;
  docker_command?: string;
  vm_download_url?: string;
  external_link?: string;
  thumbnail_url?: string;
}

export interface OperationRequest {
  id: string;
  red_team_user: string;
  red_team_username: string;
  blue_team_user?: string;
  blue_team_username?: string;
  lab: Lab;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  operation_mode: 'live' | 'ai';
  estimated_duration: number;
  max_score: number;
  created_at: string;
  expires_at: string;
}

export interface ActiveOperation {
  id: string;
  request_id: string;
  red_team_user: string;
  red_team_username: string;
  blue_team_user: string;
  blue_team_username: string;
  lab: Lab;
  status: 'setup' | 'active' | 'paused' | 'completed' | 'terminated';
  started_at: string;
  ends_at: string;
  time_remaining: number; // in seconds
  red_team_score: number;
  blue_team_score: number;
  flags_captured: number;
  attacks_blocked: number;
  total_events: number;
  vpn_config?: {
    server_address: string;
    server_port: number;
    config_file: string;
    username?: string;
    password?: string;
  };
}

export interface OperationEvent {
  id: string;
  operation_id: string;
  user_id: string;
  username: string;
  event_type: 'flag_captured' | 'attack_blocked' | 'vulnerability_found' | 'system_compromised' | 'defense_activated';
  team_type: 'red' | 'blue' | 'system';
  points_awarded: number;
  description: string;
  timestamp: string;
}

export interface CreateOperationData {
  lab_id: string;
  mode: 'live' | 'ai';
  team_type: 'red' | 'blue';
  estimated_duration?: number;
  max_score?: number;
}

export interface ChatMessage {
  id: string;
  operation_id: string;
  user_id: string;
  username: string;
  message: string;
  team_type: 'red' | 'blue' | 'system';
  timestamp: string;
}

export interface SystemLog {
  id: string;
  operation_id: string;
  level: 'info' | 'warning' | 'error' | 'success';
  message: string;
  source: string;
  timestamp: string;
}

export interface NetworkScan {
  id: string;
  operation_id: string;
  target_ip: string;
  scan_type: 'quick' | 'full' | 'vuln';
  results: {
    hosts: {
      ip: string;
      hostname?: string;
      os?: string;
      ports: {
        port: number;
        service: string;
        state: string;
      }[];
    }[];
    vulnerabilities?: {
      id: string;
      name: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      description: string;
      cve?: string;
    }[];
  };
  created_at: string;
}