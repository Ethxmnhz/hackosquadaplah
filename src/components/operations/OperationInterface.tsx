import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sword, Shield, Terminal, Flag, Clock, Users, 
  Zap, Target, Activity, AlertTriangle, CheckCircle,
  Download, Copy, Eye, EyeOff, Send, Pause, Play,
  Settings, Wifi, Server, Lock, Globe, Monitor,
  X, Maximize2, Minimize2, Volume2, VolumeX,
  MessageSquare, RefreshCw, Info, Database, Search,
  Cpu, HardDrive, Network, FileText, Code, Layers
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useOperations } from '../../hooks/useOperations';
import { ChatMessage, SystemLog, NetworkScan } from '../../types/operations';
import Card from '../ui/Card';

interface OperationInterfaceProps {
  operationId: string;
  onClose: () => void;
}

interface OperationEvent {
  id: string;
  event_type: string;
  team_type: 'red' | 'blue' | 'system';
  points_awarded: number;
  description: string;
  timestamp: string;
  username: string;
}

const OperationInterface = ({ operationId, onClose }: OperationInterfaceProps) => {
  const { user } = useAuth();
  const { 
    activeOperations, 
    operationEvents, 
    submitFlag, 
    blockAttack, 
    endOperation,
    addChatMessage,
    getOperationChat,
    addSystemLog,
    getSystemLogs
  } = useOperations();

  const [operation, setOperation] = useState<any>(null);
  const [events, setEvents] = useState<OperationEvent[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [systemLogs, setSystemLogs] = useState<SystemLog[]>([]);
  const [flagInput, setFlagInput] = useState('');
  const [chatMessage, setChatMessage] = useState('');
  const [showVPNConfig, setShowVPNConfig] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'events' | 'chat' | 'tools'>('overview');
  const [activeToolTab, setActiveToolTab] = useState<'terminal' | 'network' | 'logs' | 'files'>('terminal');
  const [submittingFlag, setSubmittingFlag] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [terminalInput, setTerminalInput] = useState('');
  const [terminalOutput, setTerminalOutput] = useState<string[]>([
    'HackoSquad Terminal v1.0',
    'Type "help" for available commands',
    '> '
  ]);
  const [networkScanResults, setNetworkScanResults] = useState<NetworkScan | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanType, setScanType] = useState<'quick' | 'full' | 'vuln'>('quick');
  const [targetIP, setTargetIP] = useState('10.0.0.1');
  const [refreshingChat, setRefreshingChat] = useState(false);
  const [refreshingLogs, setRefreshingLogs] = useState(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const currentOperation = activeOperations.find(op => op.id === operationId);
    if (currentOperation) {
      setOperation(currentOperation);
      setTimeRemaining(currentOperation.time_remaining);
    }
    
    const operationEvents = events.filter(event => 
      event.operation_id === operationId
    );
    setEvents(operationEvents);

    loadChatMessages();
    loadSystemLogs();
  }, [operationId, activeOperations, operationEvents, user]);

  // Timer countdown
  useEffect(() => {
    if (timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => Math.max(0, prev - 1));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [timeRemaining]);

  // Scroll to bottom of chat when new messages arrive
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  // Scroll to bottom of terminal when new output is added
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [terminalOutput]);

  const loadChatMessages = async () => {
    try {
      setRefreshingChat(true);
      const messages = await getOperationChat(operationId);
      setChatMessages(messages);
    } catch (error) {
      console.error('Error loading chat messages:', error);
    } finally {
      setRefreshingChat(false);
    }
  };

  const loadSystemLogs = async () => {
    try {
      setRefreshingLogs(true);
      const logs = await getSystemLogs(operationId);
      setSystemLogs(logs);
    } catch (error) {
      console.error('Error loading system logs:', error);
    } finally {
      setRefreshingLogs(false);
    }
  };

  const handleSubmitFlag = async () => {
    if (!flagInput.trim() || submittingFlag) return;
    
    setSubmittingFlag(true);
    try {
      const result = await submitFlag(operationId, flagInput);
      if (result.success) {
        setFlagInput('');
        if (soundEnabled) {
          // Play success sound
          const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT');
          audio.volume = 0.3;
          audio.play().catch(() => {});
        }
        
        // Add system log
        await addSystemLog(operationId, 'success', `Flag submitted: ${flagInput}`, 'flag_system');
      } else {
        // Add system log for failed submission
        await addSystemLog(operationId, 'error', `Invalid flag submission: ${flagInput}`, 'flag_system');
      }
    } catch (error) {
      console.error('Error submitting flag:', error);
      await addSystemLog(operationId, 'error', `Error submitting flag: ${error}`, 'flag_system');
    } finally {
      setSubmittingFlag(false);
    }
  };

  const handleBlockAttack = async (attackType: string) => {
    try {
      await blockAttack(operationId, attackType);
      if (soundEnabled) {
        // Play block sound
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT');
        audio.volume = 0.3;
        audio.play().catch(() => {});
      }
      
      // Add system log
      await addSystemLog(operationId, 'success', `Attack blocked: ${attackType}`, 'defense_system');
    } catch (error) {
      console.error('Error blocking attack:', error);
      await addSystemLog(operationId, 'error', `Error blocking attack: ${error}`, 'defense_system');
    }
  };

  const handleSendChatMessage = async () => {
    if (!chatMessage.trim()) return;
    
    try {
      const isRedTeam = operation.red_team_user === user?.id;
      await addChatMessage(operationId, chatMessage, isRedTeam ? 'red' : 'blue');
      setChatMessage('');
      await loadChatMessages();
    } catch (error) {
      console.error('Error sending chat message:', error);
    }
  };

  const handleTerminalCommand = () => {
    if (!terminalInput.trim()) return;
    
    // Add command to terminal output
    setTerminalOutput(prev => [...prev, `> ${terminalInput}`]);
    
    // Process command
    const command = terminalInput.trim().toLowerCase();
    let response: string[] = [];
    
    if (command === 'help') {
      response = [
        'Available commands:',
        '  help - Show this help message',
        '  clear - Clear the terminal',
        '  scan <ip> - Scan a target IP address',
        '  nmap <ip> - Alias for scan',
        '  exploit <ip> <port> - Attempt to exploit a service',
        '  connect <ip> <port> - Connect to a service',
        '  whoami - Show current user',
        '  ifconfig - Show network interfaces',
        '  ls - List files in current directory',
        '  cat <file> - Show file contents',
        '  flag <flag> - Submit a flag'
      ];
    } else if (command === 'clear') {
      setTerminalOutput(['HackoSquad Terminal v1.0', 'Type "help" for available commands', '> ']);
      setTerminalInput('');
      return;
    } else if (command.startsWith('scan ') || command.startsWith('nmap ')) {
      const ip = command.split(' ')[1];
      if (ip) {
        response = [`Starting scan of ${ip}...`, 'Scan will take a few seconds to complete.'];
        // Simulate scan in tools tab
        setTargetIP(ip);
        setActiveTab('tools');
        setActiveToolTab('network');
        setTimeout(() => {
          handleNetworkScan();
        }, 500);
      } else {
        response = ['Error: IP address required'];
      }
    } else if (command.startsWith('exploit ')) {
      const parts = command.split(' ');
      if (parts.length >= 3) {
        const ip = parts[1];
        const port = parts[2];
        response = [
          `Attempting to exploit ${ip}:${port}...`,
          'Checking for vulnerabilities...',
          'Testing default credentials...',
          'Trying known exploits...',
          'Exploit successful!',
          'Found potential flag: HKQ{t3rm1n4l_3xpl01t_fl4g}'
        ];
      } else {
        response = ['Error: IP and port required'];
      }
    } else if (command.startsWith('flag ')) {
      const flag = command.split(' ')[1];
      if (flag) {
        setFlagInput(flag);
        response = [`Submitting flag: ${flag}...`];
        setTimeout(() => {
          handleSubmitFlag();
        }, 500);
      } else {
        response = ['Error: Flag required'];
      }
    } else if (command === 'whoami') {
      response = [user?.user_metadata?.username || 'anonymous'];
    } else if (command === 'ifconfig') {
      response = [
        'eth0: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500',
        '        inet 10.0.0.5  netmask 255.255.255.0  broadcast 10.0.0.255',
        '        inet6 fe80::215:5dff:fe00:0  prefixlen 64  scopeid 0x20<link>',
        '        ether 00:15:5d:00:00:00  txqueuelen 1000  (Ethernet)',
        '        RX packets 8  bytes 648 (648.0 B)',
        '        RX errors 0  dropped 0  overruns 0  frame 0',
        '        TX packets 8  bytes 648 (648.0 B)',
        '        TX errors 0  dropped 0 overruns 0  carrier 0  collisions 0',
        '',
        'tun0: flags=4305<UP,POINTOPOINT,RUNNING,NOARP,MULTICAST>  mtu 1500',
        '        inet 172.16.0.10  netmask 255.255.255.0  destination 172.16.0.1',
        '        unspec 00-00-00-00-00-00-00-00-00-00-00-00-00-00-00-00  txqueuelen 100  (UNSPEC)',
        '        RX packets 6  bytes 468 (468.0 B)',
        '        RX errors 0  dropped 0  overruns 0  frame 0',
        '        TX packets 6  bytes 468 (468.0 B)',
        '        TX errors 0  dropped 0 overruns 0  carrier 0  collisions 0'
      ];
    } else if (command === 'ls') {
      response = ['documents', 'tools', 'scripts', 'README.md', 'config.json'];
    } else if (command.startsWith('cat ')) {
      const file = command.split(' ')[1];
      if (file === 'README.md') {
        response = [
          '# Operation README',
          '',
          'This system is part of a red team operation.',
          '',
          'Target information:',
          '- Main server: 10.0.0.1',
          '- Web application: http://10.0.0.1:80',
          '- Admin panel: http://10.0.0.1:8080',
          '',
          'Potential flags may be found in:',
          '- Web application vulnerabilities',
          '- Exposed admin interfaces',
          '- Misconfigured services',
          '- Unprotected files'
        ];
      } else if (file === 'config.json') {
        response = [
          '{',
          '  "operation": "HackoSquad CTF",',
          '  "target": "10.0.0.1",',
          '  "services": [',
          '    { "name": "web", "port": 80 },',
          '    { "name": "admin", "port": 8080 },',
          '    { "name": "ssh", "port": 22 },',
          '    { "name": "db", "port": 3306 }',
          '  ],',
          '  "notes": "Remember to check for default credentials"',
          '}'
        ];
      } else {
        response = [`Error: File '${file}' not found`];
      }
    } else {
      response = [`Command not found: ${command}`];
    }
    
    // Add response to terminal output
    setTerminalOutput(prev => [...prev, ...response]);
    
    // Clear input
    setTerminalInput('');
  };

  const handleNetworkScan = async () => {
    if (isScanning) return;
    
    setIsScanning(true);
    try {
      // Add system log
      await addSystemLog(operationId, 'info', `Network scan started: ${scanType} scan of ${targetIP}`, 'network_scanner');
      
      // Simulate network scan
      setTimeout(() => {
        const mockScan: NetworkScan = {
          id: `scan-${Date.now()}`,
          operation_id: operationId,
          target_ip: targetIP,
          scan_type: scanType,
          results: {
            hosts: [
              {
                ip: targetIP,
                hostname: 'target-server',
                os: 'Linux 5.4.0',
                ports: [
                  { port: 22, service: 'ssh', state: 'open' },
                  { port: 80, service: 'http', state: 'open' },
                  { port: 443, service: 'https', state: 'open' },
                  { port: 3306, service: 'mysql', state: 'filtered' },
                  { port: 8080, service: 'http-proxy', state: 'open' }
                ]
              }
            ],
            vulnerabilities: scanType === 'vuln' ? [
              {
                id: 'CVE-2021-44228',
                name: 'Log4Shell',
                severity: 'critical',
                description: 'Remote code execution vulnerability in Apache Log4j',
                cve: 'CVE-2021-44228'
              },
              {
                id: 'CVE-2023-12345',
                name: 'SQL Injection',
                severity: 'high',
                description: 'SQL injection vulnerability in web application',
                cve: 'CVE-2023-12345'
              }
            ] : undefined
          },
          created_at: new Date().toISOString()
        };
        
        setNetworkScanResults(mockScan);
        addSystemLog(operationId, 'success', `Network scan completed: found ${mockScan.results.hosts[0].ports.length} open ports`, 'network_scanner');
      }, 3000);
    } catch (error) {
      console.error('Error performing network scan:', error);
      await addSystemLog(operationId, 'error', `Network scan failed: ${error}`, 'network_scanner');
    } finally {
      setTimeout(() => {
        setIsScanning(false);
      }, 3000);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'flag_captured':
        return <Flag className="h-4 w-4 text-primary" />;
      case 'attack_blocked':
        return <Shield className="h-4 w-4 text-accent-blue" />;
      case 'vulnerability_found':
        return <AlertTriangle className="h-4 w-4 text-warning-light" />;
      case 'system_compromised':
        return <Zap className="h-4 w-4 text-error-light" />;
      case 'defense_activated':
        return <Lock className="h-4 w-4 text-success-light" />;
      default:
        return <Activity className="h-4 w-4 text-gray-400" />;
    }
  };

  const getLogLevelIcon = (level: string) => {
    switch (level) {
      case 'info':
        return <Info className="h-4 w-4 text-accent-blue" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-warning-light" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-error-light" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-success-light" />;
      default:
        return <Info className="h-4 w-4 text-gray-400" />;
    }
  };

  const getLogLevelClass = (level: string) => {
    switch (level) {
      case 'info':
        return 'border-accent-blue/30 bg-accent-blue/5';
      case 'warning':
        return 'border-warning-light/30 bg-warning-dark/10';
      case 'error':
        return 'border-error-light/30 bg-error-dark/10';
      case 'success':
        return 'border-success-light/30 bg-success-dark/10';
      default:
        return 'border-gray-700 bg-background-light';
    }
  };

  if (!operation) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
        <Card className="p-8">
          <div className="animate-pulse text-primary">Loading operation...</div>
        </Card>
      </div>
    );
  }

  const isRedTeam = operation.red_team_user === user?.id;
  const teamColor = isRedTeam ? 'primary' : 'accent-blue';
  const TeamIcon = isRedTeam ? Sword : Shield;

  return (
    <div className={`fixed inset-0 bg-background-dark z-50 overflow-hidden ${isFullscreen ? 'p-0' : 'p-4'}`}>
      {/* Header */}
      <div className="bg-background-default border-b border-background-light p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-lg ${isRedTeam ? 'bg-primary/10' : 'bg-accent-blue/10'}`}>
              <TeamIcon className={`h-6 w-6 ${isRedTeam ? 'text-primary' : 'text-accent-blue'}`} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">{operation.lab.name}</h1>
              <p className={`${isRedTeam ? 'text-primary' : 'text-accent-blue'} font-medium`}>
                {isRedTeam ? 'Red Team (Attacker)' : 'Blue Team (Defender)'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Timer */}
            <div className="text-center">
              <div className={`text-2xl font-mono font-bold ${timeRemaining < 300 ? 'text-error-light' : 'text-white'}`}>
                {formatTime(timeRemaining)}
              </div>
              <div className="text-sm text-gray-400">Time Remaining</div>
            </div>
            
            {/* Scores */}
            <div className="flex gap-4">
              <div className="text-center p-3 bg-primary/10 rounded-lg">
                <div className="text-lg font-bold text-primary">{operation.red_team_score}</div>
                <div className="text-xs text-gray-400">Red Team</div>
              </div>
              <div className="text-center p-3 bg-accent-blue/10 rounded-lg">
                <div className="text-lg font-bold text-accent-blue">{operation.blue_team_score}</div>
                <div className="text-xs text-gray-400">Blue Team</div>
              </div>
            </div>
            
            {/* Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-background-light/50 transition-all duration-200"
              >
                {soundEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
              </button>
              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-background-light/50 transition-all duration-200"
              >
                {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
              </button>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-background-light/50 transition-all duration-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-background-light border-b border-background-default">
        <div className="flex space-x-8 px-4">
          {[
            { id: 'overview', label: 'Overview', icon: Monitor },
            { id: 'events', label: 'Live Events', icon: Activity },
            { id: 'chat', label: 'Team Chat', icon: Users },
            { id: 'tools', label: 'Tools', icon: Terminal }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center px-4 py-4 border-b-2 font-medium ${
                activeTab === tab.id
                  ? `${isRedTeam ? 'border-primary text-primary' : 'border-accent-blue text-accent-blue'}`
                  : 'border-transparent text-gray-400 hover:text-white hover:border-gray-700'
              }`}
            >
              <tab.icon className="h-5 w-5 mr-2" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="h-full p-6 overflow-y-auto"
            >
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
                {/* Main Action Panel */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Environment Access */}
                  <Card className="p-6">
                    <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                      <Server className="h-6 w-6 mr-2 text-accent-blue" />
                      Lab Environment
                    </h3>
                    
                    {isRedTeam ? (
                      <div className="space-y-4">
                        <div className="bg-background-light rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-gray-400">VPN Connection</span>
                            <button
                              onClick={() => setShowVPNConfig(!showVPNConfig)}
                              className="text-primary hover:text-primary-light"
                            >
                              {showVPNConfig ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                          
                          {showVPNConfig && operation.vpn_config && (
                            <div className="space-y-3">
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <span className="text-gray-400">Server:</span>
                                  <div className="font-mono text-white">{operation.vpn_config.server_address}</div>
                                </div>
                                <div>
                                  <span className="text-gray-400">Port:</span>
                                  <div className="font-mono text-white">{operation.vpn_config.server_port}</div>
                                </div>
                                <div>
                                  <span className="text-gray-400">Username:</span>
                                  <div className="font-mono text-white">{operation.vpn_config.username}</div>
                                </div>
                                <div>
                                  <span className="text-gray-400">Password:</span>
                                  <div className="font-mono text-white">{operation.vpn_config.password}</div>
                                </div>
                              </div>
                              
                              <button
                                onClick={() => copyToClipboard(operation.vpn_config.config_file)}
                                className="btn-outline w-full flex items-center justify-center"
                              >
                                <Download className="h-4 w-4 mr-2" />
                                Download VPN Config
                              </button>
                            </div>
                          )}
                        </div>
                        
                        <div className="bg-warning-dark/20 border border-warning-light/30 rounded-lg p-4">
                          <div className="flex items-start">
                            <AlertTriangle className="h-5 w-5 text-warning-light mr-3 mt-0.5" />
                            <div>
                              <h4 className="text-warning-light font-medium">Target Information</h4>
                              <p className="text-gray-300 text-sm mt-1">
                                Connect to the VPN and scan the target network. Look for open ports, services, and vulnerabilities.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="bg-background-light rounded-lg p-4">
                          <h4 className="text-white font-medium mb-2">Lab Access</h4>
                          <p className="text-gray-400 text-sm mb-3">
                            You have full access to the lab environment. Monitor for attacks and defend your systems.
                          </p>
                          
                          <div className="bg-background-dark rounded-lg p-3">
                            <div className="flex items-center justify-between">
                              <code className="text-accent-blue font-mono text-sm">
                                docker run -d -p 80:80 hackosquad/web-lab
                              </code>
                              <button
                                onClick={() => copyToClipboard('docker run -d -p 80:80 hackosquad/web-lab')}
                                className="text-gray-400 hover:text-white"
                              >
                                <Copy className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                        
                        <div className="bg-accent-blue/20 border border-accent-blue/30 rounded-lg p-4">
                          <div className="flex items-start">
                            <Shield className="h-5 w-5 text-accent-blue mr-3 mt-0.5" />
                            <div>
                              <h4 className="text-accent-blue font-medium">Defense Objectives</h4>
                              <p className="text-gray-300 text-sm mt-1">
                                Monitor system logs, block malicious activities, and maintain service availability.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </Card>

                  {/* Action Panel */}
                  <Card className="p-6">
                    <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                      <Target className="h-6 w-6 mr-2 text-primary" />
                      {isRedTeam ? 'Attack Actions' : 'Defense Actions'}
                    </h3>
                    
                    {isRedTeam ? (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-400 mb-2">
                            Submit Flag
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={flagInput}
                              onChange={(e) => setFlagInput(e.target.value)}
                              placeholder="HKQ{flag_here}"
                              className="form-input flex-1"
                            />
                            <button
                              onClick={handleSubmitFlag}
                              disabled={!flagInput.trim() || submittingFlag}
                              className="btn-primary flex items-center disabled:opacity-50"
                            >
                              <Flag className="h-4 w-4 mr-2" />
                              {submittingFlag ? 'Submitting...' : 'Submit'}
                            </button>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <button 
                            className="btn-outline flex items-center justify-center"
                            onClick={() => {
                              setActiveTab('tools');
                              setActiveToolTab('network');
                            }}
                          >
                            <Network className="h-4 w-4 mr-2" />
                            Network Scan
                          </button>
                          <button 
                            className="btn-outline flex items-center justify-center"
                            onClick={() => {
                              setActiveTab('tools');
                              setActiveToolTab('terminal');
                            }}
                          >
                            <Terminal className="h-4 w-4 mr-2" />
                            Terminal
                          </button>
                          <button 
                            className="btn-outline flex items-center justify-center"
                            onClick={() => {
                              setActiveTab('tools');
                              setActiveToolTab('files');
                            }}
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            File Explorer
                          </button>
                          <button 
                            className="btn-outline flex items-center justify-center"
                            onClick={() => {
                              setActiveTab('tools');
                              setActiveToolTab('logs');
                            }}
                          >
                            <Database className="h-4 w-4 mr-2" />
                            System Logs
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <button
                            onClick={() => handleBlockAttack('port_scan')}
                            className="btn-outline flex items-center justify-center"
                          >
                            <Shield className="h-4 w-4 mr-2" />
                            Block Port Scan
                          </button>
                          <button
                            onClick={() => handleBlockAttack('brute_force')}
                            className="btn-outline flex items-center justify-center"
                          >
                            <Lock className="h-4 w-4 mr-2" />
                            Block Brute Force
                          </button>
                          <button
                            onClick={() => handleBlockAttack('sql_injection')}
                            className="btn-outline flex items-center justify-center"
                          >
                            <Globe className="h-4 w-4 mr-2" />
                            Block SQL Injection
                          </button>
                          <button
                            onClick={() => handleBlockAttack('malware')}
                            className="btn-outline flex items-center justify-center"
                          >
                            <AlertTriangle className="h-4 w-4 mr-2" />
                            Block Malware
                          </button>
                        </div>
                        
                        <div className="mt-4">
                          <label className="block text-sm font-medium text-gray-400 mb-2">
                            Monitoring Tools
                          </label>
                          <div className="grid grid-cols-2 gap-4">
                            <button 
                              className="btn-outline flex items-center justify-center"
                              onClick={() => {
                                setActiveTab('tools');
                                setActiveToolTab('logs');
                              }}
                            >
                              <Database className="h-4 w-4 mr-2" />
                              View System Logs
                            </button>
                            <button 
                              className="btn-outline flex items-center justify-center"
                              onClick={() => {
                                setActiveTab('tools');
                                setActiveToolTab('network');
                              }}
                            >
                              <Network className="h-4 w-4 mr-2" />
                              Network Monitor
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </Card>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                  {/* Operation Status */}
                  <Card className="p-6">
                    <h3 className="text-lg font-bold text-white mb-4">Operation Status</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Status</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          operation.status === 'active' 
                            ? 'bg-success-dark/20 text-success-light'
                            : 'bg-warning-dark/20 text-warning-light'
                        }`}>
                          {operation.status.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Flags Captured</span>
                        <span className="text-white font-medium">{operation.flags_captured}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Attacks Blocked</span>
                        <span className="text-white font-medium">{operation.attacks_blocked}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Total Events</span>
                        <span className="text-white font-medium">{operation.total_events}</span>
                      </div>
                    </div>
                  </Card>

                  {/* Quick Actions */}
                  <Card className="p-6">
                    <h3 className="text-lg font-bold text-white mb-4">Quick Actions</h3>
                    <div className="space-y-2">
                      <button className="btn-outline w-full flex items-center justify-center">
                        <Pause className="h-4 w-4 mr-2" />
                        Pause Operation
                      </button>
                      <button 
                        onClick={() => endOperation(operationId)}
                        className="btn-outline w-full flex items-center justify-center text-error-light border-error-light/30 hover:bg-error-light/10"
                      >
                        <AlertTriangle className="h-4 w-4 mr-2" />
                        End Operation
                      </button>
                    </div>
                  </Card>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'events' && (
            <motion.div
              key="events"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="h-full p-6"
            >
              <Card className="h-full p-6">
                <h3 className="text-xl font-bold text-white mb-6">Operation Events</h3>
                <div className="space-y-4 h-[calc(100vh-250px)] overflow-y-auto">
                  {operationEvents.filter(e => e.operation_id === operationId).length > 0 ? (
                    operationEvents
                      .filter(e => e.operation_id === operationId)
                      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                      .map(event => (
                        <motion.div
                          key={event.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className={`p-4 rounded-lg border ${
                            event.team_type === 'red' 
                              ? 'border-primary/30 bg-primary/5' 
                              : event.team_type === 'blue'
                                ? 'border-accent-blue/30 bg-accent-blue/5'
                                : 'border-gray-700 bg-background-light/30'
                          }`}
                        >
                          <div className="flex items-start">
                            <div className="p-2 rounded-lg bg-background-dark mr-3">
                              {getEventIcon(event.event_type)}
                            </div>
                            <div className="flex-1">
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="text-white font-medium">{event.description}</p>
                                  <p className="text-sm text-gray-400">
                                    {event.username} • {new Date(event.timestamp).toLocaleTimeString()}
                                  </p>
                                </div>
                                {event.points_awarded > 0 && (
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    event.team_type === 'red' 
                                      ? 'bg-primary/20 text-primary' 
                                      : 'bg-accent-blue/20 text-accent-blue'
                                  }`}>
                                    +{event.points_awarded} pts
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))
                  ) : (
                    <div className="text-center py-8">
                      <Activity className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                      <p className="text-gray-400">No events yet - start attacking or defending!</p>
                    </div>
                  )}
                </div>
              </Card>
            </motion.div>
          )}

          {activeTab === 'chat' && (
            <motion.div
              key="chat"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="h-full p-6"
            >
              <Card className="h-full p-6 flex flex-col">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-white">Team Communication</h3>
                  <button 
                    onClick={loadChatMessages}
                    disabled={refreshingChat}
                    className="btn-outline flex items-center text-sm"
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${refreshingChat ? 'animate-spin' : ''}`} />
                    Refresh
                  </button>
                </div>
                
                <div className="flex-1 bg-background-light rounded-lg p-4 mb-4 overflow-y-auto">
                  {chatMessages.length > 0 ? (
                    <div className="space-y-4">
                      {chatMessages.map(message => (
                        <div 
                          key={message.id}
                          className={`flex ${message.user_id === user?.id ? 'justify-end' : 'justify-start'}`}
                        >
                          <div 
                            className={`max-w-[80%] rounded-lg p-3 ${
                              message.team_type === 'red' 
                                ? 'bg-primary/10 border border-primary/30' 
                                : message.team_type === 'blue'
                                  ? 'bg-accent-blue/10 border border-accent-blue/30'
                                  : 'bg-gray-700 border border-gray-600'
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`font-medium ${
                                message.team_type === 'red' 
                                  ? 'text-primary' 
                                  : message.team_type === 'blue'
                                    ? 'text-accent-blue'
                                    : 'text-gray-400'
                              }`}>
                                {message.username}
                              </span>
                              <span className="text-xs text-gray-500">
                                {new Date(message.timestamp).toLocaleTimeString()}
                              </span>
                            </div>
                            <p className="text-white">{message.message}</p>
                          </div>
                        </div>
                      ))}
                      <div ref={chatEndRef} />
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <MessageSquare className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                      <p className="text-gray-400">No messages yet. Start the conversation!</p>
                    </div>
                  )}
                </div>
                
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendChatMessage()}
                    placeholder="Type a message..."
                    className="form-input flex-1"
                  />
                  <button 
                    onClick={handleSendChatMessage}
                    disabled={!chatMessage.trim()}
                    className="btn-primary"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </Card>
            </motion.div>
          )}

          {activeTab === 'tools' && (
            <motion.div
              key="tools"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="h-full p-6"
            >
              <Card className="h-full p-6 flex flex-col">
                <div className="border-b border-background-light mb-6">
                  <div className="flex space-x-6">
                    {[
                      { id: 'terminal', label: 'Terminal', icon: Terminal },
                      { id: 'network', label: 'Network', icon: Network },
                      { id: 'logs', label: 'System Logs', icon: Database },
                      { id: 'files', label: 'Files', icon: FileText }
                    ].map(tool => (
                      <button
                        key={tool.id}
                        onClick={() => setActiveToolTab(tool.id as any)}
                        className={`flex items-center px-4 py-3 border-b-2 font-medium ${
                          activeToolTab === tool.id
                            ? `${isRedTeam ? 'border-primary text-primary' : 'border-accent-blue text-accent-blue'}`
                            : 'border-transparent text-gray-400 hover:text-white hover:border-gray-700'
                        }`}
                      >
                        <tool.icon className="h-5 w-5 mr-2" />
                        {tool.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex-1 overflow-hidden">
                  <AnimatePresence mode="wait">
                    {activeToolTab === 'terminal' && (
                      <motion.div
                        key="terminal"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="h-full flex flex-col"
                      >
                        <div className="flex-1 bg-terminal-bg text-terminal-green font-mono p-4 rounded-lg overflow-y-auto">
                          {terminalOutput.map((line, index) => (
                            <div key={index} className="whitespace-pre-wrap">
                              {line}
                            </div>
                          ))}
                          <div ref={terminalEndRef} />
                        </div>
                        <div className="flex items-center mt-4 bg-terminal-bg rounded-lg overflow-hidden">
                          <span className="text-terminal-green font-mono px-2">{'>'}</span>
                          <input
                            type="text"
                            value={terminalInput}
                            onChange={(e) => setTerminalInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleTerminalCommand()}
                            className="flex-1 bg-transparent border-none text-terminal-green font-mono focus:outline-none p-2"
                            placeholder="Type a command..."
                          />
                          <button
                            onClick={handleTerminalCommand}
                            className="px-4 py-2 bg-background-light text-white hover:bg-background-default transition-colors"
                          >
                            <Send className="h-4 w-4" />
                          </button>
                        </div>
                      </motion.div>
                    )}

                    {activeToolTab === 'network' && (
                      <motion.div
                        key="network"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="h-full"
                      >
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                          <div className="lg:col-span-2">
                            <div className="bg-background-light rounded-lg p-4">
                              <h4 className="text-white font-medium mb-4">Network Scanner</h4>
                              <div className="flex gap-4 mb-4">
                                <div className="flex-1">
                                  <label className="block text-sm text-gray-400 mb-1">Target IP</label>
                                  <input
                                    type="text"
                                    value={targetIP}
                                    onChange={(e) => setTargetIP(e.target.value)}
                                    className="form-input w-full"
                                    placeholder="10.0.0.1"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm text-gray-400 mb-1">Scan Type</label>
                                  <select
                                    value={scanType}
                                    onChange={(e) => setScanType(e.target.value as any)}
                                    className="form-input"
                                  >
                                    <option value="quick">Quick Scan</option>
                                    <option value="full">Full Scan</option>
                                    <option value="vuln">Vulnerability Scan</option>
                                  </select>
                                </div>
                              </div>
                              <button
                                onClick={handleNetworkScan}
                                disabled={isScanning}
                                className="btn-primary w-full flex items-center justify-center"
                              >
                                <Search className={`h-4 w-4 mr-2 ${isScanning ? 'animate-spin' : ''}`} />
                                {isScanning ? 'Scanning...' : 'Start Scan'}
                              </button>
                            </div>
                          </div>
                          
                          <div>
                            <div className="bg-background-light rounded-lg p-4 h-full">
                              <h4 className="text-white font-medium mb-4">Network Status</h4>
                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <span className="text-gray-400">VPN Status</span>
                                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-success-dark/20 text-success-light">
                                    Connected
                                  </span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-gray-400">Local IP</span>
                                  <span className="text-white font-mono">10.0.0.5</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-gray-400">Gateway</span>
                                  <span className="text-white font-mono">10.0.0.1</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-gray-400">DNS</span>
                                  <span className="text-white font-mono">10.0.0.1</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Scan Results */}
                        {networkScanResults && (
                          <div className="bg-background-light rounded-lg p-4">
                            <div className="flex items-center justify-between mb-4">
                              <h4 className="text-white font-medium">Scan Results</h4>
                              <div className="text-sm text-gray-400">
                                {new Date(networkScanResults.created_at).toLocaleTimeString()}
                              </div>
                            </div>
                            
                            <div className="space-y-4">
                              {networkScanResults.results.hosts.map((host, index) => (
                                <div key={index} className="border border-background-default rounded-lg p-4">
                                  <div className="flex items-center justify-between mb-3">
                                    <div>
                                      <h5 className="text-white font-medium">{host.ip}</h5>
                                      {host.hostname && (
                                        <p className="text-sm text-gray-400">{host.hostname}</p>
                                      )}
                                    </div>
                                    {host.os && (
                                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-background-default text-gray-300">
                                        {host.os}
                                      </span>
                                    )}
                                  </div>
                                  
                                  <h6 className="text-sm font-medium text-gray-300 mb-2">Open Ports</h6>
                                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 mb-4">
                                    {host.ports.map((port, portIndex) => (
                                      <div 
                                        key={portIndex} 
                                        className={`p-2 rounded border text-sm ${
                                          port.state === 'open' 
                                            ? 'border-success-light/30 bg-success-dark/10 text-success-light' 
                                            : port.state === 'filtered'
                                              ? 'border-warning-light/30 bg-warning-dark/10 text-warning-light'
                                              : 'border-gray-700 bg-background-default text-gray-400'
                                        }`}
                                      >
                                        <div className="flex items-center justify-between">
                                          <span>{port.port}/{port.service}</span>
                                          <span>{port.state}</span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                  
                                  {networkScanResults.results.vulnerabilities && (
                                    <>
                                      <h6 className="text-sm font-medium text-gray-300 mb-2">Vulnerabilities</h6>
                                      <div className="space-y-2">
                                        {networkScanResults.results.vulnerabilities.map((vuln, vulnIndex) => (
                                          <div 
                                            key={vulnIndex} 
                                            className={`p-3 rounded border ${
                                              vuln.severity === 'critical' 
                                                ? 'border-error-light/30 bg-error-dark/10' 
                                                : vuln.severity === 'high'
                                                  ? 'border-warning-light/30 bg-warning-dark/10'
                                                  : 'border-gray-700 bg-background-default'
                                            }`}
                                          >
                                            <div className="flex items-start justify-between mb-1">
                                              <h6 className={`font-medium ${
                                                vuln.severity === 'critical' 
                                                  ? 'text-error-light' 
                                                  : vuln.severity === 'high'
                                                    ? 'text-warning-light'
                                                    : 'text-gray-300'
                                              }`}>
                                                {vuln.name}
                                              </h6>
                                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                                vuln.severity === 'critical' 
                                                  ? 'bg-error-dark/20 text-error-light' 
                                                  : vuln.severity === 'high'
                                                    ? 'bg-warning-dark/20 text-warning-light'
                                                    : 'bg-gray-700 text-gray-300'
                                              }`}>
                                                {vuln.severity.toUpperCase()}
                                              </span>
                                            </div>
                                            <p className="text-sm text-gray-400">{vuln.description}</p>
                                            {vuln.cve && (
                                              <p className="text-xs text-gray-500 mt-1">{vuln.cve}</p>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    </>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </motion.div>
                    )}

                    {activeToolTab === 'logs' && (
                      <motion.div
                        key="logs"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="h-full"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-white font-medium">System Logs</h4>
                          <button 
                            onClick={loadSystemLogs}
                            disabled={refreshingLogs}
                            className="btn-outline flex items-center text-sm"
                          >
                            <RefreshCw className={`h-4 w-4 mr-2 ${refreshingLogs ? 'animate-spin' : ''}`} />
                            Refresh
                          </button>
                        </div>
                        
                        <div className="bg-background-light rounded-lg p-4 h-[calc(100vh-300px)] overflow-y-auto">
                          {systemLogs.length > 0 ? (
                            <div className="space-y-3">
                              {systemLogs.map((log) => (
                                <div 
                                  key={log.id} 
                                  className={`p-3 rounded border ${getLogLevelClass(log.level)}`}
                                >
                                  <div className="flex items-start">
                                    <div className="p-1.5 rounded bg-background-dark mr-3">
                                      {getLogLevelIcon(log.level)}
                                    </div>
                                    <div className="flex-1">
                                      <div className="flex justify-between items-start">
                                        <p className="text-white">{log.message}</p>
                                        <div className="text-xs text-gray-500 ml-4">
                                          {new Date(log.created_at).toLocaleTimeString()}
                                        </div>
                                      </div>
                                      <div className="text-xs text-gray-400 mt-1">
                                        Source: {log.source}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-8">
                              <Database className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                              <p className="text-gray-400">No system logs available</p>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}

                    {activeToolTab === 'files' && (
                      <motion.div
                        key="files"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="h-full"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-white font-medium">File Explorer</h4>
                          <div className="flex items-center gap-2">
                            <button className="btn-outline text-sm">
                              <RefreshCw className="h-4 w-4" />
                            </button>
                            <button className="btn-outline text-sm">
                              <Search className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                          {/* File Tree */}
                          <div className="bg-background-light rounded-lg p-4">
                            <h5 className="text-sm font-medium text-gray-300 mb-3">Directory</h5>
                            <div className="space-y-2">
                              <div className="flex items-center text-white hover:text-primary cursor-pointer">
                                <FileText className="h-4 w-4 mr-2" />
                                <span>README.md</span>
                              </div>
                              <div className="flex items-center text-white hover:text-primary cursor-pointer">
                                <Code className="h-4 w-4 mr-2" />
                                <span>config.json</span>
                              </div>
                              <div className="flex items-center text-white hover:text-primary cursor-pointer">
                                <Layers className="h-4 w-4 mr-2" />
                                <span>documents/</span>
                              </div>
                              <div className="flex items-center text-white hover:text-primary cursor-pointer">
                                <Layers className="h-4 w-4 mr-2" />
                                <span>tools/</span>
                              </div>
                              <div className="flex items-center text-white hover:text-primary cursor-pointer">
                                <Layers className="h-4 w-4 mr-2" />
                                <span>scripts/</span>
                              </div>
                            </div>
                          </div>
                          
                          {/* File Content */}
                          <div className="lg:col-span-3 bg-background-light rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                              <h5 className="text-sm font-medium text-gray-300">README.md</h5>
                              <button className="text-gray-400 hover:text-white">
                                <Copy className="h-4 w-4" />
                              </button>
                            </div>
                            <div className="bg-background-dark rounded-lg p-4 font-mono text-sm text-gray-300 h-[calc(100vh-350px)] overflow-y-auto">
                              <p className="font-bold text-white"># Operation README</p>
                              <br />
                              <p>This system is part of a red team operation.</p>
                              <br />
                              <p className="font-bold text-white">Target information:</p>
                              <p>- Main server: 10.0.0.1</p>
                              <p>- Web application: http://10.0.0.1:80</p>
                              <p>- Admin panel: http://10.0.0.1:8080</p>
                              <br />
                              <p className="font-bold text-white">Potential flags may be found in:</p>
                              <p>- Web application vulnerabilities</p>
                              <p>- Exposed admin interfaces</p>
                              <p>- Misconfigured services</p>
                              <p>- Unprotected files</p>
                              <br />
                              <p className="font-bold text-white">Hints:</p>
                              <p>1. Check for default credentials on the admin panel</p>
                              <p>2. Look for SQL injection vulnerabilities in the login form</p>
                              <p>3. The web server might have directory listing enabled</p>
                              <p>4. Check for sensitive files in the backup directory</p>
                              <br />
                              <p className="text-primary">Flag format: HKQ{flag_text_here}</p>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default OperationInterface;