import React, { useState } from 'react';
import { User, Tenant } from '../types';
import { Building, ShieldCheck, Mail, Lock, ArrowRight, UserPlus, MapPin, Hash, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import { syncTenantToFirebase, syncUserToFirebase, getUserByEmail, loadTenantsFromFirebase } from '../lib/db';

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
  const [tin, setTin] = useState('');
  const [address, setAddress] = useState('');
  const [error, setError] = useState('');
  const [imageError, setImageError] = useState(false);
  const [isGoogleReg, setIsGoogleReg] = useState(false);
  const [userLimit, setUserLimit] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleGoogleAuth = async () => {
    setIsSubmitting(true);
    setError('');
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const googleUser = result.user;
      
      const user = await getUserByEmail(googleUser.email || '');
      
      if (user) {
        if (user.role === 'superadmin') {
           onLogin(user);
           return;
        }
        
        const tenant = tenants.find(t => t.id === user.tenantId);
        if (tenant) {
           if (tenant.subscriptionStatus === 'terminated') {
               setError('Your account has been terminated. Please contact support.');
               setIsSubmitting(false);
               return;
           }
           
           const updatedTenant = { ...tenant, isOnline: true };
           await syncTenantToFirebase(updatedTenant);
           onLogin(user, updatedTenant);
        } else {
           setError('Organization data not found.');
           setIsSubmitting(false);
        }
      } else {
        setIsLogin(false);
        setEmail(googleUser.email || '');
        setIsGoogleReg(true);
        setPassword('google-auth-active');
      }
    } catch (err: any) {
      setError('Google Sign-In failed: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    try {
      if (isLogin) {
        if (trimmedEmail.toLowerCase() === 'stratify2026@gmail.com' && trimmedPassword === 'stratify@2026') {
          const superAdmin: User = { id: 'admin-1', email: trimmedEmail, role: 'superadmin', name: 'Super Admin' };
          onLogin(superAdmin);
          return;
        }
        
        const user = await getUserByEmail(trimmedEmail);
        if (user) {
          if (user.role === 'superadmin') {
             onLogin(user);
             return;
          }
          
          // Try to find in props first, then fetch if missing
          let tenant = tenants.find(t => t.id === user.tenantId);
          if (!tenant) {
            const allTenants = await loadTenantsFromFirebase();
            tenant = allTenants.find(t => t.id === user.tenantId);
          }

          if (tenant) {
             if (tenant.subscriptionStatus === 'terminated') {
                 setError('Your account has been terminated.');
                 return;
             }
             
             if (tenant.subscriptionStatus === 'trial') {
                 const trialEnd = new Date(tenant.trialEndsAt);
                 if (new Date() > trialEnd) {
                     const updatedTenant = { ...tenant, subscriptionStatus: 'expired' as const };
                     await syncTenantToFirebase(updatedTenant);
                     setError('Your free trial has expired. Please contact support.');
                     return;
                 }
             }

             const updatedTenant = { ...tenant, isOnline: true };
             await syncTenantToFirebase(updatedTenant);
             onLogin(user, updatedTenant);
          } else {
              setError('Organization details not found.');
          }
        } else {
          setError('Invalid email or password.');
        }
      } else {
        // Register
        const existingUser = await getUserByEmail(trimmedEmail);
        if (existingUser) {
          setError('Email already exists.');
          return;
        }
        
        const DEVICE_FINGERPRINT_KEY = 'stratify_device_registered';
        if (localStorage.getItem(DEVICE_FINGERPRINT_KEY) && !isGoogleReg) {
          setError('Registration limit reached for this device.');
          return;
        }

        const tenantId = 't-' + Date.now();
        const trialEndsAt = new Date();
        trialEndsAt.setDate(trialEndsAt.getDate() + 7);
        
        const calculatedPrice = 2999 + (userLimit > 1 ? (userLimit - 1) * 100 : 0);
        const newTenant: Tenant = {
          id: tenantId,
          name: companyName.trim(),
          tin: tin.trim(),
          address: address.trim(),
          logo: null,
          subscriptionStatus: 'trial',
          trialEndsAt: trialEndsAt.toISOString(),
          createdAt: new Date().toISOString(),
          isOnline: true,
          userLimit,
          pricePaid: calculatedPrice
        };

        const newUser: User = {
          id: 'u-' + Date.now(),
          email: trimmedEmail.toLowerCase(),
          name: trimmedEmail.split('@')[0],
          role: 'tenant_owner',
          tenantId,
          authProvider: isGoogleReg ? 'google' : 'email'
        };

        await syncTenantToFirebase(newTenant);
        await syncUserToFirebase(newUser);

        localStorage.setItem(DEVICE_FINGERPRINT_KEY, 'true');
        onLogin(newUser, newTenant);
      }
    } catch (err: any) {
      setError('Auth error: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-950 p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl overflow-hidden border border-blue-100 dark:border-blue-900/30 max-h-[90vh] flex flex-col"
      >
        <div className="p-8 text-center bg-white dark:bg-zinc-900 border-b border-blue-50 dark:border-zinc-800 shrink-0">
          <img 
            src="https://i.postimg.cc/5yGwSWWR/1782659487700.png" 
            alt="STRATIFY Logo" 
            className="w-24 h-24 mx-auto mb-4 object-contain rounded-xl shadow-sm"
          />
          <h1 className="text-2xl font-bold mb-2 text-zinc-900 dark:text-white uppercase tracking-tight">STRATIFY (Strategy + Simplify)</h1>
          <p className="text-blue-600 dark:text-blue-400 text-[10px] font-black tracking-[0.2em] uppercase">Enterprise Resource Platform</p>
        </div>

        <div className="p-8 overflow-y-auto">
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
              <>
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
                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">Company Address</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <MapPin className="h-4 w-4 text-zinc-400" />
                    </div>
                    <input 
                      type="text" 
                      required
                      value={address}
                      onChange={e => setAddress(e.target.value)}
                      className="w-full pl-10 pr-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 text-sm text-zinc-900 dark:text-zinc-100"
                      placeholder="Full Business Address"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">Tax Identification Number (TIN)</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Hash className="h-4 w-4 text-zinc-400" />
                    </div>
                    <input 
                      type="text" 
                      required
                      value={tin}
                      onChange={e => setTin(e.target.value)}
                      className="w-full pl-10 pr-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 text-sm text-zinc-900 dark:text-zinc-100"
                      placeholder="000-000-000-00000"
                    />
                  </div>
                </div>

                {/* USER COUNT & SUBSCRIPTION CALCULATOR */}
                <div className="bg-zinc-100/50 dark:bg-zinc-800/40 p-4.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="block text-xs font-bold text-zinc-800 dark:text-zinc-200">Registered Users</span>
                      <span className="block text-[10px] text-zinc-400">Add-on seats are ₱100/mo each</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setUserLimit(prev => Math.max(1, prev - 1))}
                        className="w-8 h-8 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center font-bold text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="1"
                        value={userLimit}
                        onChange={e => setUserLimit(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-12 text-center text-xs font-bold bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg py-1.5 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setUserLimit(prev => prev + 1)}
                        className="w-8 h-8 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center font-bold text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="pt-2.5 border-t border-dashed border-zinc-200 dark:border-zinc-700 text-xs text-zinc-600 dark:text-zinc-400 space-y-1">
                    <div className="flex justify-between">
                      <span>1 Client Base License:</span>
                      <span className="font-semibold">₱2,999</span>
                    </div>
                    {userLimit > 1 && (
                      <div className="flex justify-between">
                        <span>Add-on Users ({userLimit - 1} × ₱100):</span>
                        <span className="font-semibold text-zinc-700 dark:text-zinc-300">₱{(userLimit - 1) * 100}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-sm text-blue-600 dark:text-blue-400 pt-1.5 border-t border-zinc-200 dark:border-zinc-800">
                      <span>Total Price / Month:</span>
                      <span>₱{(2999 + (userLimit > 1 ? (userLimit - 1) * 100 : 0)).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </>
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
            
            {!isGoogleReg && (
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
            )}

            <button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full mt-6 py-3 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isLogin ? (
                <>Sign In <ArrowRight className="w-4 h-4" /></>
              ) : (
                <>Create Account (7-Day Trial) <UserPlus className="w-4 h-4" /></>
              )}
            </button>
            
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-zinc-200 dark:border-zinc-800"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white dark:bg-zinc-900 px-2 text-zinc-500">Or continue with</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoogleAuth}
              disabled={isSubmitting}
              className="w-full py-3 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Google
                </>
              )}
            </button>

            {!isLogin && (
              <p className="text-center text-xs text-zinc-500 mt-4 leading-relaxed">
                By registering, you get full access to all modules for 7 days. After the trial, you must subscribe to continue using the platform.
              </p>
            )}
          </form>
        </div>
      </motion.div>
    </div>
  );
};
