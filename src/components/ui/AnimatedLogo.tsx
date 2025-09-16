import { motion } from 'framer-motion';

const letters = 'hackosquad'.split('');

const container = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.2 }
  }
};

// Glow cycle without any blur – only subtle brightness pulsation
const buildGlowCycle = (mode: 'minimal' | 'subtle' | 'vivid') => {
  const base = {
    duration: mode === 'vivid' ? 4 : mode === 'subtle' ? 5 : 6,
    repeat: Infinity,
    ease: 'easeInOut'
  } as const;
  if (mode === 'minimal') {
    return {
      hidden: { opacity: 0.96, filter: 'brightness(1)' },
      visible: (custom: number) => ({
        opacity: [0.96, 1, 0.98, 1, 0.96],
        filter: ['brightness(1)', 'brightness(1.02)', 'brightness(1)', 'brightness(1.025)', 'brightness(1)'],
        transition: { ...base, delay: custom * 0.1 }
      })
    };
  }
  if (mode === 'subtle') {
    return {
      hidden: { opacity: 0.9, filter: 'brightness(1)' },
      visible: (custom: number) => ({
        opacity: [0.9, 1, 0.94, 1, 0.9],
        filter: ['brightness(0.98)', 'brightness(1.05)', 'brightness(1)', 'brightness(1.06)', 'brightness(0.98)'],
        transition: { ...base, delay: custom * 0.12 }
      })
    };
  }
  return {
    hidden: { opacity: 0.85, filter: 'brightness(1)' },
    visible: (custom: number) => ({
      opacity: [0.85, 1, 0.9, 1, 0.85],
      filter: ['brightness(0.95)', 'brightness(1.08)', 'brightness(1)', 'brightness(1.1)', 'brightness(0.95)'],
      transition: { ...base, delay: custom * 0.14 }
    })
  };
};

interface AnimatedLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  intensity?: 'minimal' | 'subtle' | 'vivid';
  crisp?: boolean; // deprecated alias for static
  static?: boolean; // fully disable pulses/motion/shadow
}

const sizeMap: Record<string, string> = {
  sm: 'text-base tracking-[0.18em]',
  md: 'text-lg tracking-[0.2em]',
  lg: 'text-2xl tracking-[0.25em]',
  xl: 'text-3xl tracking-[0.28em]'
};

export const AnimatedLogo = ({ className = '', size = 'md', intensity = 'minimal', crisp, static: staticMode }: AnimatedLogoProps) => {
  const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)');
  const reduced = prefersReducedMotion && prefersReducedMotion.matches;
  const forcedStatic = staticMode || crisp; // treat crisp as static for backward compatibility
  const effectiveIntensity = forcedStatic || reduced ? 'minimal' : intensity;
  const glowCycle = buildGlowCycle(effectiveIntensity);
  return (
    <motion.div
      className={`relative group flex items-center justify-center font-mono font-semibold select-none bg-clip-text text-transparent ${sizeMap[size]} ${className}`}
      style={{
        backgroundImage: 'linear-gradient(90deg,#ef4444,#ec4899,#a855f7)',
        // Fully crisp mode: no shadow at all
        filter: forcedStatic ? 'none' : 'drop-shadow(0 0 1px rgba(239,68,68,0.18))'
      }}
      variants={container}
      initial="hidden"
      animate="visible"
      whileHover={!reduced && !forcedStatic ? { scale: 1.01 } : undefined}
      whileFocus={!reduced && !forcedStatic ? { scale: 1.01 } : undefined}
    >
      {/* Shimmer removed to reinforce crisp static clarity */}
      {letters.map((char, idx) => (
        <motion.span
          key={idx}
          custom={idx}
          variants={forcedStatic ? undefined : glowCycle}
          className="neon-letter lowercase relative"
        >
          <motion.span
            aria-hidden="true"
            className="inline-block"
            animate={forcedStatic || reduced ? undefined : { y: [0, -1, 0, 1, 0] }}
            transition={forcedStatic || reduced ? undefined : { duration: 5 + idx * 0.15, repeat: Infinity, ease: 'easeInOut' }}
          >
            {char}
          </motion.span>
        </motion.span>
      ))}
      {/* Hover intensification removed with blur elimination */}
    </motion.div>
  );
};

export default AnimatedLogo;
