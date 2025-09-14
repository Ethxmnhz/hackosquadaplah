import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sword, Shield, Users, Clock, Target, Zap, 
  Play, Pause, Settings, Monitor, Wifi, 
  AlertTriangle, CheckCircle, Eye, Activity,
  Server, Terminal, Globe, Lock, Plus, Search,
  Database, Wrench, Filter, RefreshCw, ArrowRight,
  Flame, Trophy, Timer, Calendar
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useOperations } from '../../hooks/useOperations';
import { CreateOperationData } from '../../types/operations';
import Card from '../../components/ui/Card';
import OperationRequestCard from '../../components/operations/OperationRequestCard';
import ActiveOperationCard from '../../components/operations/ActiveOperationCard';
import OperationInterface from '../../components/operations/OperationInterface';

const OperationsPage = () => {
  const { user } = useAuth();
  const { 
    availableLabs,
    pendingRequests,
    activeOperations,
    loading,
    tablesExist,
    refreshData,
    createOperationRequest,
    acceptOperationRequest,
    getUserOperations,
    getAvailableOperations
  } = useOperations();

  const [selectedLab, setSelectedLab] = useState<string>('');
  const [operationMode, setOperationMode] = useState<'live' | 'ai'>('live');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [userTeamType, setUserTeamType] = useState<'red' | 'blue'>('red');
  const [activeOperationId, setActiveOperationId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [accepting, setAccepting] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Get user-specific and available operations
  const userOperations = getUserOperations();
  const availableRequests = getAvailableOperations(userTeamType);

  const handleCreateOperation = async () => {
    if (!selectedLab || creating) return;
    
    setCreating(true);
    try {
      const data: CreateOperationData = {
        lab_id: selectedLab,
        mode: operationMode,
        team_type: userTeamType,
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

  const handleAcceptRequest = async (requestId: string) => {
    if (accepting) return;
    
    setAccepting(requestId);
    try {
      await acceptOperationRequest(requestId);
    } catch (error) {
      console.error('Error accepting request:', error);
      alert(error instanceof Error ? error.message : 'Failed to accept operation. Please try again.');
    } finally {
      setAccepting(null);
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
  const filteredRequests = availableRequests.filter(request => {
    const matchesSearch = request.lab.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const filteredUserRequests = userOperations.requests.filter(request => {
    const matchesSearch = request.lab.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const filteredOperations = userOperations.operations.filter(operation => {
    const matchesSearch = operation.lab.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  if (activeOperationId) {
    return (
      <OperationInterface 
        operationId={activeOperationId}
        onClose={() => setActiveOperationId(null)}
      />
    );
  }

  if (!tablesExist) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center py-16"
        >
          <Database className="h-16 w-16 text-gray-500 mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-white mb-4">Operations System Unavailable</h2>
          <p className="text-gray-400 mb-6">
            The live operations system requires database setup. Please contact an administrator to enable this feature.
          </p>
          <div className="flex justify-center gap-4">
            <button
              onClick={() => window.location.href = '/red-team'}
              className="btn-primary"
            >
              Go to Red Team
            </button>
            <button
              onClick={() => window.location.href = '/blue-team'}
              className="btn-outline"
            >
              Go to Blue Team
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-dark">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background-dark to-accent-blue/10">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background-dark/50 to-background-dark"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <div className="flex justify-center mb-6">
              <div className="p-4 rounded-full bg-primary/10 border border-primary/30">
                <Monitor className="h-12 w-12 text-primary" />
              </div>
            </div>
            <h1 className="text-5xl font-bold text-white mb-6">
              Live Cyber <span className="text-primary">Operations</span>
            </h1>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-8">
              Engage in real-time red team vs blue team cyber warfare. Attack and defend in live environments with professional-grade scenarios.
            </p>
            
            {/* Team Selection */}
            <div className="flex justify-center mb-8">
              <div className="bg-background-light rounded-2xl p-2 flex border border-background-default">
                <button
                  onClick={() => setUserTeamType('red')}
                  className={`flex items-center px-8 py-4 rounded-xl transition-all duration-300 ${
                    userTeamType === 'red'
                      ? 'bg-primary text-white shadow-lg transform scale-105'
                      : 'text-gray-400 hover:text-white hover:bg-background-default'
                  }`}
                >
                  <Sword className="h-6 w-6 mr-3" />
                  <div className="text-left">
                    <div className="font-bold">Red Team</div>
                    <div className="text-sm opacity-80">Offensive Operations</div>
                  </div>
                </button>
                <button
                  onClick={() => setUserTeamType('blue')}
                  className={`flex items-center px-8 py-4 rounded-xl transition-all duration-300 ${
                    userTeamType === 'blue'
                      ? 'bg-accent-blue text-white shadow-lg transform scale-105'
                      : 'text-gray-400 hover:text-white hover:bg-background-default'
                  }`}
                >
                  <Shield className="h-6 w-6 mr-3" />
                  <div className="text-left">
                    <div className="font-bold">Blue Team</div>
                    <div className="text-sm opacity-80">Defensive Operations</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap justify-center gap-4">
              <button 
                onClick={() => setShowCreateModal(true)}
                className="btn-primary flex items-center text-lg px-8 py-4"
              >
                <Plus className="h-6 w-6 mr-3" />
                Create Operation
              </button>
              <button 
                onClick={handleRefresh}
                disabled={refreshing}
                className="btn-outline flex items-center text-lg px-8 py-4 border-primary text-primary hover:bg-primary/10"
              >
                <RefreshCw className={`h-6 w-6 mr-3 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="bg-background-default border-y border-background-light">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { 
                label: 'Active Operations', 
                value: filteredOperations.length, 
                icon: Activity, 
                color: 'text-primary',
                bg: 'bg-primary/10'
              },
              { 
                label: 'Pending Requests', 
                value: filteredRequests.length, 
                icon: Clock, 
                color: 'text-warning-light',
                bg: 'bg-warning-dark/10'
              },
              { 
                label: 'Available Labs', 
                value: availableLabs.length, 
                icon: Server, 
                color: 'text-accent-blue',
                bg: 'bg-accent-blue/10'
              },
              { 
                label: 'Total Events', 
                value: '1,247', 
                icon: Zap, 
                color: 'text-accent-green',
                bg: 'bg-accent-green/10'
              }
            ].map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card className={`p-6 border ${stat.bg} border-opacity-30`}>
                  <div className="flex items-center">
                    <div className={`p-3 rounded-lg ${stat.bg} ${stat.color}`}>
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
              className="w-full bg-background-light border border-background-default rounded-xl py-3 pl-12 pr-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            <Search className="absolute left-4 top-3.5 h-5 w-5 text-gray-500" />
          </div>
        </motion.div>

        {/* Team-Specific Quick Access */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-12"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card 
              hover
              className={`p-8 border-2 cursor-pointer transition-all duration-300 ${
                userTeamType === 'red' 
                  ? 'border-primary/50 bg-primary/5 shadow-glow-sm' 
                  : 'border-primary/30 hover:border-primary/50'
              }`}
              onClick={() => window.location.href = '/red-team'}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="p-4 rounded-xl bg-primary/10">
                    <Sword className="h-10 w-10 text-primary" />
                  </div>
                  <div className="ml-6">
                    <h3 className="text-2xl font-bold text-white">Red Team Operations</h3>
                    <p className="text-gray-400 mt-1">Create attacks and offensive operations</p>
                    <div className="flex items-center mt-3 text-sm text-primary">
                      <Activity className="h-4 w-4 mr-2" />
                      {userOperations.requests.filter(r => r.red_team_user === user?.id).length} active requests
                    </div>
                  </div>
                </div>
                <ArrowRight className="h-8 w-8 text-primary" />
              </div>
            </Card>

            <Card 
              hover
              className={`p-8 border-2 cursor-pointer transition-all duration-300 ${
                userTeamType === 'blue' 
                  ? 'border-accent-blue/50 bg-accent-blue/5 shadow-glow-blue' 
                  : 'border-accent-blue/30 hover:border-accent-blue/50'
              }`}
              onClick={() => window.location.href = '/blue-team'}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="p-4 rounded-xl bg-accent-blue/10">
                    <Shield className="h-10 w-10 text-accent-blue" />
                  </div>
                  <div className="ml-6">
                    <h3 className="text-2xl font-bold text-white">Blue Team Defense</h3>
                    <p className="text-gray-400 mt-1">Defend against incoming attacks</p>
                    <div className="flex items-center mt-3 text-sm text-accent-blue">
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      {filteredRequests.length} incoming threats
                    </div>
                  </div>
                </div>
                <ArrowRight className="h-8 w-8 text-accent-blue" />
              </div>
            </Card>
          </div>
        </motion.div>

        {/* Your Operations */}
        {(filteredUserRequests.length > 0 || filteredOperations.length > 0) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mb-12"
          >
            <h2 className="text-3xl font-bold text-white mb-8 flex items-center">
              <Users className="h-8 w-8 mr-3 text-primary" />
              Your Operations
            </h2>
            
            {/* Active Operations */}
            {filteredOperations.length > 0 && (
              <div className="mb-8">
                <h3 className="text-xl font-medium text-gray-300 mb-6 flex items-center">
                  <Activity className="h-5 w-5 mr-2 text-success-light" />
                  Active Operations
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                  {filteredOperations.map((operation) => (
                    <ActiveOperationCard
                      key={operation.id}
                      operation={operation}
                      userTeamType={userTeamType}
                      onJoin={() => handleJoinOperation(operation.id)}
                      isUserOperation={true}
                    />
                  ))}
                </div>
              </div>
            )}
            
            {/* Pending Requests */}
            {filteredUserRequests.length > 0 && (
              <div>
                <h3 className="text-xl font-medium text-gray-300 mb-6 flex items-center">
                  <Clock className="h-5 w-5 mr-2 text-warning-light" />
                  Pending Requests
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                  {filteredUserRequests.map((request) => (
                    <OperationRequestCard
                      key={request.id}
                      request={request}
                      userTeamType={userTeamType}
                      isUserRequest={true}
                    />
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Available Operations */}
        {userTeamType === 'blue' && filteredRequests.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mb-12"
          >
            <h2 className="text-3xl font-bold text-white mb-8 flex items-center">
              <AlertTriangle className="h-8 w-8 mr-3 text-warning-light" />
              Incoming Attacks
              <span className="ml-4 px-3 py-1 bg-warning-dark/20 text-warning-light rounded-full text-lg font-medium">
                {filteredRequests.length} Active Threats
              </span>
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredRequests.map((request) => (
                <OperationRequestCard
                  key={request.id}
                  request={request}
                  userTeamType={userTeamType}
                  onAccept={() => handleAcceptRequest(request.id)}
                  accepting={accepting === request.id}
                />
              ))}
            </div>
          </motion.div>
        )}

        {/* Empty State */}
        {!loading && 
         filteredRequests.length === 0 && 
         filteredUserRequests.length === 0 && 
         filteredOperations.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card className="p-16 text-center border border-primary/30">
              <Monitor className="h-20 w-20 text-gray-500 mx-auto mb-8" />
              <h3 className="text-3xl font-bold text-white mb-6">No Operations Available</h3>
              <p className="text-gray-400 mb-8 max-w-md mx-auto text-lg">
                {userTeamType === 'red' 
                  ? "Create a new operation to start attacking target environments and challenge blue teams."
                  : "No incoming attacks to defend against. Check back later or switch to Red Team to create operations."
                }
              </p>
              <div className="flex flex-wrap gap-4 justify-center">
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="btn-primary text-lg px-8 py-4"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Create New Operation
                </button>
                <button
                  onClick={() => window.location.href = userTeamType === 'red' ? '/red-team' : '/blue-team'}
                  className="btn-outline text-lg px-8 py-4"
                >
                  Go to {userTeamType === 'red' ? 'Red' : 'Blue'} Team Dashboard
                </button>
              </div>
            </Card>
          </motion.div>
        )}

        {/* How It Works */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-16"
        >
          <Card className="p-12 border border-primary/30">
            <h2 className="text-3xl font-bold text-white mb-8 text-center">How Live Operations Work</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Target className="h-10 w-10 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-white mb-4">1. Select & Request</h3>
                <p className="text-gray-400 leading-relaxed">Choose a lab environment and create an operation request. Wait for an opponent to accept your challenge.</p>
              </div>
              
              <div className="text-center">
                <div className="w-20 h-20 bg-accent-blue/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Server className="h-10 w-10 text-accent-blue" />
                </div>
                <h3 className="text-xl font-bold text-white mb-4">2. Environment Setup</h3>
                <p className="text-gray-400 leading-relaxed">Blue team receives lab access and sets up defenses. VPN connection is established for red team access.</p>
              </div>
              
              <div className="text-center">
                <div className="w-20 h-20 bg-success-dark/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Activity className="h-10 w-10 text-success-light" />
                </div>
                <h3 className="text-xl font-bold text-white mb-4">3. Live Battle</h3>
                <p className="text-gray-400 leading-relaxed">Red team attacks while blue team defends in real-time. Score points for successful actions and strategic plays.</p>
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
              className="bg-background-default rounded-xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-primary/30"
            >
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-3xl font-bold text-white flex items-center">
                  <Sword className="h-8 w-8 mr-3 text-primary" />
                  Create New Operation
                </h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-400 hover:text-white text-2xl"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-8">
                {/* Mode Selection */}
                <div>
                  <label className="block text-lg font-medium text-gray-300 mb-4">Operation Mode</label>
                  <div className="grid grid-cols-2 gap-6">
                    <button
                      onClick={() => setOperationMode('live')}
                      className={`p-6 rounded-xl border transition-all duration-200 ${
                        operationMode === 'live'
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-gray-700 hover:border-gray-600 text-gray-400'
                      }`}
                    >
                      <Users className="h-8 w-8 mx-auto mb-3" />
                      <div className="font-medium text-lg">Live vs Blue Team</div>
                      <div className="text-sm mt-2 opacity-80">Fight against real defenders</div>
                    </button>
                    <button
                      onClick={() => setOperationMode('ai')}
                      disabled
                      className="p-6 rounded-xl border border-gray-700 text-gray-600 cursor-not-allowed opacity-50"
                    >
                      <Zap className="h-8 w-8 mx-auto mb-3" />
                      <div className="font-medium text-lg">AI Defender</div>
                      <div className="text-sm mt-2">Coming Soon</div>
                    </button>
                  </div>
                </div>

                {/* Lab Selection */}
                <div>
                  <label className="block text-lg font-medium text-gray-300 mb-4">Select Target Environment</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                    {availableLabs.map((lab) => (
                      <button
                        key={lab.id}
                        onClick={() => setSelectedLab(lab.id)}
                        className={`p-6 rounded-xl border text-left transition-all duration-200 ${
                          selectedLab === lab.id
                            ? 'border-primary bg-primary/10'
                            : 'border-gray-700 hover:border-gray-600'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-white mb-2 text-lg">{lab.name}</h4>
                            <p className="text-sm text-gray-400 mb-4 line-clamp-2">{lab.description}</p>
                            <div className="flex items-center gap-3">
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                lab.difficulty === 'easy' ? 'bg-success-dark/20 text-success-light' :
                                lab.difficulty === 'medium' ? 'bg-warning-dark/20 text-warning-light' :
                                lab.difficulty === 'hard' ? 'bg-error-dark/20 text-error-light' :
                                'bg-purple-500/20 text-purple-400'
                              }`}>
                                {lab.difficulty.toUpperCase()}
                              </span>
                              <span className="px-3 py-1 rounded-full text-xs font-medium bg-background-light text-gray-300">
                                <Timer className="h-3 w-3 inline mr-1" />
                                {lab.estimated_duration} min
                              </span>
                              <span className="px-3 py-1 rounded-full text-xs font-medium bg-primary/20 text-primary">
                                {lab.category}
                              </span>
                            </div>
                          </div>
                          {selectedLab === lab.id && (
                            <CheckCircle className="h-6 w-6 text-primary flex-shrink-0 ml-3" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-6 pt-6 border-t border-background-light">
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="btn-outline text-lg px-8 py-3"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateOperation}
                    disabled={!selectedLab || operationMode === 'ai' || creating}
                    className="btn-primary flex items-center text-lg px-8 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Play className="h-5 w-5 mr-2" />
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

export default OperationsPage;