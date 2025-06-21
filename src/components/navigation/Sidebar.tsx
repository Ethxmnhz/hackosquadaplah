import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Home, Flag, FlaskRound as Flask, ShieldAlert, Sword, 
  Plus, FolderCheck, ChevronDown, ChevronRight,
  Trophy, User, LogOut, Settings, Bell, Star, Zap, Target,
  Activity, Calendar, Award, Crown, Flame, Monitor
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
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
          ? 'bg-gradient-to-r from-primary/20 to-primary/10 text-primary border-l-4 border-primary shadow-lg' 
          : 'text-gray-300 hover:text-white hover:bg-background-light/50'
      }`
    }
  >
    <div className="relative">
      {icon}
      {isNew && (
        <div className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full animate-pulse" />
      )}
    </div>
    <span className="ml-3 font-medium">{label}</span>
    {badge && badge > 0 && (
      <span className="ml-auto bg-primary text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
        {badge > 99 ? '99+' : badge}
      </span>
    )}
    {isNew && (
      <span className="ml-auto bg-gradient-to-r from-primary to-primary-light text-white text-xs rounded-full px-2 py-1 font-bold">
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
          <ChevronDown className="h-4 w-4 group-hover:text-primary transition-colors" />
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
  const [showNotifications, setShowNotifications] = useState(false);

  const handleSignOut = async () => {
    await signOut();
  };

  const userInitials = user?.user_metadata?.username 
    ? user.user_metadata.username.slice(0, 2).toUpperCase() 
    : 'US';

  const userLevel = 'Elite'; // This would come from user stats
  const userPoints = 1250; // This would come from user stats

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-background-default to-background-dark border-r border-background-light/50 backdrop-blur-sm">
      {/* Sidebar header */}
      <div className="flex items-center justify-between h-16 px-6 border-b border-background-light/30 bg-background-light/20">
        <Logo />
        
        {mobile && onClose && (
          <button
            className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-background-light/50 transition-all duration-200"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>
      
      {/* User Profile Section - Top */}
      <div className="p-4 border-b border-background-light/30">
        <div className="relative bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl p-4 border border-primary/20">
          {/* Background Pattern */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent rounded-2xl" />
          
          <div className="relative flex items-center">
            <div className="relative">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center shadow-lg">
                <span className="text-lg font-bold text-white">
                  {userInitials}
                </span>
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-success-light rounded-full border-2 border-background-default" />
            </div>
            
            <div className="ml-3 flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">
                {user?.user_metadata?.username || 'Anonymous'}
              </p>
              <div className="flex items-center gap-2">
                <Crown className="h-3 w-3 text-primary" />
                <p className="text-xs text-primary font-medium">{userLevel}</p>
              </div>
            </div>
            
            <div className="text-right">
              <p className="text-xs text-gray-400">Points</p>
              <p className="text-sm font-bold text-white">{userPoints.toLocaleString()}</p>
            </div>
          </div>
          
          {/* Quick Stats */}
          <div className="mt-3 grid grid-cols-3 gap-2">
            <div className="text-center">
              <p className="text-xs text-gray-400">Rank</p>
              <p className="text-sm font-bold text-primary">#42</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-400">Streak</p>
              <div className="flex items-center justify-center gap-1">
                <Flame className="h-3 w-3 text-orange-400" />
                <p className="text-sm font-bold text-white">7</p>
              </div>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-400">Level</p>
              <div className="flex items-center justify-center gap-1">
                <Star className="h-3 w-3 text-yellow-400" />
                <p className="text-sm font-bold text-white">15</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Sidebar content */}
      <div className="flex-1 flex flex-col pt-4 pb-4 overflow-y-auto custom-scrollbar">
        <nav className="flex-1 px-4 space-y-2">
          {/* Main section */}
          <NavSection title="Main" icon={<Home className="h-4 w-4" />}>
            <NavItem to="/dashboard" icon={<Home className="h-5 w-5" />} label="Dashboard" />
            <NavItem to="/challenges" icon={<Flag className="h-5 w-5" />} label="Challenges" badge={3} />
            <NavItem to="/labs" icon={<Flask className="h-5 w-5" />} label="Labs" isNew />
            <NavItem to="/leaderboard" icon={<Trophy className="h-5 w-5" />} label="Leaderboard" />
          </NavSection>
          
          {/* Operations section */}
          <NavSection title="Live Operations" icon={<Monitor className="h-4 w-4" />}>
            <NavItem to="/operations" icon={<Monitor className="h-5 w-5 text-primary" />} label="Operations" isNew />
            <NavItem to="/red-team" icon={<Sword className="h-5 w-5 text-primary" />} label="Red Team" />
            <NavItem to="/blue-team" icon={<ShieldAlert className="h-5 w-5 text-accent-blue" />} label="Blue Team" />
          </NavSection>
          
          {/* Creator Zone section */}
          <NavSection title="Creator Zone" icon={<Plus className="h-4 w-4" />}>
            <NavItem to="/creator/create" icon={<Plus className="h-5 w-5" />} label="Create Challenge" />
            <NavItem to="/creator/manage" icon={<FolderCheck className="h-5 w-5" />} label="My Challenges" />
          </NavSection>
        </nav>
      </div>
      
      {/* Bottom Actions */}
      <div className="p-4 border-t border-background-light/30 bg-background-light/10">
        <div className="space-y-2">
          {/* Notifications */}
          <div className="relative">
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="w-full flex items-center px-4 py-3 text-sm text-gray-300 hover:text-white hover:bg-background-light/50 rounded-xl transition-all duration-200 group"
            >
              <div className="relative">
                <Bell className="h-5 w-5" />
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full animate-pulse" />
              </div>
              <span className="ml-3 font-medium">Notifications</span>
              <span className="ml-auto bg-primary text-white text-xs rounded-full px-2 py-1">3</span>
            </button>
            
            {/* Notification Dropdown */}
            <AnimatePresence>
              {showNotifications && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="absolute bottom-full left-0 right-0 mb-2 bg-background-default border border-background-light rounded-xl shadow-xl overflow-hidden"
                >
                  <div className="p-3 border-b border-background-light">
                    <h4 className="text-sm font-semibold text-white">Recent Notifications</h4>
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    <div className="p-3 hover:bg-background-light/50 transition-colors">
                      <p className="text-sm text-gray-300">New challenge available!</p>
                      <p className="text-xs text-gray-500 mt-1">2 minutes ago</p>
                    </div>
                    <div className="p-3 hover:bg-background-light/50 transition-colors">
                      <p className="text-sm text-gray-300">You earned a new badge!</p>
                      <p className="text-xs text-gray-500 mt-1">1 hour ago</p>
                    </div>
                    <div className="p-3 hover:bg-background-light/50 transition-colors">
                      <p className="text-sm text-gray-300">Operation invitation received</p>
                      <p className="text-xs text-gray-500 mt-1">3 hours ago</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Profile & Settings */}
          <NavLink 
            to="/profile"
            className={({ isActive }) => 
              `w-full flex items-center px-4 py-3 text-sm rounded-xl transition-all duration-200 group ${
                isActive 
                  ? 'bg-gradient-to-r from-primary/20 to-primary/10 text-primary border-l-4 border-primary shadow-lg' 
                  : 'text-gray-300 hover:text-white hover:bg-background-light/50'
              }`
            }
          >
            <User className="h-5 w-5" />
            <span className="ml-3 font-medium">Profile & Settings</span>
            <Settings className="ml-auto h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
          </NavLink>
          
          {/* Sign Out */}
          <button 
            onClick={handleSignOut}
            className="w-full flex items-center px-4 py-3 text-sm text-gray-300 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all duration-200 group"
          >
            <LogOut className="h-5 w-5" />
            <span className="ml-3 font-medium">Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;