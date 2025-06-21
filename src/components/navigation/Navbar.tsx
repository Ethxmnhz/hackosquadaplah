import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Menu, Bell, ChevronDown, LogOut, Settings, User, Search,
  Trophy, Flame, Zap, Shield, Target, Crown, Star, Globe,
  Users, Calendar, Award, Activity, TrendingUp,
  X, Filter, Clock, CheckCircle, AlertTriangle, Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';

interface NavbarProps {
  onMenuClick: () => void;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'warning' | 'info' | 'error';
  timestamp: string;
  read: boolean;
  action?: {
    label: string;
    url: string;
  };
}

interface QuickAction {
  id: string;
  label: string;
  icon: React.ElementType;
  url: string;
  color: string;
  description: string;
}

const Navbar = ({ onMenuClick }: NavbarProps) => {
  const { signOut, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [userStats, setUserStats] = useState({
    points: 0,
    rank: 'Novice',
    streak: 0,
    level: 1
  });

  const quickActions: QuickAction[] = [
    {
      id: 'new-challenge',
      label: 'Start Challenge',
      icon: Target,
      url: '/challenges',
      color: 'text-primary',
      description: 'Begin a new cybersecurity challenge'
    },
    {
      id: 'join-lab',
      label: 'Join Lab',
      icon: Shield,
      url: '/labs',
      color: 'text-accent-blue',
      description: 'Access hands-on lab environments'
    },
    {
      id: 'leaderboard',
      label: 'Leaderboard',
      icon: Trophy,
      url: '/leaderboard',
      color: 'text-yellow-400',
      description: 'Check your ranking'
    },
    {
      id: 'operations',
      label: 'Operations',
      icon: Activity,
      url: '/operations',
      color: 'text-accent-green',
      description: 'Join live operations'
    }
  ];

  useEffect(() => {
    loadUserStats();
    loadNotifications();
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.dropdown-container')) {
        setShowUserMenu(false);
        setShowNotifications(false);
        setShowQuickActions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadUserStats = async () => {
    if (!user) return;

    try {
      // Get user points
      const { data: pointsData } = await supabase
        .from('user_points')
        .select('points')
        .eq('user_id', user.id);

      const totalPoints = pointsData?.reduce((sum, p) => sum + p.points, 0) || 0;

      // Determine rank based on points
      let rank = 'Novice';
      if (totalPoints >= 2500) rank = 'Legendary';
      else if (totalPoints >= 1500) rank = 'Elite';
      else if (totalPoints >= 1000) rank = 'Expert';
      else if (totalPoints >= 500) rank = 'Advanced';
      else if (totalPoints >= 250) rank = 'Intermediate';
      else if (totalPoints >= 100) rank = 'Beginner';

      setUserStats({
        points: totalPoints,
        rank,
        streak: 7, // This would come from actual streak calculation
        level: Math.floor(totalPoints / 100) + 1
      });
    } catch (error) {
      console.error('Error loading user stats:', error);
    }
  };

  const loadNotifications = () => {
    // Mock notifications - in real app, these would come from database
    const mockNotifications: Notification[] = [
      {
        id: '1',
        title: 'New Challenge Available!',
        message: 'A new web exploitation challenge has been released.',
        type: 'info',
        timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        read: false,
        action: { label: 'View Challenge', url: '/challenges' }
      },
      {
        id: '2',
        title: 'Badge Earned!',
        message: 'You earned the "Web Warrior" badge for completing 5 web challenges.',
        type: 'success',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        read: false,
        action: { label: 'View Badges', url: '/leaderboard?tab=badges' }
      },
      {
        id: '3',
        title: 'Operation Invitation',
        message: 'You have been invited to join a red team operation.',
        type: 'info',
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        read: true,
        action: { label: 'View Operations', url: '/operations' }
      },
      {
        id: '4',
        title: 'Streak Milestone!',
        message: 'Congratulations on your 7-day learning streak!',
        type: 'success',
        timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        read: true
      }
    ];

    setNotifications(mockNotifications);
  };

  const handleSignOut = async () => {
    await signOut();
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
      setShowSearch(false);
      setSearchQuery('');
    }
  };

  const markNotificationAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === id ? { ...notif, read: true } : notif
      )
    );
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-success-light" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-warning-light" />;
      case 'error':
        return <AlertTriangle className="h-5 w-5 text-error-light" />;
      default:
        return <Info className="h-5 w-5 text-accent-blue" />;
    }
  };

  const getTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const userInitials = user?.user_metadata?.username 
    ? user.user_metadata.username.slice(0, 2).toUpperCase() 
    : 'US';

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <header className="sticky top-0 z-50 bg-background-default/95 backdrop-blur-md border-b border-background-light/50">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Left Section */}
          <div className="flex items-center space-x-4">
            {/* Mobile menu button */}
            <button
              type="button"
              className="inline-flex md:hidden items-center justify-center p-2 rounded-lg text-gray-400 hover:text-white hover:bg-background-light/50 transition-all duration-200"
              onClick={onMenuClick}
            >
              <Menu className="h-6 w-6" />
            </button>
            
            {/* Brand Text - Only show on mobile when sidebar is closed */}
            <div className="md:hidden flex items-center">
              <span className="text-xl font-bold text-white">
                <span className="text-primary">Hacko</span>Squad
              </span>
            </div>

            {/* Quick Actions - Desktop */}
            <div className="hidden lg:flex items-center space-x-2 ml-8">
              <div className="relative dropdown-container">
                <button
                  onClick={() => setShowQuickActions(!showQuickActions)}
                  className="flex items-center px-3 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-background-light/50 transition-all duration-200"
                >
                  <Zap className="h-5 w-5 mr-2" />
                  <span className="text-sm font-medium">Quick Actions</span>
                  <ChevronDown className="h-4 w-4 ml-1" />
                </button>

                <AnimatePresence>
                  {showQuickActions && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className="absolute top-full left-0 mt-2 w-80 bg-background-default border border-background-light rounded-xl shadow-xl overflow-hidden"
                    >
                      <div className="p-3 border-b border-background-light">
                        <h3 className="text-sm font-semibold text-white">Quick Actions</h3>
                      </div>
                      <div className="p-2">
                        {quickActions.map((action) => (
                          <Link
                            key={action.id}
                            to={action.url}
                            onClick={() => setShowQuickActions(false)}
                            className="flex items-center p-3 rounded-lg hover:bg-background-light/50 transition-colors group"
                          >
                            <div className={`p-2 rounded-lg bg-background-light group-hover:bg-background-light/80 ${action.color}`}>
                              <action.icon className="h-5 w-5" />
                            </div>
                            <div className="ml-3 flex-1">
                              <p className="text-sm font-medium text-white">{action.label}</p>
                              <p className="text-xs text-gray-400">{action.description}</p>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Center Section - Search */}
          <div className="hidden md:flex flex-1 max-w-lg mx-8">
            <div className="relative w-full">
              <form onSubmit={handleSearch} className="w-full">
                <input
                  type="text"
                  placeholder="Search challenges, labs, users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-background-light/50 border border-background-light rounded-xl py-2 pl-10 pr-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all duration-200"
                />
                <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-500" />
              </form>
            </div>
          </div>
          
          {/* Right Section */}
          <div className="flex items-center space-x-3">
            {/* Mobile Search */}
            <button
              onClick={() => setShowSearch(!showSearch)}
              className="md:hidden p-2 text-gray-400 hover:text-white rounded-lg hover:bg-background-light/50 transition-all duration-200"
            >
              <Search className="h-5 w-5" />
            </button>

            {/* User Stats - Desktop */}
            <div className="hidden lg:flex items-center space-x-4 px-4 py-2 bg-background-light/30 rounded-xl">
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-1">
                  <Star className="h-4 w-4 text-yellow-400" />
                  <span className="text-sm font-medium text-white">{userStats.points}</span>
                </div>
                <div className="w-px h-4 bg-background-light"></div>
                <div className="flex items-center space-x-1">
                  <Flame className="h-4 w-4 text-orange-400" />
                  <span className="text-sm font-medium text-white">{userStats.streak}</span>
                </div>
                <div className="w-px h-4 bg-background-light"></div>
                <div className="flex items-center space-x-1">
                  <Crown className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-primary">{userStats.rank}</span>
                </div>
              </div>
            </div>

            {/* Notifications */}
            <div className="relative dropdown-container">
              <button
                type="button"
                className="relative p-2 text-gray-400 hover:text-white rounded-lg hover:bg-background-light/50 transition-all duration-200"
                onClick={() => setShowNotifications(!showNotifications)}
              >
                <Bell className="h-6 w-6" />
                {unreadCount > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-white"
                  >
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </motion.span>
                )}
              </button>
              
              <AnimatePresence>
                {showNotifications && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="absolute top-full right-0 mt-2 w-96 bg-background-default border border-background-light rounded-xl shadow-xl overflow-hidden"
                  >
                    <div className="p-4 border-b border-background-light">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-white">Notifications</h3>
                        {unreadCount > 0 && (
                          <span className="px-2 py-1 bg-primary/20 text-primary text-xs rounded-full">
                            {unreadCount} new
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="max-h-80 overflow-y-auto custom-scrollbar">
                      {notifications.length === 0 ? (
                        <div className="p-6 text-center">
                          <Bell className="h-12 w-12 text-gray-500 mx-auto mb-3" />
                          <p className="text-gray-400">No notifications yet</p>
                        </div>
                      ) : (
                        notifications.map((notification) => (
                          <motion.div
                            key={notification.id}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className={`p-4 border-b border-background-light/50 hover:bg-background-light/30 transition-colors cursor-pointer ${
                              !notification.read ? 'bg-primary/5 border-l-4 border-l-primary' : ''
                            }`}
                            onClick={() => markNotificationAsRead(notification.id)}
                          >
                            <div className="flex items-start space-x-3">
                              <div className="flex-shrink-0 mt-1">
                                {getNotificationIcon(notification.type)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <p className="text-sm font-medium text-white truncate">
                                    {notification.title}
                                  </p>
                                  <span className="text-xs text-gray-500 ml-2">
                                    {getTimeAgo(notification.timestamp)}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-400 mt-1">
                                  {notification.message}
                                </p>
                                {notification.action && (
                                  <Link
                                    to={notification.action.url}
                                    className="inline-flex items-center mt-2 text-xs text-primary hover:text-primary-light"
                                    onClick={() => setShowNotifications(false)}
                                  >
                                    {notification.action.label}
                                  </Link>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        ))
                      )}
                    </div>
                    
                    <div className="p-3 border-t border-background-light bg-background-light/20">
                      <Link
                        to="/notifications"
                        className="text-sm text-primary hover:text-primary-light font-medium"
                        onClick={() => setShowNotifications(false)}
                      >
                        View all notifications
                      </Link>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            {/* User Menu */}
            <div className="relative dropdown-container">
              <button
                type="button"
                className="flex items-center space-x-3 text-gray-400 hover:text-white focus:outline-none group"
                onClick={() => setShowUserMenu(!showUserMenu)}
              >
                <div className="relative">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-white font-bold shadow-lg group-hover:shadow-xl transition-all duration-200">
                    {userInitials}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-success-light rounded-full border-2 border-background-default"></div>
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-medium text-white">
                    {user?.user_metadata?.username || 'Anonymous'}
                  </p>
                  <p className="text-xs text-gray-400">{userStats.rank}</p>
                </div>
                <ChevronDown className="h-4 w-4 group-hover:text-primary transition-colors" />
              </button>
              
              <AnimatePresence>
                {showUserMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="absolute top-full right-0 mt-2 w-72 bg-background-default border border-background-light rounded-xl shadow-xl overflow-hidden"
                  >
                    {/* User Info Header */}
                    <div className="p-4 bg-gradient-to-r from-primary/10 to-primary/5 border-b border-background-light">
                      <div className="flex items-center space-x-3">
                        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-white font-bold">
                          {userInitials}
                        </div>
                        <div>
                          <p className="font-semibold text-white">
                            {user?.user_metadata?.username || 'Anonymous'}
                          </p>
                          <p className="text-sm text-primary">{userStats.rank}</p>
                          <p className="text-xs text-gray-400">{user?.email}</p>
                        </div>
                      </div>
                      
                      {/* Quick Stats */}
                      <div className="grid grid-cols-3 gap-3 mt-4">
                        <div className="text-center">
                          <div className="text-lg font-bold text-white">{userStats.points}</div>
                          <div className="text-xs text-gray-400">Points</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-white">{userStats.level}</div>
                          <div className="text-xs text-gray-400">Level</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-white">{userStats.streak}</div>
                          <div className="text-xs text-gray-400">Streak</div>
                        </div>
                      </div>
                    </div>

                    {/* Menu Items */}
                    <div className="p-2">
                      <Link
                        to="/profile"
                        className="flex items-center px-3 py-2 text-sm text-gray-300 hover:bg-background-light/50 hover:text-white rounded-lg transition-colors"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <User className="h-5 w-5 mr-3" />
                        Profile & Account
                      </Link>
                      
                      <Link
                        to="/leaderboard"
                        className="flex items-center px-3 py-2 text-sm text-gray-300 hover:bg-background-light/50 hover:text-white rounded-lg transition-colors"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <Trophy className="h-5 w-5 mr-3" />
                        Leaderboard & Stats
                      </Link>
                      
                      <Link
                        to="/profile?tab=achievements"
                        className="flex items-center px-3 py-2 text-sm text-gray-300 hover:bg-background-light/50 hover:text-white rounded-lg transition-colors"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <Award className="h-5 w-5 mr-3" />
                        Achievements
                      </Link>
                      
                      <Link
                        to="/profile?tab=settings"
                        className="flex items-center px-3 py-2 text-sm text-gray-300 hover:bg-background-light/50 hover:text-white rounded-lg transition-colors"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <Settings className="h-5 w-5 mr-3" />
                        Settings
                      </Link>
                      
                      <div className="border-t border-background-light my-2"></div>
                      
                      <button
                        onClick={handleSignOut}
                        className="flex w-full items-center px-3 py-2 text-sm text-gray-300 hover:bg-red-500/10 hover:text-red-400 rounded-lg transition-colors"
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

      {/* Mobile Search Overlay */}
      <AnimatePresence>
        {showSearch && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden border-t border-background-light bg-background-light/50 backdrop-blur-sm"
          >
            <div className="p-4">
              <form onSubmit={handleSearch} className="relative">
                <input
                  type="text"
                  placeholder="Search challenges, labs, users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-background-light border border-background-default rounded-lg py-2 pl-10 pr-10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  autoFocus
                />
                <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-500" />
                <button
                  type="button"
                  onClick={() => setShowSearch(false)}
                  className="absolute right-3 top-2.5 text-gray-500 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Navbar;