import { useState } from 'react';
import { Play, Shield, Flame, Info, Terminal, Server, ArrowRight, Award, Users, Target, FileCode, CheckCircle, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const VIDEO_SRC = '/src/assets/RED_VS_BLUE.mp4';

const operationDescription = `
Experience real-world cyber warfare in a controlled environment. Our Red Team vs Blue Team Operations platform puts you in the midst of simulated cyber attacks based on notorious security breaches. Test your offensive and defensive skills, collaborate with teammates, and compete against rivals in high-stakes scenarios that simulate the intensity of real cyber incidents.`;

const showcasePoints = [
  {
    icon: <Terminal className="h-8 w-8 text-red-400" />,
    title: 'Live Attack Scenarios',
    desc: 'Face dynamic challenges that adapt to your actions, creating a realistic cybersecurity battleground.'
  },
  {
    icon: <Shield className="h-8 w-8 text-blue-400" />,
    title: 'Team-Based Defense',
    desc: 'Coordinate with teammates to analyze, respond, and fortify systems against sophisticated attacks.'
  },
  {
    icon: <Server className="h-8 w-8 text-primary" />,
    title: 'Realistic Infrastructure',
    desc: 'Work with enterprise-grade systems and networks that mirror real-world technology stacks.'
  },
];

const featureItems = [
  {
    icon: <Flame className="h-10 w-10 text-red-400" />,
    title: "Offensive Operations",
    description: "Practice ethical hacking techniques, exploit vulnerabilities, and execute advanced attack chains as part of the Red Team."
  },
  {
    icon: <Shield className="h-10 w-10 text-blue-400" />,
    title: "Defensive Strategies",
    description: "Detect intrusions, mitigate attacks, and secure critical infrastructure in real-time as the Blue Team defender."
  },
  {
    icon: <Users className="h-10 w-10 text-primary" />,
    title: "Team Collaboration",
    description: "Communicate effectively, share intelligence, and coordinate responses with your team members."
  },
  {
    icon: <Target className="h-10 w-10 text-red-400" />,
    title: "Real-world Scenarios",
    description: "Face challenges based on actual security incidents and sophisticated attack techniques."
  },
  {
    icon: <FileCode className="h-10 w-10 text-blue-400" />,
    title: "Skill Development",
    description: "Enhance your technical abilities, critical thinking, and decision-making under pressure."
  },
  {
    icon: <Award className="h-10 w-10 text-primary" />,
    title: "Performance Analytics",
    description: "Track your progress, identify strengths and weaknesses, and improve your cybersecurity expertise."
  }
];

const upcomingOperations = [
  {
    id: 'op-1',
    title: "Colonial Pipeline Breach",
    date: "September 20, 2025",
    difficulty: "Advanced",
    participants: 32,
    description: "Recreate or defend against the infamous ransomware attack that shut down critical infrastructure.",
    image: "cyber-grid.svg"
  },
  {
    id: 'op-2',
    title: "SolarWinds Supply Chain",
    date: "September 25, 2025",
    difficulty: "Expert",
    participants: 24,
    description: "Experience the sophisticated nation-state attack that compromised thousands of organizations.",
    image: "circuit-pattern.svg"
  },
  {
    id: 'op-3',
    title: "Financial Data Exfiltration",
    date: "October 3, 2025",
    difficulty: "Intermediate",
    participants: 28,
    description: "Steal or protect sensitive financial data in this simulation of a banking system breach.",
    image: "cyber-grid.svg"
  }
];

const OperationsPage = () => {
  const navigate = useNavigate();
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  
  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        staggerChildren: 0.1,
        delayChildren: 0.3
      } 
    }
  };
  
  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: { type: "spring", stiffness: 100 }
    }
  };

  const handleNavigateToArena = () => {
    navigate('/operations/arena');
  };

  const content = (
    <div className="min-h-screen text-white" 
         style={{ 
           background: 'radial-gradient(ellipse at 60% 20%, #181024 0%, #0A030F 100%)',
           backgroundAttachment: 'fixed'
         }}>
      
      {/* Hero Section with Video Background */}
      <div className="relative h-[80vh] min-h-[600px] overflow-hidden">
        {/* Video Background */}
        <div className="absolute inset-0 z-0">
          <video
            src={VIDEO_SRC}
            autoPlay
            loop
            muted
            onLoadedData={() => setIsVideoLoaded(true)}
            className={`w-full h-full object-cover transition-opacity duration-1000 ${isVideoLoaded ? 'opacity-20' : 'opacity-0'}`}
            style={{ filter: 'blur(2px) contrast(1.1) saturate(1.2)' }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0A030F]/70 via-[#0A030F]/80 to-[#0A030F]" />
        </div>
        
        {/* Hero Content */}
        <div className="relative z-10 h-full flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <motion.div 
            className="text-center"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <div className="flex justify-center mb-6">
              <div className="flex items-center gap-3 px-6 py-2 rounded-full bg-gradient-to-r from-red-500/20 to-blue-500/20 border border-primary/30 backdrop-blur-sm">
                <span className="text-red-400 font-bold">RED TEAM</span>
                <span className="text-xl font-black text-white">VS</span>
                <span className="text-blue-400 font-bold">BLUE TEAM</span>
              </div>
            </div>
            
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight mb-6">
              <span className="bg-gradient-to-r from-red-400 via-primary to-blue-400 text-transparent bg-clip-text drop-shadow-[0_2px_24px_rgba(127,90,240,0.25)]">
                Cyber Combat Arena
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto mb-10 leading-relaxed">
              Master the art of <span className="text-red-400 font-semibold">attack</span> and <span className="text-blue-400 font-semibold">defense</span> in real-world scenarios. Train with the best, compete against the rest.
            </p>
            
            <div className="flex flex-wrap justify-center gap-4 mt-8">
              <motion.button 
                className="px-8 py-4 text-xl font-bold rounded-xl bg-gradient-to-r from-red-500 to-primary text-white shadow-lg shadow-primary/30 flex items-center gap-3 transition-transform hover:scale-105 hover:shadow-xl hover:shadow-primary/40"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleNavigateToArena}
              >
                <Play className="h-6 w-6" /> Enter the Arena
              </motion.button>
              
              <motion.button 
                className="px-8 py-4 text-xl font-bold rounded-xl border-2 border-primary/50 text-primary bg-background-dark/50 backdrop-blur-sm flex items-center gap-3 transition-all hover:bg-primary/10 hover:border-primary"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
              >
                <Info className="h-6 w-6" /> Learn More
              </motion.button>
            </div>
          </motion.div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#0A030F] to-transparent z-10"></div>
      </div>
      
  {/* Main Content (Gated) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        
        {/* What is Operations Section */}
        <motion.section 
          className="mb-24"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex flex-col lg:flex-row gap-12 items-center">
            <div className="lg:w-1/2">
              <h2 className="text-3xl sm:text-4xl font-bold mb-6 flex items-center gap-3">
                <span className="text-primary">What are</span> Operations?
              </h2>
              
              <p className="text-gray-300 text-lg leading-relaxed mb-8 whitespace-pre-line">
                {operationDescription}
              </p>
              
              <div className="flex items-center gap-4">
                <CheckCircle className="h-6 w-6 text-green-400" />
                <span className="text-gray-200">Practice with realistic scenarios</span>
              </div>
              <div className="flex items-center gap-4 mt-3">
                <CheckCircle className="h-6 w-6 text-green-400" />
                <span className="text-gray-200">Learn from experienced security professionals</span>
              </div>
              <div className="flex items-center gap-4 mt-3">
                <CheckCircle className="h-6 w-6 text-green-400" />
                <span className="text-gray-200">Build a portfolio of hands-on experience</span>
              </div>
            </div>
            
            <div className="lg:w-1/2 grid grid-cols-1 sm:grid-cols-3 gap-6">
              {showcasePoints.map((point, idx) => (
                <motion.div 
                  key={idx}
                  className="bg-background-light/30 backdrop-blur-md rounded-xl p-6 border border-primary/20 hover:border-primary/40 transition-all hover:bg-background-light/40 hover:shadow-lg hover:shadow-primary/10"
                  whileHover={{ y: -5, scale: 1.02 }}
                >
                  <div className="mb-4">{point.icon}</div>
                  <h3 className="text-xl font-bold mb-2 text-white">{point.title}</h3>
                  <p className="text-gray-300">{point.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.section>
        
        {/* Features Grid Section */}
        <motion.section 
          className="mb-24"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold inline-block">
              <span className="bg-gradient-to-r from-red-400 via-primary to-blue-400 text-transparent bg-clip-text">
                Training for the Modern Cyber Battlefield
              </span>
            </h2>
            <div className="h-1 w-40 bg-gradient-to-r from-red-500 to-blue-500 mx-auto mt-4"></div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {featureItems.map((feature, idx) => (
              <motion.div 
                key={idx}
                variants={itemVariants}
                className="bg-background-light/20 backdrop-blur-sm rounded-xl p-6 border border-primary/20 hover:border-primary/40 transition-all hover:bg-background-light/30 hover:shadow-lg hover:shadow-primary/10"
                whileHover={{ y: -5 }}
              >
                <div className="bg-background-dark/70 rounded-lg w-16 h-16 flex items-center justify-center mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold mb-3 text-white">{feature.title}</h3>
                <p className="text-gray-300">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </motion.section>
        
        {/* Upcoming Operations */}
        <motion.section 
          className="mb-24"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
        >
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold inline-block">
              <span className="bg-gradient-to-r from-red-400 via-primary to-blue-400 text-transparent bg-clip-text">
                Upcoming Operations
              </span>
            </h2>
            <div className="h-1 w-40 bg-gradient-to-r from-red-500 to-blue-500 mx-auto mt-4"></div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {upcomingOperations.map((op, idx) => (
              <motion.div 
                key={op.id}
                className="bg-background-light/20 backdrop-blur-md rounded-xl overflow-hidden border border-primary/20 hover:border-primary/40 transition-all hover:shadow-lg hover:shadow-primary/10 flex flex-col"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                whileHover={{ y: -5 }}
              >
                <div className="h-48 overflow-hidden relative">
                  <img 
                    src={`/src/assets/${op.image}`} 
                    alt={op.title} 
                    className="w-full h-full object-cover opacity-70"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background-dark to-transparent"></div>
                  <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-background-dark/80 rounded-full px-3 py-1 backdrop-blur-sm border border-primary/30">
                    <Calendar className="h-4 w-4 text-primary" />
                    <span className="text-sm text-gray-200">{op.date}</span>
                  </div>
                  <div className="absolute top-4 right-4 bg-background-dark/80 rounded-full px-3 py-1 text-sm font-medium backdrop-blur-sm border border-primary/30">
                    {op.difficulty}
                  </div>
                </div>
                
                <div className="p-6 flex-grow">
                  <h3 className="text-xl font-bold mb-2 text-white">{op.title}</h3>
                  <p className="text-gray-300 mb-4">{op.description}</p>
                  
                  <div className="flex items-center gap-2 mb-4">
                    <Users className="h-4 w-4 text-primary" />
                    <span className="text-sm text-gray-300">{op.participants} participants registered</span>
                  </div>
                </div>
                
                <div className="p-4 border-t border-primary/20 bg-background-dark/30">
                  <button className="w-full py-2 rounded-lg bg-primary/20 hover:bg-primary/30 text-primary font-medium transition-colors flex items-center justify-center gap-2">
                    Register Now <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
          
          <div className="text-center mt-12">
            <motion.button 
              className="px-6 py-3 text-primary border border-primary/40 rounded-lg bg-background-dark/50 backdrop-blur-sm hover:bg-primary/10 transition-all font-medium flex items-center gap-2 mx-auto"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
            >
              View All Operations <ArrowRight className="h-4 w-4" />
            </motion.button>
          </div>
        </motion.section>
        
        {/* Call to Action */}
        <motion.section 
          className="rounded-2xl overflow-hidden relative"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="absolute inset-0 z-0">
            <img 
              src="/src/assets/cyber-grid.svg" 
              alt="Background pattern" 
              className="w-full h-full object-cover opacity-20"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-red-900/30 to-blue-900/30 mix-blend-color-dodge"></div>
          </div>
          
          <div className="relative z-10 px-8 py-16 text-center">
            <h2 className="text-3xl sm:text-4xl font-bold mb-6">
              <span className="bg-gradient-to-r from-red-400 via-primary to-blue-400 text-transparent bg-clip-text">
                Ready to Enter the Arena?
              </span>
            </h2>
            
            <p className="text-xl text-gray-300 max-w-2xl mx-auto mb-10">
              Join the next generation of cybersecurity professionals. Test your skills, build your reputation, and defend what matters.
            </p>
            
            <motion.button 
              className="px-8 py-4 text-xl font-bold rounded-xl bg-gradient-to-r from-red-500 to-primary text-white shadow-lg shadow-primary/30 flex items-center gap-3 mx-auto transition-transform hover:shadow-xl hover:shadow-primary/40"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleNavigateToArena}
            >
              <Play className="h-6 w-6" /> Start Your First Operation
            </motion.button>
          </div>
        </motion.section>
      </div>
    </div>
  );

  return content;
};

export default OperationsPage;
