import React from 'react';
import { Avatar } from '../components/Avatar';

export const LabInterfacePage: React.FC = () => {
  // Placeholder for lab state, questions, chat, scoreboard, etc.
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#0A030F] via-background-dark to-[#181024] text-white">
      <header className="flex items-center justify-between px-8 py-4 border-b border-primary/20 bg-background-dark/80">
        <div className="flex items-center gap-4">
          <Avatar username="You" />
          <span className="font-bold text-lg">Red Team</span>
        </div>
        <div className="text-2xl font-extrabold text-fuchsia-400">Operation: Cyber Fortress</div>
        <div className="flex items-center gap-4">
          <Avatar username="CyberNinja" />
          <span className="font-bold text-lg">Blue Team</span>
        </div>
      </header>
      <main className="flex-1 flex flex-col md:flex-row">
        <section className="flex-1 p-8">
          <h2 className="text-xl font-bold mb-4">Scenario</h2>
          <div className="bg-background-light/80 rounded-lg p-4 mb-6 shadow">
            <div className="font-bold text-fuchsia-400 mb-2">Attack Scenario</div>
            <div className="mb-4">Red team must breach the perimeter firewall and capture the flag from the DMZ server.</div>
            <div className="font-bold text-accent-blue mb-2">Defense Scenario</div>
            <div>Blue team must detect and block the intrusion, patch vulnerabilities, and protect the flag.</div>
          </div>
          <h3 className="text-lg font-bold mb-2">Questions</h3>
          <ul className="space-y-2">
            <li className="bg-background-dark/70 rounded px-4 py-2">What is the IP address of the DMZ server?</li>
            <li className="bg-background-dark/70 rounded px-4 py-2">Which port is open to the public?</li>
          </ul>
        </section>
        <aside className="w-full md:w-96 bg-background-dark/80 p-6 border-l border-primary/20 flex flex-col gap-6">
          <div>
            <h4 className="font-bold text-lg mb-2">Scoreboard</h4>
            <div className="flex justify-between text-white/80">
              <span>Red Team</span>
              <span className="font-bold text-red-400">120</span>
            </div>
            <div className="flex justify-between text-white/80">
              <span>Blue Team</span>
              <span className="font-bold text-blue-400">110</span>
            </div>
          </div>
          <div>
            <h4 className="font-bold text-lg mb-2">Timer</h4>
            <div className="text-2xl font-mono text-fuchsia-400">00:14:23</div>
          </div>
          <div>
            <h4 className="font-bold text-lg mb-2">Chat</h4>
            <div className="bg-background-light/60 rounded p-2 h-32 overflow-y-auto text-sm mb-2">
              <div><span className="font-bold text-red-400">You:</span> Let's breach the firewall!</div>
              <div><span className="font-bold text-blue-400">CyberNinja:</span> Not on my watch!</div>
            </div>
            <input className="w-full p-2 rounded bg-background-dark/80 border border-primary/30" placeholder="Type a message..." />
          </div>
        </aside>
      </main>
    </div>
  );
};

export default LabInterfacePage;
