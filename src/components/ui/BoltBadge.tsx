import { motion } from 'framer-motion';

interface BoltBadgeProps {
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
}

const BoltBadge = ({ position = 'bottom-right' }: BoltBadgeProps) => {
  const positionClasses = {
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4'
  };

  return (
    <motion.a
      href="https://bolt.new"
      target="_blank"
      rel="noopener noreferrer"
      className={`fixed ${positionClasses[position]} z-50`}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, delay: 1 }}
      whileHover={{ scale: 1.1 }}
    >
      <img 
        src="/white_circle_360x360.png" 
        alt="Powered by Bolt.new" 
        className="w-12 h-12 rounded-full shadow-glow-sm hover:shadow-glow transition-all duration-300"
      />
    </motion.a>
  );
};

export default BoltBadge;