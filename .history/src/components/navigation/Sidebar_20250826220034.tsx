import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Home, Flag, FlaskRound as Flask, ShieldAlert, Sword, 
  Plus, FolderCheck, ChevronDown, ChevronRight,
  Trophy, User, LogOut, Settings, Bell, Star, Zap, Target,
  Activity, Calendar, Award, Crown, Flame, Monitor, Shield, BookOpen
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useSidebar } from '../../contexts/SidebarContext';
import Logo from '../ui/Logo';

interface SidebarProps {
  mobile?: boolean;
  onClose?: () => void;
}

interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  badge?: number;
  isNew?: boolean;
}

interface NavSectionProps {
  title: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
}

const NavItem = ({ to, icon, label, badge, isNew }: NavItemProps) => (
  <NavLink
    to={to}
    className={({ isActive }) => 
      `group relative flex items-center px-4 py-3 rounded-xl transition-all duration-200 ${
        isActive 
          ? 'bg-gradient-to-r from-red-500/20 to-purple-600/20 text-red-400 border-l-4 border-red-500 shadow-lg' 
          : 'text-gray-300 hover:text-white hover:bg-slate-800/50'
      }`
    }
  >
    <div className="relative">
      {icon}
      {isNew && (
        <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
      )}
    </div>
    <span className="ml-3 font-medium">{label}</span>
    {badge && badge > 0 && (
      <span className="ml-auto bg-red-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
        {badge > 99 ? '99+' : badge}
      </span>
    )}
    {isNew && (
      <span className="ml-auto bg-gradient-to-r from-red-500 to-red-600 text-white text-xs rounded-full px-2 py-1 font-bold">
        NEW
      </span>
    )}
  </NavLink>
);

const NavSection = ({ title, children, icon }: NavSectionProps) => {
  const [isOpen, setIsOpen] = useState(true);
  
  return (
    <div className="mb-6">
      <button
        className="flex items-center w-full px-4 py-2 text-sm font-semibold text-gray-400 hover:text-white transition-colors duration-200 group"
        onClick={() => setIsOpen(!isOpen)}
      >
        {icon && <span className="mr-2">{icon}</span>}
        <span className="uppercase tracking-wider">{title}</span>
        <motion.div
          animate={{ rotate: isOpen ? 0 : -90 }}
          transition={{ duration: 0.2 }}
          className="ml-auto"
        >
          <ChevronDown className="h-4 w-4 group-hover:text-red-400 transition-colors" />
        </motion.div>
      </button>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="mt-2 space-y-1"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const Sidebar = ({ mobile = false, onClose }: SidebarProps) => {
  const { signOut, user } = useAuth();
  const { isMinimized, toggleSidebar } = useSidebar();
  const [currentFace, setCurrentFace] = useState(0);
  const [pixels, setPixels] = useState<Array<{ id: number; x: number; y: number; color: string; active: boolean }>>([]);
  const [isHovered, setIsHovered] = useState(false);
  const [glitchMode, setGlitchMode] = useState(false);
  const [hackingProgress, setHackingProgress] = useState(0);
  const [systemStatus, setSystemStatus] = useState<'secure' | 'scanning' | 'breach' | 'compromised'>('secure');
  const [matrixRain, setMatrixRain] = useState(false);
  const [hackingSequence, setHackingSequence] = useState<'idle' | 'colorFill' | 'hacking' | 'textDisplay' | 'complete'>('idle');
  const [colorFillProgress, setColorFillProgress] = useState(0);
  const [currentTextIndex, setCurrentTextIndex] = useState(0);
  const [userStats, setUserStats] = useState({
    level: 5,
    xp: 1250,
    totalXp: 2000,
    streak: 7,
    challenges: 23
  });

  // Text patterns for "HACKOSQUAD IS NOT HACKED"
  const textPatterns = [
    // "HACK"
    [
      { x: 1, y: 1, color: '#FF0000' }, { x: 1, y: 2, color: '#FF0000' }, { x: 1, y: 3, color: '#FF0000' }, { x: 1, y: 4, color: '#FF0000' }, { x: 1, y: 5, color: '#FF0000' },
      { x: 2, y: 3, color: '#FF0000' }, { x: 3, y: 1, color: '#FF0000' }, { x: 3, y: 2, color: '#FF0000' }, { x: 3, y: 3, color: '#FF0000' }, { x: 3, y: 4, color: '#FF0000' }, { x: 3, y: 5, color: '#FF0000' },
      { x: 5, y: 1, color: '#FF0000' }, { x: 5, y: 2, color: '#FF0000' }, { x: 5, y: 3, color: '#FF0000' }, { x: 5, y: 4, color: '#FF0000' }, { x: 5, y: 5, color: '#FF0000' },
      { x: 6, y: 1, color: '#FF0000' }, { x: 6, y: 2, color: '#FF0000' }, { x: 6, y: 3, color: '#FF0000' }, { x: 6, y: 4, color: '#FF0000' }
    ],
    // "SQUAD"
    [
      { x: 1, y: 2, color: '#00FF00' }, { x: 1, y: 3, color: '#00FF00' }, { x: 1, y: 4, color: '#00FF00' }, { x: 2, y: 1, color: '#00FF00' }, { x: 2, y: 5, color: '#00FF00' },
      { x: 3, y: 1, color: '#00FF00' }, { x: 3, y: 2, color: '#00FF00' }, { x: 3, y: 3, color: '#00FF00' }, { x: 4, y: 2, color: '#00FF00' }, { x: 4, y: 4, color: '#00FF00' },
      { x: 5, y: 1, color: '#00FF00' }, { x: 5, y: 2, color: '#00FF00' }, { x: 5, y: 3, color: '#00FF00' }, { x: 5, y: 4, color: '#00FF00' }, { x: 5, y: 5, color: '#00FF00' },
      { x: 6, y: 1, color: '#00FF00' }, { x: 6, y: 2, color: '#00FF00' }, { x: 6, y: 3, color: '#00FF00' }, { x: 6, y: 4, color: '#00FF00' }, { x: 6, y: 5, color: '#00FF00' }
    ],
    // "IS"
    [
      { x: 2, y: 1, color: '#0088FF' }, { x: 2, y: 2, color: '#0088FF' }, { x: 2, y: 3, color: '#0088FF' }, { x: 2, y: 4, color: '#0088FF' }, { x: 2, y: 5, color: '#0088FF' },
      { x: 4, y: 2, color: '#0088FF' }, { x: 4, y: 3, color: '#0088FF' }, { x: 4, y: 4, color: '#0088FF' }, { x: 5, y: 1, color: '#0088FF' }, { x: 5, y: 5, color: '#0088FF' },
      { x: 6, y: 1, color: '#0088FF' }, { x: 6, y: 2, color: '#0088FF' }, { x: 6, y: 3, color: '#0088FF' }, { x: 6, y: 4, color: '#0088FF' }, { x: 6, y: 5, color: '#0088FF' }
    ],
    // "NOT"
    [
      { x: 1, y: 1, color: '#FFD700' }, { x: 1, y: 2, color: '#FFD700' }, { x: 1, y: 3, color: '#FFD700' }, { x: 1, y: 4, color: '#FFD700' }, { x: 1, y: 5, color: '#FFD700' },
      { x: 2, y: 2, color: '#FFD700' }, { x: 3, y: 3, color: '#FFD700' }, { x: 4, y: 4, color: '#FFD700' }, { x: 5, y: 1, color: '#FFD700' }, { x: 5, y: 2, color: '#FFD700' },
      { x: 5, y: 3, color: '#FFD700' }, { x: 5, y: 4, color: '#FFD700' }, { x: 5, y: 5, color: '#FFD700' }, { x: 2, y: 1, color: '#FFD700' }, { x: 3, y: 1, color: '#FFD700' },
      { x: 4, y: 1, color: '#FFD700' }, { x: 2, y: 5, color: '#FFD700' }, { x: 3, y: 5, color: '#FFD700' }, { x: 4, y: 5, color: '#FFD700' }
    ],
    // "HACKED"
    [
      { x: 1, y: 1, color: '#FF00FF' }, { x: 1, y: 2, color: '#FF00FF' }, { x: 1, y: 3, color: '#FF00FF' }, { x: 1, y: 4, color: '#FF00FF' }, { x: 1, y: 5, color: '#FF00FF' },
      { x: 2, y: 3, color: '#FF00FF' }, { x: 3, y: 1, color: '#FF00FF' }, { x: 3, y: 2, color: '#FF00FF' }, { x: 3, y: 3, color: '#FF00FF' }, { x: 3, y: 4, color: '#FF00FF' },
      { x: 3, y: 5, color: '#FF00FF' }, { x: 5, y: 1, color: '#FF00FF' }, { x: 5, y: 2, color: '#FF00FF' }, { x: 5, y: 3, color: '#FF00FF' }, { x: 5, y: 4, color: '#FF00FF' },
      { x: 6, y: 1, color: '#FF00FF' }, { x: 6, y: 5, color: '#FF00FF' }, { x: 4, y: 1, color: '#FF00FF' }, { x: 4, y: 2, color: '#FF00FF' }, { x: 4, y: 4, color: '#FF00FF' }
    ]
  ];

  // Enhanced faces with more cybersecurity themes
  const faces = [
    // Hacker Mask
    [
      { x: 2, y: 1, color: '#000000' }, { x: 3, y: 1, color: '#000000' }, { x: 4, y: 1, color: '#000000' }, { x: 5, y: 1, color: '#000000' },
      { x: 1, y: 2, color: '#000000' }, { x: 2, y: 2, color: '#FFFFFF' }, { x: 3, y: 2, color: '#000000' }, { x: 4, y: 2, color: '#FFFFFF' }, { x: 5, y: 2, color: '#000000' }, { x: 6, y: 2, color: '#000000' },
      { x: 1, y: 3, color: '#000000' }, { x: 2, y: 3, color: '#000000' }, { x: 3, y: 3, color: '#000000' }, { x: 4, y: 3, color: '#000000' }, { x: 5, y: 3, color: '#000000' }, { x: 6, y: 3, color: '#000000' },
      { x: 1, y: 4, color: '#000000' }, { x: 2, y: 4, color: '#FF0000' }, { x: 3, y: 4, color: '#FF0000' }, { x: 4, y: 4, color: '#FF0000' }, { x: 5, y: 4, color: '#FF0000' }, { x: 6, y: 4, color: '#000000' },
      { x: 2, y: 5, color: '#000000' }, { x: 3, y: 5, color: '#000000' }, { x: 4, y: 5, color: '#000000' }, { x: 5, y: 5, color: '#000000' }
    ],
    // WiFi Signal
    [
      { x: 3, y: 1, color: '#00FF00' }, { x: 4, y: 1, color: '#00FF00' },
      { x: 2, y: 2, color: '#00FF00' }, { x: 3, y: 2, color: '#00FF00' }, { x: 4, y: 2, color: '#00FF00' }, { x: 5, y: 2, color: '#00FF00' },
      { x: 1, y: 3, color: '#00FF00' }, { x: 2, y: 3, color: '#00FF00' }, { x: 3, y: 3, color: '#00FF00' }, { x: 4, y: 3, color: '#00FF00' }, { x: 5, y: 3, color: '#00FF00' }, { x: 6, y: 3, color: '#00FF00' },
      { x: 3, y: 4, color: '#00FF00' }, { x: 4, y: 4, color: '#00FF00' },
      { x: 3, y: 5, color: '#00FF00' }, { x: 4, y: 5, color: '#00FF00' }
    ],
    // Shield (Security)
    [
      { x: 3, y: 1, color: '#0088FF' }, { x: 4, y: 1, color: '#0088FF' },
      { x: 2, y: 2, color: '#0088FF' }, { x: 3, y: 2, color: '#FFFFFF' }, { x: 4, y: 2, color: '#FFFFFF' }, { x: 5, y: 2, color: '#0088FF' },
      { x: 2, y: 3, color: '#0088FF' }, { x: 3, y: 3, color: '#FFFFFF' }, { x: 4, y: 3, color: '#FFFFFF' }, { x: 5, y: 3, color: '#0088FF' },
      { x: 2, y: 4, color: '#0088FF' }, { x: 3, y: 4, color: '#0088FF' }, { x: 4, y: 4, color: '#0088FF' }, { x: 5, y: 4, color: '#0088FF' },
      { x: 3, y: 5, color: '#0088FF' }, { x: 4, y: 5, color: '#0088FF' }
    ],
    // Skull (Danger)
    [
      { x: 2, y: 1, color: '#FFFFFF' }, { x: 3, y: 1, color: '#FFFFFF' }, { x: 4, y: 1, color: '#FFFFFF' }, { x: 5, y: 1, color: '#FFFFFF' },
      { x: 1, y: 2, color: '#FFFFFF' }, { x: 2, y: 2, color: '#000000' }, { x: 3, y: 2, color: '#FFFFFF' }, { x: 4, y: 2, color: '#000000' }, { x: 5, y: 2, color: '#FFFFFF' }, { x: 6, y: 2, color: '#FFFFFF' },
      { x: 1, y: 3, color: '#FFFFFF' }, { x: 2, y: 3, color: '#FFFFFF' }, { x: 3, y: 3, color: '#000000' }, { x: 4, y: 3, color: '#FFFFFF' }, { x: 5, y: 3, color: '#FFFFFF' }, { x: 6, y: 3, color: '#FFFFFF' },
      { x: 1, y: 4, color: '#FFFFFF' }, { x: 2, y: 4, color: '#000000' }, { x: 3, y: 4, color: '#FFFFFF' }, { x: 4, y: 4, color: '#000000' }, { x: 5, y: 4, color: '#FFFFFF' }, { x: 6, y: 4, color: '#FFFFFF' },
      { x: 2, y: 5, color: '#FFFFFF' }, { x: 3, y: 5, color: '#000000' }, { x: 4, y: 5, color: '#000000' }, { x: 5, y: 5, color: '#FFFFFF' }
    ],
    // Terminal Cursor
    [
      { x: 1, y: 2, color: '#00FF00' }, { x: 2, y: 2, color: '#00FF00' }, { x: 3, y: 2, color: '#00FF00' },
      { x: 1, y: 3, color: '#00FF00' }, { x: 4, y: 3, color: '#00FF00' }, { x: 5, y: 3, color: '#00FF00' }, { x: 6, y: 3, color: '#00FF00' },
      { x: 1, y: 4, color: '#00FF00' }, { x: 2, y: 4, color: '#00FF00' }, { x: 3, y: 4, color: '#00FF00' }
    ],
    // Lock (Encrypted)
    [
      { x: 3, y: 1, color: '#FFD700' }, { x: 4, y: 1, color: '#FFD700' },
      { x: 2, y: 2, color: '#FFD700' }, { x: 5, y: 2, color: '#FFD700' },
      { x: 1, y: 3, color: '#FFD700' }, { x: 2, y: 3, color: '#FFD700' }, { x: 3, y: 3, color: '#FFD700' }, { x: 4, y: 3, color: '#FFD700' }, { x: 5, y: 3, color: '#FFD700' }, { x: 6, y: 3, color: '#FFD700' },
      { x: 1, y: 4, color: '#FFD700' }, { x: 2, y: 4, color: '#FFD700' }, { x: 3, y: 4, color: '#000000' }, { x: 4, y: 4, color: '#FFD700' }, { x: 5, y: 4, color: '#FFD700' }, { x: 6, y: 4, color: '#FFD700' },
      { x: 1, y: 5, color: '#FFD700' }, { x: 2, y: 5, color: '#FFD700' }, { x: 3, y: 5, color: '#FFD700' }, { x: 4, y: 5, color: '#FFD700' }, { x: 5, y: 5, color: '#FFD700' }, { x: 6, y: 5, color: '#FFD700' }
    ]
  ];

  // Initialize pixelating animation
  useEffect(() => {
    const generatePixels = () => {
      const pixelArray = [];
      const currentFacePixels = faces[currentFace];
      
      // Create 8x8 grid
      for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
          const facePixel = currentFacePixels.find(p => p.x === j && p.y === i);
          pixelArray.push({
            id: i * 8 + j,
            x: j,
            y: i,
            color: facePixel ? facePixel.color : 'transparent',
            active: !!facePixel
          });
        }
      }
      return pixelArray;
    };

    setPixels(generatePixels());

    // Change face every 3 seconds
    const faceInterval = setInterval(() => {
      setCurrentFace(prev => (prev + 1) % faces.length);
    }, 3000);

    return () => clearInterval(faceInterval);
  }, [currentFace]);

  // Enhanced effects
  useEffect(() => {
    // System status animation
    const statusInterval = setInterval(() => {
      const statuses: Array<typeof systemStatus> = ['secure', 'scanning', 'breach', 'compromised'];
      const randomChance = Math.random();
      
      if (randomChance < 0.05) { // 5% chance of breach
        setSystemStatus('breach');
        setGlitchMode(true);
        setTimeout(() => {
          setSystemStatus('compromised');
          setGlitchMode(false);
        }, 1000);
      } else if (randomChance < 0.2) { // 15% chance of scanning
        setSystemStatus('scanning');
      } else {
        setSystemStatus('secure');
      }
    }, 5000);

    // Hacking progress simulation
    const hackInterval = setInterval(() => {
      if (systemStatus === 'scanning') {
        setHackingProgress(prev => (prev + Math.random() * 20) % 100);
      } else {
        setHackingProgress(0);
      }
    }, 200);

    return () => {
      clearInterval(statusInterval);
      clearInterval(hackInterval);
    };
  }, [systemStatus]);

  // Matrix rain effect
  useEffect(() => {
    if (matrixRain) {
      const timeout = setTimeout(() => setMatrixRain(false), 3000);
      return () => clearTimeout(timeout);
    }
  }, [matrixRain]);

  // Enhanced hacking sequence effect
  useEffect(() => {
    if (hackingSequence === 'colorFill') {
      const fillInterval = setInterval(() => {
        setColorFillProgress(prev => {
          const newProgress = prev + 2;
          if (newProgress >= 100) {
            setHackingSequence('hacking');
            return 100;
          }
          return newProgress;
        });
      }, 50);

      return () => clearInterval(fillInterval);
    }

    if (hackingSequence === 'hacking') {
      const hackingTimeout = setTimeout(() => {
        setHackingSequence('textDisplay');
        setCurrentTextIndex(0);
      }, 2000);

      return () => clearTimeout(hackingTimeout);
    }

    if (hackingSequence === 'textDisplay') {
      const textInterval = setInterval(() => {
        setCurrentTextIndex(prev => {
          const nextIndex = prev + 1;
          if (nextIndex >= textPatterns.length) {
            setHackingSequence('complete');
            setTimeout(() => {
              setHackingSequence('idle');
              setColorFillProgress(0);
              setCurrentTextIndex(0);
            }, 2000);
            return prev;
          }
          return nextIndex;
        });
      }, 1000);

      return () => clearInterval(textInterval);
    }
  }, [hackingSequence]);

  const handleHackClick = () => {
    if (hackingSequence === 'idle') {
      setHackingSequence('colorFill');
      setColorFillProgress(0);
    }
  };

  const handleSignOut = async () => {
    await signOut();
  };

  const getHackingPixelColor = (pixel: any, baseColor: string) => {
    if (hackingSequence === 'colorFill') {
      const pixelPosition = (pixel.y * 8 + pixel.x) / 64 * 100;
      if (pixelPosition <= colorFillProgress) {
        const colors = ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF'];
        return colors[Math.floor(Math.random() * colors.length)];
      }
    }

    if (hackingSequence === 'hacking') {
      return ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF'][Math.floor(Math.random() * 6)];
    }

    if (hackingSequence === 'textDisplay' || hackingSequence === 'complete') {
      const currentPattern = textPatterns[currentTextIndex];
      if (currentPattern) {
        const patternPixel = currentPattern.find(p => p.x === pixel.x && p.y === pixel.y);
        if (patternPixel) {
          return patternPixel.color;
        }
      }
      return 'transparent';
    }

    return baseColor;
  };

  return (
    <motion.div 
      className="flex flex-col h-full border-r border-red-500/20 backdrop-blur-sm relative"
      style={{ backgroundColor: '#0A030F' }}
      animate={{ width: mobile ? '320px' : (isMinimized ? '80px' : '280px') }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
    >
      {/* Minimize/Maximize Toggle - Hide on mobile */}
      {!mobile && (
        <button
          onClick={toggleSidebar}
          className="absolute -right-3 top-1/2 transform -translate-y-1/2 z-50 w-6 h-6 bg-slate-800 border border-red-500/30 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-red-500/20 transition-all duration-200 shadow-lg"
        >
          <motion.div
            animate={{ rotate: isMinimized ? 0 : 180 }}
            transition={{ duration: 0.3 }}
          >
            <ChevronRight className="h-3 w-3" />
          </motion.div>
        </button>
      )}

      {/* Sidebar header */}
      <div className="flex items-center justify-between h-16 px-6 border-b border-red-500/20" style={{ backgroundColor: '#0A030F' }}>
        {!isMinimized ? (
          <Logo size="small" />
        ) : (
          <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-red-500 to-purple-600 flex items-center justify-center">
            <span className="text-white font-bold text-sm">H</span>
          </div>
        )}
        
        {mobile && onClose && !isMinimized && (
          <button
            className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-slate-800/50 transition-all duration-200"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>
      
      {/* Enhanced Pixelating Animation Card */}
      {!isMinimized && (
        <div className="p-4 border-b border-red-500/20">
          <div 
            className="relative bg-gradient-to-br from-slate-900/80 to-black rounded-2xl p-6 border border-red-500/30 overflow-hidden cursor-pointer transition-all duration-300 hover:border-red-500/50 hover:shadow-lg hover:shadow-red-500/10"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={handleHackClick}
          >
            {/* Pixelated Face Grid */}
            <div className="relative z-10 grid grid-cols-8 grid-rows-8 gap-[2px] w-24 h-24 mx-auto">
              {pixels.map((pixel) => (
                <motion.div
                  key={pixel.id}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ 
                    opacity: hackingSequence !== 'idle' ? 1 : (pixel.active ? 1 : 0),
                    scale: hackingSequence === 'hacking' ? [1, 1.5, 0.8, 1.2, 1] : 
                           hackingSequence !== 'idle' ? 1 :
                           (pixel.active ? (glitchMode ? [1, 1.5, 0.8, 1.2, 1] : [0.8, 1.2, 1]) : 0),
                    backgroundColor: getHackingPixelColor(pixel, glitchMode ? ['#FF0000', '#00ff00', '#0000ff'][Math.floor(Math.random() * 3)] : pixel.color),
                    boxShadow: (pixel.active || hackingSequence !== 'idle') && pixel.color !== 'transparent' 
                      ? `0 0 ${isHovered || hackingSequence !== 'idle' ? '20px' : '10px'} ${getHackingPixelColor(pixel, pixel.color)}80`
                      : 'none',
                    rotate: hackingSequence === 'hacking' ? Math.random() * 360 : 
                            glitchMode ? Math.random() * 360 : 0
                  }}
                  transition={{
                    duration: hackingSequence === 'hacking' ? 0.1 : 
                             hackingSequence === 'colorFill' ? 0.3 :
                             glitchMode ? 0.1 : 0.5,
                    delay: hackingSequence === 'colorFill' ? (pixel.y * 8 + pixel.x) * 0.01 :
                           glitchMode ? Math.random() * 0.1 : 
                           (pixel.x + pixel.y) * 0.05,
                    repeat: hackingSequence === 'hacking' ? 10 : 
                            glitchMode ? 5 : Infinity,
                    repeatType: "reverse",
                    repeatDelay: hackingSequence === 'hacking' ? 0 :
                                glitchMode ? 0 : 2
                  }}
                  className="w-full h-full rounded-[1px]"
                />
              ))}
            </div>

            {/* Enhanced Card Background Color Fill */}
            {hackingSequence === 'colorFill' && (
              <motion.div
                className="absolute inset-0 rounded-2xl"
                initial={{ background: 'transparent' }}
                animate={{
                  background: [
                    'linear-gradient(45deg, #FF000020, #800080020)',
                    'linear-gradient(45deg, #800080020, #FF000020)',
                    'linear-gradient(45deg, #FF000020, #800080020)'
                  ]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity
                }}
              />
            )}

            {/* Enhanced corner brackets with red theme */}
            <div className="absolute top-3 left-3 w-4 h-4 border-l-2 border-t-2 border-red-500/60"></div>
            <div className="absolute top-3 right-3 w-4 h-4 border-r-2 border-t-2 border-red-500/60"></div>
            <div className="absolute bottom-3 left-3 w-4 h-4 border-l-2 border-b-2 border-red-500/60"></div>
            <div className="absolute bottom-3 right-3 w-4 h-4 border-r-2 border-b-2 border-red-500/60"></div>

            {/* Hacking Status Display */}
            {hackingSequence !== 'idle' && (
              <div className="mt-4">
                <div className="text-xs text-center font-mono mb-1">
                  {hackingSequence === 'colorFill' && (
                    <span className="text-red-400 animate-pulse">INITIALIZING HACK...</span>
                  )}
                  {hackingSequence === 'hacking' && (
                    <span className="text-yellow-400 animate-pulse">HACKING IN PROGRESS...</span>
                  )}
                  {hackingSequence === 'textDisplay' && (
                    <span className="text-green-400">
                      {currentTextIndex === 0 && "HACKOSQUAD"}
                      {currentTextIndex === 1 && "IS"}
                      {currentTextIndex === 2 && "NOT"}
                      {currentTextIndex === 3 && "HACKED"}
                    </span>
                  )}
                  {hackingSequence === 'complete' && (
                    <span className="text-green-400 font-bold animate-pulse">SECURE SYSTEM ✓</span>
                  )}
                </div>
                {hackingSequence === 'colorFill' && (
                  <div className="w-full bg-slate-800 rounded-full h-1 overflow-hidden">
                    <motion.div
                      className="bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 h-full rounded-full"
                      animate={{ width: `${colorFillProgress}%` }}
                      transition={{ duration: 0.1 }}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Matrix Rain Effect */}
            {matrixRain && (
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {[...Array(20)].map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 200, opacity: [0, 1, 0] }}
                    transition={{ duration: 2, delay: i * 0.1 }}
                    className="absolute text-green-400 text-xs font-mono"
                    style={{ left: `${(i * 5) % 100}%` }}
                  >
                    {Math.random().toString(36).substring(2, 8)}
                  </motion.div>
                ))}
              </div>
            )}

            {/* Enhanced floating particles */}
            <div className="absolute inset-0 pointer-events-none">
              {[...Array(isHovered ? 12 : 8)].map((_, i) => (
                <motion.div
                  key={i}
                  animate={{
                    x: [0, Math.random() * 100 - 50, 0],
                    y: [0, Math.random() * 100 - 50, 0],
                    opacity: [0, 1, 0],
                    scale: [0, isHovered ? 1.5 : 1, 0]
                  }}
                  transition={{
                    duration: isHovered ? 2 : 3,
                    delay: i * 0.3,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="absolute w-1 h-1 rounded-full"
                  style={{
                    backgroundColor: isHovered 
                      ? ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ffffff'][i % 7]
                      : ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'][i % 6],
                    left: `${20 + Math.random() * 60}%`,
                    top: `${20 + Math.random() * 60}%`
                  }}
                />
              ))}
            </div>

            {/* Enhanced scanning lines */}
            <motion.div
              animate={{
                y: systemStatus === 'scanning' ? [-20, 120, -20] : [-20, 120],
                opacity: systemStatus === 'scanning' ? [0, 1, 0.8, 1, 0] : [0, 0.8, 0]
              }}
              transition={{
                duration: systemStatus === 'scanning' ? 1 : 2,
                repeat: Infinity,
                repeatDelay: systemStatus === 'scanning' ? 0 : 1
              }}
              className={`absolute left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-${
                systemStatus === 'scanning' ? 'yellow' : 'cyan'
              }-400 to-transparent`}
            />

            {/* Interactive hint */}
            {isHovered && hackingSequence === 'idle' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute bottom-2 left-1/2 transform -translate-x-1/2 text-xs text-gray-400 font-mono bg-black/50 px-2 py-1 rounded"
              >
                CLICK TO HACK
              </motion.div>
            )}
          </div>
        </div>
      )}
      
      {/* Minimized Icon Only */}
      {isMinimized && (
        <div className="p-4 border-b border-red-500/20 flex justify-center">
          <div 
            className="relative w-12 h-12 bg-gradient-to-br from-slate-900/80 to-black rounded-xl border border-red-500/30 cursor-pointer transition-all duration-300 hover:border-red-500/50"
            onClick={handleHackClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            <div className="absolute inset-2 grid grid-cols-4 grid-rows-4 gap-[1px]">
              {pixels.slice(0, 16).map((pixel, i) => (
                <motion.div
                  key={i}
                  animate={{ 
                    backgroundColor: getHackingPixelColor(pixel, pixel.color),
                    opacity: pixel.active ? 1 : 0
                  }}
                  transition={{ duration: 0.5, delay: i * 0.02 }}
                  className="w-full h-full rounded-[0.5px]"
                />
              ))}
            </div>
          </div>
        </div>
      )}
      
      {/* Sidebar content */}
      <div className="flex-1 flex flex-col pt-4 pb-4 overflow-y-auto custom-scrollbar">
        <nav className="flex-1 px-4 space-y-2">
          {/* Main section */}
          <NavSection title={isMinimized ? "" : "Main"} icon={<Home className="h-4 w-4" />}>
            <NavItem to="/dashboard" icon={<Home className="h-5 w-5" />} label={isMinimized ? "" : "Dashboard"} />
            <NavItem to="/challenges" icon={<Flag className="h-5 w-5" />} label={isMinimized ? "" : "Challenges"} badge={isMinimized ? undefined : 3} />
            <NavItem to="/skill-paths" icon={<BookOpen className="h-5 w-5" />} label={isMinimized ? "" : "Skill Paths"} />
            <NavItem to="/labs" icon={<Flask className="h-5 w-5" />} label={isMinimized ? "" : "Labs"} isNew={!isMinimized} />
            <NavItem to="/threat-intelligence" icon={<Shield className="h-5 w-5" />} label={isMinimized ? "" : "Threat Intel"} isNew={!isMinimized} />
            <NavItem to="/leaderboard" icon={<Trophy className="h-5 w-5" />} label={isMinimized ? "" : "Leaderboard"} />
            <NavItem
              to="/red-vs-blue"
              icon={
                <span className="inline-block w-6 h-6 bg-gradient-to-br from-red-500 to-blue-500 rounded-full flex items-center justify-center font-extrabold text-white text-lg shadow-md border-2 border-white">
                  VS
                </span>
              }
              label={isMinimized ? "" : "Red vs Blue"}
              isNew={!isMinimized}
            />
          </NavSection>
          
          {/* Operations section */}
          <NavSection title={isMinimized ? "" : "Live Operations"} icon={<Monitor className="h-4 w-4" />}>
            <NavItem to="/operations" icon={<Monitor className="h-5 w-5 text-red-400" />} label={isMinimized ? "" : "Operations"} isNew={!isMinimized} />
            <NavItem to="/red-vs-blue" icon={<Sword className="h-5 w-5 text-fuchsia-400" />} label={isMinimized ? "" : "Red vs Blue"} />
          </NavSection>
          
          {/* Creator Zone section */}
          <NavSection title={isMinimized ? "" : "Creator Zone"} icon={<Plus className="h-4 w-4" />}>
            <NavItem to="/creator/create" icon={<Plus className="h-5 w-5" />} label={isMinimized ? "" : "Create Challenge"} />
            <NavItem to="/creator/manage" icon={<FolderCheck className="h-5 w-5" />} label={isMinimized ? "" : "My Challenges"} />
          </NavSection>

          {/* Admin section */}
          <NavSection title={isMinimized ? "" : "Admin Panel"} icon={<Settings className="h-4 w-4" />}>
            <NavItem to="/admin" icon={<Shield className="h-5 w-5" />} label={isMinimized ? "" : "Dashboard"} />
            <NavItem to="/admin/labs" icon={<Flask className="h-5 w-5" />} label={isMinimized ? "" : "Labs Management"} />
            <NavItem to="/admin/skill-paths" icon={<BookOpen className="h-5 w-5" />} label={isMinimized ? "" : "Skill Paths"} isNew={!isMinimized} />
            <NavItem to="/admin/operations" icon={<Monitor className="h-5 w-5" />} label={isMinimized ? "" : "Operations"} />
            <NavItem to="/admin/laboperations" icon={<Monitor className="h-5 w-5" />} label={isMinimized ? "" : "LabOperations"} />
          </NavSection>
        </nav>
      </div>
      
      {/* Bottom Actions */}
      <div className="p-4 border-t border-red-500/20" style={{ backgroundColor: '#0A030F' }}>
        <div className="space-y-2">
          {/* Profile & Settings */}
          <NavLink 
            to="/profile"
            className={({ isActive }) => 
              `w-full flex items-center px-4 py-3 text-sm rounded-xl transition-all duration-200 group ${
                isActive 
                  ? 'bg-gradient-to-r from-red-500/20 to-purple-600/20 text-red-400 border-l-4 border-red-500 shadow-lg' 
                  : 'text-gray-300 hover:text-white hover:bg-slate-800/50'
              } ${isMinimized ? 'justify-center' : ''}`
            }
            title={isMinimized ? "Profile & Settings" : ""}
          >
            <User className="h-5 w-5" />
            {!isMinimized && (
              <>
                <span className="ml-3 font-medium">Profile & Settings</span>
                <Settings className="ml-auto h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
              </>
            )}
          </NavLink>
          
          {/* Sign Out */}
          <button 
            onClick={handleSignOut}
            className={`w-full flex items-center px-4 py-3 text-sm text-gray-300 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all duration-200 group ${
              isMinimized ? 'justify-center' : ''
            }`}
            title={isMinimized ? "Sign Out" : ""}
          >
            <LogOut className="h-5 w-5" />
            {!isMinimized && <span className="ml-3 font-medium">Sign Out</span>}
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default Sidebar;