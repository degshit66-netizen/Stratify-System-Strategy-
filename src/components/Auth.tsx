import React, { useState } from 'react';
import { User, Tenant } from '../types';
import { Building, ShieldCheck, Mail, Lock, ArrowRight, UserPlus } from 'lucide-react';
import { motion } from 'motion/react';

interface AuthProps {
  onLogin: (user: User, tenant?: Tenant) => void;
  tenants: Tenant[];
  setTenants: React.Dispatch<React.SetStateAction<Tenant[]>>;
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
}

export const Auth: React.FC<AuthProps> = ({ onLogin, tenants, setTenants, users, setUsers }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [error, setError] = useState('');
  const [imageError, setImageError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (isLogin) {
      if (email === 'stratify2026@gmail.com' && password === 'stratify@2026') {
        const superAdmin: User = { id: 'admin-1', email, role: 'superadmin', name: 'Super Admin' };
        onLogin(superAdmin);
        return;
      }
      
      // Simulate auth check
      const user = users.find(u => u.email === email);
      if (user) {
        if (user.role === 'superadmin') {
           onLogin(user);
           return;
        }
        
        const tenant = tenants.find(t => t.id === user.tenantId);
        if (tenant) {
           if (tenant.subscriptionStatus === 'terminated') {
               setError('Your account has been terminated. Please contact support.');
               return;
           }
           if (tenant.subscriptionStatus === 'paused') {
               setError('Your account is currently paused. Please contact support.');
               return;
           }
           
           // Check free trial logic
           if (tenant.subscriptionStatus === 'trial') {
               const trialEnd = new Date(tenant.trialEndsAt);
               if (new Date() > trialEnd) {
                   // Expired
                   const updatedTenant = { ...tenant, subscriptionStatus: 'expired' as const };
                   setTenants(tenants.map(t => t.id === updatedTenant.id ? updatedTenant : t));
                   setError('Your 7-day free trial has expired. Please contact the admin to subscribe.');
                   return;
               }
           } else if (tenant.subscriptionStatus === 'expired') {
               setError('Your subscription has expired. Please contact the admin to renew.');
               return;
           }

           // Update online status
           const updatedTenant = { ...tenant, isOnline: true };
           const updatedTenants = tenants.map(t => t.id === updatedTenant.id ? updatedTenant : t);
           setTenants(updatedTenants);
           localStorage.setItem('mock_tenants', JSON.stringify(updatedTenants));
           
           onLogin(user, updatedTenant);
        } else {
            setError('Tenant not found.');
        }
      } else {
        setError('Invalid email or password.');
      }
    } else {
      // Register
      if (users.find(u => u.email === email)) {
        setError('Email already exists.');
        return;
      }

      const tenantId = 't-' + Date.now();
      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + 7); // 7 days trial
      
      const newTenant: Tenant = {
        id: tenantId,
        name: companyName,
        logo: null,
        subscriptionStatus: 'trial',
        trialEndsAt: trialEndsAt.toISOString(),
        createdAt: new Date().toISOString(),
        isOnline: true
      };

      const newUser: User = {
        id: 'u-' + Date.now(),
        email,
        name: email.split('@')[0],
        role: 'tenant_owner',
        tenantId
      };

      const newTenants = [...tenants, newTenant];
      const newUsers = [...users, newUser];
      setTenants(newTenants);
      setUsers(newUsers);
      
      // Force sync to storage before reload
      localStorage.setItem('mock_tenants', JSON.stringify(newTenants));
      localStorage.setItem('mock_users', JSON.stringify(newUsers));
      
      onLogin(newUser, newTenant);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-950 p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl overflow-hidden border border-blue-100 dark:border-blue-900/30"
      >
        <div className="p-8 text-center bg-white dark:bg-zinc-900 border-b border-blue-50 dark:border-zinc-800">
          <img 
            src="https://i.postimg.cc/5yGwSWWR/1782659487700.png" 
            alt="STRATIFY Logo" 
            className="w-24 h-24 mx-auto mb-4 object-contain rounded-xl shadow-sm"
          />
          <h1 className="text-2xl font-bold mb-2 text-zinc-900 dark:text-white">STRATIFY (System+Strategy)</h1>
          <p className="text-blue-600 dark:text-blue-400 text-sm font-medium tracking-wide uppercase">System Development</p>
        </div>

        <div className="p-8">
          <div className="flex gap-4 mb-8">
            <button 
              onClick={() => { setIsLogin(true); setError(''); }}
              className={`flex-1 pb-3 text-sm font-bold border-b-2 transition-colors ${isLogin ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400' : 'border-transparent text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}
            >
              Log In
            </button>
            <button 
              onClick={() => { setIsLogin(false); setError(''); }}
              className={`flex-1 pb-3 text-sm font-bold border-b-2 transition-colors ${!isLogin ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400' : 'border-transparent text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}
            >
              Register
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-rose-50 text-rose-600 rounded-xl text-sm font-medium border border-rose-100 dark:bg-rose-500/10 dark:border-rose-500/20">
                {error}
              </div>
            )}
            
            {!isLogin && (
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">Company Name</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Building className="h-4 w-4 text-zinc-400" />
                  </div>
                  <input 
                    type="text" 
                    required
                    value={companyName}
                    onChange={e => setCompanyName(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 text-sm text-zinc-900 dark:text-zinc-100"
                    placeholder="Enter your company name"
                  />
                </div>
              </div>
            )}
            
            <div>
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-zinc-400" />
                </div>
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 text-sm text-zinc-900 dark:text-zinc-100"
                  placeholder="name@company.com"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-zinc-400" />
                </div>
                <input 
                  type="password" 
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 text-sm text-zinc-900 dark:text-zinc-100"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button 
              type="submit" 
              className="w-full mt-6 py-3 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
            >
              {isLogin ? (
                <>Sign In <ArrowRight className="w-4 h-4" /></>
              ) : (
                <>Create Account (7-Day Trial) <UserPlus className="w-4 h-4" /></>
              )}
            </button>
            
            {!isLogin && (
              <p className="text-center text-xs text-zinc-500 mt-4">
                By registering, you get full access to all modules for 7 days. After the trial, you must subscribe to continue using the platform.
              </p>
            )}
          </form>
        </div>
      </motion.div>
    </div>
  );
};
