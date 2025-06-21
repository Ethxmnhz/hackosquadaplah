import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, Settings, Trophy, Flag, Shield, Users, 
  Calendar, Clock, Star, Award, Target, Activity,
  Edit2, Save, X, Eye, EyeOff, Mail, Lock,
  Bell, Globe, Palette, Volume2, VolumeX,
  Download, Upload, Camera, Check, AlertTriangle,
  Flame, Crown, Zap, BookOpen, Code, Terminal,
  Github, Twitter, Linkedin, ExternalLink,
  ChevronRight, TrendingUp, BarChart3, PieChart,
  MapPin, Phone, Link as LinkIcon, Copy,
  Trash2, Plus, Minus, RefreshCw, Share2
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import Card from '../../components/ui/Card';

interface UserProfile {
  id: string;
  username: string;
  email: string;
  full_name?: string;
  bio?: string;
  location?: string;
  website?: string;
  avatar_url?: string;
  github_username?: string;
  twitter_username?: string;
  linkedin_username?: string;
  phone?: string;
  company?: string;
  job_title?: string;
  skills: string[];
  interests: string[];
  created_at: string;
  updated_at: string;
}

interface UserStats {
  total_points: number;
  challenges_completed: number;
  labs_completed: number;
  rank_position: number;
  rank_title: string;
  streak_days: number;
  total_time_spent: number;
  favorite_category: string;
  badges_earned: number;
  teams_joined: number;
  operations_participated: number;
  flags_captured: number;
  attacks_blocked: number;
}

interface Badge {
  id: string;
  name: string;
  description: string;
  icon_class: string;
  color: string;
  category: string;
  rarity: string;
  earned_at: string;
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
  completed_at?: string;
}

interface UserSettings {
  notifications_email: boolean;
  notifications_push: boolean;
  notifications_challenges: boolean;
  notifications_teams: boolean;
  notifications_operations: boolean;
  theme: 'dark' | 'light' | 'auto';
  language: string;
  timezone: string;
  privacy_profile: 'public' | 'private' | 'friends';
  privacy_stats: 'public' | 'private' | 'friends';
  privacy_activity: 'public' | 'private' | 'friends';
  sound_effects: boolean;
  auto_save: boolean;
  show_hints: boolean;
}

const ProfilePage = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'stats' | 'badges' | 'achievements' | 'activity' | 'settings'>('overview');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editedProfile, setEditedProfile] = useState<Partial<UserProfile>>({});
  const [editedSettings, setEditedSettings] = useState<Partial<UserSettings>>({});
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [passwordData, setPasswordData] = useState({
    current: '',
    new: '',
    confirm: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (user) {
      loadProfileData();
    }
  }, [user]);

  const loadProfileData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      await Promise.all([
        loadProfile(),
        loadStats(),
        loadBadges(),
        loadAchievements(),
        loadSettings()
      ]);
    } catch (error) {
      console.error('Error loading profile data:', error);
      setError('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const loadProfile = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) throw error;

    const profileData: UserProfile = {
      ...data,
      skills: data.skills || [],
      interests: data.interests || []
    };

    setProfile(profileData);
    setEditedProfile(profileData);
  };

  const loadStats = async () => {
    if (!user) return;

    // Get total points
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

    // Get teams count
    const { count: teamsCount } = await supabase
      .from('team_members')
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

    const statsData: UserStats = {
      total_points: totalPoints,
      challenges_completed: challengesCount || 0,
      labs_completed: labsCount || 0,
      rank_position: 42, // Would calculate from leaderboard
      rank_title: rankTitle,
      streak_days: 7, // Would calculate from activity
      total_time_spent: 1440, // In minutes
      favorite_category: 'web',
      badges_earned: badgesCount || 0,
      teams_joined: teamsCount || 0,
      operations_participated: 0,
      flags_captured: 0,
      attacks_blocked: 0
    };

    setStats(statsData);
  };

  const loadBadges = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('user_badges')
      .select(`
        earned_at,
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

    const badgesData = data?.map(item => ({
      ...item.badges,
      earned_at: item.earned_at
    })) || [];

    setBadges(badgesData);
  };

  const loadAchievements = async () => {
    // Mock achievements data
    const mockAchievements: Achievement[] = [
      {
        id: '1',
        name: 'First Blood',
        description: 'Complete your first challenge',
        icon_class: 'flag',
        category: 'challenges',
        target_value: 1,
        progress: stats?.challenges_completed || 0,
        completed: (stats?.challenges_completed || 0) >= 1
      },
      {
        id: '2',
        name: 'Point Collector',
        description: 'Earn 1000 points',
        icon_class: 'trophy',
        category: 'points',
        target_value: 1000,
        progress: stats?.total_points || 0,
        completed: (stats?.total_points || 0) >= 1000
      },
      {
        id: '3',
        name: 'Lab Rat',
        description: 'Complete 10 labs',
        icon_class: 'flask-conical',
        category: 'labs',
        target_value: 10,
        progress: stats?.labs_completed || 0,
        completed: (stats?.labs_completed || 0) >= 10
      }
    ];

    setAchievements(mockAchievements);
  };

  const loadSettings = async () => {
    // Mock settings - in real app would come from user_settings table
    const mockSettings: UserSettings = {
      notifications_email: true,
      notifications_push: true,
      notifications_challenges: true,
      notifications_teams: true,
      notifications_operations: false,
      theme: 'dark',
      language: 'en',
      timezone: 'UTC',
      privacy_profile: 'public',
      privacy_stats: 'public',
      privacy_activity: 'public',
      sound_effects: true,
      auto_save: true,
      show_hints: true
    };

    setSettings(mockSettings);
    setEditedSettings(mockSettings);
  };

  const handleSaveProfile = async () => {
    if (!user || !editedProfile) return;

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const { error } = await supabase
        .from('profiles')
        .update(editedProfile)
        .eq('id', user.id);

      if (error) throw error;

      setProfile({ ...profile!, ...editedProfile });
      setEditMode(false);
      setSuccess('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      setError('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (passwordData.new !== passwordData.confirm) {
      setError('New passwords do not match');
      return;
    }

    if (passwordData.new.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.new
      });

      if (error) throw error;

      setSuccess('Password updated successfully!');
      setShowPasswordChange(false);
      setPasswordData({ current: '', new: '', confirm: '' });
    } catch (error) {
      console.error('Error updating password:', error);
      setError('Failed to update password');
    } finally {
      setSaving(false);
    }
  };

  const handleCopyProfile = async () => {
    const profileUrl = `${window.location.origin}/profile/${user?.id}`;
    try {
      await navigator.clipboard.writeText(profileUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
    }
  };

  const getRankIcon = (rank: string) => {
    switch (rank) {
      case 'Legendary':
        return <Crown className="h-6 w-6 text-yellow-400" />;
      case 'Elite':
        return <Star className="h-6 w-6 text-purple-400" />;
      case 'Expert':
        return <Trophy className="h-6 w-6 text-primary" />;
      case 'Advanced':
        return <Target className="h-6 w-6 text-accent-blue" />;
      case 'Intermediate':
        return <Shield className="h-6 w-6 text-accent-green" />;
      case 'Beginner':
        return <Flag className="h-6 w-6 text-warning-light" />;
      default:
        return <User className="h-6 w-6 text-gray-400" />;
    }
  };

  const getBadgeIcon = (iconClass: string) => {
    const iconMap: Record<string, React.ElementType> = {
      'flag': Flag,
      'trophy': Trophy,
      'star': Star,
      'crown': Crown,
      'zap': Zap,
      'target': Target,
      'flask-conical': BookOpen,
      'flame': Flame,
      'users': Users,
      'shield': Shield,
      'terminal': Terminal,
      'code': Code
    };
    
    const IconComponent = iconMap[iconClass] || Star;
    return <IconComponent className="h-5 w-5" />;
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common':
        return 'border-gray-500 bg-gray-500/10 text-gray-400';
      case 'rare':
        return 'border-blue-500 bg-blue-500/10 text-blue-400';
      case 'epic':
        return 'border-purple-500 bg-purple-500/10 text-purple-400';
      case 'legendary':
        return 'border-yellow-500 bg-yellow-500/10 text-yellow-400';
      default:
        return 'border-gray-500 bg-gray-500/10 text-gray-400';
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse text-primary text-xl text-center">Loading profile...</div>
      </div>
    );
  }

  if (!profile || !stats) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <AlertTriangle className="h-16 w-16 text-error-light mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Profile Not Found</h2>
          <p className="text-gray-400">Unable to load profile data.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <Card className="p-8 border border-primary/30 bg-gradient-to-r from-primary/10 to-primary/5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="flex items-center gap-6">
              {/* Avatar */}
              <div className="relative">
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile.username}
                    className="w-24 h-24 rounded-full border-4 border-primary/30"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center border-4 border-primary/30">
                    <span className="text-3xl font-bold text-white">
                      {profile.username.slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="absolute -bottom-2 -right-2 bg-background-dark rounded-full p-1">
                  {getRankIcon(stats.rank_title)}
                </div>
              </div>

              {/* User Info */}
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold text-white">{profile.username}</h1>
                  <span className="px-3 py-1 bg-primary/20 text-primary rounded-full text-sm font-medium">
                    {stats.rank_title}
                  </span>
                </div>
                {profile.full_name && (
                  <p className="text-xl text-gray-300 mb-1">{profile.full_name}</p>
                )}
                {profile.bio && (
                  <p className="text-gray-400 mb-2">{profile.bio}</p>
                )}
                <div className="flex items-center gap-4 text-sm text-gray-400">
                  {profile.location && (
                    <div className="flex items-center">
                      <MapPin className="h-4 w-4 mr-1" />
                      {profile.location}
                    </div>
                  )}
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-1" />
                    Joined {new Date(profile.created_at).toLocaleDateString()}
                  </div>
                  <div className="flex items-center">
                    <Trophy className="h-4 w-4 mr-1" />
                    Rank #{stats.rank_position}
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleCopyProfile}
                className="btn-outline flex items-center"
              >
                {copied ? <Check className="h-4 w-4 mr-2" /> : <Share2 className="h-4 w-4 mr-2" />}
                {copied ? 'Copied!' : 'Share Profile'}
              </button>
              <button
                onClick={() => setEditMode(!editMode)}
                className="btn-primary flex items-center"
              >
                <Edit2 className="h-4 w-4 mr-2" />
                {editMode ? 'Cancel Edit' : 'Edit Profile'}
              </button>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            <div className="text-center p-4 bg-background-light/50 rounded-lg">
              <div className="text-2xl font-bold text-white">{stats.total_points}</div>
              <div className="text-sm text-gray-400">Total Points</div>
            </div>
            <div className="text-center p-4 bg-background-light/50 rounded-lg">
              <div className="text-2xl font-bold text-white">{stats.challenges_completed}</div>
              <div className="text-sm text-gray-400">Challenges</div>
            </div>
            <div className="text-center p-4 bg-background-light/50 rounded-lg">
              <div className="text-2xl font-bold text-white">{stats.labs_completed}</div>
              <div className="text-sm text-gray-400">Labs</div>
            </div>
            <div className="text-center p-4 bg-background-light/50 rounded-lg">
              <div className="text-2xl font-bold text-white">{stats.badges_earned}</div>
              <div className="text-sm text-gray-400">Badges</div>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Navigation Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="mb-8"
      >
        <div className="flex space-x-8 border-b border-background-light">
          {[
            { id: 'overview', label: 'Overview', icon: User },
            { id: 'stats', label: 'Statistics', icon: BarChart3 },
            { id: 'badges', label: 'Badges', icon: Award },
            { id: 'achievements', label: 'Achievements', icon: Target },
            { id: 'activity', label: 'Activity', icon: Activity },
            { id: 'settings', label: 'Settings', icon: Settings }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center px-4 py-4 border-b-2 font-medium transition-colors ${
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

      {/* Messages */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mb-6"
          >
            <div className="flex items-center gap-2 p-4 bg-error-dark/20 border border-error-light/30 rounded-lg text-error-light">
              <AlertTriangle className="h-5 w-5 flex-shrink-0" />
              <p>{error}</p>
              <button onClick={() => setError('')} className="ml-auto">
                <X className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}

        {success && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mb-6"
          >
            <div className="flex items-center gap-2 p-4 bg-success-dark/20 border border-success-light/30 rounded-lg text-success-light">
              <Check className="h-5 w-5 flex-shrink-0" />
              <p>{success}</p>
              <button onClick={() => setSuccess('')} className="ml-auto">
                <X className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'overview' && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-8"
          >
            {/* Profile Information */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-white">Profile Information</h2>
                  {editMode && (
                    <button
                      onClick={handleSaveProfile}
                      disabled={saving}
                      className="btn-primary flex items-center"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="form-label">Username</label>
                    {editMode ? (
                      <input
                        type="text"
                        value={editedProfile.username || ''}
                        onChange={(e) => setEditedProfile(prev => ({ ...prev, username: e.target.value }))}
                        className="form-input"
                      />
                    ) : (
                      <div className="text-white">{profile.username}</div>
                    )}
                  </div>

                  <div>
                    <label className="form-label">Full Name</label>
                    {editMode ? (
                      <input
                        type="text"
                        value={editedProfile.full_name || ''}
                        onChange={(e) => setEditedProfile(prev => ({ ...prev, full_name: e.target.value }))}
                        className="form-input"
                        placeholder="Your full name"
                      />
                    ) : (
                      <div className="text-white">{profile.full_name || 'Not set'}</div>
                    )}
                  </div>

                  <div>
                    <label className="form-label">Email</label>
                    <div className="text-white">{profile.email}</div>
                  </div>

                  <div>
                    <label className="form-label">Location</label>
                    {editMode ? (
                      <input
                        type="text"
                        value={editedProfile.location || ''}
                        onChange={(e) => setEditedProfile(prev => ({ ...prev, location: e.target.value }))}
                        className="form-input"
                        placeholder="City, Country"
                      />
                    ) : (
                      <div className="text-white">{profile.location || 'Not set'}</div>
                    )}
                  </div>

                  <div>
                    <label className="form-label">Company</label>
                    {editMode ? (
                      <input
                        type="text"
                        value={editedProfile.company || ''}
                        onChange={(e) => setEditedProfile(prev => ({ ...prev, company: e.target.value }))}
                        className="form-input"
                        placeholder="Your company"
                      />
                    ) : (
                      <div className="text-white">{profile.company || 'Not set'}</div>
                    )}
                  </div>

                  <div>
                    <label className="form-label">Job Title</label>
                    {editMode ? (
                      <input
                        type="text"
                        value={editedProfile.job_title || ''}
                        onChange={(e) => setEditedProfile(prev => ({ ...prev, job_title: e.target.value }))}
                        className="form-input"
                        placeholder="Your job title"
                      />
                    ) : (
                      <div className="text-white">{profile.job_title || 'Not set'}</div>
                    )}
                  </div>
                </div>

                <div className="mt-6">
                  <label className="form-label">Bio</label>
                  {editMode ? (
                    <textarea
                      value={editedProfile.bio || ''}
                      onChange={(e) => setEditedProfile(prev => ({ ...prev, bio: e.target.value }))}
                      className="form-input"
                      rows={4}
                      placeholder="Tell us about yourself..."
                    />
                  ) : (
                    <div className="text-white">{profile.bio || 'No bio set'}</div>
                  )}
                </div>

                {/* Social Links */}
                <div className="mt-6">
                  <h3 className="text-lg font-bold text-white mb-4">Social Links</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="form-label flex items-center">
                        <Github className="h-4 w-4 mr-2" />
                        GitHub
                      </label>
                      {editMode ? (
                        <input
                          type="text"
                          value={editedProfile.github_username || ''}
                          onChange={(e) => setEditedProfile(prev => ({ ...prev, github_username: e.target.value }))}
                          className="form-input"
                          placeholder="github_username"
                        />
                      ) : (
                        <div className="text-white">
                          {profile.github_username ? (
                            <a
                              href={`https://github.com/${profile.github_username}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:text-primary-light flex items-center"
                            >
                              @{profile.github_username}
                              <ExternalLink className="h-3 w-3 ml-1" />
                            </a>
                          ) : (
                            'Not set'
                          )}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="form-label flex items-center">
                        <Twitter className="h-4 w-4 mr-2" />
                        Twitter
                      </label>
                      {editMode ? (
                        <input
                          type="text"
                          value={editedProfile.twitter_username || ''}
                          onChange={(e) => setEditedProfile(prev => ({ ...prev, twitter_username: e.target.value }))}
                          className="form-input"
                          placeholder="twitter_username"
                        />
                      ) : (
                        <div className="text-white">
                          {profile.twitter_username ? (
                            <a
                              href={`https://twitter.com/${profile.twitter_username}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:text-primary-light flex items-center"
                            >
                              @{profile.twitter_username}
                              <ExternalLink className="h-3 w-3 ml-1" />
                            </a>
                          ) : (
                            'Not set'
                          )}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="form-label flex items-center">
                        <Linkedin className="h-4 w-4 mr-2" />
                        LinkedIn
                      </label>
                      {editMode ? (
                        <input
                          type="text"
                          value={editedProfile.linkedin_username || ''}
                          onChange={(e) => setEditedProfile(prev => ({ ...prev, linkedin_username: e.target.value }))}
                          className="form-input"
                          placeholder="linkedin_username"
                        />
                      ) : (
                        <div className="text-white">
                          {profile.linkedin_username ? (
                            <a
                              href={`https://linkedin.com/in/${profile.linkedin_username}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:text-primary-light flex items-center"
                            >
                              {profile.linkedin_username}
                              <ExternalLink className="h-3 w-3 ml-1" />
                            </a>
                          ) : (
                            'Not set'
                          )}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="form-label flex items-center">
                        <LinkIcon className="h-4 w-4 mr-2" />
                        Website
                      </label>
                      {editMode ? (
                        <input
                          type="url"
                          value={editedProfile.website || ''}
                          onChange={(e) => setEditedProfile(prev => ({ ...prev, website: e.target.value }))}
                          className="form-input"
                          placeholder="https://yourwebsite.com"
                        />
                      ) : (
                        <div className="text-white">
                          {profile.website ? (
                            <a
                              href={profile.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:text-primary-light flex items-center"
                            >
                              {profile.website}
                              <ExternalLink className="h-3 w-3 ml-1" />
                            </a>
                          ) : (
                            'Not set'
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Card>

              {/* Recent Activity */}
              <Card className="p-6">
                <h2 className="text-2xl font-bold text-white mb-6">Recent Activity</h2>
                <div className="space-y-4">
                  <div className="flex items-center p-4 bg-background-light rounded-lg">
                    <Flag className="h-5 w-5 text-primary mr-3" />
                    <div>
                      <p className="text-white">Completed "SQL Injection Basics"</p>
                      <p className="text-sm text-gray-400">2 hours ago • +150 points</p>
                    </div>
                  </div>
                  <div className="flex items-center p-4 bg-background-light rounded-lg">
                    <Award className="h-5 w-5 text-accent-blue mr-3" />
                    <div>
                      <p className="text-white">Earned "Web Warrior" badge</p>
                      <p className="text-sm text-gray-400">1 day ago</p>
                    </div>
                  </div>
                  <div className="flex items-center p-4 bg-background-light rounded-lg">
                    <Users className="h-5 w-5 text-accent-green mr-3" />
                    <div>
                      <p className="text-white">Joined "Elite Hackers" team</p>
                      <p className="text-sm text-gray-400">3 days ago</p>
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Progress Card */}
              <Card className="p-6">
                <h3 className="text-lg font-bold text-white mb-4">Progress Overview</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-400">Next Rank: Elite</span>
                      <span className="text-white">{stats.total_points}/1500</span>
                    </div>
                    <div className="w-full bg-background-light rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full transition-all duration-300"
                        style={{ width: `${(stats.total_points / 1500) * 100}%` }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-background-light rounded-lg">
                      <Flame className="h-6 w-6 text-orange-400 mx-auto mb-1" />
                      <div className="text-lg font-bold text-white">{stats.streak_days}</div>
                      <div className="text-xs text-gray-400">Day Streak</div>
                    </div>
                    <div className="text-center p-3 bg-background-light rounded-lg">
                      <Clock className="h-6 w-6 text-accent-blue mx-auto mb-1" />
                      <div className="text-lg font-bold text-white">{Math.floor(stats.total_time_spent / 60)}h</div>
                      <div className="text-xs text-gray-400">Time Spent</div>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Skills */}
              <Card className="p-6">
                <h3 className="text-lg font-bold text-white mb-4">Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {profile.skills.length > 0 ? (
                    profile.skills.map((skill, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-primary/20 text-primary rounded-full text-sm"
                      >
                        {skill}
                      </span>
                    ))
                  ) : (
                    <p className="text-gray-400 text-sm">No skills added yet</p>
                  )}
                </div>
              </Card>

              {/* Latest Badges */}
              <Card className="p-6">
                <h3 className="text-lg font-bold text-white mb-4">Latest Badges</h3>
                <div className="grid grid-cols-3 gap-3">
                  {badges.slice(0, 6).map((badge) => (
                    <div
                      key={badge.id}
                      className={`p-3 rounded-lg border text-center ${getRarityColor(badge.rarity)}`}
                    >
                      <div className="mb-2">
                        {getBadgeIcon(badge.icon_class)}
                      </div>
                      <div className="text-xs font-medium">{badge.name}</div>
                    </div>
                  ))}
                </div>
                {badges.length > 6 && (
                  <button
                    onClick={() => setActiveTab('badges')}
                    className="w-full mt-4 text-primary hover:text-primary-light text-sm flex items-center justify-center"
                  >
                    View All Badges
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </button>
                )}
              </Card>
            </div>
          </motion.div>
        )}

        {activeTab === 'settings' && (
          <motion.div
            key="settings"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-8"
          >
            {/* Account Settings */}
            <Card className="p-6">
              <h2 className="text-2xl font-bold text-white mb-6">Account Settings</h2>
              
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-white mb-4">Change Password</h3>
                  {!showPasswordChange ? (
                    <button
                      onClick={() => setShowPasswordChange(true)}
                      className="btn-outline flex items-center"
                    >
                      <Lock className="h-4 w-4 mr-2" />
                      Change Password
                    </button>
                  ) : (
                    <div className="space-y-4 p-4 bg-background-light rounded-lg">
                      <div>
                        <label className="form-label">Current Password</label>
                        <input
                          type="password"
                          value={passwordData.current}
                          onChange={(e) => setPasswordData(prev => ({ ...prev, current: e.target.value }))}
                          className="form-input"
                        />
                      </div>
                      <div>
                        <label className="form-label">New Password</label>
                        <input
                          type="password"
                          value={passwordData.new}
                          onChange={(e) => setPasswordData(prev => ({ ...prev, new: e.target.value }))}
                          className="form-input"
                        />
                      </div>
                      <div>
                        <label className="form-label">Confirm New Password</label>
                        <input
                          type="password"
                          value={passwordData.confirm}
                          onChange={(e) => setPasswordData(prev => ({ ...prev, confirm: e.target.value }))}
                          className="form-input"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handlePasswordChange}
                          disabled={saving}
                          className="btn-primary"
                        >
                          {saving ? 'Updating...' : 'Update Password'}
                        </button>
                        <button
                          onClick={() => {
                            setShowPasswordChange(false);
                            setPasswordData({ current: '', new: '', confirm: '' });
                          }}
                          className="btn-outline"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Card>

            {/* Notification Settings */}
            <Card className="p-6">
              <h2 className="text-2xl font-bold text-white mb-6">Notification Preferences</h2>
              
              {settings && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-white font-medium">Email Notifications</h4>
                      <p className="text-sm text-gray-400">Receive notifications via email</p>
                    </div>
                    <button
                      onClick={() => setEditedSettings(prev => ({ ...prev, notifications_email: !prev.notifications_email }))}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        editedSettings.notifications_email ? 'bg-primary' : 'bg-gray-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          editedSettings.notifications_email ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-white font-medium">Challenge Notifications</h4>
                      <p className="text-sm text-gray-400">Get notified about new challenges</p>
                    </div>
                    <button
                      onClick={() => setEditedSettings(prev => ({ ...prev, notifications_challenges: !prev.notifications_challenges }))}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        editedSettings.notifications_challenges ? 'bg-primary' : 'bg-gray-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          editedSettings.notifications_challenges ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-white font-medium">Team Notifications</h4>
                      <p className="text-sm text-gray-400">Get notified about team activities</p>
                    </div>
                    <button
                      onClick={() => setEditedSettings(prev => ({ ...prev, notifications_teams: !prev.notifications_teams }))}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        editedSettings.notifications_teams ? 'bg-primary' : 'bg-gray-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          editedSettings.notifications_teams ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-white font-medium">Sound Effects</h4>
                      <p className="text-sm text-gray-400">Play sounds for interactions</p>
                    </div>
                    <button
                      onClick={() => setEditedSettings(prev => ({ ...prev, sound_effects: !prev.sound_effects }))}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        editedSettings.sound_effects ? 'bg-primary' : 'bg-gray-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          editedSettings.sound_effects ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              )}
            </Card>

            {/* Privacy Settings */}
            <Card className="p-6">
              <h2 className="text-2xl font-bold text-white mb-6">Privacy Settings</h2>
              
              {settings && (
                <div className="space-y-4">
                  <div>
                    <label className="form-label">Profile Visibility</label>
                    <select
                      value={editedSettings.privacy_profile}
                      onChange={(e) => setEditedSettings(prev => ({ ...prev, privacy_profile: e.target.value as any }))}
                      className="form-input"
                    >
                      <option value="public">Public</option>
                      <option value="friends">Friends Only</option>
                      <option value="private">Private</option>
                    </select>
                  </div>

                  <div>
                    <label className="form-label">Statistics Visibility</label>
                    <select
                      value={editedSettings.privacy_stats}
                      onChange={(e) => setEditedSettings(prev => ({ ...prev, privacy_stats: e.target.value as any }))}
                      className="form-input"
                    >
                      <option value="public">Public</option>
                      <option value="friends">Friends Only</option>
                      <option value="private">Private</option>
                    </select>
                  </div>

                  <div>
                    <label className="form-label">Activity Visibility</label>
                    <select
                      value={editedSettings.privacy_activity}
                      onChange={(e) => setEditedSettings(prev => ({ ...prev, privacy_activity: e.target.value as any }))}
                      className="form-input"
                    >
                      <option value="public">Public</option>
                      <option value="friends">Friends Only</option>
                      <option value="private">Private</option>
                    </select>
                  </div>
                </div>
              )}
            </Card>
          </motion.div>
        )}

        {/* Add other tab content here (stats, badges, achievements, activity) */}
      </AnimatePresence>
    </div>
  );
};

export default ProfilePage;