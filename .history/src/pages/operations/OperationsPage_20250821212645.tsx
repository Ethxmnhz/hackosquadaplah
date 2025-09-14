import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Activity, Clock, Zap, Play, Plus, Search, RefreshCw, Database, Server, ArrowRight
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
  const [activeOperationId, setActiveOperationId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [accepting, setAccepting] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Only generic operations, no team filtering
  const userOperations = getUserOperations();
  const availableRequests = getAvailableOperations();

  const handleCreateOperation = async () => {
    if (!selectedLab || creating) return;
    
    setCreating(true);
    try {
      const data: CreateOperationData = {
        lab_id: selectedLab,
        mode: operationMode,
        estimated_duration: 60,
        max_score: 1000
      };
      
      await createOperationRequest(data);
      setShowCreateModal(false);
      setSelectedLab('');
    } catch (error) {
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
                <Server className="h-12 w-12 text-primary" />
              </div>
            </div>
            <h1 className="text-5xl font-bold text-white mb-6">
              Live Cyber <span className="text-primary">Operations</span>
            </h1>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-8">
              Engage in real-time cyber operations in live environments with professional-grade scenarios.
            </p>
            
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

        {/* Your Operations */}
        {(filteredUserRequests.length > 0 || filteredOperations.length > 0) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mb-12"
          >
            <h2 className="text-3xl font-bold text-white mb-8 flex items-center">
              Your Operations
            </h2>
            
            {/* Active Operations */}
            {filteredOperations.length > 0 && (
              <div className="mb-8">
                <h3 className="text-xl font-medium text-gray-300 mb-6 flex items-center">
                  Active Operations
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                  {filteredOperations.map((operation) => (
                    <ActiveOperationCard
                      key={operation.id}
                      operation={operation}
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
                  Pending Requests
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                  {filteredUserRequests.map((request) => (
                    <OperationRequestCard
                      key={request.id}
                      request={request}
                      isUserRequest={true}
                    />
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Available Operations */}
        {filteredRequests.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mb-12"
          >
            <h2 className="text-3xl font-bold text-white mb-8 flex items-center">
              Available Operations
              <span className="ml-4 px-3 py-1 bg-warning-dark/20 text-warning-light rounded-full text-lg font-medium">
                {filteredRequests.length} Available
              </span>
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredRequests.map((request) => (
                <OperationRequestCard
                  key={request.id}
                  request={request}
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
              <Server className="h-20 w-20 text-gray-500 mx-auto mb-8" />
              <h3 className="text-3xl font-bold text-white mb-6">No Operations Available</h3>
              <p className="text-gray-400 mb-8 max-w-md mx-auto text-lg">
                Create a new operation to get started.
              </p>
              <div className="flex flex-wrap gap-4 justify-center">
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="btn-primary text-lg px-8 py-4"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Create New Operation
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
                  <Server className="h-10 w-10 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-white mb-4">1. Select & Request</h3>
                <p className="text-gray-400 leading-relaxed">Choose a lab environment and create an operation request.</p>
              </div>
              
              <div className="text-center">
                <div className="w-20 h-20 bg-accent-blue/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Activity className="h-10 w-10 text-accent-blue" />
                </div>
                <h3 className="text-xl font-bold text-white mb-4">2. Environment Setup</h3>
                <p className="text-gray-400 leading-relaxed">Environment is set up for the operation.</p>
              </div>
              
              <div className="text-center">
                <div className="w-20 h-20 bg-success-dark/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Zap className="h-10 w-10 text-success-light" />
                </div>
                <h3 className="text-xl font-bold text-white mb-4">3. Live Battle</h3>
                <p className="text-gray-400 leading-relaxed">Engage in the operation and score points for successful actions.</p>
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
                      <span className="font-medium text-lg">Live Operation</span>
                      <div className="text-sm mt-2 opacity-80">Engage in a live environment</div>
                    </button>
                    <button
                      onClick={() => setOperationMode('ai')}
                      disabled
                      className="p-6 rounded-xl border border-gray-700 text-gray-600 cursor-not-allowed opacity-50"
                    >
                      <span className="font-medium text-lg">AI Mode</span>
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
                                {lab.estimated_duration} min
                              </span>
                              <span className="px-3 py-1 rounded-full text-xs font-medium bg-primary/20 text-primary">
                                {lab.category}
                              </span>
                            </div>
                          </div>
                          {selectedLab === lab.id && (
                            <span className="h-6 w-6 text-primary flex-shrink-0 ml-3">✓</span>
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
                    {creating ? 'Creating Operation...' : 'Launch Operation'}
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