// This page is deprecated. All blue team logic has been removed.

import { motion } from 'framer-motion';
import { RefreshCw, Search } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useOperations } from '../../hooks/useOperations';
import Card from '../../components/ui/Card';

const BlueTeamPage = () => {
  const { user } = useAuth();
  const { loading, refreshData } = useOperations();

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
                  onClick={refreshData}
                  className="btn-primary bg-accent-blue hover:bg-accent-blue/90 flex items-center text-lg px-6 py-3"
                >
                  <RefreshCw className="h-5 w-5 mr-2" />
                  Refresh Threats
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
              className="w-full bg-background-light border border-background-default rounded-lg py-3 pl-12 pr-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent-blue focus:border-transparent"
            />
            <Search className="absolute left-4 top-3.5 h-5 w-5 text-gray-500" />
          </div>
        </motion.div>

        {/* Empty State */}
        {!loading && (
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
                onClick={refreshData}
                className="btn-primary bg-accent-blue hover:bg-accent-blue/90"
              >
                <RefreshCw className="h-5 w-5 mr-2" />
                Refresh Threat Feed
              </button>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default BlueTeamPage;