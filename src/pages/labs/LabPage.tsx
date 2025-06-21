import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, Trophy, Clock, Users, CheckCircle, Terminal, 
  Download, AlertTriangle, Target, Book, Shield, Flag,
  Sword, Flame, Lock, ExternalLink, Play
} from 'lucide-react';
import { getLab, submitLabAnswer, joinLab } from '../../lib/api';
import { Lab } from '../../lib/types';
import { supabase } from '../../lib/supabase';
import Card from '../../components/ui/Card';
import LabTimer from '../../components/ui/LabTimer';

const LabPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [lab, setLab] = useState<Lab | null>(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [timeExpired, setTimeExpired] = useState(false);
  const [questionResults, setQuestionResults] = useState<Record<string, {
    isCorrect: boolean;
    pointsEarned: number;
  }>>({});
  const [activeSection, setActiveSection] = useState('overview');
  const [labStarted, setLabStarted] = useState(false);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (id) loadLabData(id);
  }, [id]);

  const loadLabData = async (labId: string) => {
    setLoading(true);
    const result = await getLab(labId);
    if (result.success) {
      setLab(result.data);
      
      // Check if user has already joined this lab
      const { data: participant } = await supabase
        .from('lab_participants')
        .select('*')
        .eq('lab_id', labId)
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .maybeSingle();

      if (participant) {
        setLabStarted(true);
        setActiveSection('challenges');
      }
    }
    setLoading(false);
  };

  const handleJoinLab = async () => {
    if (!lab || !id || joining) return;
    
    setJoining(true);
    const result = await joinLab(id);
    if (result.success) {
      setLabStarted(true);
      setActiveSection('challenges');
    } else {
      alert('Failed to join lab. Please try again.');
    }
    setJoining(false);
  };

  const handleSubmitAnswer = async (questionId: string) => {
    if (!lab || !id || submitting || !labStarted) return;
    
    setSubmitting(true);
    const answer = answers[questionId];
    const result = await submitLabAnswer(id, questionId, answer);
    
    if (result.success && result.data) {
      setQuestionResults(prev => ({
        ...prev,
        [questionId]: result.data
      }));
    }
    setSubmitting(false);
  };

  const handleTimeEnd = () => {
    setTimeExpired(true);
  };

  const getTotalPointsEarned = () => {
    return Object.values(questionResults).reduce((sum, result) => sum + result.pointsEarned, 0);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background-dark py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse text-primary">Loading lab...</div>
        </div>
      </div>
    );
  }

  if (!lab) {
    return (
      <div className="min-h-screen bg-background-dark py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-gray-400">Lab not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-dark">
      {/* Hero Section */}
      <div 
        className="relative h-[500px] bg-cover bg-center"
        style={{
          backgroundImage: lab.thumbnail_url ? `url(${lab.thumbnail_url})` : 'none',
          backgroundColor: !lab.thumbnail_url ? '#1a1a1a' : undefined
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-background-dark/50 via-background-dark/70 to-background-dark"></div>
        
        <div className="absolute inset-0 flex items-center">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <button
                onClick={() => navigate('/labs')}
                className="flex items-center text-gray-400 hover:text-white mb-6"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Back to Labs
              </button>

              <div className="flex items-start justify-between">
                <div className="max-w-3xl">
                  <div className="flex flex-wrap items-center gap-4 mb-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium
                      ${lab.difficulty === 'easy' ? 'bg-success-dark/20 text-success-light' :
                        lab.difficulty === 'medium' ? 'bg-warning-dark/20 text-warning-light' :
                        'bg-error-dark/20 text-error-light'}`}
                    >
                      {lab.difficulty}
                    </span>
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-primary/20 text-primary">
                      {lab.category}
                    </span>
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-accent-blue/20 text-accent-blue">
                      {lab.points} pts
                    </span>
                  </div>
                  <h1 className="text-5xl font-bold text-white mb-6">{lab.title}</h1>
                  <p className="text-xl text-gray-300">{lab.description}</p>
                </div>
                {lab.completed && (
                  <div className="flex items-center text-success-light bg-success-dark/20 px-4 py-2 rounded-lg">
                    <CheckCircle className="h-5 w-5 mr-2" />
                    Completed • {lab.points_earned} pts
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="sticky top-0 z-10 bg-background-dark border-b border-background-light">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {[
              { id: 'overview', label: 'Overview', icon: Book },
              { id: 'environment', label: 'Lab Environment', icon: Terminal },
              { id: 'challenges', label: 'Challenges', icon: Flag }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveSection(tab.id)}
                className={`flex items-center px-4 py-4 border-b-2 font-medium ${
                  activeSection === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-400 hover:text-white hover:border-gray-700'
                }`}
              >
                <tab.icon className="h-5 w-5 mr-2" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {activeSection === 'overview' && (
              <>
                {/* Attack Scenario */}
                {lab.attack_scenario && (
                  <Card className="p-6 border border-primary/30">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-3 rounded-lg bg-primary/10">
                        <Sword className="h-6 w-6 text-primary" />
                      </div>
                      <h2 className="text-2xl font-bold text-white">Attack Scenario</h2>
                    </div>
                    <div className="prose prose-invert max-w-none">
                      <p className="text-gray-300 whitespace-pre-wrap">{lab.attack_scenario}</p>
                    </div>
                  </Card>
                )}

                {/* Learning Objectives */}
                {lab.learning_objectives && lab.learning_objectives.length > 0 && (
                  <Card className="p-6">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-3 rounded-lg bg-accent-blue/10">
                        <Target className="h-6 w-6 text-accent-blue" />
                      </div>
                      <h2 className="text-2xl font-bold text-white">Learning Objectives</h2>
                    </div>
                    <div className="grid gap-4">
                      {lab.learning_objectives.map((objective, index) => (
                        <div key={index} className="flex items-start gap-4 p-4 bg-background-light rounded-lg">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-accent-blue/10 text-accent-blue font-mono">
                            {index + 1}
                          </div>
                          <p className="text-gray-300">{objective}</p>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                {/* Tools & Resources */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Suggested Tools */}
                  {lab.suggested_tools && lab.suggested_tools.length > 0 && (
                    <Card className="p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <Shield className="h-6 w-6 text-accent-green" />
                        <h3 className="text-xl font-bold text-white">Required Tools</h3>
                      </div>
                      <ul className="space-y-3">
                        {lab.suggested_tools.map((tool, index) => (
                          <li key={index} className="flex items-center p-3 bg-background-light rounded-lg">
                            <Lock className="h-5 w-5 text-accent-green mr-3" />
                            <span className="text-gray-300">{tool}</span>
                          </li>
                        ))}
                      </ul>
                    </Card>
                  )}

                  {/* Pre-reading Materials */}
                  {lab.pre_reading_links && lab.pre_reading_links.length > 0 && (
                    <Card className="p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <Book className="h-6 w-6 text-accent-blue" />
                        <h3 className="text-xl font-bold text-white">Pre-reading Materials</h3>
                      </div>
                      <ul className="space-y-3">
                        {lab.pre_reading_links.map((link, index) => (
                          <li key={index}>
                            <a 
                              href={link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center p-3 bg-background-light rounded-lg text-accent-blue hover:bg-background-light/80"
                            >
                              <ExternalLink className="h-5 w-5 mr-3" />
                              <span>Resource {index + 1}</span>
                            </a>
                          </li>
                        ))}
                      </ul>
                    </Card>
                  )}
                </div>
              </>
            )}

            {activeSection === 'environment' && (
              <Card className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 rounded-lg bg-accent-blue/10">
                    <Terminal className="h-6 w-6 text-accent-blue" />
                  </div>
                  <h2 className="text-2xl font-bold text-white">Lab Environment</h2>
                </div>

                {lab.docker_command ? (
                  <div className="mb-6">
                    <h3 className="text-lg font-medium text-white mb-3">Docker Setup</h3>
                    <div className="bg-background-dark rounded-lg p-4 font-mono">
                      <div className="flex items-center text-gray-400 mb-2">
                        <Terminal className="h-5 w-5 mr-2" />
                        Run this command to start the lab:
                      </div>
                      <code className="block text-accent-blue">
                        {lab.docker_command}
                      </code>
                    </div>
                  </div>
                ) : lab.vm_download_url ? (
                  <div className="mb-6">
                    <h3 className="text-lg font-medium text-white mb-3">Virtual Machine Setup</h3>
                    <div className="bg-background-dark rounded-lg p-4">
                      <div className="flex items-center text-gray-400 mb-4">
                        <Download className="h-5 w-5 mr-2" />
                        Download and import the VM image:
                      </div>
                      <a
                        href={lab.vm_download_url}
                        className="btn-primary inline-flex items-center"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download VM Image
                      </a>
                    </div>
                  </div>
                ) : null}

                {lab.setup_instructions && (
                  <div>
                    <h3 className="text-lg font-medium text-white mb-3">Setup Instructions</h3>
                    <div className="bg-background-light rounded-lg p-4">
                      <p className="text-gray-300 whitespace-pre-wrap">{lab.setup_instructions}</p>
                    </div>
                  </div>
                )}
              </Card>
            )}

            {activeSection === 'challenges' && (
              <div className="space-y-6">
                {lab.questions?.map((question, index) => (
                  <Card key={question.id} className="p-6 border border-background-light hover:border-gray-700 transition-all duration-300">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-mono">
                        {index + 1}
                      </div>
                      <h3 className="text-xl font-bold text-white">
                        {question.question}
                      </h3>
                    </div>

                    {question.description && (
                      <div className="bg-background-light rounded-lg p-4 mb-4">
                        <p className="text-gray-300">{question.description}</p>
                      </div>
                    )}

                    <div className="mb-4">
                      <div className="relative">
                        <Flag className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
                        <input
                          type="text"
                          placeholder="Enter your answer"
                          value={answers[question.id] || ''}
                          onChange={(e) => setAnswers(prev => ({
                            ...prev,
                            [question.id]: e.target.value
                          }))}
                          className="form-input pl-10"
                          disabled={timeExpired || lab.completed || questionResults[question.id]?.isCorrect || !labStarted}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Trophy className="h-5 w-5 text-primary mr-2" />
                        <span className="text-gray-400">{question.points} points</span>
                      </div>
                      
                      {questionResults[question.id] ? (
                        <div className={`flex items-center ${
                          questionResults[question.id].isCorrect 
                            ? 'text-success-light' 
                            : 'text-error-light'
                        }`}>
                          {questionResults[question.id].isCorrect ? (
                            <>
                              <CheckCircle className="h-5 w-5 mr-2" />
                              Correct! +{questionResults[question.id].pointsEarned} points
                            </>
                          ) : (
                            <>
                              <AlertTriangle className="h-5 w-5 mr-2" />
                              Incorrect
                            </>
                          )}
                        </div>
                      ) : (
                        <button
                          onClick={() => handleSubmitAnswer(question.id)}
                          disabled={
                            !answers[question.id] || 
                            submitting || 
                            timeExpired || 
                            lab.completed ||
                            !labStarted
                          }
                          className="btn-primary"
                        >
                          Submit Answer
                        </button>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {!lab.completed && !labStarted && (
              <Card className="p-6 border border-primary/30 bg-primary/10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 rounded-lg bg-primary/10">
                    <Play className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold text-white">Start Lab</h3>
                </div>
                <p className="text-gray-300 mb-4">
                  You have {lab.estimated_time} minutes to complete this lab. The timer will start when you click the button below.
                </p>
                <button
                  onClick={handleJoinLab}
                  disabled={joining}
                  className="btn-primary w-full flex items-center justify-center"
                >
                  {joining ? 'Starting Lab...' : 'Join Lab'}
                </button>
              </Card>
            )}

            {/* Timer only shows after joining */}
            {!lab.completed && labStarted && (
              <LabTimer 
                initialTime={lab.estimated_time * 60} 
                onTimeEnd={handleTimeEnd}
              />
            )}

            {/* Lab Info */}
            <Card className="p-6">
              <h3 className="text-lg font-bold text-white mb-4">Lab Information</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center text-gray-400">
                    <Trophy className="h-5 w-5 mr-2 text-primary" />
                    Points Available
                  </div>
                  <span className="text-white font-medium">{lab.points}</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center text-gray-400">
                    <Clock className="h-5 w-5 mr-2 text-accent-green" />
                    Time Limit
                  </div>
                  <span className="text-white font-medium">{lab.estimated_time} min</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center text-gray-400">
                    <Users className="h-5 w-5 mr-2 text-accent-blue" />
                    Active Users
                  </div>
                  <span className="text-white font-medium">12</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center text-gray-400">
                    <Flame className="h-5 w-5 mr-2 text-warning-light" />
                    Difficulty
                  </div>
                  <span className="text-white font-medium">{lab.difficulty}</span>
                </div>
              </div>
            </Card>

            {/* Points Summary */}
            {Object.keys(questionResults).length > 0 && (
              <Card className="p-6 border border-primary/30 bg-primary/10">
                <h3 className="text-lg font-bold text-white mb-4">Points Summary</h3>
                <div className="text-2xl font-bold text-primary">
                  {getTotalPointsEarned()} points earned
                </div>
                <div className="text-sm text-gray-400 mt-1">
                  {Object.values(questionResults).filter(r => r.isCorrect).length} of {lab.questions?.length} challenges completed
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LabPage;