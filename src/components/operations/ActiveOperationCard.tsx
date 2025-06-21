import { motion } from 'framer-motion';
import { 
  Clock, Users, Target, Sword, Shield, 
  Play, Eye, Activity, Trophy, Flag,
  Zap, Timer, Calendar, User
} from 'lucide-react';
import { ActiveOperation } from '../../types/operations';
import Card from '../ui/Card';

interface ActiveOperationCardProps {
  operation: ActiveOperation;
  userTeamType: 'red' | 'blue';
  onJoin?: () => void;
  onView?: () => void;
  isUserOperation?: boolean;
}

const ActiveOperationCard = ({ 
  operation, 
  userTeamType, 
  onJoin, 
  onView,
  isUserOperation = false
}: ActiveOperationCardProps) => {
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'easy':
        return 'bg-success-dark/20 text-success-light border-success-light/30';
      case 'medium':
        return 'bg-warning-dark/20 text-warning-light border-warning-light/30';
      case 'hard':
        return 'bg-error-dark/20 text-error-light border-error-light/30';
      case 'expert':
        return 'bg-purple-500/20 text-purple-400 border-purple-400/30';
      default:
        return 'bg-primary/20 text-primary border-primary/30';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-success-dark/20 text-success-light border-success-light/30';
      case 'setup':
        return 'bg-warning-dark/20 text-warning-light border-warning-light/30';
      case 'paused':
        return 'bg-gray-500/20 text-gray-400 border-gray-400/30';
      case 'completed':
        return 'bg-accent-blue/20 text-accent-blue border-accent-blue/30';
      default:
        return 'bg-primary/20 text-primary border-primary/30';
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getScoreLeader = () => {
    if (operation.red_team_score > operation.blue_team_score) {
      return { team: 'red', lead: operation.red_team_score - operation.blue_team_score };
    } else if (operation.blue_team_score > operation.red_team_score) {
      return { team: 'blue', lead: operation.blue_team_score - operation.red_team_score };
    }
    return { team: 'tie', lead: 0 };
  };

  const scoreLeader = getScoreLeader();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="h-full"
    >
      <Card className={`p-6 h-full flex flex-col border-2 transition-all duration-200 ${
        isUserOperation 
          ? userTeamType === 'red'
            ? 'border-primary/30 bg-primary/5'
            : 'border-accent-blue/30 bg-accent-blue/5'
          : 'border-accent-green/30 hover:border-accent-green/50'
      }`}>
        
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-xl font-bold text-white truncate">{operation.lab.name}</h3>
              {isUserOperation && (
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  userTeamType === 'red' ? 'bg-primary/20 text-primary' : 'bg-accent-blue/20 text-accent-blue'
                }`}>
                  Your Operation
                </span>
              )}
            </div>
            
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getDifficultyColor(operation.lab.difficulty)}`}>
                {operation.lab.difficulty.toUpperCase()}
              </span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(operation.status)}`}>
                {operation.status.toUpperCase()}
              </span>
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-background-light text-gray-300">
                {operation.lab.category}
              </span>
            </div>
          </div>
          
          <div className="text-right">
            <div className="text-lg font-mono font-bold text-white">
              {formatTime(operation.time_remaining)}
            </div>
            <div className="text-xs text-gray-400">Time Left</div>
          </div>
        </div>

        {/* Score Display */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Current Score</span>
            {scoreLeader.team !== 'tie' && (
              <span className={`text-xs font-medium ${
                scoreLeader.team === 'red' ? 'text-primary' : 'text-accent-blue'
              }`}>
                {scoreLeader.team === 'red' ? 'Red' : 'Blue'} leads by {scoreLeader.lead}
              </span>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-primary/10 rounded-lg p-3 border border-primary/20">
              <div className="flex items-center justify-between">
                <span className="text-sm text-primary font-medium">Red Team</span>
                <span className="text-lg font-bold text-white">{operation.red_team_score}</span>
              </div>
            </div>
            <div className="bg-accent-blue/10 rounded-lg p-3 border border-accent-blue/20">
              <div className="flex items-center justify-between">
                <span className="text-sm text-accent-blue font-medium">Blue Team</span>
                <span className="text-lg font-bold text-white">{operation.blue_team_score}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Team Members */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="flex items-center p-3 bg-primary/10 rounded-lg border border-primary/20">
            <Sword className="h-5 w-5 text-primary mr-2 flex-shrink-0" />
            <div className="min-w-0">
              <div className="text-xs text-gray-400">Attacker</div>
              <div className="text-sm text-white font-medium truncate">
                {operation.red_team_username}
              </div>
            </div>
          </div>
          
          <div className="flex items-center p-3 bg-accent-blue/10 rounded-lg border border-accent-blue/20">
            <Shield className="h-5 w-5 text-accent-blue mr-2 flex-shrink-0" />
            <div className="min-w-0">
              <div className="text-xs text-gray-400">Defender</div>
              <div className="text-sm text-white font-medium truncate">
                {operation.blue_team_username}
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="text-center p-2 bg-background-light rounded-lg">
            <div className="text-lg font-bold text-primary">{operation.flags_captured}</div>
            <div className="text-xs text-gray-400">Flags</div>
          </div>
          <div className="text-center p-2 bg-background-light rounded-lg">
            <div className="text-lg font-bold text-accent-blue">{operation.attacks_blocked}</div>
            <div className="text-xs text-gray-400">Blocks</div>
          </div>
          <div className="text-center p-2 bg-background-light rounded-lg">
            <div className="text-lg font-bold text-accent-green">{operation.total_events}</div>
            <div className="text-xs text-gray-400">Events</div>
          </div>
        </div>

        {/* Operation Info */}
        <div className="flex items-center gap-4 text-xs text-gray-500 mb-6">
          <div className="flex items-center">
            <Calendar className="h-3 w-3 mr-1" />
            Started {new Date(operation.started_at).toLocaleDateString()}
          </div>
          <div className="flex items-center">
            <User className="h-3 w-3 mr-1" />
            ID: {operation.id.slice(-8)}
          </div>
        </div>

        {/* Actions */}
        <div className="mt-auto flex gap-2">
          {operation.status === 'active' && onJoin && (
            <button
              onClick={onJoin}
              className={`btn-primary flex-1 flex items-center justify-center ${
                userTeamType === 'blue' ? 'bg-accent-blue hover:bg-accent-blue/90' : ''
              }`}
            >
              <Play className="h-4 w-4 mr-2" />
              Join Operation
            </button>
          )}
          
          {onView && (
            <button
              onClick={onView}
              className="btn-outline flex items-center justify-center px-4"
            >
              <Eye className="h-4 w-4 mr-2" />
              View Details
            </button>
          )}
          
          {operation.status === 'setup' && (
            <div className="flex-1 flex items-center justify-center text-sm text-gray-400">
              <Activity className="h-4 w-4 mr-2" />
              Setting up environment...
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
};

export default ActiveOperationCard;