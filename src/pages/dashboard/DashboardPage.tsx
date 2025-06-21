import { motion } from 'framer-motion';
import { useAuth } from '../../hooks/useAuth';
import Card from '../../components/ui/Card';
import { 
  Trophy, Users, Clock, Flag, Flame, 
  Activity, Book, BarChart, ExternalLink,
  Shield 
} from 'lucide-react';

const DashboardPage = () => {
  const { user } = useAuth();
  const username = user?.user_metadata?.username || 'User';

  const fadeInUp = {
    initial: { y: 30, opacity: 0 },
    animate: { y: 0, opacity: 1 },
    transition: { duration: 0.5 }
  };

  return (
    <div>
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between">
        <motion.div
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-3xl font-bold text-white">Welcome back, <span className="text-primary">{username}</span></h1>
          <p className="mt-1 text-gray-400">Ready to hack the planet today?</p>
        </motion.div>
        
        <motion.div
          initial={{ x: 20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="mt-4 md:mt-0"
        >
          <button className="btn-primary">
            <Flame className="mr-2 h-5 w-5" />
            Start Learning
          </button>
        </motion.div>
      </div>
      
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <motion.div {...fadeInUp} transition={{ duration: 0.5, delay: 0.1 }}>
          <Card className="p-4">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-primary/10 text-primary">
                <Trophy className="h-6 w-6" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-400">Rank</p>
                <p className="text-2xl font-bold text-white">Novice</p>
              </div>
            </div>
          </Card>
        </motion.div>
        
        <motion.div {...fadeInUp} transition={{ duration: 0.5, delay: 0.2 }}>
          <Card className="p-4">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-accent-blue/10 text-accent-blue">
                <Flag className="h-6 w-6" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-400">Challenges Solved</p>
                <p className="text-2xl font-bold text-white">3 / 42</p>
              </div>
            </div>
          </Card>
        </motion.div>
        
        <motion.div {...fadeInUp} transition={{ duration: 0.5, delay: 0.3 }}>
          <Card className="p-4">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-accent-green/10 text-accent-green">
                <Activity className="h-6 w-6" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-400">Points</p>
                <p className="text-2xl font-bold text-white">250</p>
              </div>
            </div>
          </Card>
        </motion.div>
        
        <motion.div {...fadeInUp} transition={{ duration: 0.5, delay: 0.4 }}>
          <Card className="p-4">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-accent-yellow/10 text-accent-yellow">
                <Clock className="h-6 w-6" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-400">Time Spent</p>
                <p className="text-2xl font-bold text-white">4h 26m</p>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
      
      {/* Continue Learning & Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <motion.div 
          className="lg:col-span-2"
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <Card className="p-6 h-full">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Continue Learning</h2>
              <a href="#" className="text-sm text-primary hover:text-primary-light flex items-center">
                View all <ExternalLink className="ml-1 h-3 w-3" />
              </a>
            </div>
            
            <div className="space-y-4">
              <div className="p-4 bg-background-light rounded-lg border border-background-default hover:border-gray-700 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="inline-block px-2 py-1 text-xs bg-primary/20 text-primary rounded mb-2">In Progress</span>
                    <h3 className="text-lg font-medium text-white">Web Application Basics</h3>
                    <p className="text-sm text-gray-400 mt-1">Learn the fundamentals of web exploitation</p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-400">Progress</div>
                    <div className="text-lg font-medium text-white">45%</div>
                  </div>
                </div>
                <div className="mt-4 h-2 bg-background-default rounded-full overflow-hidden">
                  <div className="bg-primary h-full rounded-full" style={{ width: '45%' }}></div>
                </div>
              </div>
              
              <div className="p-4 bg-background-light rounded-lg border border-background-default hover:border-gray-700 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="inline-block px-2 py-1 text-xs bg-accent-blue/20 text-accent-blue rounded mb-2">New</span>
                    <h3 className="text-lg font-medium text-white">Buffer Overflow 101</h3>
                    <p className="text-sm text-gray-400 mt-1">Learn how memory corruption vulnerabilities work</p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-400">Progress</div>
                    <div className="text-lg font-medium text-white">10%</div>
                  </div>
                </div>
                <div className="mt-4 h-2 bg-background-default rounded-full overflow-hidden">
                  <div className="bg-accent-blue h-full rounded-full" style={{ width: '10%' }}></div>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
        
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <Card className="p-6 h-full">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Leaderboard</h2>
              <a href="#" className="text-sm text-primary hover:text-primary-light">View all</a>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center p-2 rounded-md bg-background-light">
                <div className="flex items-center justify-center h-8 w-8 bg-primary text-white rounded-full font-medium">
                  1
                </div>
                <div className="ml-3 flex-1">
                  <p className="text-white font-medium">blackh4t</p>
                </div>
                <div className="text-gray-300 font-medium">1,250 pts</div>
              </div>
              
              <div className="flex items-center p-2 rounded-md bg-background-light">
                <div className="flex items-center justify-center h-8 w-8 bg-secondary-light text-white rounded-full font-medium">
                  2
                </div>
                <div className="ml-3 flex-1">
                  <p className="text-white font-medium">h4xx0r_1</p>
                </div>
                <div className="text-gray-300 font-medium">1,120 pts</div>
              </div>
              
              <div className="flex items-center p-2 rounded-md bg-background-light">
                <div className="flex items-center justify-center h-8 w-8 bg-secondary-light text-white rounded-full font-medium">
                  3
                </div>
                <div className="ml-3 flex-1">
                  <p className="text-white font-medium">cyber_ninja</p>
                </div>
                <div className="text-gray-300 font-medium">980 pts</div>
              </div>
              
              <div className="flex items-center p-2 rounded-md border border-primary/30 bg-primary/10">
                <div className="flex items-center justify-center h-8 w-8 bg-background-dark text-white rounded-full font-medium">
                  42
                </div>
                <div className="ml-3 flex-1">
                  <p className="text-white font-medium">{username} <span className="text-primary text-xs">(You)</span></p>
                </div>
                <div className="text-gray-300 font-medium">250 pts</div>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
      
      {/* Featured Challenges */}
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.5 }}
      >
        <h2 className="text-xl font-bold text-white mb-4">Featured Challenges</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card hover glow className="overflow-hidden">
            <div className="h-40 bg-gradient-to-r from-primary-dark to-primary flex items-center justify-center">
              <Book className="h-16 w-16 text-white" />
            </div>
            <div className="p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-medium bg-primary/20 text-primary py-1 px-2 rounded">Web</span>
                <span className="text-xs text-gray-400">300 points</span>
              </div>
              <h3 className="text-lg font-medium text-white mb-1">SQL Injection Basics</h3>
              <p className="text-sm text-gray-400 mb-4">Learn how to exploit SQL injection vulnerabilities</p>
              <div className="flex justify-between items-center">
                <div className="flex items-center text-gray-500 text-xs">
                  <Users className="h-4 w-4 mr-1" />
                  <span>126 solves</span>
                </div>
                <button className="btn-primary py-1 px-3 text-sm">Start Challenge</button>
              </div>
            </div>
          </Card>
          
          <Card hover glow className="overflow-hidden">
            <div className="h-40 bg-gradient-to-r from-accent-blue to-accent-blue/70 flex items-center justify-center">
              <BarChart className="h-16 w-16 text-white" />
            </div>
            <div className="p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-medium bg-accent-blue/20 text-accent-blue py-1 px-2 rounded">Crypto</span>
                <span className="text-xs text-gray-400">500 points</span>
              </div>
              <h3 className="text-lg font-medium text-white mb-1">Breaking RSA</h3>
              <p className="text-sm text-gray-400 mb-4">Learn cryptographic vulnerabilities in RSA implementation</p>
              <div className="flex justify-between items-center">
                <div className="flex items-center text-gray-500 text-xs">
                  <Users className="h-4 w-4 mr-1" />
                  <span>83 solves</span>
                </div>
                <button className="btn-primary py-1 px-3 text-sm">Start Challenge</button>
              </div>
            </div>
          </Card>
          
          <Card hover glow className="overflow-hidden">
            <div className="h-40 bg-gradient-to-r from-accent-green to-accent-green/70 flex items-center justify-center">
              <Shield className="h-16 w-16 text-white" />
            </div>
            <div className="p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-medium bg-accent-green/20 text-accent-green py-1 px-2 rounded">Reverse</span>
                <span className="text-xs text-gray-400">750 points</span>
              </div>
              <h3 className="text-lg font-medium text-white mb-1">Binary Analysis</h3>
              <p className="text-sm text-gray-400 mb-4">Learn how to analyze and reverse engineer binaries</p>
              <div className="flex justify-between items-center">
                <div className="flex items-center text-gray-500 text-xs">
                  <Users className="h-4 w-4 mr-1" />
                  <span>42 solves</span>
                </div>
                <button className="btn-primary py-1 px-3 text-sm">Start Challenge</button>
              </div>
            </div>
          </Card>
        </div>
      </motion.div>
    </div>
  );
};

export default DashboardPage;