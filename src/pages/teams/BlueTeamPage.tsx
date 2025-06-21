import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, Target, Activity, Eye, Lock, Users,
  Search, RefreshCw, Clock, AlertTriangle, CheckCircle,
  Calendar, User, Play, Zap, Flag, Trophy, Timer
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useOperations } from '../../hooks/useOperations';
import Card from '../../components/ui/Card';
import OperationRequestCard from '../../components/operations/OperationRequestCard';
import ActiveOperationCard from '../../components/operations/ActiveOperationCard';
import OperationInterface from '../../components/operations/OperationInterface';

const BlueTeamPage = () => {
  const { user } = useAuth();
  const { 
    loading,
    refreshData,
    acceptOperationRequest,
    getUserOperations,
    getAvailableOperations
  } = useOperations();

  const [activeOperationId, setActiveOperationId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [accepting, setAccepting] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Get user-specific and available operations for blue team
  const userOperations = getUserOperations();
  const availableRequests = getAvailableOperations('blue');

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
  const filteredAvailableRequests = availableRequests.filter(request => {
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

  const stats = [
    { label: 'Active Defenses', value: filteredOperations.length, icon: Shield, color: 'text-accent-blue' },
    { label: 'Incoming Attacks', value: filteredAvailableRequests.length, icon: AlertTriangle, color: 'text-warning-light' },
    { label: 'Attacks Blocked', value: '23', icon: Lock, color: 'text-success-light' },
    { label: 'Defense Rate', value: '89%', icon: Target, color: 'text-accent-green' }
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
      <div className="relative h-[400px] overflow-hidden bg-gradient-to-br from-accent-blue/20 via-background-dark to-background-dark">
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
                <div className="p-4 rounded-full bg-accent-blue/10 border border-accent-blue/30">
                  <Shield className="h-12 w-12 text-accent-blue" />
                </div>
                <div>
                  <h1 className="text-5xl font-bold text-white mb-2">
                    Blue Team <span className="text-accent-blue">Defense</span>
                  </h1>
                  <p className="text-xl text-gray-300">
                    Defend against cyber threats and master defensive security operations
                  </p>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-4">
                <button 
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="btn-primary bg-accent-blue hover:bg-accent-blue/90 flex items-center text-lg px-6 py-3"
                >
                  <RefreshCw className={`h-5 w-5 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                  {refreshing ? 'Refreshing...' : 'Refresh Threats'}
                </button>
                <button className="btn-outline flex items-center text-lg px-6 py-3 border-accent-blue text-accent-blue hover:bg-accent-blue/10">
                  <Eye className="h-5 w-5 mr-2" />
                  Monitor Systems
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
                <Card className="p-6 border border-accent-blue/30 bg-accent-blue/5">
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
              placeholder="Search threats and operations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-background-light border border-background-default rounded-lg py-3 pl-12 pr-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent-blue focus:border-transparent"
            />
            <Search className="absolute left-4 top-3.5 h-5 w-5 text-gray-500" />
          </div>
        </motion.div>

        {/* Incoming Attacks */}
        {filteredAvailableRequests.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mb-12"
          >
            <h2 className="text-3xl font-bold text-white mb-6 flex items-center">
              <AlertTriangle className="h-8 w-8 mr-3 text-warning-light" />
              Incoming Attacks
              <span className="ml-3 px-3 py-1 bg-warning-dark/20 text-warning-light rounded-full text-sm font-medium">
                {filteredAvailableRequests.length} Active Threats
              </span>
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredAvailableRequests.map((request) => (
                <OperationRequestCard
                  key={request.id}
                  request={request}
                  userTeamType="blue"
                  onAccept={() => handleAcceptRequest(request.id)}
                  accepting={accepting === request.id}
                />
              ))}
            </div>
          </motion.div>
        )}

        {/* Active Defenses */}
        {filteredOperations.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mb-12"
          >
            <h2 className="text-3xl font-bold text-white mb-6 flex items-center">
              <Shield className="h-8 w-8 mr-3 text-accent-blue" />
              Active Defenses
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredOperations.map((operation) => (
                <ActiveOperationCard
                  key={operation.id}
                  operation={operation}
                  userTeamType="blue"
                  onJoin={() => handleJoinOperation(operation.id)}
                  isUserOperation={true}
                />
              ))}
            </div>
          </motion.div>
        )}

        {/* Your Accepted Requests */}
        {filteredUserRequests.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mb-12"
          >
            <h2 className="text-3xl font-bold text-white mb-6 flex items-center">
              <Clock className="h-8 w-8 mr-3 text-accent-green" />
              Accepted Challenges
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredUserRequests.map((request) => (
                <OperationRequestCard
                  key={request.id}
                  request={request}
                  userTeamType="blue"
                  isUserRequest={true}
                />
              ))}
            </div>
          </motion.div>
        )}

        {/* Empty State */}
        {!loading && 
         filteredAvailableRequests.length === 0 && 
         filteredOperations.length === 0 && 
         filteredUserRequests.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card className="p-12 text-center border border-accent-blue/30">
              <Shield className="h-16 w-16 text-accent-blue mx-auto mb-6" />
              <h3 className="text-2xl font-bold text-white mb-4">All Systems Secure</h3>
              <p className="text-gray-400 mb-6 max-w-md mx-auto">
                No incoming attacks detected. Your defensive systems are monitoring for threats. Check back regularly for new attack requests.
              </p>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="btn-primary bg-accent-blue hover:bg-accent-blue/90"
              >
                <RefreshCw className={`h-5 w-5 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? 'Refreshing...' : 'Refresh Threat Feed'}
              </button>
            </Card>
          </motion.div>
        )}

        {/* Blue Team Guide */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-12"
        >
          <Card className="p-8 border border-accent-blue/30">
            <h2 className="text-2xl font-bold text-white mb-6 text-center">Blue Team Defense Guide</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-accent-blue/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="h-8 w-8 text-accent-blue" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">1. Monitor Threats</h3>
                <p className="text-gray-400">Watch for incoming attack requests from red teams. Review the target environment and attack details.</p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-success-dark/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="h-8 w-8 text-success-light" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">2. Accept Challenge</h3>
                <p className="text-gray-400">Accept attack requests to defend the target environment. You'll get access to monitoring tools and logs.</p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-warning-dark/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Lock className="h-8 w-8 text-warning-light" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">3. Defend & Block</h3>
                <p className="text-gray-400">Monitor for attacks, block malicious activities, and maintain system security to score points.</p>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default BlueTeamPage;