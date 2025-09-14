import { motion } from 'framer-motion';
import { 
  Clock, Users, Target, Sword, Shield, 
  Play, Eye, AlertTriangle, CheckCircle, User,
  Calendar, Timer, Zap
} from 'lucide-react';
import { OperationRequest } from '../../types/operations';
import Card from '../ui/Card';

interface OperationRequestCardProps {
  request: OperationRequest;
  userTeamType: 'red' | 'blue';
  onAccept?: () => void;
  onView?: () => void;
  isUserRequest?: boolean;
  accepting?: boolean;
}

const OperationRequestCard = ({ 
  request, 
  userTeamType, 
  onAccept, 
  onView,
  isUserRequest = false,
  accepting = false
}: OperationRequestCardProps) => {
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

  const getTimeRemaining = () => {
    const now = new Date();
    const expires = new Date(request.expires_at);
    const diff = expires.getTime() - now.getTime();
    
    if (diff <= 0) return 'Expired';
    
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    return `${minutes}m`;
  };

  const isExpired = new Date(request.expires_at) <= new Date();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="h-full"
    >
      <Card className={`p-6 h-full flex flex-col border-2 transition-all duration-200 ${
        isUserRequest 
          ? userTeamType === 'red'
            ? 'border-primary/30 bg-primary/5'
            : 'border-accent-blue/30 bg-accent-blue/5'
          : userTeamType === 'red' 
            ? 'border-primary/30 hover:border-primary/50' 
            : 'border-accent-blue/30 hover:border-accent-blue/50'
      } ${isExpired ? 'opacity-60' : ''}`}>
        
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-xl font-bold text-white truncate">{request.lab.name}</h3>
              {isUserRequest && (
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  userTeamType === 'red' ? 'bg-primary/20 text-primary' : 'bg-accent-blue/20 text-accent-blue'
                }`}>
                  Your Request
                </span>
              )}
            </div>
            
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getDifficultyColor(request.lab.difficulty)}`}>
                {request.lab.difficulty.toUpperCase()}
              </span>
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-background-light text-gray-300">
                {request.lab.category}
              </span>
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-accent-green/20 text-accent-green">
                {request.max_score} pts max
              </span>
            </div>
          </div>
          
          <div className="text-right">
            <div className={`text-sm font-medium ${isExpired ? 'text-error-light' : 'text-warning-light'}`}>
              {isExpired ? 'Expired' : `Expires: ${getTimeRemaining()}`}
            </div>
          </div>
        </div>

        {/* Lab Description */}
        <p className="text-gray-400 text-sm mb-4 line-clamp-2">{request.lab.description}</p>

        {/* Operation Details */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="flex items-center text-sm text-gray-400">
            <Timer className="h-4 w-4 mr-2 text-accent-blue" />
            <span>{request.estimated_duration} min</span>
          </div>
          <div className="flex items-center text-sm text-gray-400">
            <Zap className="h-4 w-4 mr-2 text-warning-light" />
            <span>{request.operation_mode.toUpperCase()}</span>
          </div>
        </div>

        {/* Team Status */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="flex items-center p-3 bg-primary/10 rounded-lg border border-primary/20">
            <Sword className="h-5 w-5 text-primary mr-2 flex-shrink-0" />
            <div className="min-w-0">
              <div className="text-xs text-gray-400">Red Team</div>
              <div className="text-sm text-white font-medium truncate">
                {request.red_team_username}
              </div>
            </div>
          </div>
          
          <div className="flex items-center p-3 bg-accent-blue/10 rounded-lg border border-accent-blue/20">
            <Shield className="h-5 w-5 text-accent-blue mr-2 flex-shrink-0" />
            <div className="min-w-0">
              <div className="text-xs text-gray-400">Blue Team</div>
              <div className="text-sm text-white font-medium">
                {request.blue_team_username || 'Waiting...'}
              </div>
            </div>
          </div>
        </div>

        {/* Request Info */}
        <div className="flex items-center gap-4 text-xs text-gray-500 mb-6">
          <div className="flex items-center">
            <Calendar className="h-3 w-3 mr-1" />
            Created {new Date(request.created_at).toLocaleDateString()}
          </div>
          <div className="flex items-center">
            <User className="h-3 w-3 mr-1" />
            ID: {request.id.slice(-8)}
          </div>
        </div>

        {/* Actions */}
        <div className="mt-auto flex gap-2">
          {!isExpired && request.status === 'pending' && !isUserRequest && userTeamType === 'blue' && onAccept && (
            <button
              onClick={onAccept}
              disabled={accepting}
              className="btn-primary bg-accent-blue hover:bg-accent-blue/90 flex-1 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Shield className="h-4 w-4 mr-2" />
              {accepting ? 'Accepting...' : 'Accept Challenge'}
            </button>
          )}
          
          {onView && (
            <button
              onClick={onView}
              className="btn-outline flex items-center justify-center px-4"
            >
              <Eye className="h-4 w-4 mr-2" />
              View
            </button>
          )}
          
          {isUserRequest && request.status === 'pending' && (
            <div className="flex-1 flex items-center justify-center text-sm text-gray-400">
              <Clock className="h-4 w-4 mr-2" />
              Waiting for Blue Team...
            </div>
          )}
        </div>

        {/* Expired Warning */}
        {isExpired && (
          <div className="mt-4 p-3 bg-error-dark/20 border border-error-light/30 rounded-lg">
            <div className="flex items-center text-error-light">
              <AlertTriangle className="h-4 w-4 mr-2 flex-shrink-0" />
              <span className="text-sm">This operation request has expired</span>
            </div>
          </div>
        )}
      </Card>
    </motion.div>
  );
};

export default OperationRequestCard;