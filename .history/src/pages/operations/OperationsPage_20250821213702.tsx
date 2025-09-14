
import { Play, Shield, Flame, Users, MessageCircle, Clock, Activity, Zap } from 'lucide-react';

const VIDEO_SRC = '/sample-operation.mp4'; // Replace with your video file

const teamMembers = {
  red: [
    { name: 'Alice', avatar: '/assets/red1.png' },
    { name: 'Bob', avatar: '/assets/red2.png' },
    { name: 'Charlie', avatar: '/assets/red3.png' },
  ],
  blue: [
    { name: 'Eve', avatar: '/assets/blue1.png' },
    { name: 'Mallory', avatar: '/assets/blue2.png' },
    { name: 'Trent', avatar: '/assets/blue3.png' },
  ],
};

const liveEvents = [
  { team: 'red', text: 'breached firewall', time: '00:23:12' },
  { team: 'blue', text: 'patched vulnerability', time: '00:22:58' },
  { team: 'red', text: 'exfiltrated data', time: '00:22:41' },
  { team: 'blue', text: 'detected intrusion', time: '00:22:30' },
  { team: 'red', text: 'escalated privileges', time: '00:22:10' },
];

const chatMessages = [
  { user: 'Alice', team: 'red', text: 'Breach in progress, cover me!' },
  { user: 'Eve', team: 'blue', text: 'Monitoring logs, ready to respond.' },
  { user: 'Bob', team: 'red', text: 'Privilege escalation successful.' },
  { user: 'Mallory', team: 'blue', text: 'Deploying patch now.' },
];

const OperationPage = () => {
  return (
    <div className="relative min-h-screen bg-gradient-to-br from-background-dark via-background-light/80 to-background-dark text-white overflow-hidden">
      {/* Video Overlay */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <video
          src={VIDEO_SRC}
          autoPlay
          loop
          muted
          className="w-full h-96 object-cover brightness-[.35]"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-background-dark/80 to-background-dark/95" />
      </div>

      {/* Main Content */}
      <div className="relative z-10 pt-24 pb-12 px-2 sm:px-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-10">
          <div className="flex items-center gap-4">
            <Flame className="h-10 w-10 text-primary drop-shadow-lg" />
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
              <span className="text-red-400">Red Team</span>
              <span className="mx-4 text-primary">vs</span>
              <span className="text-blue-400">Blue Team</span>
            </h1>
          </div>
          <div className="flex gap-4">
            <button className="btn-primary flex items-center gap-2 px-6 py-3 text-lg font-semibold">
              <Play className="h-5 w-5" /> Start New Operation
            </button>
            <button className="btn-outline flex items-center gap-2 px-6 py-3 text-lg font-semibold border-primary text-primary hover:bg-primary/10">
              <Shield className="h-5 w-5" /> Defend
            </button>
          </div>
        </div>

        {/* Teams & Operation Status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
          {/* Red Team */}
          <div className="bg-gradient-to-br from-red-900/70 to-background-dark rounded-2xl p-6 border border-red-700/40 shadow-xl flex flex-col items-center">
            <div className="flex items-center gap-2 mb-4">
              <Users className="h-6 w-6 text-red-400" />
              <h2 className="text-2xl font-bold text-red-400">Red Team</h2>
            </div>
            <ul className="space-y-4 w-full">
              {teamMembers.red.map((member) => (
                <li key={member.name} className="flex items-center gap-3">
                  <img src={member.avatar} alt={member.name} className="w-10 h-10 rounded-full border-2 border-red-500" />
                  <span className="font-medium text-lg">{member.name}</span>
                </li>
              ))}
            </ul>
            <div className="mt-6 w-full flex flex-col gap-2">
              <div className="flex justify-between text-gray-300 text-sm">
                <span>Score</span>
                <span className="font-mono text-lg text-red-400 font-bold">12</span>
              </div>
              <div className="flex justify-between text-gray-300 text-sm">
                <span>Breaches</span>
                <span className="font-mono">3</span>
              </div>
            </div>
          </div>

          {/* Operation Status */}
          <div className="bg-background-light/90 rounded-2xl p-8 border border-primary/30 shadow-2xl flex flex-col items-center justify-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-red-500 via-primary to-blue-500 animate-pulse" />
            <div className="mb-6 flex flex-col items-center">
              <span className="px-4 py-2 rounded-full bg-primary/20 text-primary font-semibold text-lg tracking-wider flex items-center gap-2">
                <Activity className="h-5 w-5 animate-pulse" /> LIVE
              </span>
            </div>
            <div className="mb-4 text-3xl md:text-4xl font-bold text-white text-center">Operation: Breach & Defend</div>
            <div className="flex gap-8 mb-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-red-400">12</div>
                <div className="text-gray-400 text-sm">Red Score</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-400">9</div>
                <div className="text-gray-400 text-sm">Blue Score</div>
              </div>
            </div>
            <div className="w-full flex flex-col gap-2 mb-4">
              <div className="flex justify-between text-gray-300">
                <span>Time Left</span>
                <span className="font-mono">00:23:41</span>
              </div>
              <div className="flex justify-between text-gray-300">
                <span>Active Events</span>
                <span className="font-mono">5</span>
              </div>
            </div>
            <div className="flex gap-4 mt-2">
              <button className="btn-primary flex items-center gap-2 px-5 py-2 text-base font-semibold">
                <Zap className="h-4 w-4" /> Attack
              </button>
              <button className="btn-outline flex items-center gap-2 px-5 py-2 text-base font-semibold border-primary text-primary hover:bg-primary/10">
                <Shield className="h-4 w-4" /> Defend
              </button>
            </div>
          </div>

          {/* Blue Team */}
          <div className="bg-gradient-to-br from-blue-900/70 to-background-dark rounded-2xl p-6 border border-blue-700/40 shadow-xl flex flex-col items-center">
            <div className="flex items-center gap-2 mb-4">
              <Users className="h-6 w-6 text-blue-400" />
              <h2 className="text-2xl font-bold text-blue-400">Blue Team</h2>
            </div>
            <ul className="space-y-4 w-full">
              {teamMembers.blue.map((member) => (
                <li key={member.name} className="flex items-center gap-3">
                  <img src={member.avatar} alt={member.name} className="w-10 h-10 rounded-full border-2 border-blue-500" />
                  <span className="font-medium text-lg">{member.name}</span>
                </li>
              ))}
            </ul>
            <div className="mt-6 w-full flex flex-col gap-2">
              <div className="flex justify-between text-gray-300 text-sm">
                <span>Score</span>
                <span className="font-mono text-lg text-blue-400 font-bold">9</span>
              </div>
              <div className="flex justify-between text-gray-300 text-sm">
                <span>Defenses</span>
                <span className="font-mono">2</span>
              </div>
            </div>
          </div>
        </div>

        {/* Live Events & Chat */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Live Events */}
          <div className="bg-background-light/90 rounded-2xl p-6 border border-primary/20 shadow-xl">
            <h3 className="text-xl font-bold text-primary mb-4 flex items-center gap-2">
              <Flame className="h-5 w-5 text-primary" /> Live Events
            </h3>
            <ul className="space-y-3 text-gray-200 text-base">
              {liveEvents.map((event, idx) => (
                <li key={idx} className="flex items-center gap-3">
                  <span className={`inline-block w-2 h-2 rounded-full ${event.team === 'red' ? 'bg-red-500' : 'bg-blue-500'}`}></span>
                  <span className={event.team === 'red' ? 'text-red-300' : 'text-blue-300'}>
                    {event.team === 'red' ? 'Red Team' : 'Blue Team'}
                  </span>
                  <span className="text-gray-400">{event.text}</span>
                  <span className="ml-auto text-xs text-gray-500 font-mono">{event.time}</span>
                </li>
              ))}
            </ul>
          </div>
          {/* Team Chat */}
          <div className="bg-background-light/90 rounded-2xl p-6 border border-primary/20 shadow-xl flex flex-col h-80">
            <h3 className="text-xl font-bold text-primary mb-4 flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-primary" /> Team Chat
            </h3>
            <div className="flex-1 overflow-y-auto space-y-2 text-gray-300 mb-4 pr-2">
              {chatMessages.map((msg, idx) => (
                <div key={idx}>
                  <span className={msg.team === 'red' ? 'text-red-400 font-bold' : 'text-blue-400 font-bold'}>
                    {msg.user}:
                  </span> {msg.text}
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                className="flex-1 rounded-lg bg-background-dark border border-primary/30 px-4 py-2 text-white focus:outline-none"
                placeholder="Type a message..."
                disabled
              />
              <button className="btn-primary px-6 py-2 rounded-lg opacity-60 cursor-not-allowed" disabled>Send</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OperationPage;
