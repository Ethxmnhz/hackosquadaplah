import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sword, Target, Shield, Flame, Users, Play, 
  Rocket, UserPlus, Eye, Timer, Trophy, Lock,
  ChevronRight, Star, Activity, Zap, Flag, Terminal,
  Plus, Search, RefreshCw, Clock, AlertTriangle,
  CheckCircle, Calendar, User
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useOperations } from '../../hooks/useOperations';
import { CreateOperationData } from '../../types/operations';
import Card from '../../components/ui/Card';
import OperationRequestCard from '../../components/operations/OperationRequestCard';
import ActiveOperationCard from '../../components/operations/ActiveOperationCard';
import OperationInterface from '../../components/operations/OperationInterface';

const RedTeamPage = () => {
  const { user } = useAuth();
  const { 
    availableLabs,
    loading,
    refreshData,
    createOperationRequest,
    getUserOperations,
    getAvailableOperations
  } = useOperations();

  const [selectedLab, setSelectedLab] = useState<string>('');
  const [operationMode, setOperationMode] = useState<'live' | 'ai'>('live');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeOperationId, setActiveOperationId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [creating, setCreating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Get user-specific operations for red team
  const userOperations = getUserOperations();

  const handleCreateOperation = async () => {
    if (!selectedLab || creating) return;
    
    setCreating(true);
    try {
      const data: CreateOperationData = {
        lab_id: selectedLab,
        mode: operationMode,
        team_type: 'red',
        estimated_duration: 60,
        max_score: 1000
      };
      
      await createOperationRequest(data);
      setShowCreateModal(false);
      setSelectedLab('');
    } catch (error) {
      console.error('Error creating operation:', error);
      alert('Failed to create operation. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const handleJoinOperation = async (operationId: string) => {
    setActiveOperationId(operationId);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    refreshData();
    setTimeout(() => setRefreshing(false), 1000);
  };

  // Filter operations based on search
  const filteredRequests = userOperations.requests.filter(request => {
    const matchesSearch = request.lab.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const filteredOperations = userOperations.operations.filter(operation => {
    const matchesSearch = operation.lab.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const stats = [
    { label: 'Active Operations', value: filteredOperations.length, icon: Activity, color: 'text-primary' },
    { label: 'Pending Requests', value: filteredRequests.length, icon: Clock, color: 'text-warning-light' },
    { label: 'Total Attacks', value: '47', icon: Sword, color: 'text-accent-green' },
    { label: 'Success Rate', value: '73%', icon: Target, color: 'text-accent-blue' }
  ];

  if (activeOperationId) {
    return (
      <OperationInterface 
        operationId={activeOperationId}
        onClose={() => setActiveOperationId(null)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background-dark">
      {/* Hero Section */}
      <div className="relative h-[400px] overflow-hidden bg-gradient-to-br from-primary/20 via-background-dark to-background-dark">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background-dark/50 to-background-dark"></div>
        
        <div className="relative h-full flex items-center">
          <div className="max-w-7xl mx-auto px-4 w-full">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="max-w-3xl"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="p-4 rounded-full bg-primary/10 border border-primary/30">
                  <Sword className="h-12 w-12 text-primary" />
                </div>
                <div>
                  <h1 className="text-5xl font-bold text-white mb-2">
                    Red Team <span className="text-primary">Operations</span>
                  </h1>
                  <p className="text-xl text-gray-300">
                    Master the art of offensive cybersecurity through live operations
                  </p>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-4">
                <button 
                  onClick={() => setShowCreateModal(true)}
                  className="btn-primary flex items-center text-lg px-6 py-3"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Create Operation
                </button>
                <button 
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="btn-outline flex items-center text-lg px-6 py-3 border-primary text-primary hover:bg-primary/10"
                >
                  <RefreshCw className={`h-5 w-5 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                  {refreshing ? 'Refreshing...' : 'Refresh'}
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="bg-background-default border-y border-background-light">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card className="p-6 border border-primary/30 bg-primary/5">
                  <div className="flex items-center">
                    <div className={`p-3 rounded-lg bg-background-light ${stat.color}`}>
                      <stat.icon className="h-6 w-6" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm text-gray-400">{stat.label}</p>
                      <p className="text-2xl font-bold text-white">{stat.value}</p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Search Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className="relative max-w-md">
            <input
              type="text"
              placeholder="Search operations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-background-light border border-background-default rounded-lg py-3 pl-12 pr-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            <Search className="absolute left-4 top-3.5 h-5 w-5 text-gray-500" />
          </div>
        </motion.div>

        {/* Active Operations */}
        {filteredOperations.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mb-12"
          >
            <h2 className="text-3xl font-bold text-white mb-6 flex items-center">
              <Activity className="h-8 w-8 mr-3 text-primary" />
              Active Operations
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredOperations.map((operation) => (
                <ActiveOperationCard
                  key={operation.id}
                  operation={operation}
                  userTeamType="red"
                  onJoin={() => handleJoinOperation(operation.id)}
                  isUserOperation={true}
                />
              ))}
            </div>
          </motion.div>
        )}

        {/* Pending Requests */}
        {filteredRequests.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mb-12"
          >
            <h2 className="text-3xl font-bold text-white mb-6 flex items-center">
              <Clock className="h-8 w-8 mr-3 text-warning-light" />
              Pending Requests
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredRequests.map((request) => (
                <OperationRequestCard
                  key={request.id}
                  request={request}
                  userTeamType="red"
                  isUserRequest={true}
                />
              ))}
            </div>
          </motion.div>
        )}

        {/* Empty State */}
        {!loading && filteredRequests.length === 0 && filteredOperations.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card className="p-12 text-center border border-primary/30">
              <Sword className="h-16 w-16 text-primary mx-auto mb-6" />
              <h3 className="text-2xl font-bold text-white mb-4">No Operations Yet</h3>
              <p className="text-gray-400 mb-6 max-w-md mx-auto">
                Create your first operation to start attacking target environments and compete against blue teams.
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="btn-primary"
              >
                Create Your First Operation
              </button>
            </Card>
          </motion.div>
        )}

        {/* Red Team Guide */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-12"
        >
          <Card className="p-8 border border-primary/30">
            <h2 className="text-2xl font-bold text-white mb-6 text-center">Red Team Operations Guide</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Target className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">1. Create Operation</h3>
                <p className="text-gray-400">Select a target lab environment and create an operation request. Choose your attack strategy and estimated time.</p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-accent-blue/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield className="h-8 w-8 text-accent-blue" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">2. Wait for Defender</h3>
                <p className="text-gray-400">Blue team defenders will see your request and can accept the challenge. You'll be notified when someone joins.</p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-success-dark/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Zap className="h-8 w-8 text-success-light" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">3. Execute Attack</h3>
                <p className="text-gray-400">Connect via VPN, scan for vulnerabilities, capture flags, and score points while the blue team tries to stop you.</p>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Create Operation Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="bg-background-default rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-primary/30"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-white flex items-center">
                  <Sword className="h-6 w-6 mr-2 text-primary" />
                  Create Red Team Operation
                </h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-6">
                {/* Mode Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-3">Operation Mode</label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => setOperationMode('live')}
                      className={`p-4 rounded-lg border transition-all duration-200 ${
                        operationMode === 'live'
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-gray-700 hover:border-gray-600 text-gray-400'
                      }`}
                    >
                      <Users className="h-6 w-6 mx-auto mb-2" />
                      <div className="font-medium">Live vs Blue Team</div>
                      <div className="text-xs mt-1">Fight against real defenders</div>
                    </button>
                    <button
                      onClick={() => setOperationMode('ai')}
                      disabled
                      className="p-4 rounded-lg border border-gray-700 text-gray-600 cursor-not-allowed opacity-50"
                    >
                      <Zap className="h-6 w-6 mx-auto mb-2" />
                      <div className="font-medium">AI Defender</div>
                      <div className="text-xs mt-1">Coming Soon</div>
                    </button>
                  </div>
                </div>

                {/* Lab Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-3">Select Target Environment</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                    {availableLabs.map((lab) => (
                      <button
                        key={lab.id}
                        onClick={() => setSelectedLab(lab.id)}
                        className={`p-4 rounded-lg border text-left transition-all duration-200 ${
                          selectedLab === lab.id
                            ? 'border-primary bg-primary/10'
                            : 'border-gray-700 hover:border-gray-600'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-white mb-1">{lab.name}</h4>
                            <p className="text-sm text-gray-400 mb-3 line-clamp-2">{lab.description}</p>
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                lab.difficulty === 'easy' ? 'bg-success-dark/20 text-success-light' :
                                lab.difficulty === 'medium' ? 'bg-warning-dark/20 text-warning-light' :
                                lab.difficulty === 'hard' ? 'bg-error-dark/20 text-error-light' :
                                'bg-purple-500/20 text-purple-400'
                              }`}>
                                {lab.difficulty.toUpperCase()}
                              </span>
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-background-light text-gray-300">
                                {lab.estimated_duration} min
                              </span>
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-primary/20 text-primary">
                                {lab.category}
                              </span>
                            </div>
                          </div>
                          {selectedLab === lab.id && (
                            <CheckCircle className="h-5 w-5 text-primary flex-shrink-0 ml-2" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-4 pt-4 border-t border-background-light">
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="btn-outline"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateOperation}
                    disabled={!selectedLab || operationMode === 'ai' || creating}
                    className="btn-primary flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Rocket className="h-5 w-5 mr-2" />
                    {creating ? 'Creating Operation...' : 'Launch Attack'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default RedTeamPage;