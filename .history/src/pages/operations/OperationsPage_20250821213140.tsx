import React from 'react';

// Sample video path (replace with your own video file in public/ or assets/)
const VIDEO_SRC = '/sample-operation.mp4';

const teamMembers = {
  red: [
    { name: 'Alice', avatar: '/assets/red1.png' },
    { name: 'Bob', avatar: '/assets/red2.png' },
  ],
  blue: [
    { name: 'Eve', avatar: '/assets/blue1.png' },
    { name: 'Mallory', avatar: '/assets/blue2.png' },
  ],
};

const OperationPage: React.FC = () => {
  return (
    <div className="relative min-h-screen bg-background-dark text-white overflow-hidden">
      {/* Video Overlay */}
      <div className="absolute inset-0 z-0">
        <video
          src={VIDEO_SRC}
          autoPlay
          loop
          muted
          className="w-full h-80 object-cover brightness-50"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 to-background-dark/90" />
      </div>

      {/* Main Content */}
      <div className="relative z-10 pt-32 pb-12 px-4 max-w-7xl mx-auto">
        {/* Title & Description */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-extrabold tracking-tight mb-4">
            Red Team <span className="text-primary">vs</span> Blue Team
          </h1>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto">
            Real-time cyber breach simulation. Team up with friends or challenge rivals in a live operation environment.
          </p>
        </div>

        {/* Teams & Operation Status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
          {/* Red Team */}
          <div className="bg-gradient-to-br from-red-900/60 to-background-dark rounded-2xl p-6 border border-red-700/40 shadow-lg">
            <h2 className="text-2xl font-bold text-red-400 mb-4">Red Team</h2>
            <ul className="space-y-4">
              {teamMembers.red.map((member) => (
                <li key={member.name} className="flex items-center gap-3">
                  <img src={member.avatar} alt={member.name} className="w-10 h-10 rounded-full border-2 border-red-500" />
                  <span className="font-medium text-lg">{member.name}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Operation Status */}
          <div className="bg-background-light/80 rounded-2xl p-8 border border-primary/30 shadow-xl flex flex-col items-center justify-center">
            <div className="mb-6">
              <span className="px-4 py-2 rounded-full bg-primary/20 text-primary font-semibold text-lg tracking-wider">
                LIVE
              </span>
            </div>
            <div className="mb-4 text-4xl font-bold text-white">Operation: Breach & Defend</div>
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
            <div className="w-full flex flex-col gap-2">
              <div className="flex justify-between text-gray-300">
                <span>Time Left</span>
                <span className="font-mono">00:23:41</span>
              </div>
              <div className="flex justify-between text-gray-300">
                <span>Active Events</span>
                <span className="font-mono">5</span>
              </div>
            </div>
          </div>

          {/* Blue Team */}
          <div className="bg-gradient-to-br from-blue-900/60 to-background-dark rounded-2xl p-6 border border-blue-700/40 shadow-lg">
            <h2 className="text-2xl font-bold text-blue-400 mb-4">Blue Team</h2>
            <ul className="space-y-4">
              {teamMembers.blue.map((member) => (
                <li key={member.name} className="flex items-center gap-3">
                  <img src={member.avatar} alt={member.name} className="w-10 h-10 rounded-full border-2 border-blue-500" />
                  <span className="font-medium text-lg">{member.name}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Chat & Events */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Live Events */}
          <div className="bg-background-light/80 rounded-2xl p-6 border border-primary/20 shadow">
            <h3 className="text-xl font-bold text-primary mb-4">Live Events</h3>
            <ul className="space-y-3 text-gray-200 text-base">
              <li>Red Team breached firewall at 00:23:12</li>
              <li>Blue Team patched vulnerability at 00:22:58</li>
              <li>Red Team exfiltrated data at 00:22:41</li>
              <li>Blue Team detected intrusion at 00:22:30</li>
              <li>Red Team escalated privileges at 00:22:10</li>
            </ul>
          </div>
          {/* Team Chat */}
          <div className="bg-background-light/80 rounded-2xl p-6 border border-primary/20 shadow flex flex-col h-80">
            <h3 className="text-xl font-bold text-primary mb-4">Team Chat</h3>
            <div className="flex-1 overflow-y-auto space-y-2 text-gray-300 mb-4">
              <div><span className="text-red-400 font-bold">Alice:</span> Breach in progress, cover me!</div>
              <div><span className="text-blue-400 font-bold">Eve:</span> Monitoring logs, ready to respond.</div>
              <div><span className="text-red-400 font-bold">Bob:</span> Privilege escalation successful.</div>
              <div><span className="text-blue-400 font-bold">Mallory:</span> Deploying patch now.</div>
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
