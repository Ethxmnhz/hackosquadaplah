

import { Play, Shield, Flame, Users, MessageCircle, Activity, Zap, Info } from 'lucide-react';

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

const operationDescription = `A Red Team vs Blue Team operation is a real-time, hands-on cyber security challenge where two teams compete in a simulated environment. The Red Team acts as attackers, attempting to breach systems, exploit vulnerabilities, and exfiltrate data. The Blue Team defends, detecting intrusions, patching vulnerabilities, and maintaining system integrity.\n\nOperations are designed to mimic real-world cyber attacks and defenses, providing an immersive, competitive, and educational experience. Join with friends or rivals, test your skills, and climb the leaderboard!`;

const howItWorks = [
  {
    icon: <Flame className="h-7 w-7 text-primary" />, title: 'Join or Create an Operation',
    desc: 'Start a new operation or join an existing one. Choose your side: Red (Attack) or Blue (Defend).'
  },
  {
    icon: <Zap className="h-7 w-7 text-red-400" />, title: 'Compete in Real Time',
    desc: 'Red Team launches attacks and exploits, Blue Team monitors, detects, and responds. Every action is live.'
  },
  {
    icon: <Shield className="h-7 w-7 text-blue-400" />, title: 'Score & Progress',
    desc: 'Earn points for successful attacks or defenses. Track your progress and see live stats.'
  },
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

      {/* Hero Section: What is an Operation? */}
      <div className="relative z-10 pt-24 pb-12 px-2 sm:px-6 max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <div className="flex justify-center mb-4">
            <Flame className="h-12 w-12 text-primary drop-shadow-lg" />
          </div>
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight mb-6">
            Red Team <span className="text-primary">vs</span> Blue Team Operations
          </h1>
          <p className="text-lg md:text-xl text-gray-300 max-w-3xl mx-auto mb-6">
            Experience the thrill of real-time cyber warfare. Compete, collaborate, and learn in immersive, live attack & defense scenarios.
          </p>
          <div className="flex flex-wrap justify-center gap-4 mt-6">
            <button className="btn-primary flex items-center gap-2 px-8 py-4 text-lg font-semibold shadow-lg">
              <Play className="h-6 w-6" /> Start an Operation
            </button>
            <button className="btn-outline flex items-center gap-2 px-8 py-4 text-lg font-semibold border-primary text-primary hover:bg-primary/10">
              <Info className="h-6 w-6" /> Learn More
            </button>
          </div>
        </div>

        {/* What is an Operation? */}
        <div className="bg-background-light/90 rounded-2xl p-8 border border-primary/20 shadow-xl mb-16">
          <h2 className="text-3xl font-bold text-primary mb-4 flex items-center gap-2">
            <Shield className="h-7 w-7 text-primary" /> What is a Red vs Blue Operation?
          </h2>
          <p className="text-gray-200 text-lg whitespace-pre-line">
            {operationDescription}
          </p>
        </div>

        {/* How It Works */}
        <div className="mb-20">
          <h2 className="text-3xl font-bold text-primary mb-8 text-center">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {howItWorks.map((step, idx) => (
              <div key={idx} className="bg-background-dark rounded-2xl border border-primary/10 p-8 flex flex-col items-center shadow-lg">
                <div className="mb-4">{step.icon}</div>
                <h3 className="text-xl font-bold text-white mb-2 text-center">{step.title}</h3>
                <p className="text-gray-400 text-center">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OperationPage;
