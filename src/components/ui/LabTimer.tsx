import { motion } from 'framer-motion';
import { Clock, Pause, Play, RotateCcw } from 'lucide-react';
import { useTimer } from '../../hooks/useTimer';

interface LabTimerProps {
  initialTime: number; // in seconds
  onTimeEnd?: () => void;
}

const LabTimer = ({ initialTime, onTimeEnd }: LabTimerProps) => {
  const { time, isRunning, startTimer, pauseTimer, resetTimer, formatTime } = useTimer(initialTime);

  const timeInfo = formatTime();
  const progress = (time / initialTime) * 100;

  const getTimeColor = () => {
    if (progress > 50) return 'text-success-light';
    if (progress > 25) return 'text-warning-light';
    return 'text-error-light';
  };

  return (
    <div className="bg-background-light rounded-lg p-4 border border-background-default">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <Clock className="h-5 w-5 text-primary mr-2" />
          <span className="text-gray-400">Time Remaining</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={isRunning ? pauseTimer : startTimer}
            className="p-1 rounded-md hover:bg-background-default transition-colors"
          >
            {isRunning ? (
              <Pause className="h-4 w-4 text-warning-light" />
            ) : (
              <Play className="h-4 w-4 text-success-light" />
            )}
          </button>
          <button
            onClick={resetTimer}
            className="p-1 rounded-md hover:bg-background-default transition-colors"
          >
            <RotateCcw className="h-4 w-4 text-gray-400" />
          </button>
        </div>
      </div>

      <div className="text-3xl font-mono font-bold text-center mb-4">
        <span className={getTimeColor()}>{timeInfo.formatted}</span>
      </div>

      <div className="relative h-2 bg-background-default rounded-full overflow-hidden">
        <motion.div
          className="absolute top-0 left-0 h-full bg-primary"
          initial={{ width: '100%' }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>
    </div>
  );
};

export default LabTimer