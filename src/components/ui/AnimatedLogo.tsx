import { motion } from 'framer-motion';

const letters = 'hackosquad'.split('');

const container = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.2 }
  }
};

// Glow cycle builder with three intensity modes and minimal motion option
const buildGlowCycle = (mode: 'minimal' | 'subtle' | 'vivid', crisp: boolean) => {
  if (mode === 'minimal') {
    return {
      hidden: { opacity: 0.95, filter: 'brightness(1) blur(0px)' },
      visible: (custom: number) => ({
        opacity: [0.95, 1, 0.97, 1, 0.95],
        filter: [
          'brightness(1) blur(0px)',
          'brightness(1.03) blur(0px)',
          'brightness(1) blur(0px)',
          'brightness(1.05) blur(0px)',
          'brightness(1) blur(0px)'
        ],
        transition: {
          duration: 6,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: custom * 0.1
        }
      })
    };
  }
  const vivid = mode === 'vivid';
  return {
    hidden: { opacity: vivid ? 0.55 : 0.65, filter: 'brightness(0.9) blur(0px)' },
    visible: (custom: number) => ({
      opacity: vivid ? [0.55, 1, 0.7, 1, 0.55] : [0.65, 1, 0.75, 1, 0.65],
      filter: crisp
        ? ['brightness(1) blur(0px)','brightness(1.04) blur(0px)','brightness(1) blur(0px)','brightness(1.05) blur(0px)','brightness(1) blur(0px)']
        : vivid
          ? ['brightness(0.95) blur(0px)','brightness(1.1) blur(0.12px)','brightness(1.03) blur(0px)','brightness(1.15) blur(0.18px)','brightness(0.95) blur(0px)']
          : ['brightness(0.98) blur(0px)','brightness(1.06) blur(0.1px)','brightness(1.0) blur(0px)','brightness(1.08) blur(0.12px)','brightness(0.98) blur(0px)'],
      transition: {
        duration: vivid ? 4 : 4.75,
        repeat: Infinity,
        ease: 'easeInOut',
        delay: custom * 0.12
      }
    })
  };
};

interface AnimatedLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  intensity?: 'minimal' | 'subtle' | 'vivid';
  crisp?: boolean; // force lowest possible blur and glow
}

const sizeMap: Record<string, string> = {
  sm: 'text-base tracking-[0.18em]',
  md: 'text-lg tracking-[0.2em]',
  lg: 'text-2xl tracking-[0.25em]',
  xl: 'text-3xl tracking-[0.28em]'
};

export const AnimatedLogo = ({ className = '', size = 'md', intensity = 'minimal', crisp = false }: AnimatedLogoProps) => {
  const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)');
  const reduced = prefersReducedMotion && prefersReducedMotion.matches;
  const effectiveIntensity = reduced ? 'minimal' : intensity;
  const glowCycle = buildGlowCycle(effectiveIntensity, crisp || reduced);
  return (
    <motion.div
      className={`relative group flex items-center justify-center font-mono font-semibold select-none bg-clip-text text-transparent ${sizeMap[size]} ${className}`}
      style={{
        backgroundImage: 'linear-gradient(90deg,#ef4444,#ec4899,#a855f7)',
        filter: (crisp || reduced)
          ? 'drop-shadow(0 0 1px rgba(239,68,68,0.25))'
          : effectiveIntensity === 'vivid'
            ? 'drop-shadow(0 0 3px rgba(239,68,68,0.45)) drop-shadow(0 0 4px rgba(168,85,247,0.3))'
            : effectiveIntensity === 'subtle'
              ? 'drop-shadow(0 0 2px rgba(239,68,68,0.3)) drop-shadow(0 0 3px rgba(168,85,247,0.2))'
              : 'drop-shadow(0 0 2px rgba(239,68,68,0.25))'
      }}
      variants={container}
      initial="hidden"
      animate="visible"
  whileHover={!reduced && !crisp ? { scale: 1.02 } : undefined}
  whileFocus={!reduced && !crisp ? { scale: 1.02 } : undefined}
    >
      {/* Shimmer overlay */}
  {!reduced && !crisp && (
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 overflow-hidden rounded"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.05, 0.15, 0.08] }}
          transition={{ duration: 6, repeat: Infinity }}
        >
          <motion.div
            className="absolute top-0 bottom-0 w-1/3 bg-gradient-to-r from-transparent via-[#ffffff22] to-transparent"
            initial={{ x: '-30%' }}
            animate={{ x: ['-30%', '130%'] }}
            transition={{ duration: 4.5, repeat: Infinity, ease: 'linear', delay: 1 }}
          />
        </motion.div>
      )}
      {letters.map((char, idx) => (
        <motion.span
          key={idx}
          custom={idx}
          variants={glowCycle}
          className="neon-letter lowercase relative"
        >
          <motion.span
            aria-hidden="true"
            className="inline-block"
            animate={!reduced ? { y: [0, -1, 0, 1, 0] } : undefined}
            transition={!reduced ? { duration: 5 + idx * 0.15, repeat: Infinity, ease: 'easeInOut' } : undefined}
          >
            {char}
          </motion.span>
        </motion.span>
      ))}
      {/* Intensify glow on hover/focus */}
      {!reduced && !crisp && (
        <motion.div
          aria-hidden="true"
          className="absolute inset-0 blur-[2px] opacity-0 group-hover:opacity-50 group-focus:opacity-50 transition-opacity duration-300"
          style={{
            background: 'radial-gradient(circle at 50% 50%, rgba(236,72,153,0.25), transparent 60%)'
          }}
        />
      )}
    </motion.div>
  );
};

export default AnimatedLogo;
