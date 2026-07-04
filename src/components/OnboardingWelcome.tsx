import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, CheckCircle, ChevronRight, Volume2, VolumeX, BookOpen, Layers, CreditCard, Landmark, Database, ShieldCheck } from 'lucide-react';
import { Tenant } from '../types';

interface Props {
  tenant: Tenant;
  onComplete: () => void;
}

export const OnboardingWelcome: React.FC<Props> = ({ tenant, onComplete }) => {
  const [step, setStep] = useState(1);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const PHASES = [
    {
      text: `Welcome to STRATIFY Accounting System, ${tenant.name}. Your elite enterprise workspace has been fully initialized.`,
      title: `Welcome to STRATIFY`,
      subtitle: `Enterprise accounting and analytics platform customized for ${tenant.name}.`,
      tags: ['STRATIFY OS', 'Secured Instance', 'Active Tenant'],
      bgImage: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1600&q=80', // Tall futuristic skyscraper
      icon: <Sparkles className="w-8 h-8 text-yellow-400" />,
      cardColor: 'from-blue-500/20 to-indigo-500/20 border-indigo-500/30 shadow-indigo-500/10'
    },
    {
      text: `STRATIFY is a professional accounting and business management platform. It allows you to seamlessly manage your general journal and ledger entries.`,
      title: `General Ledger Management`,
      subtitle: `Engineered for dual-entry precision, smart ledger audits, and financial reporting.`,
      tags: ['General Journal', 'Chart of Accounts', 'Audit Trail'],
      bgImage: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1600&q=80', // Financial spreadsheets and calculator
      icon: <BookOpen className="w-8 h-8 text-blue-400" />,
      cardColor: 'from-blue-500/20 to-cyan-500/20 border-blue-500/30 shadow-blue-500/10'
    },
    {
      text: `It enables you to easily generate regulatory BIR forms like 2307 and 2550Q automatically from your recorded transactions.`,
      title: `BIR Tax Compliance`,
      subtitle: `Instant generation of withholding forms and quarterly returns with SEC and BIR PTU standards.`,
      tags: ['Form 2307', 'Form 2550Q', 'PTU Validated'],
      bgImage: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=1600&q=80', // Clean professional corporate office pillars
      icon: <Landmark className="w-8 h-8 text-emerald-400" />,
      cardColor: 'from-emerald-500/20 to-teal-500/20 border-emerald-500/30 shadow-emerald-500/10'
    },
    {
      text: `Track your warehouse stock level, process automated payroll schedules, and view beautiful interactive analytical dashboards.`,
      title: `Inventory, Payroll & Dashboards`,
      subtitle: `Unify stock control, staff compensation ledgers, and live growth charts under one dashboard.`,
      tags: ['Stock Tracker', 'Salary Ledgers', 'Dynamic Charts'],
      bgImage: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1600&q=80', // Financial graphs and dashboard
      icon: <Layers className="w-8 h-8 text-purple-400" />,
      cardColor: 'from-purple-500/20 to-pink-500/20 border-purple-500/30 shadow-purple-500/10'
    },
    {
      text: `With our offline-first technology, your data is always safe locally and syncs automatically to the secure Cloud database once online.`,
      title: `Offline-First & Cloud Sync`,
      subtitle: `Your system remains fully functional without internet. All data auto-syncs securely behind the scenes.`,
      tags: ['Local DB Cache', 'Firestore Sync', 'Automatic Backup'],
      bgImage: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&w=1600&q=80', // Server storage cabling network
      icon: <Database className="w-8 h-8 text-cyan-400" />,
      cardColor: 'from-cyan-500/20 to-indigo-500/20 border-cyan-500/30 shadow-cyan-500/10'
    }
  ];

  useEffect(() => {
    synthRef.current = window.speechSynthesis;
    return () => {
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, []);

  useEffect(() => {
    if (step !== 1) return;
    if (!synthRef.current) return;

    synthRef.current.cancel();

    if (isMuted) return;

    const currentPhase = PHASES[phaseIndex];
    if (!currentPhase) {
      setStep(2);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(currentPhase.text);
    currentUtteranceRef.current = utterance;

    // Locate high-quality female or professional English voice
    const voices = synthRef.current.getVoices();
    const premiumVoice = voices.find(v => 
      v.lang.startsWith('en') && 
      (v.name.includes('Female') || v.name.includes('Samantha') || v.name.includes('Google US English') || v.name.includes('Victoria'))
    );
    if (premiumVoice) {
      utterance.voice = premiumVoice;
    }
    utterance.rate = 0.95;
    utterance.pitch = 1.1;

    utterance.onend = () => {
      // Advance to next slide automatically on speech end
      if (phaseIndex < PHASES.length - 1) {
        setPhaseIndex(prev => prev + 1);
      } else {
        setStep(2);
      }
    };

    utterance.onerror = () => {
      // Handle speech synthesizers that fail to fire
    };

    // Robust fallback timer in case SpeechSynthesis gets stuck or disabled
    const fallbackDuration = currentPhase.text.length * 80 + 3000;
    const timer = setTimeout(() => {
      if (synthRef.current && !synthRef.current.speaking) {
        if (phaseIndex < PHASES.length - 1) {
          setPhaseIndex(prev => prev + 1);
        } else {
          setStep(2);
        }
      }
    }, fallbackDuration);

    // Speak with interaction grace
    setTimeout(() => {
      if (synthRef.current && utterance) {
        synthRef.current.speak(utterance);
      }
    }, 100);

    return () => {
      clearTimeout(timer);
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, [phaseIndex, step, isMuted]);

  const handleNextPhase = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
    }
    if (phaseIndex < PHASES.length - 1) {
      setPhaseIndex(prev => prev + 1);
    } else {
      setStep(2);
    }
  };

  const handleToggleMute = () => {
    if (isMuted) {
      setIsMuted(false);
    } else {
      setIsMuted(true);
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    }
  };

  const skip = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
    }
    onComplete();
  };

  const activePhase = PHASES[phaseIndex];

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-zinc-950 overflow-hidden select-none font-sans" style={{ perspective: '1200px' }}>
      
      {/* Dynamic Backing Background Images with high-contrast ambient overlay */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`bg-${phaseIndex}`}
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 0.35, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 1 }}
          className="absolute inset-0 z-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${activePhase?.bgImage})` }}
        />
      </AnimatePresence>

      {/* Cybernetic Dark Vignette Gradient Overlay */}
      <div className="absolute inset-0 z-10 bg-gradient-to-tr from-zinc-950 via-zinc-950/80 to-indigo-950/40 pointer-events-none" />

      {/* Glowing Mesh Grids */}
      <div className="absolute inset-0 z-10 opacity-10 bg-[linear-gradient(to_right,#312e81_1px,transparent_1px),linear-gradient(to_bottom,#312e81_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" />

      {/* Floating Action Header: Audio & Skip */}
      <div className="absolute top-6 left-6 right-6 z-50 flex justify-between items-center no-print">
        <div className="flex items-center gap-2 bg-zinc-900/80 border border-zinc-800/80 backdrop-blur-xl px-4 py-2 rounded-2xl">
          <img src="https://i.postimg.cc/5yGwSWWR/1782659487700.png" alt="Logo" className="w-5 h-5 rounded-md" />
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-400">STRATIFY Intro</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleToggleMute}
            className="p-3 rounded-2xl bg-zinc-900/80 border border-zinc-800/80 hover:border-indigo-500/30 text-zinc-300 hover:text-white transition-all backdrop-blur-xl flex items-center justify-center"
            title={isMuted ? "Unmute Intro Voice" : "Mute Intro Voice"}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400 animate-pulse" />}
          </button>
          
          <button
            onClick={skip}
            className="px-4 py-2.5 rounded-2xl bg-zinc-900/80 border border-zinc-800/80 hover:border-indigo-500/30 text-zinc-400 hover:text-white text-xs font-bold uppercase tracking-widest transition-all backdrop-blur-xl"
          >
            Skip Intro
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {step === 1 && activePhase && (
          <motion.div
            key={`slide-${phaseIndex}`}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.6 }}
            className="relative z-20 w-full max-w-6xl px-6 md:px-12 grid grid-cols-1 md:grid-cols-2 gap-12 items-center"
          >
            {/* LEFT COLUMN: Text narrative and details */}
            <div className="space-y-6 text-left">
              <div className="flex flex-wrap gap-2">
                {activePhase.tags.map((tag, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 rounded-full text-[9px] font-extrabold uppercase tracking-wider bg-indigo-500/10 border border-indigo-500/20 text-indigo-400"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <div className="space-y-3">
                <h2 className="text-3xl md:text-5xl font-display font-black text-white uppercase tracking-tight leading-none bg-gradient-to-r from-white via-zinc-100 to-indigo-200 bg-clip-text text-transparent">
                  {activePhase.title}
                </h2>
                <p className="text-zinc-400 text-sm md:text-base font-medium leading-relaxed max-w-lg">
                  {activePhase.subtitle}
                </p>
              </div>

              {/* Narrated audio subtitle block */}
              <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 backdrop-blur-xl flex gap-3.5 items-start max-w-lg">
                <div className="shrink-0 mt-0.5">
                  {!isMuted ? (
                    <div className="flex items-center gap-0.5 h-4 w-4">
                      <span className="w-1 bg-indigo-400 rounded-full animate-[bounce_0.8s_infinite_100ms] h-3"></span>
                      <span className="w-1 bg-indigo-400 rounded-full animate-[bounce_0.8s_infinite_300ms] h-4"></span>
                      <span className="w-1 bg-indigo-400 rounded-full animate-[bounce_0.8s_infinite_200ms] h-2"></span>
                    </div>
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-zinc-600"></span>
                  )}
                </div>
                <p className="text-xs text-zinc-300 font-medium leading-relaxed italic">
                  "{activePhase.text}"
                </p>
              </div>

              {/* Progress & Controls */}
              <div className="flex items-center gap-6 pt-4">
                <button
                  onClick={handleNextPhase}
                  className="group inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs font-bold uppercase tracking-wider transition-all shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 hover:scale-[1.02]"
                >
                  <span>{phaseIndex === PHASES.length - 1 ? "Finish Intro" : "Next Topic"}</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </button>

                {/* Bullet Indicators */}
                <div className="flex gap-1.5">
                  {PHASES.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setPhaseIndex(idx)}
                      className={`h-1.5 rounded-full transition-all ${idx === phaseIndex ? 'w-6 bg-indigo-500' : 'w-1.5 bg-zinc-700 hover:bg-zinc-600'}`}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: Holographic 3D Rotating Glass Card with perspective */}
            <div className="hidden md:flex justify-center items-center" style={{ perspective: '1000px' }}>
              <motion.div
                animate={{ 
                  rotateY: [15, -15, 15], 
                  rotateX: [6, -6, 6],
                  y: [0, -12, 0] 
                }}
                transition={{ 
                  duration: 6, 
                  repeat: Infinity, 
                  ease: "easeInOut" 
                }}
                style={{ transformStyle: 'preserve-3d' }}
                className={`w-[340px] h-[440px] rounded-[32px] bg-gradient-to-b ${activePhase.cardColor} backdrop-blur-2xl border p-8 flex flex-col justify-between shadow-2xl relative overflow-hidden`}
              >
                {/* Visual Glass Reflections */}
                <div className="absolute top-0 left-0 right-0 h-[50%] bg-gradient-to-b from-white/10 to-transparent pointer-events-none transform -skew-y-12 scale-150" />
                
                {/* Tech corner decors */}
                <div className="absolute top-4 left-4 w-4 h-4 border-t border-l border-white/20" />
                <div className="absolute top-4 right-4 w-4 h-4 border-t border-r border-white/20" />
                <div className="absolute bottom-4 left-4 w-4 h-4 border-b border-l border-white/20" />
                <div className="absolute bottom-4 right-4 w-4 h-4 border-b border-r border-white/20" />

                <div className="space-y-6" style={{ transform: 'translateZ(40px)' }}>
                  <div className="w-16 h-16 rounded-2xl bg-zinc-950/40 border border-white/10 flex items-center justify-center shadow-inner">
                    {activePhase.icon}
                  </div>
                  
                  <div className="space-y-2 text-left">
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-400">STRATIFY OS</span>
                    <h3 className="text-xl font-bold text-white leading-tight uppercase font-display tracking-wide">{activePhase.title}</h3>
                  </div>
                </div>

                <div className="space-y-4" style={{ transform: 'translateZ(25px)' }}>
                  <div className="h-[2px] bg-gradient-to-r from-indigo-500/50 via-cyan-500/50 to-transparent rounded" />
                  
                  <div className="flex justify-between items-center text-[10px] font-mono text-zinc-400">
                    <div className="flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span>SEC / BIR Validated</span>
                    </div>
                    <span>v4.12 Live</span>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="done"
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="relative z-20 flex flex-col items-center text-center max-w-xl px-6"
          >
            <div className="w-24 h-24 mb-8 bg-emerald-500/10 rounded-[32px] flex items-center justify-center border border-emerald-500/30 shadow-lg shadow-emerald-500/5 animate-pulse">
              <CheckCircle className="w-12 h-12 text-emerald-400" />
            </div>

            <div className="space-y-3 mb-10">
              <h2 className="text-4xl font-display font-black text-white uppercase tracking-tight leading-none bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
                System Ready.
              </h2>
              <p className="text-zinc-400 text-sm font-medium">
                Your high-end enterprise workspace for <strong>{tenant.name}</strong> is fully initialized, secured, and ready for double-entry bookkeeping.
              </p>
            </div>

            <button
              onClick={skip}
              className="group inline-flex items-center gap-2 px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs font-bold uppercase tracking-wider transition-all shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 hover:scale-[1.02]"
            >
              <span>Enter Workspace</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
