import { useEffect, useState } from 'react';
import { AnimatedLogo } from './AnimatedLogo';
import { motion } from 'framer-motion';

interface LoadingScreenProps {
  message?: string;
  subMessage?: string;
  progress?: number; // optional manual progress (0-100)
  showProgressBar?: boolean;
  fullscreen?: boolean;
}

// A central reusable loading UI replacing raw "Loading HackoSquad" text occurrences.
export const LoadingScreen = ({
  message = 'Initializing',
  subMessage = 'Preparing your cyber lab environment...',
  progress,
  showProgressBar = true,
  fullscreen = true
}: LoadingScreenProps) => {
  const [internalProgress, setInternalProgress] = useState(0);
  const effectiveProgress = typeof progress === 'number' ? progress : internalProgress;

  // Simulated progressive loading if no explicit progress provided
  useEffect(() => {
    if (typeof progress === 'number') return; // external progress controls it
    const interval = setInterval(() => {
      setInternalProgress(p => {
        if (p >= 96) return p; // leave last few % to external completion
        const increment = Math.random() * 6; // variable pace
        return Math.min(96, p + increment);
      });
    }, 400);
    return () => clearInterval(interval);
  }, [progress]);

  // Ensure minimal display time before unmount (parent should honor with small delay if needed)
  // (Optional) could enforce minimal display time; variable removed to avoid unused warning

  return (
    <div
      className={`${fullscreen ? 'min-h-screen' : 'h-full'} flex flex-col items-center justify-center px-6 py-12 bg-gradient-to-br from-[#0A030F] via-background-dark to-[#181024] text-white relative overflow-hidden`}
      role="status"
      aria-live="polite"
    >
      {/* Subtle animated grid background */}
      <div className="pointer-events-none absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_center,rgba(255,255,255,0.08),transparent_70%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(60deg,transparent_0%,rgba(255,255,255,0.04)_50%,transparent_100%)] animate-[pulse_6s_ease-in-out_infinite]" />

      <div className="relative z-10 flex flex-col items-center gap-8 w-full max-w-md">
        <AnimatedLogo size="lg" intensity="minimal" />
        <div className="text-center space-y-2">
          <h1 className="text-xl font-semibold tracking-wide text-white/90">{message}</h1>
          <p className="text-sm text-white/60">{subMessage}</p>
        </div>

        {showProgressBar && (
          <div className="w-full">
            <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-fuchsia-500 via-red-500 to-cyan-500"
                initial={{ width: 0 }}
                animate={{ width: `${effectiveProgress}%` }}
                transition={{ ease: 'easeOut', duration: 0.6 }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-white/50 font-mono uppercase tracking-wider">
              <span>HackoSquad Core</span>
              <span>{Math.floor(effectiveProgress)}%</span>
            </div>
          </div>
        )}

        <motion.div
          className="text-[10px] tracking-[0.3em] text-white/30 font-mono"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.2, 1, 0.2] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        >
          LOADING ENVIRONMENT
        </motion.div>
      </div>
    </div>
  );
};

export default LoadingScreen;