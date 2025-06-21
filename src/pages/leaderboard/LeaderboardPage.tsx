import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, Crown, Medal, Star, Zap, Target, Users, 
  TrendingUp, Calendar, Award, Flame, Shield, Sword,
  ChevronUp, ChevronDown, Filter, Search, RefreshCw,
  Globe, Lock, Wifi, FlaskConical, Flag, Gem, Baby
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import Card from '../../components/ui/Card';

interface LeaderboardEntry {
  id: string;
  user_id: string;
  username: string;
  total_points: number;
  rank_position: number;
  rank_title: string;
  challenges_completed: number;
  labs_completed: number;
  badge_count: number;
  last_updated: string;
}

interface UserStats {
  id: string;
  user_id: string;
  total_points: number;
  challenges_completed: number;
  labs_completed: number;
  rank_position: number;
  rank_title: string;
  streak_days: number;
  total_time_spent: number;
  favorite_category: string;
  skill_level: string;
}

interface Badge {
  id: string;
  name: string;
  description: string;
  icon_class: string;
  color: string;
  category: string;
  rarity: string;
  earned_at?: string;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon_class: string;
  category: string;
  target_value: number;
  progress: number;
  completed: boolean;
}

const LeaderboardPage = () => {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [userBadges, setUserBadges] = useState<Badge[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'badges' | 'achievements'>('leaderboard');
  const [timeFilter, setTimeFilter] = useState<'all' | 'week' | 'month'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadLeaderboardData();
  }, [user]);

  const loadLeaderboardData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadRealLeaderboard(),
        loadUserStats(),
        loadUserBadges(),
        loadAchievements()
      ]);
    } catch (error) {
      console.error('Error loading leaderboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRealLeaderboard = async () => {
    try {
      // Get all users with their actual points and stats
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, email');

      if (profilesError) throw profilesError;

      if (!profiles || profiles.length === 0) {
        setLeaderboard([]);
        return;
      }

      // Calculate real stats for each user
      const leaderboardData = await Promise.all(
        profiles.map(async (profile) => {
          // Get total points
          const { data: pointsData } = await supabase
            .from('user_points')
            .select('points')
            .eq('user_id', profile.id);

          const totalPoints = pointsData?.reduce((sum, p) => sum + p.points, 0) || 0;

          // Get challenges completed
          const { count: challengesCount } = await supabase
            .from('challenge_completions')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', profile.id);

          // Get labs completed
          const { count: labsCount } = await supabase
            .from('lab_completions')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', profile.id);

          // Get badges count
          const { count: badgesCount } = await supabase
            .from('user_badges')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', profile.id);

          // Determine rank title based on points
          let rankTitle = 'Novice';
          if (totalPoints >= 2500) rankTitle = 'Legendary';
          else if (totalPoints >= 1500) rankTitle = 'Elite';
          else if (totalPoints >= 1000) rankTitle = 'Expert';
          else if (totalPoints >= 500) rankTitle = 'Advanced';
          else if (totalPoints >= 250) rankTitle = 'Intermediate';
          else if (totalPoints >= 100) rankTitle = 'Beginner';

          return {
            id: profile.id,
            user_id: profile.id,
            username: profile.username,
            total_points: totalPoints,
            rank_position: 0, // Will be set after sorting
            rank_title: rankTitle,
            challenges_completed: challengesCount || 0,
            labs_completed: labsCount || 0,
            badge_count: badgesCount || 0,
            last_updated: new Date().toISOString()
          };
        })
      );

      // Sort by points and assign rank positions
      const sortedLeaderboard = leaderboardData
        .sort((a, b) => b.total_points - a.total_points)
        .map((entry, index) => ({
          ...entry,
          rank_position: index + 1
        }));

      setLeaderboard(sortedLeaderboard);

      // Update the leaderboard_entries table for caching
      if (sortedLeaderboard.length > 0) {
        const { error: upsertError } = await supabase
          .from('leaderboard_entries')
          .upsert(
            sortedLeaderboard.map(entry => ({
              user_id: entry.user_id,
              username: entry.username,
              total_points: entry.total_points,
              rank_position: entry.rank_position,
              rank_title: entry.rank_title,
              challenges_completed: entry.challenges_completed,
              labs_completed: entry.labs_completed,
              badge_count: entry.badge_count,
              last_updated: new Date().toISOString()
            })),
            { onConflict: 'user_id' }
          );

        if (upsertError) {
          console.error('Error updating leaderboard cache:', upsertError);
        }
      }
    } catch (error) {
      console.error('Error loading real leaderboard:', error);
      setLeaderboard([]);
    }
  };

  const loadUserStats = async () => {
    if (!user) return;

    try {
      // Calculate user's real stats
      const { data: pointsData } = await supabase
        .from('user_points')
        .select('points')
        .eq('user_id', user.id);

      const totalPoints = pointsData?.reduce((sum, p) => sum + p.points, 0) || 0;

      const { count: challengesCount } = await supabase
        .from('challenge_completions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      const { count: labsCount } = await supabase
        .from('lab_completions')
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

      // Find user's rank position
      const userRank = leaderboard.find(entry => entry.user_id === user.id);
      const rankPosition = userRank?.rank_position || leaderboard.length + 1;

      const stats: UserStats = {
        id: user.id,
        user_id: user.id,
        total_points: totalPoints,
        challenges_completed: challengesCount || 0,
        labs_completed: labsCount || 0,
        rank_position: rankPosition,
        rank_title: rankTitle,
        streak_days: 0,
        total_time_spent: 0,
        favorite_category: 'web',
        skill_level: 'beginner'
      };

      setUserStats(stats);

      // Update user_stats table
      const { error: upsertError } = await supabase
        .from('user_stats')
        .upsert({
          user_id: user.id,
          total_points: totalPoints,
          challenges_completed: challengesCount || 0,
          labs_completed: labsCount || 0,
          rank_position: rankPosition,
          rank_title: rankTitle,
          last_activity: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });

      if (upsertError) {
        console.error('Error updating user stats:', upsertError);
      }
    } catch (error) {
      console.error('Error loading user stats:', error);
    }
  };

  const loadUserBadges = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_badges')
        .select(`
          *,
          badges (
            id,
            name,
            description,
            icon_class,
            color,
            category,
            rarity
          )
        `)
        .eq('user_id', user.id);

      if (error) throw error;

      const badges = data?.map(item => ({
        ...item.badges,
        earned_at: item.earned_at
      })) || [];

      setUserBadges(badges);
    } catch (error) {
      console.error('Error loading user badges:', error);
    }
  };

  const loadAchievements = async () => {
    if (!user || !userStats) return;

    try {
      const { data: allAchievements, error: achievementsError } = await supabase
        .from('achievements')
        .select('*')
        .eq('is_active', true);

      if (achievementsError) throw achievementsError;

      const { data: userAchievements, error: userAchievementsError } = await supabase
        .from('user_achievements')
        .select('*')
        .eq('user_id', user.id);

      if (userAchievementsError) throw userAchievementsError;

      const achievementsWithProgress = allAchievements?.map(achievement => {
        const userAchievement = userAchievements?.find(ua => ua.achievement_id === achievement.id);
        const currentValue = userStats?.[achievement.current_value_field as keyof UserStats] || 0;
        const progress = Math.min((Number(currentValue) / achievement.target_value) * 100, 100);
        
        return {
          ...achievement,
          progress,
          completed: !!userAchievement
        };
      }) || [];

      setAchievements(achievementsWithProgress);
    } catch (error) {
      console.error('Error loading achievements:', error);
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    await loadLeaderboardData();
    setRefreshing(false);
  };

  const getRankIcon = (position: number) => {
    switch (position) {
      case 1:
        return <Crown className="h-6 w-6 text-yellow-400" />;
      case 2:
        return <Medal className="h-6 w-6 text-gray-400" />;
      case 3:
        return <Medal className="h-6 w-6 text-amber-600" />;
      default:
        return <Trophy className="h-5 w-5 text-gray-500" />;
    }
  };

  const getRankColor = (position: number) => {
    switch (position) {
      case 1:
        return 'from-yellow-400 to-yellow-600';
      case 2:
        return 'from-gray-300 to-gray-500';
      case 3:
        return 'from-amber-500 to-amber-700';
      default:
        return 'from-gray-600 to-gray-800';
    }
  };

  const getBadgeIcon = (iconClass: string) => {
    const iconMap: Record<string, React.ElementType> = {
      'baby': Baby,
      'star': Star,
      'gem': Gem,
      'crown': Crown,
      'zap': Zap,
      'target': Target,
      'flask-conical': FlaskConical,
      'flame': Flame,
      'users': Users,
      'globe': Globe,
      'lock': Lock,
      'wifi': Wifi,
      'flag': Flag,
      'trophy': Trophy,
      'award': Award,
      'shield': Shield,
      'sword': Sword
    };
    
    const IconComponent = iconMap[iconClass] || Star;
    return <IconComponent className="h-5 w-5" />;
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common':
        return 'border-gray-500 bg-gray-500/10';
      case 'rare':
        return 'border-blue-500 bg-blue-500/10';
      case 'epic':
        return 'border-purple-500 bg-purple-500/10';
      case 'legendary':
        return 'border-yellow-500 bg-yellow-500/10';
      default:
        return 'border-gray-500 bg-gray-500/10';
    }
  };

  const filteredLeaderboard = leaderboard.filter(entry =>
    entry.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const userRank = leaderboard.find(entry => entry.user_id === user?.id);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Leaderboard</h1>
            <p className="text-gray-400">Compete with the best hackers worldwide</p>
          </div>
          <button
            onClick={refreshData}
            disabled={refreshing}
            className="btn-primary flex items-center"
          >
            <RefreshCw className={`h-5 w-5 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Updating...' : 'Refresh'}
          </button>
        </div>
      </motion.div>

      {/* User Stats Card */}
      {userStats && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-8"
        >
          <Card className="p-6 border border-primary/30 bg-gradient-to-r from-primary/10 to-primary/5">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-6">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center">
                    <span className="text-2xl font-bold text-white">
                      {user?.user_metadata?.username?.slice(0, 2).toUpperCase() || 'US'}
                    </span>
                  </div>
                  <div className="absolute -bottom-2 -right-2 bg-background-dark rounded-full p-1">
                    {getRankIcon(userStats.rank_position || 999)}
                  </div>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">
                    {user?.user_metadata?.username || 'Anonymous'}
                  </h2>
                  <p className="text-primary font-medium">{userStats.rank_title}</p>
                  <p className="text-gray-400">Rank #{userStats.rank_position || 'Unranked'}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-6 md:mt-0">
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">{userStats.total_points}</div>
                  <div className="text-sm text-gray-400">Points</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">{userStats.challenges_completed}</div>
                  <div className="text-sm text-gray-400">Challenges</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">{userStats.labs_completed}</div>
                  <div className="text-sm text-gray-400">Labs</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">{userBadges.length}</div>
                  <div className="text-sm text-gray-400">Badges</div>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Navigation Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="mb-8"
      >
        <div className="flex space-x-8 border-b border-background-light">
          {[
            { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
            { id: 'badges', label: 'Badges', icon: Award },
            { id: 'achievements', label: 'Achievements', icon: Target }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center px-4 py-4 border-b-2 font-medium ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-400 hover:text-white hover:border-gray-700'
              }`}
            >
              <tab.icon className="h-5 w-5 mr-2" />
              {tab.label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'leaderboard' && (
          <motion.div
            key="leaderboard"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {/* Search and Filters */}
            <div className="flex flex-col md:flex-row gap-4 mb-8">
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder="Search players..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-background-light border border-background-default rounded-lg py-2 pl-10 pr-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
                <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-500" />
              </div>
              <select
                value={timeFilter}
                onChange={(e) => setTimeFilter(e.target.value as any)}
                className="form-input md:w-48"
              >
                <option value="all">All Time</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
              </select>
            </div>

            {loading ? (
              <Card className="p-8 text-center">
                <div className="animate-pulse text-primary text-xl">Loading leaderboard...</div>
              </Card>
            ) : filteredLeaderboard.length === 0 ? (
              <Card className="p-8 text-center">
                <Trophy className="h-16 w-16 text-gray-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">No Players Found</h3>
                <p className="text-gray-400">Complete challenges and labs to appear on the leaderboard!</p>
              </Card>
            ) : (
              <>
                {/* Top 3 Podium */}
                {filteredLeaderboard.length >= 3 && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    {filteredLeaderboard.slice(0, 3).map((entry, index) => (
                      <motion.div
                        key={entry.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: index * 0.1 }}
                        className={`relative ${index === 0 ? 'md:order-2' : index === 1 ? 'md:order-1' : 'md:order-3'}`}
                      >
                        <Card className={`p-6 text-center border-2 bg-gradient-to-br ${getRankColor(entry.rank_position)}`}>
                          <div className="relative mb-4">
                            <div className={`w-20 h-20 mx-auto rounded-full bg-gradient-to-br ${getRankColor(entry.rank_position)} flex items-center justify-center border-4 border-white/20`}>
                              <span className="text-xl font-bold text-white">
                                {entry.username.slice(0, 2).toUpperCase()}
                              </span>
                            </div>
                            <div className="absolute -top-2 -right-2">
                              {getRankIcon(entry.rank_position)}
                            </div>
                          </div>
                          
                          <h3 className="text-xl font-bold text-white mb-1">{entry.username}</h3>
                          <p className="text-white/80 mb-2">{entry.rank_title}</p>
                          <div className="text-3xl font-bold text-white mb-4">{entry.total_points}</div>
                          
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <div className="text-white/60">Challenges</div>
                              <div className="text-white font-medium">{entry.challenges_completed}</div>
                            </div>
                            <div>
                              <div className="text-white/60">Labs</div>
                              <div className="text-white font-medium">{entry.labs_completed}</div>
                            </div>
                          </div>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                )}

                {/* Leaderboard Table */}
                <Card className="overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-background-light">
                        <tr>
                          <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Rank</th>
                          <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Player</th>
                          <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Points</th>
                          <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Challenges</th>
                          <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Labs</th>
                          <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Badges</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-background-light">
                        {filteredLeaderboard.map((entry, index) => (
                          <motion.tr
                            key={entry.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3, delay: index * 0.05 }}
                            className={`hover:bg-background-light/50 ${
                              entry.user_id === user?.id ? 'bg-primary/10 border-l-4 border-primary' : ''
                            }`}
                          >
                            <td className="px-6 py-4">
                              <div className="flex items-center">
                                <span className="text-lg font-bold text-white mr-2">#{entry.rank_position}</span>
                                {entry.rank_position <= 10 && (
                                  <Star className="h-4 w-4 text-yellow-400" />
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center mr-3">
                                  <span className="text-sm font-bold text-white">
                                    {entry.username.slice(0, 2).toUpperCase()}
                                  </span>
                                </div>
                                <div>
                                  <div className="text-white font-medium">{entry.username}</div>
                                  <div className="text-gray-400 text-sm">{entry.rank_title}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-white font-bold text-lg">{entry.total_points}</span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-gray-300">{entry.challenges_completed}</span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-gray-300">{entry.labs_completed}</span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-gray-300">{entry.badge_count}</span>
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </>
            )}
          </motion.div>
        )}

        {activeTab === 'badges' && (
          <motion.div
            key="badges"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {userBadges.length === 0 ? (
              <Card className="p-8 text-center">
                <Award className="h-16 w-16 text-gray-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">No Badges Yet</h3>
                <p className="text-gray-400">Complete challenges and labs to earn badges!</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {userBadges.map((badge, index) => (
                  <motion.div
                    key={badge.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                  >
                    <Card className={`p-6 text-center border-2 ${getRarityColor(badge.rarity)} hover:scale-105 transition-transform`}>
                      <div 
                        className="w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4"
                        style={{ backgroundColor: badge.color + '20', color: badge.color }}
                      >
                        {getBadgeIcon(badge.icon_class)}
                      </div>
                      <h3 className="text-lg font-bold text-white mb-2">{badge.name}</h3>
                      <p className="text-gray-400 text-sm mb-3">{badge.description}</p>
                      <div className="flex items-center justify-between">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRarityColor(badge.rarity)}`}>
                          {badge.rarity.charAt(0).toUpperCase() + badge.rarity.slice(1)}
                        </span>
                        {badge.earned_at && (
                          <span className="text-xs text-gray-500">
                            {new Date(badge.earned_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'achievements' && (
          <motion.div
            key="achievements"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {achievements.length === 0 ? (
              <Card className="p-8 text-center">
                <Target className="h-16 w-16 text-gray-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">No Achievements Available</h3>
                <p className="text-gray-400">Check back later for new achievements!</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {achievements.map((achievement, index) => (
                  <motion.div
                    key={achievement.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                  >
                    <Card className={`p-6 border ${achievement.completed ? 'border-success-light bg-success-dark/10' : 'border-background-light'}`}>
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center mr-4 ${
                            achievement.completed ? 'bg-success-dark/20 text-success-light' : 'bg-background-light text-gray-400'
                          }`}>
                            {getBadgeIcon(achievement.icon_class)}
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-white">{achievement.name}</h3>
                            <p className="text-gray-400 text-sm">{achievement.description}</p>
                          </div>
                        </div>
                        {achievement.completed && (
                          <div className="text-success-light">
                            <Award className="h-6 w-6" />
                          </div>
                        )}
                      </div>
                      
                      <div className="mb-4">
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-gray-400">Progress</span>
                          <span className="text-white">{Math.round(achievement.progress)}%</span>
                        </div>
                        <div className="w-full bg-background-light rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full transition-all duration-500 ${
                              achievement.completed ? 'bg-success-light' : 'bg-primary'
                            }`}
                            style={{ width: `${achievement.progress}%` }}
                          />
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-400">Target: {achievement.target_value}</span>
                        {achievement.reward_points > 0 && (
                          <span className="text-primary font-medium">+{achievement.reward_points} pts</span>
                        )}
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LeaderboardPage;