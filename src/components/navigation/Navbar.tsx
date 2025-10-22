import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Menu, ChevronDown, LogOut, Settings, User,
  Trophy, BookOpen, Award, FlaskRound as Flask, Flag, Monitor,
  Plus, FolderCheck, Target, Shield, Sparkles, Crown, Star
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../hooks/useAuth';
import ConnectWallet from '../onchain/ConnectWallet';

interface NavbarProps {
  onMenuClick: () => void;
}

interface DropdownItem {
  label: string;
  icon: React.ElementType;
  url: string;
  description: string;
  color: string;
}

const Navbar = ({ onMenuClick }: NavbarProps) => {
  const { signOut, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showLearnMenu, setShowLearnMenu] = useState(false);
  const [showOperationsMenu, setShowOperationsMenu] = useState(false);
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.dropdown-container')) {
        setShowUserMenu(false);
        setShowLearnMenu(false);
        setShowOperationsMenu(false);
        setShowCreateMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    await signOut();
  };

  const userInitials = user?.user_metadata?.username 
    ? user.user_metadata.username.slice(0, 2).toUpperCase() 
    : 'US';

  // Dropdown menu items
  const learnItems: DropdownItem[] = [
    {
      label: 'Challenges',
      icon: Flag,
      url: '/challenges',
      description: 'Interactive cybersecurity challenges',
      color: 'red'
    },
    {
      label: 'Labs',
      icon: Flask,
      url: '/labs',
      description: 'Hands-on practice environments',
      color: 'purple'
    }
  ];

  const operationsItems: DropdownItem[] = [
    {
      label: 'Red Team',
      icon: Target,
      url: '/red-team',
      description: 'Offensive security operations',
      color: 'red'
    },
    {
      label: 'Blue Team',
      icon: Shield,
      url: '/blue-team',
      description: 'Defensive security operations',
      color: 'blue'
    }
  ];

  const createItems: DropdownItem[] = [
    {
      label: 'Create Challenge',
      icon: Plus,
      url: '/creator/create',
      description: 'Design new cybersecurity challenges',
      color: 'green'
    },
    {
      label: 'Manage Challenges',
      icon: FolderCheck,
      url: '/creator/manage',
      description: 'Manage your existing challenges',
      color: 'orange'
    }
  ];

  const DropdownMenu = ({ 
    items, 
    isOpen, 
    onClose 
  }: { 
    items: DropdownItem[], 
    isOpen: boolean, 
    onClose: () => void 
  }) => (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="absolute top-full left-0 mt-2 w-80 border border-red-500/20 rounded-xl shadow-xl overflow-hidden"
          style={{ backgroundColor: '#0A030F' }}
        >
          <div className="p-2">
            {items.map((item, index) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Link
                  to={item.url}
                  className={`flex items-center gap-4 p-4 rounded-lg hover:bg-${item.color}-500/10 transition-all duration-200 group border border-transparent hover:border-${item.color}-500/30`}
                  onClick={onClose}
                >
                  <div className={`w-12 h-12 rounded-xl bg-${item.color}-500/20 flex items-center justify-center group-hover:scale-110 transition-transform`}>
                    <item.icon className={`h-6 w-6 text-${item.color}-400`} />
                  </div>
                  <div className="flex-1">
                    <h3 className={`text-white font-semibold mb-1 group-hover:text-${item.color}-400 transition-colors`}>
                      {item.label}
                    </h3>
                    <p className="text-gray-400 text-sm">
                      {item.description}
                    </p>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 backdrop-blur-xl border-b 
        ${scrollY > 4 ? 'bg-[#09030F]/85 border-red-500/30 shadow-[0_4px_24px_-6px_rgba(0,0,0,0.6)]' : 'bg-[#0A030F]/70 border-red-500/10'}
      `}
    >
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-[68px] gap-6">
          {/* Left Cluster */}
          <div className="flex items-center gap-4">
            <button
              type="button"
              className="inline-flex lg:hidden items-center justify-center p-2 rounded-lg text-gray-400 hover:text-white hover:bg-slate-800/50 transition-colors"
              onClick={onMenuClick}
            >
              <Menu className="h-6 w-6" />
            </button>
            <button
              onClick={() => navigate('/')}
              className="group relative flex items-center justify-center h-10 w-10 rounded-lg bg-red-600/10 border border-red-500/30 hover:border-red-400/50 hover:bg-red-600/20 transition-colors"
              aria-label="Home"
            >
              <Sparkles className="h-5 w-5 text-red-400 group-hover:rotate-12 transition-transform" />
            </button>
            <div className="hidden xl:flex items-center gap-2 text-[11px] px-2.5 py-1 rounded-full bg-red-600/10 border border-red-500/30 text-red-300 uppercase tracking-wide">
              <Crown className="h-3.5 w-3.5" /> Beta Access
            </div>
          </div>

          {/* Center Navigation */}
          <div className="hidden md:flex items-center space-x-2 xl:space-x-4">
            {/* Learn Dropdown */}
            <div className="relative dropdown-container">
              <button
                type="button"
                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all text-sm font-medium 
                  ${showLearnMenu || location.pathname.startsWith('/challenge') ? 'bg-red-600/20 text-red-300' : 'text-gray-300 hover:text-white hover:bg-slate-800/50'}
                `}
                onClick={() => {
                  setShowLearnMenu(!showLearnMenu);
                  setShowOperationsMenu(false);
                  setShowCreateMenu(false);
                }}
              >
                <BookOpen className="h-5 w-5" />
                <span className="font-medium">Learn</span>
                <ChevronDown className={`h-4 w-4 transition-transform ${showLearnMenu ? 'rotate-180' : ''}`} />
              </button>
              
              <DropdownMenu 
                items={learnItems} 
                isOpen={showLearnMenu} 
                onClose={() => setShowLearnMenu(false)} 
              />
            </div>

            {/* Operations Dropdown */}
            <div className="relative dropdown-container">
              <button
                type="button"
                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all text-sm font-medium 
                  ${showOperationsMenu || location.pathname.startsWith('/red') || location.pathname.startsWith('/blue') ? 'bg-red-600/20 text-red-300' : 'text-gray-300 hover:text-white hover:bg-slate-800/50'}
                `}
                onClick={() => {
                  setShowOperationsMenu(!showOperationsMenu);
                  setShowLearnMenu(false);
                  setShowCreateMenu(false);
                }}
              >
                <Monitor className="h-5 w-5" />
                <span className="font-medium">Operations</span>
                <ChevronDown className={`h-4 w-4 transition-transform ${showOperationsMenu ? 'rotate-180' : ''}`} />
              </button>
              
              <DropdownMenu 
                items={operationsItems} 
                isOpen={showOperationsMenu} 
                onClose={() => setShowOperationsMenu(false)} 
              />
            </div>

            {/* Create Dropdown */}
            <div className="relative dropdown-container">
              <button
                type="button"
                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all text-sm font-medium 
                  ${showCreateMenu || location.pathname.startsWith('/creator') ? 'bg-red-600/20 text-red-300' : 'text-gray-300 hover:text-white hover:bg-slate-800/50'}
                `}
                onClick={() => {
                  setShowCreateMenu(!showCreateMenu);
                  setShowLearnMenu(false);
                  setShowOperationsMenu(false);
                }}
              >
                <Plus className="h-5 w-5" />
                <span className="font-medium">Create</span>
                <ChevronDown className={`h-4 w-4 transition-transform ${showCreateMenu ? 'rotate-180' : ''}`} />
              </button>
              
              <DropdownMenu 
                items={createItems} 
                isOpen={showCreateMenu} 
                onClose={() => setShowCreateMenu(false)} 
              />
            </div>

            {/* Direct Links */}
            <Link
              to="/leaderboard"
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all text-sm font-medium 
                ${location.pathname.startsWith('/leaderboard') ? 'bg-red-600/20 text-red-300' : 'text-gray-300 hover:text-white hover:bg-slate-800/50'}
              `}
            >
              <Trophy className="h-5 w-5" />
              <span className="font-medium">Leaderboard</span>
            </Link>
          </div>
          
          {/* Right Cluster */}
          <div className="flex items-center gap-3">
            {/* Onchain Wallet Connect */}
            <div className="hidden md:block">
              <ConnectWallet />
            </div>
            <Link
              to="/billing"
              className="hidden md:inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold tracking-wide bg-gradient-to-r from-red-600 via-rose-600 to-fuchsia-600 text-white shadow shadow-red-800/40 hover:brightness-110 transition-all"
            >
              <Star className="h-4 w-4" /> Upgrade
            </Link>
            {/* User Menu */}
            <div className="relative dropdown-container">
              <button
                type="button"
                className="flex items-center space-x-3 text-gray-400 hover:text-white focus:outline-none group px-2 py-1.5 rounded-xl hover:bg-slate-800/40 transition-colors"
                onClick={() => setShowUserMenu(!showUserMenu)}
              >
                <div className="relative">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-red-600 to-fuchsia-600 flex items-center justify-center text-white font-bold shadow-lg group-hover:shadow-xl transition-all duration-200">
                    {userInitials}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-slate-900"></div>
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-medium text-white">
                    {user?.user_metadata?.username || 'Anonymous'}
                  </p>
                  <p className="text-[11px] text-gray-400">Cyber Ops</p>
                </div>
                <ChevronDown className="h-4 w-4 group-hover:text-red-400 transition-colors" />
              </button>
              
              <AnimatePresence>
                {showUserMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="absolute top-full right-0 mt-2 w-72 border border-red-500/30 rounded-2xl shadow-xl overflow-hidden backdrop-blur-xl"
                    style={{ backgroundColor: '#0A030F' }}
                  >
                    {/* User Info Header */}
                    <div className="p-4 bg-gradient-to-r from-red-600/20 to-fuchsia-600/10 border-b border-red-500/30">
                      <div className="flex items-center space-x-3">
                        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-red-600 to-fuchsia-600 flex items-center justify-center text-white font-bold">
                          {userInitials}
                        </div>
                        <div>
                          <p className="font-semibold text-white">
                            {user?.user_metadata?.username || 'Anonymous'}
                          </p>
                          <p className="text-xs text-red-300">Active User</p>
                          <p className="text-[11px] text-gray-400">{user?.email}</p>
                        </div>
                      </div>
                    </div>

                    {/* Menu Items */}
                    <div className="p-2">
                      <Link
                        to="/profile"
                        className="flex items-center px-3 py-2 text-sm text-gray-300 hover:bg-red-600/10 hover:text-white rounded-lg transition-colors"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <User className="h-5 w-5 mr-3" />
                        Profile & Account
                      </Link>
                      
                      <Link
                        to="/leaderboard"
                        className="flex items-center px-3 py-2 text-sm text-gray-300 hover:bg-red-600/10 hover:text-white rounded-lg transition-colors"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <Trophy className="h-5 w-5 mr-3" />
                        Leaderboard & Stats
                      </Link>
                      
                      <Link
                        to="/profile?tab=achievements"
                        className="flex items-center px-3 py-2 text-sm text-gray-300 hover:bg-red-600/10 hover:text-white rounded-lg transition-colors"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <Award className="h-5 w-5 mr-3" />
                        Achievements
                      </Link>

                      <Link
                        to="/certs/mine"
                        className="flex items-center px-3 py-2 text-sm text-gray-300 hover:bg-red-600/10 hover:text-white rounded-lg transition-colors"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <Award className="h-5 w-5 mr-3" />
                        My Certificates (Onchain)
                      </Link>
                      
                      <Link
                        to="/profile?tab=settings"
                        className="flex items-center px-3 py-2 text-sm text-gray-300 hover:bg-red-600/10 hover:text-white rounded-lg transition-colors"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <Settings className="h-5 w-5 mr-3" />
                        Settings
                      </Link>
                      
                      <div className="border-t border-red-500/20 my-2"></div>
                      
                      <button
                        onClick={handleSignOut}
                        className="flex w-full items-center px-3 py-2 text-sm text-gray-300 hover:bg-red-600/10 hover:text-red-300 rounded-lg transition-colors"
                      >
                        <LogOut className="h-5 w-5 mr-3" />
                        Sign Out
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;