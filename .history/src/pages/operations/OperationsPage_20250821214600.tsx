

import { Play, Shield, Flame, Zap, Info, Award, Users, BarChart3, ArrowRight, ShieldOff, Bomb } from 'lucide-react';
import React, { useEffect } from 'react';

const VIDEO_SRC = '/src/assets/RED_VS_BLUE.mp4';


// Glowing SVG grid background
const CyberGrid = () => (
  <svg className="absolute inset-0 w-full h-full z-0 pointer-events-none" style={{ opacity: 0.22 }}>
    <defs>
      <linearGradient id="gridGlow" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#7f5af0" stopOpacity="0.18" />
        <stop offset="100%" stopColor="#0A030F" stopOpacity="0.0" />
      </linearGradient>
    </defs>
    {[...Array(30)].map((_, i) => (
      <line key={i} x1={i * 40} y1="0" x2={i * 40} y2="2000" stroke="url(#gridGlow)" strokeWidth="1" />
    ))}
    {[...Array(20)].map((_, i) => (
      <line key={i} y1={i * 40} x1="0" y2={i * 40} x2="2000" stroke="url(#gridGlow)" strokeWidth="1" />
    ))}
  </svg>
);

// Animated cyber nodes
const CyberNodes = () => (
  <svg className="absolute inset-0 w-full h-full z-0 pointer-events-none" style={{ opacity: 0.18 }}>
    <circle cx="12%" cy="18%" r="7" fill="#7f5af0" className="animate-pulse-slow" />
    <circle cx="80%" cy="30%" r="5" fill="#00d4ff" className="animate-pulse-slow" />
    <circle cx="60%" cy="80%" r="6" fill="#ff4b9b" className="animate-pulse-slow" />
    <circle cx="40%" cy="60%" r="4" fill="#fff" className="animate-pulse-slow" />
    <circle cx="70%" cy="50%" r="8" fill="#7f5af0" className="animate-pulse-slow" />
  </svg>
);

// Code rain effect (Matrix style)
const CodeRain = () => {
  useEffect(() => {
    const canvas = document.getElementById('code-rain-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let width = window.innerWidth;
    let height = 120;
    canvas.width = width;
    canvas.height = height;
    const chars = '01#@%&$';
    const fontSize = 18;
    const columns = Math.floor(width / fontSize);
    const drops = Array(columns).fill(1);
    let animationFrame;
    function draw() {
      ctx.fillStyle = 'rgba(10,3,15,0.18)';
      ctx.fillRect(0, 0, width, height);
      ctx.font = fontSize + 'px monospace';
      ctx.fillStyle = '#7f5af0';
      for (let i = 0; i < drops.length; i++) {
        const text = chars[Math.floor(Math.random() * chars.length)];
        ctx.fillText(text, i * fontSize, drops[i] * fontSize);
        if (Math.random() > 0.975) drops[i] = 0;
        drops[i]++;
        if (drops[i] * fontSize > height) drops[i] = 0;
      }
      animationFrame = requestAnimationFrame(draw);
    }
    draw();
    return () => cancelAnimationFrame(animationFrame);
  }, []);
  return <canvas id="code-rain-canvas" className="fixed top-0 left-0 w-full h-24 z-20 pointer-events-none" style={{mixBlendMode:'screen'}} />;
};

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


const operationDescription = `
A Red Team vs Blue Team Operation is a real-time, hands-on cyber security battle. Two teams compete in a live, professional-grade environment: the Red Team attacks, the Blue Team defends. Every action is tracked, scored, and visualized. This is not a simulation—this is cyber warfare, gamified for learning, competition, and fun.`;

const howItWorks = [
  {
    icon: <Flame className="h-8 w-8 text-primary" />, title: 'Choose Your Side',
    desc: 'Join as Red Team (Attack) or Blue Team (Defend). Each side has unique tools, objectives, and strategies.'
  },
  {
    icon: <Zap className="h-8 w-8 text-red-400" />, title: 'Live Cyber Battle',
    desc: 'Red Team launches real attacks, Blue Team responds in real time. Every move is tracked and scored.'
  },
  {
    icon: <Shield className="h-8 w-8 text-blue-400" />, title: 'Win, Learn, Dominate',
    desc: 'Earn points, climb the leaderboard, and build real-world skills. Every operation is a new challenge.'
  },
];

const benefits = [
  {
    icon: <Award className="h-7 w-7 text-accent-green" />,
    title: 'Real-World Skills',
    desc: 'Practice offensive and defensive tactics in a safe, realistic environment.'
  },
  {
    icon: <Users className="h-7 w-7 text-primary" />,
    title: 'Teamwork & Rivalry',
    desc: 'Collaborate with friends or challenge rivals. Communication and coordination are key.'
  },
  {
    icon: <BarChart3 className="h-7 w-7 text-accent-blue" />,
    title: 'Live Leaderboards',
    desc: 'See your progress, compare with others, and earn your place at the top.'
  },
];



const OperationPage = () => {
  return (
  <div className="relative min-h-screen text-white overflow-hidden" style={{ background: '#0A030F' }}>
      {/* Cinematic Video Hero */}
  <div className="absolute inset-0 z-0 pointer-events-none">
        <video
          src={VIDEO_SRC}
          autoPlay
          loop
          muted
          className="w-full h-[38vh] min-h-[420px] object-cover brightness-[.20]"
        />
  <div className="absolute inset-0 bg-gradient-to-b from-black/90 via-[#0A030F]/80 to-[#0A030F]/95" />
  <CyberGrid />
  <CyberNodes />
      </div>

  <CodeRain />
  <div className="relative z-10 pt-24 pb-12 px-2 sm:px-6 max-w-6xl mx-auto">
        {/* Animated Offensive/Defensive SVGs */}
        <div className="absolute left-0 top-32 z-0 opacity-40 animate-pulse-slow pointer-events-none">
          <Bomb className="w-32 h-32 text-red-900/60 drop-shadow-[0_0_32px_#ff4b9b77]" />
        </div>
        <div className="absolute right-0 top-60 z-0 opacity-40 animate-pulse-slow pointer-events-none">
          <ShieldOff className="w-32 h-32 text-blue-900/60 drop-shadow-[0_0_32px_#00d4ff77]" />
        </div>
        {/* Hero Section */}
  <div className="text-center mb-16 relative z-10">
          <div className="flex justify-center mb-6">
            <Flame className="h-14 w-14 text-primary drop-shadow-lg animate-pulse" />
          </div>
          <h1 className="text-6xl font-black tracking-tight mb-6 bg-gradient-to-r from-red-400 via-primary to-blue-400 text-transparent bg-clip-text drop-shadow-[0_2px_24px_rgba(127,90,240,0.25)] animate-fade-in">
            Red Team vs Blue Team Operations
          </h1>
          <p className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto mb-8 animate-fade-in">
            The ultimate cyber battleground. Attack, defend, and master real-world skills in live, team-based operations.
          </p>
          <div className="flex flex-wrap justify-center gap-4 mt-6 animate-fade-in">
            <button className="btn-primary flex items-center gap-2 px-10 py-5 text-xl font-bold shadow-xl">
              <Play className="h-7 w-7" /> Start an Operation
            </button>
            <button className="btn-outline flex items-center gap-2 px-10 py-5 text-xl font-bold border-primary text-primary hover:bg-primary/10">
              <Info className="h-7 w-7" /> Learn More
            </button>
          </div>
        </div>

        {/* Infographic: What is an Operation? */}
  <div className="bg-background-light/90 rounded-2xl p-10 border border-primary/20 shadow-2xl mb-20 flex flex-col md:flex-row items-center gap-10 animate-fade-in backdrop-blur-md bg-opacity-80" style={{boxShadow:'0 0 32px #7f5af055, 0 2px 32px #0A030Fcc'}}>
          <div className="flex-1 flex flex-col gap-6">
            <h2 className="text-3xl font-extrabold text-primary flex items-center gap-3 mb-2">
              <Shield className="h-8 w-8 text-primary" /> What is a Red vs Blue Operation?
            </h2>
            <p className="text-gray-200 text-lg whitespace-pre-line">
              {operationDescription}
            </p>
            <ul className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-6">
              <li className="flex items-center gap-3">
                <Flame className="h-7 w-7 text-red-400" /> <span className="font-semibold text-white">Red Team: Attack</span>
              </li>
              <li className="flex items-center gap-3">
                <Shield className="h-7 w-7 text-blue-400" /> <span className="font-semibold text-white">Blue Team: Defend</span>
              </li>
              <li className="flex items-center gap-3">
                <Award className="h-7 w-7 text-accent-green" /> <span className="font-semibold text-white">Live Scoring</span>
              </li>
            </ul>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="bg-gradient-to-br from-primary/30 to-background-dark rounded-2xl p-8 border border-primary/20 shadow-xl w-full max-w-xs backdrop-blur-md bg-opacity-80" style={{boxShadow:'0 0 24px #7f5af055, 0 2px 24px #0A030Fcc'}}>
              <div className="flex items-center gap-3 mb-4">
                <BarChart3 className="h-7 w-7 text-accent-blue" />
                <span className="text-lg font-bold text-white">Live Leaderboard</span>
              </div>
              <ul className="space-y-2 text-gray-200">
                <li>1. Alice (Red) - 1200 pts</li>
                <li>2. Eve (Blue) - 1100 pts</li>
                <li>3. Bob (Red) - 950 pts</li>
                <li>4. Mallory (Blue) - 900 pts</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Benefits Section */}
  <div className="mb-20 animate-fade-in">
          <h2 className="text-3xl font-extrabold text-primary mb-10 text-center">Why Play Operations?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {benefits.map((benefit, idx) => (
              <div key={idx} className="bg-background-dark/80 rounded-2xl border border-primary/10 p-10 flex flex-col items-center shadow-xl hover:scale-[1.03] transition-transform backdrop-blur-md bg-opacity-80" style={{boxShadow:'0 0 16px #7f5af055, 0 2px 16px #0A030Fcc'}}>
                <div className="mb-4">{benefit.icon}</div>
                <h3 className="text-xl font-bold text-white mb-2 text-center">{benefit.title}</h3>
                <p className="text-gray-400 text-center">{benefit.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Timeline: How It Works */}
  <div className="mb-24 animate-fade-in">
          <h2 className="text-3xl font-extrabold text-primary mb-10 text-center">How It Works</h2>
          <div className="flex flex-col md:flex-row items-center justify-center gap-8">
            {howItWorks.map((step, idx) => (
              <div key={idx} className="relative flex flex-col items-center md:items-start text-center md:text-left">
                <div className="bg-background-dark border-2 border-primary/30 rounded-full p-5 mb-4 shadow-lg backdrop-blur-md" style={{boxShadow:'0 0 12px #7f5af055, 0 2px 12px #0A030Fcc'}}>
                  {step.icon}
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{step.title}</h3>
                <p className="text-gray-400 max-w-xs">{step.desc}</p>
                {idx < howItWorks.length - 1 && (
                  <ArrowRight className="hidden md:block absolute top-1/2 right-[-2.5rem] text-primary w-10 h-10" />
                )}
                {idx < howItWorks.length - 1 && (
                  <div className="block md:hidden w-1 h-8 bg-primary/30 mx-auto my-2 rounded-full" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Call to Action */}
  <div className="text-center mt-16 animate-fade-in">
          <h2 className="text-3xl font-extrabold text-primary mb-6">Ready to Enter the Arena?</h2>
          <p className="text-lg text-gray-300 mb-8 max-w-2xl mx-auto">
            Join a live operation, test your skills, and become a legend. Whether you’re a beginner or a pro, there’s a place for you on the battlefield.
          </p>
          <button className="btn-primary px-12 py-5 text-xl font-bold flex items-center gap-3 shadow-xl">
            <Play className="h-7 w-7" /> Get Started
          </button>
        </div>
      </div>
    </div>
  );
};

export default OperationPage;
