import React from 'react';
import { ShieldAlert, Mail, Phone, Facebook } from 'lucide-react';
import { motion } from 'motion/react';
import { Tenant, User } from '../types';

interface SubscriptionPromptProps {
  tenant: Tenant | null;
  user: User | null;
  onLogout: () => void;
}

export const SubscriptionPrompt: React.FC<SubscriptionPromptProps> = ({ tenant, user, onLogout }) => {
  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col font-sans text-zinc-100 items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="max-w-md w-full bg-zinc-900 border border-red-900/30 rounded-3xl p-8 shadow-2xl relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-red-600 to-amber-600"></div>
        
        <div className="flex flex-col items-center text-center space-y-6">
          <div className="w-20 h-20 bg-red-950 rounded-2xl flex items-center justify-center border border-red-900/50 shadow-inner">
            <ShieldAlert className="w-10 h-10 text-red-500" />
          </div>
          
          <div>
            <h2 className="text-2xl font-bold font-display tracking-tight text-white mb-2">Trial Expired</h2>
            <p className="text-sm text-zinc-400">
              The 7-day trial period for <strong className="text-zinc-200">{tenant?.name}</strong> has ended. To continue accessing your tenant workspace and records, please upgrade to a premium subscription.
            </p>
          </div>
          
          <div className="w-full bg-black/40 rounded-xl p-5 border border-zinc-800 text-left space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2">Contact Administrator</h3>
            <div className="flex items-center gap-3 text-sm text-zinc-300">
              <div className="w-8 h-8 rounded-lg bg-blue-950/50 flex items-center justify-center border border-blue-900/50">
                <Facebook className="w-4 h-4 text-blue-400" />
              </div>
              <a href="https://www.facebook.com/share/1BVqhwRTeW/" target="_blank" rel="noopener noreferrer" className="hover:text-blue-400 transition-colors">Facebook Page</a>
            </div>
            <div className="flex items-center gap-3 text-sm text-zinc-300">
              <div className="w-8 h-8 rounded-lg bg-blue-950/50 flex items-center justify-center border border-blue-900/50">
                <Mail className="w-4 h-4 text-blue-400" />
              </div>
              <a href="mailto:stratify2026@gmail.com" className="hover:text-blue-400 transition-colors">stratify2026@gmail.com</a>
            </div>
            <div className="flex items-center gap-3 text-sm text-zinc-300">
              <div className="w-8 h-8 rounded-lg bg-blue-950/50 flex items-center justify-center border border-blue-900/50">
                <Phone className="w-4 h-4 text-blue-400" />
              </div>
              <span>0966-235-2256</span>
            </div>
          </div>
          
          <button 
            onClick={onLogout}
            className="w-full py-3 px-4 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-sm font-bold transition-all shadow-md"
          >
            Sign Out
          </button>
        </div>
      </motion.div>
    </div>
  );
};
