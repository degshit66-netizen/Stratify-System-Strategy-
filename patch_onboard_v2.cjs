const fs = require('fs');

const onboardCode = `import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Play, Pause, ChevronRight } from 'lucide-react';
import { Tenant } from '../types';

interface Props {
  tenant: Tenant;
  onComplete: () => void;
}

export const OnboardingWelcome: React.FC<Props> = ({ tenant, onComplete }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [step, setStep] = useState(0);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  
  const introText = \`Welcome to STRATIFY Accounting System, \${tenant.name}. I am your AI assistant. STRATIFY is a professional, god-tier accounting and business management platform. It allows you to seamlessly manage your ledgers, generate BIR forms like 2307 and 2550Q, track inventory, process payroll, and view real-time financial dashboards. With our offline-first technology, your data is always safe and syncs automatically to the cloud. Click the get started button to explore your new workspace.\`;

  useEffect(() => {
    synthRef.current = window.speechSynthesis;
    utteranceRef.current = new SpeechSynthesisUtterance(introText);
    
    const setVoice = () => {
      if (!synthRef.current || !utteranceRef.current) return;
      const voices = synthRef.current.getVoices();
      // Try to find a premium female English voice
      const femaleVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Female') || v.name.includes('Samantha') || v.name.includes('Google US English') || v.name.includes('Victoria')));
      if (femaleVoice) {
        utteranceRef.current.voice = femaleVoice;
      }
      utteranceRef.current.rate = 0.95;
      utteranceRef.current.pitch = 1.1; 
    };

    if (synthRef.current.onvoiceschanged !== undefined) {
      synthRef.current.onvoiceschanged = setVoice;
    }
    setVoice();

    utteranceRef.current.onend = () => {
      setIsPlaying(false);
      setStep(2);
    };

    return () => {
      if (synthRef.current) synthRef.current.cancel();
    };
  }, [tenant.name, introText]);

  const togglePlay = () => {
    if (!synthRef.current || !utteranceRef.current) return;
    
    if (isPlaying) {
      synthRef.current.pause();
      setIsPlaying(false);
    } else {
      if (synthRef.current.paused) {
        synthRef.current.resume();
      } else {
        synthRef.current.cancel(); 
        synthRef.current.speak(utteranceRef.current);
      }
      setIsPlaying(true);
      setStep(1);
    }
  };

  const skip = () => {
    if (synthRef.current) synthRef.current.cancel();
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black overflow-hidden" style={{ perspective: '1000px' }}>
      
      {/* Dynamic Background */}
      <div className="absolute inset-0 z-0 opacity-40">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-900/40 via-black to-black"></div>
        {isPlaying && (
          <motion.div 
            animate={{ 
              background: ['radial-gradient(circle at 50% 50%, rgba(79, 70, 229, 0.15) 0%, transparent 50%)', 'radial-gradient(circle at 50% 50%, rgba(79, 70, 229, 0.3) 0%, transparent 70%)', 'radial-gradient(circle at 50% 50%, rgba(79, 70, 229, 0.15) 0%, transparent 50%)']
            }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute inset-0"
          />
        )}
      </div>

      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.div 
            key="start"
            initial={{ opacity: 0, scale: 0.8, rotateX: 20 }}
            animate={{ opacity: 1, scale: 1, rotateX: 0 }}
            exit={{ opacity: 0, scale: 1.5, filter: 'blur(10px)' }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
            className="relative z-10 flex flex-col items-center justify-center text-center max-w-3xl px-6"
          >
            <div className="mb-8 relative group cursor-pointer" onClick={togglePlay}>
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full blur opacity-70 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-pulse"></div>
              <div className="relative w-32 h-32 bg-black rounded-full flex items-center justify-center border border-indigo-500/50 shadow-2xl">
                <Play className="w-12 h-12 text-white ml-2" />
              </div>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-zinc-500 font-display tracking-tighter mb-4">
              Welcome to STRATIFY
            </h1>
            <p className="text-lg md:text-xl text-zinc-400 max-w-xl font-light mb-12">
              Tap the orb to begin your God-Tier introduction.
            </p>
            
            <button onClick={skip} className="text-sm text-zinc-600 hover:text-zinc-300 uppercase tracking-widest font-bold transition-colors">
              Skip Introduction
            </button>
          </motion.div>
        )}

        {step === 1 && (
          <motion.div 
            key="playing"
            initial={{ opacity: 0, rotateY: -90, z: -500 }}
            animate={{ opacity: 1, rotateY: 0, z: 0 }}
            exit={{ opacity: 0, rotateY: 90, z: -500 }}
            transition={{ duration: 1.5, type: 'spring', bounce: 0.2 }}
            className="relative z-10 flex flex-col items-center text-center max-w-4xl px-6"
          >
            <motion.div 
              animate={{ scale: [1, 1.05, 1] }} 
              transition={{ duration: 2, repeat: Infinity }}
              className="w-24 h-24 mb-12 rounded-full border-4 border-indigo-500 flex items-center justify-center shadow-[0_0_50px_rgba(79,70,229,0.5)]"
              onClick={togglePlay}
            >
              <Sparkles className="w-10 h-10 text-indigo-400" />
            </motion.div>
            
            <h2 className="text-3xl md:text-5xl font-bold text-white leading-tight font-display tracking-tight mb-8">
              A Professional, God-Tier Accounting & Business Management Platform.
            </h2>
            
            <div className="flex gap-4">
              <span className="px-4 py-1.5 rounded-full border border-zinc-800 bg-zinc-900 text-xs font-bold text-zinc-400 uppercase tracking-wider">BIR Forms</span>
              <span className="px-4 py-1.5 rounded-full border border-zinc-800 bg-zinc-900 text-xs font-bold text-zinc-400 uppercase tracking-wider">Offline Sync</span>
              <span className="px-4 py-1.5 rounded-full border border-zinc-800 bg-zinc-900 text-xs font-bold text-zinc-400 uppercase tracking-wider">Dashboards</span>
            </div>
            
            <button onClick={skip} className="mt-16 text-xs text-zinc-600 hover:text-white uppercase tracking-widest font-bold transition-colors">
              Skip to Workspace
            </button>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div 
            key="done"
            initial={{ opacity: 0, scale: 0.5, y: 100 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 1, type: 'spring' }}
            className="relative z-10 flex flex-col items-center text-center max-w-2xl px-6"
          >
            <div className="w-24 h-24 mb-8 bg-emerald-500/10 rounded-full flex items-center justify-center border border-emerald-500/30">
              <CheckCircle className="w-12 h-12 text-emerald-400" />
            </div>
            
            <h2 className="text-4xl font-bold text-white mb-4 font-display">You're Ready.</h2>
            <p className="text-zinc-400 mb-12 text-lg">Your workspace is fully initialized and secured.</p>
            
            <button 
              onClick={skip} 
              className="group relative inline-flex items-center justify-center px-8 py-4 text-base font-bold text-white transition-all duration-200 bg-indigo-600 border border-transparent rounded-full hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-600 shadow-[0_0_20px_rgba(79,70,229,0.4)]"
            >
              Enter Workspace
              <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
`;

fs.writeFileSync('src/components/OnboardingWelcome.tsx', onboardCode);
