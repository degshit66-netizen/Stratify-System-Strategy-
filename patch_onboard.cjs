const fs = require('fs');

const code = `import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, CheckCircle, ChevronRight } from 'lucide-react';
import { Tenant } from '../types';

interface Props {
  tenant: Tenant;
  onComplete: () => void;
}

export const OnboardingWelcome: React.FC<Props> = ({ tenant, onComplete }) => {
  const [step, setStep] = useState(1);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  
  const introText = \`Welcome to STRATIFY Accounting System, \${tenant.name}. STRATIFY is a professional accounting and business management platform. It allows you to seamlessly manage your ledgers, generate BIR forms like 2307 and 2550Q, track inventory, process payroll, and view real-time financial dashboards. With our offline-first technology, your data is always safe and syncs automatically to the cloud.\`;

  useEffect(() => {
    // Attempt autoplay if browser allows (since user might have interacted to login)
    try {
      synthRef.current = window.speechSynthesis;
      utteranceRef.current = new SpeechSynthesisUtterance(introText);
      
      const setVoice = () => {
        if (!synthRef.current || !utteranceRef.current) return;
        const voices = synthRef.current.getVoices();
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
        setStep(2);
      };

      // Auto-start
      setTimeout(() => {
        if (synthRef.current && utteranceRef.current) {
          synthRef.current.speak(utteranceRef.current);
        }
      }, 500);

    } catch(e) {}

    return () => {
      if (synthRef.current) synthRef.current.cancel();
    };
  }, [tenant.name, introText]);

  const skip = () => {
    if (synthRef.current) synthRef.current.cancel();
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-zinc-950 overflow-hidden" style={{ perspective: '1000px' }}>
      <div className="absolute inset-0 z-0 opacity-40">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-900/30 via-zinc-950 to-zinc-950"></div>
      </div>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div 
            key="playing"
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 1.1, filter: 'blur(10px)' }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
            className="relative z-10 flex flex-col items-center text-center max-w-4xl px-6"
          >
            <motion.div 
              animate={{ scale: [1, 1.05, 1] }} 
              transition={{ duration: 2, repeat: Infinity }}
              className="w-24 h-24 mb-10 rounded-2xl bg-indigo-950/50 border border-indigo-500/30 flex items-center justify-center shadow-lg"
            >
              <Sparkles className="w-10 h-10 text-indigo-400" />
            </motion.div>
            
            <h2 className="text-3xl md:text-5xl font-bold text-white leading-tight font-display tracking-tight mb-8">
              Professional Accounting & Business Management Platform.
            </h2>
            
            <div className="flex gap-4">
              <span className="px-4 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900/80 text-xs font-bold text-zinc-400 uppercase tracking-wider shadow-sm">BIR Forms</span>
              <span className="px-4 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900/80 text-xs font-bold text-zinc-400 uppercase tracking-wider shadow-sm">Offline Sync</span>
              <span className="px-4 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900/80 text-xs font-bold text-zinc-400 uppercase tracking-wider shadow-sm">Dashboards</span>
            </div>
            
            <button onClick={skip} className="mt-16 text-xs text-zinc-500 hover:text-white uppercase tracking-widest font-bold transition-colors">
              Skip to Workspace
            </button>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div 
            key="done"
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="relative z-10 flex flex-col items-center text-center max-w-2xl px-6"
          >
            <div className="w-24 h-24 mb-8 bg-emerald-500/10 rounded-2xl flex items-center justify-center border border-emerald-500/30">
              <CheckCircle className="w-12 h-12 text-emerald-400" />
            </div>
            
            <h2 className="text-4xl font-bold text-white mb-4 font-display tracking-tight">System Ready.</h2>
            <p className="text-zinc-400 mb-12 text-lg">Your workspace is fully initialized and secured.</p>
            
            <button 
              onClick={skip} 
              className="group relative inline-flex items-center justify-center px-8 py-4 text-sm font-bold text-white transition-all duration-200 bg-indigo-600 border border-transparent rounded-xl hover:bg-indigo-700 shadow-md"
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

fs.writeFileSync('src/components/OnboardingWelcome.tsx', code);
