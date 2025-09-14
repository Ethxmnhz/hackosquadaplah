

import { Play, Shield, Flame, Zap, Info } from 'lucide-react';
import React, { useEffect } from 'react';

const VIDEO_SRC = '/src/assets/RED_VS_BLUE.mp4';





const operationDescription = `
Step into the arena of real cyber warfare. Red Team vs Blue Team Operations let you relive and practice the world’s most notorious breaches—live, with friends or rivals. Experience the thrill of attack and defense, test your skills against real tactics, and face scenarios you’ll never see anywhere else. This is not a classroom. This is the front line.`;

const showcasePoints = [
  {
    icon: <Flame className="h-8 w-8 text-primary" />,
    title: 'Practice Real Breaches',
    desc: 'Recreate and defend against legendary hacks. Every scenario is inspired by real-world attacks.'
  },
  {
    icon: <Zap className="h-8 w-8 text-red-400" />,
    title: 'Play With Friends & Make Rivals',
    desc: 'Team up, compete, and build your legend. Every operation is a new story.'
  },
  {
    icon: <Shield className="h-8 w-8 text-blue-400" />,
    title: 'Experience the Unimaginable',
    desc: 'Face scenarios and tactics you’ll never see in a classroom. This is cyber combat, not theory.'
  },
];



const OperationPage = () => {
  return (
  <div className="relative min-h-screen text-white overflow-hidden" style={{ background: 'radial-gradient(ellipse at 60% 20%, #181024 0%, #0A030F 100%)' }}>
      {/* Cinematic Video Hero */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <video
          src={VIDEO_SRC}
          autoPlay
          loop
          muted
          className="w-full h-[38vh] min-h-[320px] object-cover brightness-[.18]"
          style={{ filter: 'blur(2px) grayscale(0.3)' }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/95 via-[#0A030F]/95 to-[#0A030F]/100" />
      </div>

  <div className="relative z-10 pt-24 pb-12 px-2 sm:px-6 max-w-6xl mx-auto">
        {/* Animated Offensive/Defensive SVGs */}
        {/* Hero Section */}
  <div className="text-center mb-16 relative z-10">
          <div className="flex justify-center mb-6">
            <Flame className="h-14 w-14 text-primary drop-shadow-lg animate-pulse" />
          </div>
          <h1 className="text-6xl font-black tracking-tight mb-6 bg-gradient-to-r from-red-400 via-primary to-blue-400 text-transparent bg-clip-text drop-shadow-[0_2px_24px_rgba(127,90,240,0.25)] animate-fade-in">
            Red Team vs Blue Team Operations
          </h1>
          <div className="flex justify-center mb-6">
            <span className="px-6 py-2 rounded-full bg-gradient-to-r from-primary to-accent-blue text-white text-xl font-black tracking-widest shadow-lg animate-pulse-slow border border-primary/40 uppercase" style={{letterSpacing:'0.22em'}}>Red Team vs Blue Team</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-black tracking-tight mb-8 bg-gradient-to-r from-red-400 via-primary to-blue-400 text-transparent bg-clip-text drop-shadow-[0_2px_24px_rgba(127,90,240,0.25)] animate-fade-in">
            Practice the Past. Defend the Future.
          </h1>
          <p className="text-2xl md:text-3xl text-gray-200 max-w-3xl mx-auto mb-10 animate-fade-in font-semibold">
            Relive the world’s most infamous breaches. Play with friends. Make enemies. Experience cyber warfare like never before.
          </p>
          <div className="flex flex-wrap justify-center gap-4 mt-8 animate-fade-in">
            <button className="btn-primary flex items-center gap-2 px-12 py-5 text-2xl font-black shadow-xl transition-transform hover:scale-105 focus:scale-105">
              <Play className="h-8 w-8" /> Enter the Arena
            </button>
            <button className="btn-outline flex items-center gap-2 px-12 py-5 text-2xl font-black border-primary text-primary hover:bg-primary/10 transition-transform hover:scale-105 focus:scale-105">
              <Info className="h-8 w-8" /> See How It Works
            </button>
          </div>
        </div>

        {/* Infographic: What is an Operation? */}
        <div className="bg-background-light/80 rounded-2xl p-10 border border-primary/30 shadow-2xl mb-20 flex flex-col md:flex-row items-center gap-10 animate-fade-in backdrop-blur-md" style={{boxShadow:'0 0 32px #7f5af055, 0 2px 32px #0A030Fcc'}}>
          <div className="flex-1 flex flex-col gap-6 items-center justify-center">
            <h2 className="text-3xl font-extrabold text-primary flex items-center gap-3 mb-4">
              <Shield className="h-8 w-8 text-primary" /> What Makes It Different?
            </h2>
            <p className="text-gray-200 text-xl whitespace-pre-line text-center font-semibold mb-6">
              {operationDescription}
            </p>
            <ul className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-8 w-full">
              {showcasePoints.map((point, idx) => (
                <li key={idx} className="flex flex-col items-center gap-3">
                  {point.icon}
                  <span className="font-bold text-lg text-white text-center">{point.title}</span>
                  <span className="text-gray-400 text-center text-base font-normal">{point.desc}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Benefits Section */}
  {/* No timeline/leaderboard/irrelevant elements for pure marketing impact */}

        {/* Call to Action */}
        <div className="text-center mt-20 animate-fade-in">
          <h2 className="text-4xl font-extrabold text-primary mb-8">Ready to Experience Cyber Combat?</h2>
          <p className="text-2xl text-gray-200 mb-10 max-w-2xl mx-auto font-semibold">
            This is your chance to practice, play, and experience cyber security like never before. Enter the arena. Make history.
          </p>
          <button className="btn-primary px-16 py-6 text-2xl font-black flex items-center gap-4 shadow-xl animate-pulse-slow transition-transform hover:scale-105">
            <Play className="h-8 w-8" /> Start Your First Operation
          </button>
        </div>
      </div>
    </div>
  );
};

export default OperationPage;
