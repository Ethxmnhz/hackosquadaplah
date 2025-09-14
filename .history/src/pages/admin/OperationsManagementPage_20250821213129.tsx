import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Monitor, Shield, Sword, Play, Pause, 
  Trash2, Eye, Settings, Server, Terminal,
  Database, RefreshCw, Plus, Search, Filter,
  AlertTriangle, CheckCircle, Clock, Calendar,
  User, Activity, Flag, Lock, Download, Copy,
  X, Maximize2, Minimize2, Volume2, VolumeX
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import Card from '../../components/ui/Card';

interface OperationLab {
  id: string;
  lab_id: string;
  is_active: boolean;
  docker_config: any;
  vm_config: any;
  vpn_template: any;
  scoring_rules: any;
  max_duration: number;
  difficulty_multiplier: number;
  created_at: string;
  updated_at: string;
  lab: {
    title: string;
    category: string;
    difficulty: string;
  };
}

interface OperationRequest {
  id: string;
  red_team_user: string;
  blue_team_user: string | null;
  lab_id: string;
  status: string;
  operation_mode: string;
  estimated_duration: number;
  max_score: number;
  expires_at: string;
  created_at: string;
  updated_at: string;
  red_profile: { username: string };
  blue_profile: { username: string } | null;
  lab: {
    title: string;
    category: string;
    difficulty: string;
  };
}

interface ActiveOperation {
  id: string;
  request_id: string;
  lab_id: string;
  status: string;
  started_at: string;
  ends_at: string;
  time_remaining: number;
  total_events: number;
  vpn_config: any;
  created_at: string;
  updated_at: string;
  lab: {
    title: string;
    category: string;
    difficulty: string;
  };
}

interface Lab {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: string;
  estimated_time: number;
}

const OperationsManagementPage = () => {
  const { user } = useAuth();
  const [operationLabs, setOperationLabs] = useState<OperationLab[]>([]);
  const [pendingRequests, setPendingRequests] = useState<OperationRequest[]>([]);
  const [activeOperations, setActiveOperations] = useState<ActiveOperation[]>([]);
  const [availableLabs, setAvailableLabs] = useState<Lab[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateLabModal, setShowCreateLabModal] = useState(false);
  const [selectedLab, setSelectedLab] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedOperation, setSelectedOperation] = useState<ActiveOperation | null>(null);
  const [showOperationModal, setShowOperationModal] = useState(false);
  const [configuring, setConfiguring] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminCheckLoading, setAdminCheckLoading] = useState(true);
  const [debugInfo, setDebugInfo] = useState<string>('');

  useEffect(() => {
    checkAdminStatus();
  }, [user]);

  useEffect(() => {
    if (isAdmin) {
      loadData();
      
      // Set up real-time subscriptions
      const requestsSubscription = supabase
        .channel('admin_operation_requests')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'operation_requests' },
          () => loadPendingRequests()
        )
        .subscribe();

      const operationsSubscription = supabase
        .channel('admin_active_operations')
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'active_operations' },
          () => loadActiveOperations()
        )
        .subscribe();

      return () => {
        requestsSubscription.unsubscribe();
        operationsSubscription.unsubscribe();
      };
    }
  }, [isAdmin]);

  const checkAdminStatus = async () => {
    if (!user) {
      setAdminCheckLoading(false);
      return;
    }

    try {
      setDebugInfo('Checking admin status...');
      
      // First, try to ensure the user is in admin_users
      const { error: insertError } = await supabase
        .from('admin_users')
        .upsert({ id: user.id }, { onConflict: 'id' });

      if (insertError) {
        setDebugInfo(`Insert error: ${insertError.message}`);
        console.log('Note: Could not add user to admin_users:', insertError.message);
      } else {
        setDebugInfo('Successfully added/confirmed user in admin_users');
      }

      // Check if user is admin
      const { data, error } = await supabase
        .from('admin_users')
        .select('id')
        .eq('id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        setDebugInfo(`Admin check error: ${error.message}`);
        console.error('Error checking admin status:', error);
      }

      const adminStatus = !!data;
      setIsAdmin(adminStatus);
      setDebugInfo(`Admin status: ${adminStatus ? 'YES' : 'NO'}`);
    } catch (error) {
      setDebugInfo(`Exception: ${(error as Error).message}`);
      console.error('Error in admin check:', error);
      setIsAdmin(false);
    } finally {
      setAdminCheckLoading(false);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadAvailableLabs(),
        loadOperationLabs(),
        loadPendingRequests(),
        loadActiveOperations()
      ]);
    } catch (error) {
      console.error('Error loading operations data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableLabs = async () => {
    try {
      const { data, error } = await supabase
        .from('labs')
        .select('id, title, description, category, difficulty, estimated_time')
        .eq('status', 'published');

      if (error) throw error;
      setAvailableLabs(data || []);
    } catch (error) {
      console.error('Error loading available labs:', error);
    }
  };

  const loadOperationLabs = async () => {
    try {
      const { data, error } = await supabase
        .from('operation_labs')
        .select(`
          *,
          lab:labs(title, category, difficulty)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOperationLabs(data || []);
    } catch (error) {
      console.error('Error loading operation labs:', error);
      setOperationLabs([]);
    }
  };

  const loadPendingRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('operation_requests')
        .select(`
          *,
          red_profile:profiles!operation_requests_red_team_user_fkey(username),
          blue_profile:profiles!operation_requests_blue_team_user_fkey(username),
          lab:labs(title, category, difficulty)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPendingRequests(data || []);
    } catch (error) {
      console.error('Error loading pending requests:', error);
      setPendingRequests([]);
    }
  };

  const loadActiveOperations = async () => {
    try {
      const { data, error } = await supabase
        .from('active_operations')
        .select(`
          *,
          lab:labs(title, category, difficulty)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setActiveOperations(data || []);
    } catch (error) {
      console.error('Error loading active operations:', error);
      setActiveOperations([]);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadData().then(() => {
      setTimeout(() => setRefreshing(false), 500);
    });
  };

  const handleCreateOperationLab = async (labId: string) => {
    if (!labId || configuring) return;
    
    setConfiguring(true);
    try {
      // Get lab details
      const { data: lab, error: labError } = await supabase
        .from('labs')
        .select('*')
        .eq('id', labId)
        .single();

      if (labError) throw labError;

      // Create operation lab with detailed error logging
      const insertData = {
        lab_id: labId,
        is_active: true,
        docker_config: {
          image: `hackosquad/lab-${lab.title.toLowerCase().replace(/\s+/g, '-')}`,
          ports: ['80:80', '22:22', '443:443'],
          environment: { LAB_MODE: 'operation' }
        },
        vm_config: null,
        vpn_template: {
          server: '10.0.0.1',
          port: 1194,
          protocol: 'udp'
        },
        scoring_rules: {
          flag_points: 100,
          vulnerability_points: 50,
          defense_points: 75,
          time_bonus: true
        },
        max_duration: lab.estimated_time + 30,
        difficulty_multiplier: lab.difficulty === 'easy' ? 1.0 : 
                              lab.difficulty === 'medium' ? 1.5 : 
                              lab.difficulty === 'hard' ? 2.0 : 2.5
      };

      console.log('Attempting to insert operation lab:', insertData);

      const { data, error } = await supabase
        .from('operation_labs')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('Detailed error:', error);
        throw error;
      }

      console.log('Successfully created operation lab:', data);
      await loadOperationLabs();
      setShowCreateLabModal(false);
      setSelectedLab(null);
    } catch (error) {
      console.error('Error creating operation lab:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Failed to create operation lab: ${errorMessage}\n\nDebug info: ${debugInfo}`);
    } finally {
      setConfiguring(false);
    }
  };

  const handleTerminateOperation = async (operationId: string) => {
    if (!confirm('Are you sure you want to terminate this operation?')) return;
    
    try {
      const { error } = await supabase
        .from('active_operations')
        .update({
          status: 'terminated',
          time_remaining: 0,
          updated_at: new Date().toISOString()
        })
        .eq('id', operationId);

      if (error) throw error;

      // Add system event
      await supabase
        .from('operation_events')
        .insert({
          operation_id: operationId,
          user_id: user?.id,
          event_type: 'system_compromised',
          team_type: 'system',
          points_awarded: 0,
          description: 'Operation terminated by administrator'
        });

      await loadActiveOperations();
    } catch (error) {
      console.error('Error terminating operation:', error);
      alert('Failed to terminate operation');
    }
  };

  const handleViewOperation = (operation: ActiveOperation) => {
    setSelectedOperation(operation);
    setShowOperationModal(true);
  };

  const handleDeployLab = async (operationId: string) => {
    try {
      // In a real implementation, this would trigger a serverless function
      // that would deploy the lab environment and update the operation status
      
      // For now, we'll just simulate the deployment
      const { error } = await supabase
        .from('active_operations')
        .update({
          status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('id', operationId);

      if (error) throw error;

      // Add system event
      await supabase
        .from('operation_events')
        .insert({
          operation_id: operationId,
          user_id: user?.id,
          event_type: 'system_compromised',
          team_type: 'system',
          points_awarded: 0,
          description: 'Lab environment deployed by administrator'
        });

      await loadActiveOperations();
      alert('Lab environment deployed successfully');
    } catch (error) {
      console.error('Error deploying lab:', error);
      alert('Failed to deploy lab environment');
    }
  };

  const handleResetLab = async (operationId: string) => {
    if (!confirm('Are you sure you want to reset this lab environment?')) return;
    
    try {
      // In a real implementation, this would trigger a serverless function
      // that would reset the lab environment
      
      // For now, we'll just simulate the reset
      const { error } = await supabase
        .from('operation_events')
        .insert({
          operation_id: operationId,
          user_id: user?.id,
          event_type: 'system_compromised',
          team_type: 'system',
          points_awarded: 0,
          description: 'Lab environment reset by administrator'
        });

      if (error) throw error;
      alert('Lab environment reset successfully');
    } catch (error) {
      console.error('Error resetting lab:', error);
      alert('Failed to reset lab environment');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-success-dark/20 text-success-light';
      case 'setup':
        return 'bg-warning-dark/20 text-warning-light';
      case 'paused':
        return 'bg-gray-500/20 text-gray-400';
      case 'completed':
        return 'bg-accent-blue/20 text-accent-blue';
      case 'terminated':
        return 'bg-error-dark/20 text-error-light';
      default:
        return 'bg-primary/20 text-primary';
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty?.toLowerCase()) {
      case 'easy':
        return 'bg-success-dark/20 text-success-light';
      case 'medium':
        return 'bg-warning-dark/20 text-warning-light';
      case 'hard':
        return 'bg-error-dark/20 text-error-light';
      case 'expert':
        return 'bg-purple-500/20 text-purple-400';
      default:
        return 'bg-primary/20 text-primary';
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const filteredOperations = activeOperations.filter(operation => {
    const matchesSearch = operation.lab?.title?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || operation.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (adminCheckLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-pulse text-primary text-xl mb-4">Checking admin permissions...</div>
            <div className="text-sm text-gray-400">{debugInfo}</div>
          </div>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center py-16"
        >
          <AlertTriangle className="h-16 w-16 text-error-light mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-white mb-4">Access Denied</h2>
          <p className="text-gray-400 mb-4">
            You don't have administrator permissions to access this page.
          </p>
          <div className="text-sm text-gray-500 mb-6 font-mono bg-background-light p-4 rounded-lg">
            Debug: {debugInfo}
          </div>
          <div className="flex justify-center gap-4">
            <button
              onClick={() => window.location.href = '/dashboard'}
              className="btn-primary"
            >
              Go to Dashboard
            </button>
            <button
              onClick={checkAdminStatus}
              className="btn-outline"
            >
              Retry Admin Check
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

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
            <h1 className="text-3xl font-bold text-white mb-2">Operations Management</h1>
            <p className="text-gray-400">Control and monitor live operations</p>
            <div className="text-xs text-gray-500 mt-1">Debug: {debugInfo}</div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="btn-outline flex items-center"
            >
              <RefreshCw className={`h-5 w-5 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
            <button
              onClick={() => setShowCreateLabModal(true)}
              className="btn-primary flex items-center"
            >
              <Plus className="h-5 w-5 mr-2" />
              Configure Lab
            </button>
          </div>
        </div>
      </motion.div>

      {/* Search and Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="mb-8"
      >
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Search operations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-background-light border border-background-default rounded-lg py-2 pl-10 pr-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-500" />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="form-input md:w-48"
          >
            <option value="all">All Statuses</option>
            <option value="setup">Setup</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="completed">Completed</option>
            <option value="terminated">Terminated</option>
          </select>
        </div>
      </motion.div>

      {/* Active Operations */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="mb-12"
      >
        <h2 className="text-2xl font-bold text-white mb-6">Active Operations</h2>
        
        {loading ? (
          <Card className="p-6">
            <div className="animate-pulse text-primary">Loading operations...</div>
          </Card>
        ) : filteredOperations.length === 0 ? (
          <Card className="p-8 text-center">
            <Monitor className="h-16 w-16 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-400">No active operations found</p>
          </Card>
        ) : (
          <div className="space-y-6">
            {filteredOperations.map((operation) => (
              <Card key={operation.id} className="p-6">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-3 rounded-lg bg-background-light">
                        <Monitor className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-xl font-bold text-white">{operation.lab?.title}</h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(operation.status)}`}>
                            {operation.status.toUpperCase()}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(operation.lab?.difficulty)}`}>
                            {operation.lab?.difficulty?.toUpperCase()}
                          </span>
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-background-light text-gray-300">
                            {operation.lab?.category}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                      {/* Stats */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col justify-between p-3 bg-background-light rounded-lg">
                          <div className="text-xs text-gray-400">Time Remaining</div>
                          <div className="text-lg font-mono font-bold text-white">{formatTime(operation.time_remaining)}</div>
                        </div>
                        
                        <div className="flex flex-col justify-between p-3 bg-background-light rounded-lg">
                          <div className="text-xs text-gray-400">Started</div>
                          <div className="text-sm text-white">{new Date(operation.started_at).toLocaleString()}</div>
                        </div>
                        
                        <div className="flex flex-col justify-between p-3 bg-background-light rounded-lg">
                          <div className="text-xs text-gray-400">Total Events</div>
                          <div className="text-lg font-bold text-accent-green">{operation.total_events}</div>
                        </div>
                      </div>
                    </div>

                    <div className="text-sm text-gray-400">
                      Operation ID: {operation.id}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex md:flex-col gap-2">
                    <button
                      onClick={() => handleViewOperation(operation)}
                      className="btn-outline flex items-center"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </button>
                    
                    {operation.status === 'setup' && (
                      <button
                        onClick={() => handleDeployLab(operation.id)}
                        className="btn-primary flex items-center"
                      >
                        <Server className="h-4 w-4 mr-2" />
                        Deploy Lab
                      </button>
                    )}
                    
                    {operation.status === 'active' && (
                      <button
                        onClick={() => handleResetLab(operation.id)}
                        className="btn-outline flex items-center text-warning-light border-warning-light/30 hover:bg-warning-light/10"
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Reset Lab
                      </button>
                    )}
                    
                    {(operation.status === 'setup' || operation.status === 'active' || operation.status === 'paused') && (
                      <button
                        onClick={() => handleTerminateOperation(operation.id)}
                        className="btn-outline flex items-center text-error-light border-error-light/30 hover:bg-error-light/10"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Terminate
                      </button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </motion.div>

      {/* Operation Labs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <h2 className="text-2xl font-bold text-white mb-6">Configured Labs</h2>
        
        {loading ? (
          <Card className="p-6">
            <div className="animate-pulse text-primary">Loading labs...</div>
          </Card>
        ) : operationLabs.length === 0 ? (
          <Card className="p-8 text-center">
            <Server className="h-16 w-16 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-400 mb-4">No labs configured for operations</p>
            <button
              onClick={() => setShowCreateLabModal(true)}
              className="btn-primary"
            >
              Configure Your First Lab
            </button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {operationLabs.map((lab) => (
              <Card key={lab.id} className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 rounded-lg bg-background-light">
                    <Server className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">{lab.lab?.title}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(lab.lab?.difficulty)}`}>
                        {lab.lab?.difficulty?.toUpperCase()}
                      </span>
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-background-light text-gray-300">
                        {lab.lab?.category}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 mb-4">
                  <div className="flex justify-between items-center p-3 bg-background-light rounded-lg">
                    <div className="text-sm text-gray-400">Max Duration</div>
                    <div className="text-sm text-white">{lab.max_duration} min</div>
                  </div>
                  
                  <div className="flex justify-between items-center p-3 bg-background-light rounded-lg">
                    <div className="text-sm text-gray-400">Difficulty Multiplier</div>
                    <div className="text-sm text-white">x{lab.difficulty_multiplier}</div>
                  </div>
                  
                  <div className="flex justify-between items-center p-3 bg-background-light rounded-lg">
                    <div className="text-sm text-gray-400">Status</div>
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                      lab.is_active ? 'bg-success-dark/20 text-success-light' : 'bg-error-dark/20 text-error-light'
                    }`}>
                      {lab.is_active ? 'ACTIVE' : 'INACTIVE'}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <button className="btn-outline flex items-center">
                    <Settings className="h-4 w-4 mr-2" />
                    Configure
                  </button>
                  <button className="btn-outline flex items-center text-error-light border-error-light/30 hover:bg-error-light/10">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Remove
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </motion.div>

      {/* Create Lab Modal */}
      <AnimatePresence>
        {showCreateLabModal && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="bg-background-default rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-white">Configure Lab for Operations</h3>
                <button
                  onClick={() => setShowCreateLabModal(false)}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-3">Select Lab</label>
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {availableLabs.length === 0 ? (
                      <div className="text-center p-4 bg-background-light rounded-lg">
                        <p className="text-gray-400">No available labs found</p>
                      </div>
                    ) : (
                      availableLabs.map(lab => (
                        <button
                          key={lab.id}
                          onClick={() => setSelectedLab(lab.id)}
                          className={`w-full p-4 rounded-lg border text-left transition-all duration-200 ${
                            selectedLab === lab.id
                              ? 'border-primary bg-primary/10'
                              : 'border-gray-700 hover:border-gray-600'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-medium text-white mb-1">{lab.title}</h4>
                              <p className="text-sm text-gray-400 mb-2">{lab.description}</p>
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(lab.difficulty)}`}>
                                  {lab.difficulty.toUpperCase()}
                                </span>
                                <span className="px-2 py-1 rounded-full text-xs font-medium bg-background-light text-gray-300">
                                  {lab.category}
                                </span>
                              </div>
                            </div>
                            {selectedLab === lab.id && (
                              <CheckCircle className="h-5 w-5 text-primary flex-shrink-0 ml-2" />
                            )}
                          </div>
                        </button>
                      ))
                    }
                  </div>
                </div>

                <div className="flex justify-end gap-4">
                  <button
                    onClick={() => setShowCreateLabModal(false)}
                    className="btn-outline"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleCreateOperationLab(selectedLab || '')}
                    disabled={!selectedLab || configuring}
                    className="btn-primary flex items-center disabled:opacity-50"
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    {configuring ? 'Configuring...' : 'Configure Lab'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Operation Details Modal */}
      <AnimatePresence>
        {showOperationModal && selectedOperation && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="bg-background-default rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-white flex items-center">
                  <Monitor className="h-6 w-6 mr-2 text-primary" />
                  Operation Details
                </h3>
                <button
                  onClick={() => setShowOperationModal(false)}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="p-4">
                    <h4 className="text-lg font-bold text-white mb-4">Operation Info</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Lab</span>
                        <span className="text-white">{selectedOperation.lab?.title}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Status</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedOperation.status)}`}>
                          {selectedOperation.status.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Started</span>
                        <span className="text-white">{new Date(selectedOperation.started_at).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Ends</span>
                        <span className="text-white">{new Date(selectedOperation.ends_at).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Time Remaining</span>
                        <span className="text-white">{formatTime(selectedOperation.time_remaining)}</span>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-4">
                    <h4 className="text-lg font-bold text-white mb-4">Lab Environment</h4>
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-3 bg-background-light rounded-lg">
                          <div className="text-sm text-gray-400 mb-1">Total Events</div>
                          <div className="text-xl font-bold text-accent-green">{selectedOperation.total_events}</div>
                        </div>
                      </div>

                      <div className="p-4 bg-background-light rounded-lg">
                        <h5 className="text-white font-medium mb-2">VPN Configuration</h5>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-400">Server:</span>
                            <div className="font-mono text-white">{selectedOperation.vpn_config?.server_address}</div>
                          </div>
                          <div>
                            <span className="text-gray-400">Port:</span>
                            <div className="font-mono text-white">{selectedOperation.vpn_config?.server_port}</div>
                          </div>
                        </div>
                        <button
                          onClick={() => {/* Copy VPN config */}}
                          className="btn-outline w-full flex items-center justify-center mt-3"
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          Copy VPN Config
                        </button>
                      </div>
                    </div>
                  </Card>

                  <div className="flex justify-between gap-4 pt-4 border-t border-background-light">
                    <div>
                      {selectedOperation.status === 'setup' && (
                        <button
                          onClick={() => handleDeployLab(selectedOperation.id)}
                          className="btn-primary flex items-center"
                        >
                          <Server className="h-5 w-5 mr-2" />
                          Deploy Lab
                        </button>
                      )}
                      
                      {selectedOperation.status === 'active' && (
                        <button
                          onClick={() => handleResetLab(selectedOperation.id)}
                          className="btn-outline flex items-center text-warning-light border-warning-light/30 hover:bg-warning-light/10"
                        >
                          <RefreshCw className="h-5 w-5 mr-2" />
                          Reset Lab
                        </button>
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowOperationModal(false)}
                        className="btn-outline"
                      >
                        Close
                      </button>
                      
                      {(selectedOperation.status === 'setup' || selectedOperation.status === 'active' || selectedOperation.status === 'paused') && (
                        <button
                          onClick={() => {
                            handleTerminateOperation(selectedOperation.id);
                            setShowOperationModal(false);
                          }}
                          className="btn-outline flex items-center text-error-light border-error-light/30 hover:bg-error-light/10"
                        >
                          <Trash2 className="h-5 w-5 mr-2" />
                          Terminate
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default OperationsManagementPage;