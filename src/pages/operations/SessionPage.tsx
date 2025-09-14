import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Shield, Zap, Flame, Terminal, Send, Clock, Server, Code } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useOperations } from '../../hooks/useOperations';

interface SessionData {
  id: string;
  red_team_user: string;
  blue_team_user: string;
  lab_id: string;
  status: string;
  time_remaining: number;
  ends_at: string;
  red_team_score?: number;
  blue_team_score?: number;
  created_at: string;
}

interface ChatMessage {
  id: string;
  user_id: string;
  username?: string;
  message: string;
  created_at: string;
  team_type?: string;
}

const OperationSessionPage = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { getOperationChat, addChatMessage, getSessionById } = useOperations();
  
  const [session, setSession] = useState<SessionData | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState(3600); // 1 hour in seconds
  
  // Load session data
  useEffect(() => {
    const loadSession = async () => {
      if (!sessionId || !user) return;
      
      try {
        setLoading(true);
        // Get real session data from Supabase
        const sessionData = await getSessionById(sessionId);
        
        setSession(sessionData);
        setTimeRemaining(sessionData.time_remaining || 3600);
        
        // Load chat messages
        const messages = await getOperationChat(sessionId);
        // Type cast the messages to match our ChatMessage interface
        const typedMessages = (messages || []).map(msg => ({
          id: msg.id,
          user_id: msg.user_id,
          username: msg.username,
          message: msg.message,
          created_at: msg.timestamp || msg.created_at || new Date().toISOString(),
          team_type: msg.team_type
        }));
        setChatMessages(typedMessages);
      } catch (error) {
        console.error('Error loading session:', error);
        alert('Failed to load session. Redirecting to operations page.');
        navigate('/operations');
      } finally {
        setLoading(false);
      }
    };
    
    loadSession();
    
    // Set up timer
    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 0) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [sessionId, user]);
  
  // Format time remaining as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Handle sending a chat message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !sessionId) return;
    
    try {
      // For the team_type, use the user's team role
      const teamType = isRedTeam ? 'red' : isBlueTeam ? 'blue' : 'red'; // Default to red if unknown
      await addChatMessage(sessionId, newMessage, teamType);
      setNewMessage('');
      
      // Refresh chat messages
      const messages = await getOperationChat(sessionId);
      // Type cast the messages to match our ChatMessage interface
      const typedMessages = (messages || []).map(msg => ({
        id: msg.id,
        user_id: msg.user_id,
        username: msg.username,
        message: msg.message,
        created_at: msg.timestamp || new Date().toISOString(),
        team_type: msg.team_type
      }));
      setChatMessages(typedMessages);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };
  
  // Determine if the current user is red or blue team
  const isRedTeam = session && user && session.red_team_user === user.id;
  const isBlueTeam = session && user && session.blue_team_user === user.id;
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white" style={{ background: 'radial-gradient(ellipse at 60% 20%, #181024 0%, #0A030F 100%)' }}>
        <div className="text-center">
          <Zap className="h-12 w-12 text-primary mx-auto animate-pulse mb-4" />
          <h2 className="text-2xl font-bold">Loading Operation Session...</h2>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen text-white" style={{ background: 'radial-gradient(ellipse at 60% 20%, #181024 0%, #0A030F 100%)' }}>
      <div className="max-w-7xl mx-auto pt-20 px-4 pb-20">
        {/* Session Header */}
        <div className="bg-background-dark/90 border border-primary/30 rounded-xl p-6 mb-8 shadow-xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {isRedTeam ? (
                <div className="p-3 rounded-full bg-red-400/20">
                  <Flame className="h-8 w-8 text-red-400" />
                </div>
              ) : (
                <div className="p-3 rounded-full bg-blue-400/20">
                  <Shield className="h-8 w-8 text-blue-400" />
                </div>
              )}
              <div>
                <h1 className="text-2xl md:text-3xl font-bold">
                  {isRedTeam ? 'Red Team Operation' : 'Blue Team Operation'} 
                </h1>
                <p className="text-white/60">Session ID: {sessionId}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-6">
              <div className="text-center">
                <p className="text-white/60 text-sm">Red Team Score</p>
                <p className="text-2xl font-bold text-red-400">{session?.red_team_score || 0}</p>
              </div>
              
              <div className="text-center">
                <p className="text-white/60 text-sm">Blue Team Score</p>
                <p className="text-2xl font-bold text-blue-400">{session?.blue_team_score || 0}</p>
              </div>
              
              <div className="text-center">
                <p className="text-white/60 text-sm">Time Remaining</p>
                <p className={`text-2xl font-bold ${timeRemaining < 300 ? 'text-red-400 animate-pulse' : 'text-primary'}`}>
                  {formatTime(timeRemaining)}
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Main Content Area - 2 Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Lab Environment */}
          <div className="lg:col-span-2 space-y-6">
            {/* Lab Info */}
            <div className="bg-background-dark/80 border border-primary/20 rounded-xl p-6 shadow-lg">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Server className="h-5 w-5 text-primary" /> Lab Environment
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-background-light/30 rounded-lg p-4 border border-primary/10">
                  <h3 className="font-bold text-primary mb-2">Target System</h3>
                  <p className="text-white/80">IP: 10.0.0.100</p>
                  <p className="text-white/80">Services: SSH, HTTP, FTP</p>
                  <p className="text-white/80">OS: Ubuntu 20.04 LTS</p>
                </div>
                
                <div className="bg-background-light/30 rounded-lg p-4 border border-primary/10">
                  <h3 className="font-bold text-primary mb-2">Connection Details</h3>
                  <p className="text-white/80">VPN: Connected</p>
                  <p className="text-white/80">Your IP: 10.0.0.{isRedTeam ? '5' : '10'}</p>
                  <p className="text-white/80">Status: Active</p>
                </div>
              </div>
              
              {/* Lab Controls */}
              <div className="mt-6 flex flex-wrap gap-3">
                <button className="btn-primary px-4 py-2 text-sm rounded-lg flex items-center gap-2">
                  <Terminal className="h-4 w-4" /> Open Terminal
                </button>
                <button className="btn-outline border-primary text-primary px-4 py-2 text-sm rounded-lg flex items-center gap-2">
                  <Code className="h-4 w-4" /> View Walkthrough
                </button>
                {isRedTeam && (
                  <button className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 text-sm rounded-lg flex items-center gap-2">
                    <Zap className="h-4 w-4" /> Submit Flag
                  </button>
                )}
                {isBlueTeam && (
                  <button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 text-sm rounded-lg flex items-center gap-2">
                    <Shield className="h-4 w-4" /> Block Attack
                  </button>
                )}
              </div>
            </div>
            
            {/* Scenario Description */}
            <div className="bg-background-dark/80 border border-primary/20 rounded-xl p-6 shadow-lg">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Flame className="h-5 w-5 text-primary" /> Scenario Description
              </h2>
              
              <div className="prose prose-invert max-w-none">
                <p>
                  You are {isRedTeam ? 'an attacker targeting' : 'defending'} a critical infrastructure system for a major utility company. 
                  The system controls water treatment facilities across a metropolitan area.
                </p>
                
                <h3>{isRedTeam ? 'Red Team Objectives' : 'Blue Team Objectives'}</h3>
                
                {isRedTeam ? (
                  <ul>
                    <li>Gain access to the control system</li>
                    <li>Escalate privileges to administrator</li>
                    <li>Locate and exfiltrate sensitive data</li>
                    <li>Maintain persistent access</li>
                  </ul>
                ) : (
                  <ul>
                    <li>Monitor for suspicious activities</li>
                    <li>Prevent unauthorized access</li>
                    <li>Detect and block privilege escalation attempts</li>
                    <li>Preserve evidence for analysis</li>
                  </ul>
                )}
              </div>
            </div>
            
            {/* Activity Timeline */}
            <div className="bg-background-dark/80 border border-primary/20 rounded-xl p-6 shadow-lg">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" /> Activity Timeline
              </h2>
              
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="w-10 h-10 flex-shrink-0 bg-primary/20 rounded-full flex items-center justify-center">
                    <Zap className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-white/60">3 minutes ago</p>
                    <p className="text-white font-medium">Session started</p>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <div className="w-10 h-10 flex-shrink-0 bg-red-400/20 rounded-full flex items-center justify-center">
                    <Flame className="h-5 w-5 text-red-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-white/60">2 minutes ago</p>
                    <p className="text-white font-medium">Red Team initiated port scan</p>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <div className="w-10 h-10 flex-shrink-0 bg-blue-400/20 rounded-full flex items-center justify-center">
                    <Shield className="h-5 w-5 text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-white/60">1 minute ago</p>
                    <p className="text-white font-medium">Blue Team enhanced firewall rules</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Right Column - Chat & Controls */}
          <div className="space-y-6">
            {/* Chat Area */}
            <div className="bg-background-dark/80 border border-primary/20 rounded-xl shadow-lg flex flex-col h-[600px]">
              <div className="p-4 border-b border-primary/20">
                <h2 className="font-bold">Team Chat</h2>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {chatMessages.length > 0 ? (
                  chatMessages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.user_id === user?.id ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] rounded-lg px-3 py-2 ${
                        msg.user_id === user?.id 
                          ? 'bg-primary/30 text-white' 
                          : 'bg-background-light/50 text-white/90'
                      }`}>
                        <p className="text-xs text-white/60 mb-1">{msg.username || 'User'} • {new Date(msg.created_at).toLocaleTimeString()}</p>
                        <p>{msg.message}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-white/40 text-center pt-10">No messages yet. Start the conversation!</p>
                )}
              </div>
              
              <div className="p-3 border-t border-primary/20">
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className="flex-1 bg-background-light/30 border border-primary/20 rounded-lg px-3 py-2 text-white placeholder:text-white/40 focus:border-primary/60 transition"
                    placeholder="Type a message..."
                  />
                  <button 
                    type="submit" 
                    className="btn-primary px-3 py-2 rounded-lg flex items-center"
                    disabled={!newMessage.trim()}
                  >
                    <Send className="h-5 w-5" />
                  </button>
                </form>
              </div>
            </div>
            
            {/* Quick Tools */}
            <div className="bg-background-dark/80 border border-primary/20 rounded-xl p-6 shadow-lg">
              <h2 className="text-xl font-bold mb-4">Quick Tools</h2>
              
              <div className="space-y-3">
                {isRedTeam ? (
                  <>
                    <button className="w-full bg-red-400/20 hover:bg-red-400/30 text-red-400 px-4 py-3 rounded-lg flex items-center gap-3 transition-colors">
                      <Terminal className="h-5 w-5" /> Nmap Scan
                    </button>
                    <button className="w-full bg-red-400/20 hover:bg-red-400/30 text-red-400 px-4 py-3 rounded-lg flex items-center gap-3 transition-colors">
                      <Code className="h-5 w-5" /> Exploit Browser
                    </button>
                  </>
                ) : (
                  <>
                    <button className="w-full bg-blue-400/20 hover:bg-blue-400/30 text-blue-400 px-4 py-3 rounded-lg flex items-center gap-3 transition-colors">
                      <Shield className="h-5 w-5" /> Security Dashboard
                    </button>
                    <button className="w-full bg-blue-400/20 hover:bg-blue-400/30 text-blue-400 px-4 py-3 rounded-lg flex items-center gap-3 transition-colors">
                      <Server className="h-5 w-5" /> Network Monitor
                    </button>
                  </>
                )}
                <button className="w-full bg-primary/20 hover:bg-primary/30 text-primary px-4 py-3 rounded-lg flex items-center gap-3 transition-colors">
                  <Terminal className="h-5 w-5" /> Command Reference
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OperationSessionPage;
