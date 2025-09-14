import { Flame, Shield, Play } from 'lucide-react';


const RedVsBluePage = () => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#0A030F] via-background-dark to-[#181024] text-white px-4 py-16">
    <div className="max-w-3xl w-full text-center">
      <div className="flex justify-center mb-6">
        <span className="px-6 py-2 rounded-full bg-gradient-to-r from-primary to-accent-blue text-white text-xl font-black tracking-widest shadow-lg animate-pulse-slow border border-primary/40 uppercase" style={{letterSpacing:'0.22em'}}>Red vs Blue</span>
      </div>
      <h1 className="text-5xl md:text-6xl font-black tracking-tight mb-8 bg-gradient-to-r from-red-400 via-primary to-blue-400 text-transparent bg-clip-text drop-shadow-[0_2px_24px_rgba(127,90,240,0.25)] animate-fade-in">
        The Ultimate Cyber Arena
      </h1>
      <p className="text-2xl md:text-3xl text-white max-w-2xl mx-auto mb-10 animate-fade-in font-semibold" style={{textShadow:'0 2px 16px #7f5af0cc'}}>
        Red Team vs Blue Team. Relive legendary breaches, defend against real tactics, and experience cyber warfare with friends and rivals.
      </p>

      {/* Stats Section */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-8 mb-12 animate-fade-in">
        <div className="bg-background-light/80 rounded-xl p-6 border border-primary/30 shadow-lg flex flex-col items-center">
          <span className="text-3xl font-black text-fuchsia-400 mb-2">1,250</span>
          <span className="text-lg font-semibold text-white/90">Total Points</span>
        </div>
        <div className="bg-background-light/80 rounded-xl p-6 border border-accent-blue/30 shadow-lg flex flex-col items-center">
          <span className="text-3xl font-black text-accent-blue mb-2">Lab: Fortress</span>
          <span className="text-lg font-semibold text-white/90">Last Played Lab</span>
        </div>
        <div className="bg-background-light/80 rounded-xl p-6 border border-green-400/30 shadow-lg flex flex-col items-center">
          <span className="text-3xl font-black text-green-400 mb-2">Aug 20, 2025</span>
          <span className="text-lg font-semibold text-white/90">Last Played</span>
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-4 mt-4 animate-fade-in">
        <button className="btn-primary flex items-center gap-2 px-12 py-5 text-2xl font-black shadow-xl transition-transform hover:scale-105 focus:scale-105">
          <Play className="h-8 w-8" /> Enter the Arena
        </button>
      </div>

      <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-background-light/80 rounded-2xl p-8 border border-red-500/40 shadow-xl flex flex-col items-center backdrop-blur-md" style={{boxShadow:'0 0 16px #ff4b9b55, 0 2px 16px #0A030Fcc'}}>
          <Flame className="h-10 w-10 text-red-400 mb-4" />
          <h2 className="text-2xl font-bold text-red-400 mb-2">Red Team</h2>
          <p className="text-lg text-white opacity-90">Attack, exploit, and breach. Use real-world tactics to break through defenses and make history.</p>
        </div>
        <div className="bg-background-light/80 rounded-2xl p-8 border border-blue-500/40 shadow-xl flex flex-col items-center backdrop-blur-md" style={{boxShadow:'0 0 16px #00d4ff55, 0 2px 16px #0A030Fcc'}}>
          <Shield className="h-10 w-10 text-blue-400 mb-4" />
          <h2 className="text-2xl font-bold text-blue-400 mb-2">Blue Team</h2>
          <p className="text-lg text-white opacity-90">Defend, detect, and respond. Face relentless attacks and prove your skills under pressure.</p>
        </div>
      </div>
    </div>
  </div>
);

export default RedVsBluePage;
