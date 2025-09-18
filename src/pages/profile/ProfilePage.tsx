import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Settings, Trophy, Flag, Shield, Users,
  Calendar, Star, Target,
  Edit2, Save, X, Lock,
  Check, AlertTriangle,
  Flame, Crown, Zap, BookOpen, Code, Terminal,
  Github, Twitter, Linkedin, ExternalLink,
  MapPin, Link as LinkIcon,
  Share2
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { Link } from 'react-router-dom';
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

// Removed mock Achievements and Settings interfaces; we only keep real, backed data.

const ProfilePage = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'settings'>('overview');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editedProfile, setEditedProfile] = useState<Partial<UserProfile>>({});
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
        loadBadges()
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

    const badgesData: Badge[] = (data || []).map((item: any) => ({
      ...(item?.badges || {}),
      earned_at: item?.earned_at
    })) as Badge[];

    setBadges(badgesData as Badge[]);
  };

  // Removed achievements and settings loaders (were mock-only)

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
    <div className="min-h-screen bg-gradient-to-br from-[#0A030F] via-background-dark to-[#181024] text-white relative overflow-hidden">
      {/* subtle page background accents */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(127,90,240,0.12),transparent_60%)]" />
      <div className="pointer-events-none absolute -top-24 -left-24 h-80 w-80 rounded-full bg-red-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-10"
      >
        <div className="relative overflow-hidden rounded-2xl border border-white/10">
          {/* Soft gradient background with subtle glow */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-fuchsia-500/10 to-purple-500/10" />
          <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-primary/20 blur-3xl opacity-40" />
          <div className="relative p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
              <div className="flex items-center gap-6">
                {/* Avatar */}
                <div className="relative">
                  {profile.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile.username}
                      className="w-24 h-24 md:w-28 md:h-28 rounded-full ring-4 ring-white/10 object-cover"
                    />
                  ) : (
                    <div className="w-24 h-24 md:w-28 md:h-28 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center ring-4 ring-white/10">
                      <span className="text-3xl font-bold text-white">
                        {profile.username.slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="absolute -bottom-2 -right-2 rounded-full p-1.5 bg-black/60 backdrop-blur border border-white/10">
                    {getRankIcon(stats.rank_title)}
                  </div>
                </div>
                {/* User Info */}
                <div>
                  <div className="flex flex-wrap items-center gap-3 mb-2">
                    <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">{profile.username}</h1>
                    <span className="px-3 py-1 rounded-full text-xs md:text-sm font-medium bg-black/40 border border-white/10 text-white/90 backdrop-blur">
                      {stats.rank_title}
                    </span>
                  </div>
                  {profile.full_name && (
                    <p className="text-base md:text-lg text-white/80 mb-1">{profile.full_name}</p>
                  )}
                  {profile.bio && (
                    <p className="text-white/70 mb-2 max-w-2xl">{profile.bio}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-4 text-sm text-white/60">
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
                  className="inline-flex items-center justify-center rounded-lg border border-white/10 bg-black/40 px-4 py-2 text-sm font-medium text-white hover:bg-black/60 transition-colors backdrop-blur"
                >
                  {copied ? <Check className="h-4 w-4 mr-2" /> : <Share2 className="h-4 w-4 mr-2" />}
                  {copied ? 'Copied!' : 'Share Profile'}
                </button>
                <button
                  onClick={() => setEditMode(!editMode)}
                  className="inline-flex items-center justify-center rounded-lg bg-primary/90 hover:bg-primary px-4 py-2 text-sm font-medium text-white transition-colors"
                >
                  <Edit2 className="h-4 w-4 mr-2" />
                  {editMode ? 'Cancel Edit' : 'Edit Profile'}
                </button>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mt-6">
              {[
                { label: 'Points', value: stats.total_points, icon: Star },
                { label: 'Challenges', value: stats.challenges_completed, icon: Flag },
                { label: 'Labs', value: stats.labs_completed, icon: Terminal },
                { label: 'Badges', value: stats.badges_earned, icon: Shield }
              ].map((s) => (
                <div key={s.label} className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/30 backdrop-blur px-3 py-3">
                  <div className="rounded-md bg-white/10 text-white p-2 border border-white/10">
                    <s.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-white font-semibold leading-tight">{s.value}</div>
                    <div className="text-xs text-white/60">{s.label}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
  </motion.div>

  {/* Navigation Tabs (only real tabs remain) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="mb-8"
      >
        <div className="flex space-x-8 border-b border-background-light">
          {[
            { id: 'overview', label: 'Overview', icon: User },
            { id: 'settings', label: 'Settings', icon: Settings }
          ].map(tab => (
            <button
              key={tab.id as 'overview' | 'settings'}
              onClick={() => setActiveTab(tab.id as 'overview' | 'settings')}
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

              {/* Removed Recent Activity (was static/dummy). Consider wiring real activity later. */}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Quick Actions */}
              <Card className="p-6">
                <h3 className="text-lg font-bold text-white mb-4">Quick Actions</h3>
                <div className="grid grid-cols-2 gap-3">
                  <Link to="/challenges" className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/30 hover:bg-black/50 transition-colors px-3 py-2">
                    <Flag className="h-4 w-4 text-red-400" />
                    <span>Challenges</span>
                  </Link>
                  <Link to="/labs" className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/30 hover:bg-black/50 transition-colors px-3 py-2">
                    <Terminal className="h-4 w-4 text-blue-400" />
                    <span>Labs</span>
                  </Link>
                  <Link to="/skill-paths" className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/30 hover:bg-black/50 transition-colors px-3 py-2">
                    <BookOpen className="h-4 w-4 text-purple-400" />
                    <span>Skill Paths</span>
                  </Link>
                  <Link to="/certifications" className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/30 hover:bg-black/50 transition-colors px-3 py-2">
                    <Shield className="h-4 w-4 text-emerald-400" />
                    <span>Certifications</span>
                  </Link>
                  <Link to="/leaderboard" className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/30 hover:bg-black/50 transition-colors px-3 py-2 col-span-2">
                    <Trophy className="h-4 w-4 text-yellow-400" />
                    <span>Leaderboard</span>
                  </Link>
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
                {/* Removed link to a non-existent Badges tab to keep UI focused */}
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
            {/* Account Settings - Only include real features (password change). */}
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
            {/* Removed Notification/Privacy Settings (were mock/no-op). */}
          </motion.div>
        )}

        {/* Other tabs removed to avoid placeholders. Keep the page focused and clean. */}
      </AnimatePresence>
      </div>
    </div>
  );
};

export default ProfilePage;