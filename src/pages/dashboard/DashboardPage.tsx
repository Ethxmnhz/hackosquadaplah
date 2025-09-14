import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import Card from '../../components/ui/Card';
import { 
  Trophy, Users, Clock, Flag, Flame, Activity, 
  Shield, Target, Zap, Crown, Calendar, Award, Globe,
  Lock, Code, ChevronRight, Monitor, AlertTriangle,
  CheckCircle, RefreshCw, FlaskRound as Flask,
  Fingerprint, Wifi, BookOpen, TrendingUp, Star, Play,
  MoreHorizontal, ArrowRight, Sparkles, Rocket, 
  Brain, Swords, Eye, Settings, Bell
} from 'lucide-react';

interface UserStats {
  total_points: number;
  challenges_completed: number;
  labs_completed: number;
  rank_position: number;
  rank_title: string;
  streak_days: number;
  badges_earned: number;
}

interface CurrentLearning {
  id: string;
  type: 'challenge' | 'lab';
  title: string;
  description: string;
  difficulty: string;
  progress: number;
  image_url?: string;
  category: string;
  points: number;
  estimated_time: number;
}

interface LeaderboardEntry {
  id: string;
  username: string;
  total_points: number;
  rank_position: number;
  rank_title: string;
}

interface FeaturedContent {
  id: string;
  type: 'challenge' | 'lab';
  title: string;
  description: string;
  difficulty: string;
  image_url?: string;
  category: string;
  points: number;
  estimated_time: number;
  is_new: boolean;
  created_at: string;
}

const DashboardPage = () => {
  const { user } = useAuth();
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [currentLearning, setCurrentLearning] = useState<CurrentLearning[]>([]);
  const [featuredContent, setFeaturedContent] = useState<FeaturedContent[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const username = user?.user_metadata?.username || user?.email?.split('@')[0] || 'Hacker';

  useEffect(() => {
    loadDashboardData();
  }, [user]);

  const loadDashboardData = async (silent = false) => {
    if (!silent) setLoading(true);
    
    try {
      await Promise.all([
        loadUserStats(),
        loadCurrentLearning(),
        loadFeaturedContent(),
        loadLeaderboard()
      ]);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const loadUserStats = async () => {
    if (!user) return;

    try {
      // Get user points
      const { data: pointsData } = await supabase
        .from('user_points')
        .select('points')
        .eq('user_id', user.id);

      const totalPoints = pointsData?.reduce((sum, p) => sum + p.points, 0) || 0;

      // Get challenges completed
      const { count: challengesCount } = await supabase
        .from('challenge_completions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      // Get labs completed
      const { count: labsCount } = await supabase
        .from('lab_completions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      // Get badges count
      const { count: badgesCount } = await supabase
        .from('user_badges')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      // Determine rank title
      let rankTitle = 'Novice';
      if (totalPoints >= 2500) rankTitle = 'Legendary';
      else if (totalPoints >= 1500) rankTitle = 'Elite';
      else if (totalPoints >= 1000) rankTitle = 'Expert';
      else if (totalPoints >= 500) rankTitle = 'Advanced';
      else if (totalPoints >= 250) rankTitle = 'Intermediate';
      else if (totalPoints >= 100) rankTitle = 'Beginner';

      // Get rank position
      const { data: leaderboardData } = await supabase
        .from('leaderboard_entries')
        .select('user_id')
        .order('total_points', { ascending: false });

      const userRank = leaderboardData?.findIndex(entry => entry.user_id === user.id) || 0;
      const rankPosition = userRank >= 0 ? userRank + 1 : 999;

      // Calculate streak days (simplified)
      const streakDays = Math.floor(totalPoints / 50) % 30 || 1;

      setUserStats({
        total_points: totalPoints,
        challenges_completed: challengesCount || 0,
        labs_completed: labsCount || 0,
        rank_position: rankPosition,
        rank_title: rankTitle,
        streak_days: streakDays,
        badges_earned: badgesCount || 0
      });
    } catch (error) {
      console.error('Error loading user stats:', error);
    }
  };

  const loadCurrentLearning = async () => {
    if (!user) return;

    try {
      const learningItems: CurrentLearning[] = [];

      // Get challenges that user has started but not completed
      const { data: userPoints } = await supabase
        .from('user_points')
        .select('source_id, source_type')
        .eq('user_id', user.id)
        .eq('source_type', 'challenge');

      const { data: completedChallenges } = await supabase
        .from('challenge_completions')
        .select('challenge_id')
        .eq('user_id', user.id);

      const completedChallengeIds = new Set(completedChallenges?.map(c => c.challenge_id) || []);
      const startedChallengeIds = new Set(userPoints?.map(p => p.source_id) || []);

      // Find challenges that are started but not completed
      const inProgressChallengeIds = Array.from(startedChallengeIds).filter(id => 
        !completedChallengeIds.has(id)
      );

      if (inProgressChallengeIds.length > 0) {
        const { data: challenges } = await supabase
          .from('challenges')
          .select('id, title, description, difficulty, points, challenge_type, icon_url, estimated_time')
          .in('id', inProgressChallengeIds)
          .eq('status', 'approved')
          .limit(3);

        challenges?.forEach(challenge => {
          learningItems.push({
            id: challenge.id,
            type: 'challenge',
            title: challenge.title,
            description: challenge.description || '',
            difficulty: challenge.difficulty,
            progress: 50, // Assume 50% progress for started challenges
            image_url: challenge.icon_url,
            category: challenge.challenge_type,
            points: challenge.points,
            estimated_time: challenge.estimated_time || 30
          });
        });
      }

      // Get labs that user has started but not completed
      const { data: labPoints } = await supabase
        .from('user_points')
        .select('source_id, source_type')
        .eq('user_id', user.id)
        .eq('source_type', 'lab');

      const { data: completedLabs } = await supabase
        .from('lab_completions')
        .select('lab_id')
        .eq('user_id', user.id);

      const completedLabIds = new Set(completedLabs?.map(l => l.lab_id) || []);
      const startedLabIds = new Set(labPoints?.map(p => p.source_id) || []);

      const inProgressLabIds = Array.from(startedLabIds).filter(id => 
        !completedLabIds.has(id)
      );

      if (inProgressLabIds.length > 0) {
        const { data: labs } = await supabase
          .from('labs')
          .select('id, title, description, difficulty, points, category, thumbnail_url, estimated_time')
          .in('id', inProgressLabIds)
          .eq('status', 'published')
          .limit(3);

        labs?.forEach(lab => {
          learningItems.push({
            id: lab.id,
            type: 'lab',
            title: lab.title,
            description: lab.description || '',
            difficulty: lab.difficulty,
            progress: 30, // Assume 30% progress for started labs
            image_url: lab.thumbnail_url,
            category: lab.category,
            points: lab.points,
            estimated_time: lab.estimated_time || 60
          });
        });
      }

      // If no in-progress items, get some recommended challenges
      if (learningItems.length === 0) {
        const { data: recommendedChallenges } = await supabase
          .from('challenges')
          .select('id, title, description, difficulty, points, challenge_type, icon_url, estimated_time')
          .eq('status', 'approved')
          .order('created_at', { ascending: false })
          .limit(3);

        recommendedChallenges?.forEach(challenge => {
          learningItems.push({
            id: challenge.id,
            type: 'challenge',
            title: challenge.title,
            description: challenge.description || '',
            difficulty: challenge.difficulty,
            progress: 0,
            image_url: challenge.icon_url,
            category: challenge.challenge_type,
            points: challenge.points,
            estimated_time: challenge.estimated_time || 30
          });
        });
      }

      setCurrentLearning(learningItems.slice(0, 3));
    } catch (error) {
      console.error('Error loading current learning:', error);
    }
  };

  const loadFeaturedContent = async () => {
    try {
      const featuredItems: FeaturedContent[] = [];

      // Get recent challenges (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: recentChallenges } = await supabase
        .from('challenges')
        .select('id, title, description, difficulty, points, challenge_type, icon_url, estimated_time, created_at')
        .eq('status', 'approved')
        .gte('created_at', sevenDaysAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(3);

      recentChallenges?.forEach(challenge => {
        featuredItems.push({
          id: challenge.id,
          type: 'challenge',
          title: challenge.title,
          description: challenge.description || '',
          difficulty: challenge.difficulty,
          image_url: challenge.icon_url,
          category: challenge.challenge_type,
          points: challenge.points,
          estimated_time: challenge.estimated_time || 30,
          is_new: true,
          created_at: challenge.created_at
        });
      });

      // Get recent labs (last 7 days)
      const { data: recentLabs } = await supabase
        .from('labs')
        .select('id, title, description, difficulty, points, category, thumbnail_url, estimated_time, created_at')
        .eq('status', 'published')
        .gte('created_at', sevenDaysAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(3);

      recentLabs?.forEach(lab => {
        featuredItems.push({
          id: lab.id,
          type: 'lab',
          title: lab.title,
          description: lab.description || '',
          difficulty: lab.difficulty,
          image_url: lab.thumbnail_url,
          category: lab.category,
          points: lab.points,
          estimated_time: lab.estimated_time || 60,
          is_new: true,
          created_at: lab.created_at
        });
      });

      // If no recent content, get popular content
      if (featuredItems.length === 0) {
        const { data: popularChallenges } = await supabase
          .from('challenges')
          .select('id, title, description, difficulty, points, challenge_type, icon_url, estimated_time, created_at')
          .eq('status', 'approved')
          .order('created_at', { ascending: false })
          .limit(4);

        popularChallenges?.forEach(challenge => {
          featuredItems.push({
            id: challenge.id,
            type: 'challenge',
            title: challenge.title,
            description: challenge.description || '',
            difficulty: challenge.difficulty,
            image_url: challenge.icon_url,
            category: challenge.challenge_type,
            points: challenge.points,
            estimated_time: challenge.estimated_time || 30,
            is_new: false,
            created_at: challenge.created_at
          });
        });
      }

      // Sort by creation date and take top 6
      featuredItems.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setFeaturedContent(featuredItems.slice(0, 6));
    } catch (error) {
      console.error('Error loading featured content:', error);
    }
  };

  const loadLeaderboard = async () => {
    try {
      const { data, error } = await supabase
        .from('leaderboard_entries')
        .select('*')
        .order('total_points', { ascending: false })
        .limit(5);

      if (error) throw error;
      setLeaderboard(data || []);
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty?.toLowerCase()) {
      case 'easy': return 'text-green-400 bg-green-400/10';
      case 'medium': return 'text-yellow-400 bg-yellow-400/10';
      case 'hard': return 'text-orange-400 bg-orange-400/10';
      case 'expert': return 'text-red-400 bg-red-400/10';
      default: return 'text-gray-400 bg-gray-400/10';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category?.toLowerCase()) {
      case 'web': return Globe;
      case 'network': return Wifi;
      case 'crypto': return Lock;
      case 'forensics': return Fingerprint;
      case 'reverse': return Code;
      default: return Flag;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0A030F' }}>
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 border-4 border-red-500/30 border-t-red-500 rounded-full mx-auto mb-6"
          />
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <h2 className="text-2xl font-bold text-white mb-2">Loading HackoSquad</h2>
            <p className="text-gray-400">Preparing your cybersecurity dashboard...</p>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0A030F' }}>
      {/* Header Bar */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="border-b border-slate-800/50 bg-slate-900/20 backdrop-blur-xl"
      >
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-xl">
                  <span className="text-white font-bold text-xl">
                    {username.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-slate-900"></div>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">
                  Welcome back, <span className="text-red-400">{username}</span>
                </h1>
                <p className="text-gray-400 text-sm">Ready for your next challenge?</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="p-2 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 rounded-xl transition-all"
              >
                <Bell className="h-5 w-5 text-gray-400" />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 text-white rounded-xl transition-all"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                <span className="text-sm font-medium">{refreshing ? 'Syncing...' : 'Refresh'}</span>
              </motion.button>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Overview Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
        >
          {[
            { 
              icon: Trophy, 
              label: 'Total Points', 
              value: userStats?.total_points || 0, 
              color: 'from-red-500 to-orange-500',
              bg: 'bg-red-500/10 border-red-500/20'
            },
            { 
              icon: Crown, 
              label: 'Global Rank', 
              value: `#${userStats?.rank_position || '---'}`, 
              color: 'from-purple-500 to-pink-500',
              bg: 'bg-purple-500/10 border-purple-500/20'
            },
            { 
              icon: Flame, 
              label: 'Day Streak', 
              value: userStats?.streak_days || 0, 
              color: 'from-orange-500 to-yellow-500',
              bg: 'bg-orange-500/10 border-orange-500/20'
            },
            { 
              icon: Flag, 
              label: 'Challenges', 
              value: userStats?.challenges_completed || 0, 
              color: 'from-blue-500 to-cyan-500',
              bg: 'bg-blue-500/10 border-blue-500/20'
            }
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + index * 0.1 }}
              whileHover={{ y: -5 }}
              className={`relative overflow-hidden rounded-2xl border ${stat.bg} backdrop-blur-sm`}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg`}>
                    <stat.icon className="h-6 w-6 text-white" />
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-white">{stat.value}</p>
                    <p className="text-sm text-gray-400">{stat.label}</p>
                  </div>
                </div>
                <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: '60%' }}
                    transition={{ delay: 0.5 + index * 0.1, duration: 1 }}
                    className={`h-full bg-gradient-to-r ${stat.color}`}
                  />
                </div>
              </div>
              {/* Floating orb */}
              <div className={`absolute -top-4 -right-4 w-8 h-8 bg-gradient-to-br ${stat.color} rounded-full opacity-20 animate-pulse`} />
            </motion.div>
          ))}
        </motion.div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Learning Progress - Left Column */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="lg:col-span-2 space-y-6"
          >
            {/* My Learning Section */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-3xl backdrop-blur-xl border border-slate-700/50" />
              <div className="relative p-8">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-lg">
                      <Brain className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-white">Active Learning</h2>
                      <p className="text-gray-400">Continue your cybersecurity journey</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button className="px-4 py-2 bg-red-500/20 text-red-400 rounded-xl text-sm font-medium hover:bg-red-500/30 transition-all">
                      In Progress
                    </button>
                    <button className="px-4 py-2 text-gray-400 rounded-xl text-sm font-medium hover:text-white hover:bg-slate-700/50 transition-all">
                      Completed
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  {currentLearning.length > 0 ? (
                    currentLearning.map((item, index) => {
                      const CategoryIcon = getCategoryIcon(item.category);
                      
                      return (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.4 + index * 0.1 }}
                          whileHover={{ scale: 1.02 }}
                          className="group"
                        >
                          <div 
                            className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800/40 to-slate-900/40 border border-slate-700/30 hover:border-red-500/50 transition-all duration-300 cursor-pointer"
                            onClick={() => window.location.href = `/${item.type}s/${item.id}`}
                          >
                            <div className="flex items-center gap-6 p-6">
                              <div className="relative">
                                <div className="w-16 h-16 rounded-2xl overflow-hidden bg-gradient-to-br from-slate-700 to-slate-800 flex-shrink-0 shadow-lg">
                                  {item.image_url ? (
                                    <img 
                                      src={item.image_url} 
                                      alt={item.title}
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                        e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                      }}
                                    />
                                  ) : null}
                                  <div className={`absolute inset-0 flex items-center justify-center ${item.image_url ? 'hidden' : ''}`}>
                                    <CategoryIcon className="h-8 w-8 text-red-400" />
                                  </div>
                                </div>
                                {item.progress > 0 && (
                                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-xs font-bold text-white">
                                    {item.progress}%
                                  </div>
                                )}
                              </div>

                              <div className="flex-1">
                                <h3 className="text-lg font-bold text-white group-hover:text-red-400 transition-colors mb-2">
                                  {item.title}
                                </h3>
                                <p className="text-gray-400 text-sm mb-4 line-clamp-2">
                                  {item.description}
                                </p>
                                
                                <div className="flex items-center gap-6">
                                  <span className={`px-3 py-1 rounded-lg text-xs font-semibold ${getDifficultyColor(item.difficulty)}`}>
                                    {item.difficulty.toUpperCase()}
                                  </span>
                                  <div className="flex items-center text-gray-400 text-sm">
                                    <Clock className="h-4 w-4 mr-1" />
                                    {item.estimated_time}m
                                  </div>
                                  <div className="flex items-center text-gray-400 text-sm">
                                    <Trophy className="h-4 w-4 mr-1" />
                                    {item.points} pts
                                  </div>
                                </div>

                                {item.progress > 0 && (
                                  <div className="mt-4">
                                    <div className="w-full bg-slate-700 rounded-full h-2">
                                      <motion.div 
                                        initial={{ width: 0 }}
                                        animate={{ width: `${item.progress}%` }}
                                        transition={{ delay: 0.6 + index * 0.1, duration: 1 }}
                                        className="h-2 bg-gradient-to-r from-red-500 to-red-400 rounded-full"
                                      />
                                    </div>
                                  </div>
                                )}
                              </div>
                              
                              <ArrowRight className="h-6 w-6 text-gray-400 group-hover:text-red-400 transition-colors" />
                            </div>
                            
                            {/* Hover effect overlay */}
                            <div className="absolute inset-0 bg-gradient-to-r from-red-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                          </div>
                        </motion.div>
                      );
                    })
                  ) : (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.5 }}
                      className="text-center py-16"
                    >
                      <div className="w-20 h-20 rounded-3xl bg-slate-800/50 flex items-center justify-center mx-auto mb-6">
                        <Rocket className="h-10 w-10 text-gray-600" />
                      </div>
                      <h3 className="text-xl font-bold text-white mb-3">Ready to Launch?</h3>
                      <p className="text-gray-400 mb-8 max-w-md mx-auto">
                        Start your cybersecurity journey with our curated challenges and hands-on labs
                      </p>
                      <div className="flex gap-4 justify-center">
                        <motion.a
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          href="/challenges"
                          className="px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl font-medium transition-all shadow-lg hover:shadow-red-500/25 flex items-center"
                        >
                          <Flag className="h-5 w-5 mr-2" />
                          Explore Challenges
                        </motion.a>
                        <motion.a
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          href="/labs"
                          className="px-6 py-3 border border-purple-500/30 bg-purple-500/10 text-purple-400 rounded-xl font-medium transition-all flex items-center"
                        >
                          <Flask className="h-5 w-5 mr-2" />
                          Try Labs
                        </motion.a>
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>
            </div>

            {/* Featured Content */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 to-slate-900/50 rounded-3xl backdrop-blur-xl border border-purple-500/20" />
              <div className="relative p-8">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg">
                      <Sparkles className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-white">Trending Now</h2>
                      <p className="text-gray-400">Hot challenges from the community</p>
                    </div>
                  </div>
                  <motion.a
                    whileHover={{ scale: 1.05 }}
                    href="/challenges"
                    className="text-purple-400 hover:text-purple-300 transition-colors flex items-center text-sm font-medium"
                  >
                    View All <ChevronRight className="ml-1 h-4 w-4" />
                  </motion.a>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {featuredContent.slice(0, 4).map((item, index) => {
                    const CategoryIcon = getCategoryIcon(item.category);
                    
                    return (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 + index * 0.1 }}
                        whileHover={{ scale: 1.03 }}
                        className="group cursor-pointer"
                        onClick={() => window.location.href = `/${item.type}s/${item.id}`}
                      >
                        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800/40 to-slate-900/40 border border-slate-700/30 hover:border-purple-500/50 transition-all">
                          <div className="relative h-32 bg-gradient-to-br from-slate-700 to-slate-800 overflow-hidden">
                            {item.image_url ? (
                              <img 
                                src={item.image_url} 
                                alt={item.title}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                }}
                              />
                            ) : null}
                            <div className={`absolute inset-0 flex items-center justify-center ${item.image_url ? 'hidden' : ''}`}>
                              <CategoryIcon className="h-12 w-12 text-purple-400/70" />
                            </div>
                            
                            {item.is_new && (
                              <div className="absolute top-3 left-3">
                                <span className="px-2 py-1 bg-green-500 text-white text-xs font-bold rounded-lg shadow-lg">
                                  NEW
                                </span>
                              </div>
                            )}
                            
                            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                          </div>

                          <div className="p-4">
                            <h3 className="text-base font-bold text-white group-hover:text-purple-400 transition-colors mb-2 line-clamp-2">
                              {item.title}
                            </h3>
                            
                            <div className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-3">
                                <div className="flex items-center text-gray-400">
                                  <Clock className="h-3 w-3 mr-1" />
                                  {item.estimated_time}m
                                </div>
                                <div className="flex items-center text-gray-400">
                                  <Trophy className="h-3 w-3 mr-1" />
                                  {item.points}
                                </div>
                              </div>
                              <span className={`px-2 py-1 rounded text-xs font-medium ${getDifficultyColor(item.difficulty)}`}>
                                {item.difficulty.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          </div>
                          
                          {/* Hover glow effect */}
                          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right Sidebar */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="space-y-6"
          >
            {/* Live Battle Arena */}
            <div className="relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-red-900/30 via-slate-900/50 to-blue-900/30 rounded-3xl backdrop-blur-xl border border-red-500/30" />
              
              {/* Animated background patterns */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-4 left-4 w-16 h-16 bg-red-500/30 rounded-full blur-xl animate-pulse" />
                <div className="absolute bottom-4 right-4 w-12 h-12 bg-blue-500/30 rounded-full blur-xl animate-pulse" style={{ animationDelay: '1s' }} />
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-purple-500/30 rounded-full blur-lg animate-pulse" style={{ animationDelay: '2s' }} />
              </div>
              
              <div className="relative p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-blue-500 flex items-center justify-center shadow-lg">
                      <Swords className="h-5 w-5 text-white" />
                    </div>
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Battle Arena</h3>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                      <span className="text-xs text-green-400 font-medium">LIVE</span>
                      <span className="px-2 py-0.5 bg-orange-500/20 text-orange-400 text-xs font-bold rounded-full">
                        BETA
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 mb-6">
                  <div className="flex items-center justify-between">
                    <div className="text-center flex-1">
                      <div className="w-12 h-12 mx-auto mb-2 rounded-xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-lg">
                        <Target className="h-6 w-6 text-white" />
                      </div>
                      <h4 className="text-sm font-bold text-red-400">Red Team</h4>
                      <p className="text-xs text-gray-400">Attackers</p>
                    </div>
                    
                    <div className="relative mx-4">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-r from-red-500 via-purple-500 to-blue-500 flex items-center justify-center shadow-xl">
                        <span className="text-white font-bold">VS</span>
                      </div>
                      <div className="absolute inset-0 rounded-full bg-gradient-to-r from-red-500 via-purple-500 to-blue-500 animate-ping opacity-30" />
                    </div>
                    
                    <div className="text-center flex-1">
                      <div className="w-12 h-12 mx-auto mb-2 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                        <Shield className="h-6 w-6 text-white" />
                      </div>
                      <h4 className="text-sm font-bold text-blue-400">Blue Team</h4>
                      <p className="text-xs text-gray-400">Defenders</p>
                    </div>
                  </div>
                </div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                  className="bg-gradient-to-r from-slate-800/50 to-slate-700/50 backdrop-blur-sm rounded-2xl p-4 border border-slate-600/50"
                >
                  <h4 className="text-base font-bold text-white mb-3 text-center">Join the Next Battle!</h4>
                  <p className="text-gray-400 mb-4 text-xs text-center">
                    Real-time cybersecurity warfare
                  </p>
                  
                  <div className="space-y-2">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full px-4 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-xl font-medium transition-all shadow-lg hover:shadow-red-500/25 flex items-center justify-center"
                    >
                      <Target className="h-4 w-4 mr-2" />
                      <span>Attack Squad</span>
                    </motion.button>
                    
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-medium transition-all shadow-lg hover:shadow-blue-500/25 flex items-center justify-center"
                    >
                      <Shield className="h-4 w-4 mr-2" />
                      <span>Defense Squad</span>
                    </motion.button>
                  </div>
                  
                  <div className="mt-4 grid grid-cols-3 gap-2 text-xs text-gray-400">
                    <div className="text-center">
                      <Eye className="h-3 w-3 mx-auto mb-1" />
                      <span>24/7 Live</span>
                    </div>
                    <div className="text-center">
                      <Users className="h-3 w-3 mx-auto mb-1" />
                      <span>5v5 Battles</span>
                    </div>
                    <div className="text-center">
                      <Globe className="h-3 w-3 mx-auto mb-1" />
                      <span>Global Ranks</span>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>

            {/* Quick Navigation */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-3xl backdrop-blur-xl border border-slate-700/50" />
              <div className="relative p-6">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center">
                  <Rocket className="h-5 w-5 mr-2 text-blue-400" />
                  Quick Launch
                </h3>
                <div className="space-y-3">
                  {[
                    { href: '/challenges', icon: Flag, label: 'New Challenge', color: 'red' },
                    { href: '/labs', icon: Flask, label: 'Practice Labs', color: 'purple' },
                    { href: '/skill-paths', icon: BookOpen, label: 'Learning Paths', color: 'blue' },
                    { href: '/leaderboard', icon: Trophy, label: 'Leaderboard', color: 'orange' }
                  ].map((item, index) => (
                    <motion.a
                      key={item.label}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 + index * 0.1 }}
                      whileHover={{ scale: 1.02, x: 5 }}
                      href={item.href}
                      className={`flex items-center gap-3 p-3 bg-${item.color}-500/10 hover:bg-${item.color}-500/20 border border-${item.color}-500/20 hover:border-${item.color}-500/40 rounded-xl transition-all group`}
                    >
                      <div className={`w-8 h-8 rounded-lg bg-${item.color}-500/20 flex items-center justify-center group-hover:scale-110 transition-transform`}>
                        <item.icon className={`h-4 w-4 text-${item.color}-400`} />
                      </div>
                      <span className="text-white font-medium text-sm flex-1">{item.label}</span>
                      <ArrowRight className={`h-4 w-4 text-gray-400 group-hover:text-${item.color}-400 transition-colors`} />
                    </motion.a>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;