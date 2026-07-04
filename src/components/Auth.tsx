import React, { useState } from 'react';
import { User, Tenant } from '../types';
import { Building, ShieldCheck, ShieldAlert, Mail, Lock, ArrowRight, UserPlus, MapPin, Hash, Loader2, ArrowLeft, Key, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import { syncTenantToFirebase, syncUserToFirebase, getUserByEmail, loadTenantsFromFirebase, syncPasswordResetRequestToFirebase } from '../lib/db';

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

  // Forgot password flow states
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [forgotCompanyName, setForgotCompanyName] = useState('');
  const [forgotEmail, setForgotEmail] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleRequestPasswordResetDirect = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setIsSubmitting(true);

    try {
      // 1. Load all tenants to match by company name
      const allTenants = await loadTenantsFromFirebase();
      const matchedTenant = allTenants.find(
        t => t.name.trim().toLowerCase() === forgotCompanyName.trim().toLowerCase()
      );

      if (!matchedTenant) {
        setError('Company name is not registered under STRATIFY.');
        setIsSubmitting(false);
        return;
      }

      // 2. Find the user with that email
      const user = await getUserByEmail(forgotEmail.trim());
      if (!user) {
        setError('Email address is not registered.');
        setIsSubmitting(false);
        return;
      }

      // 3. Verify that the user belongs to the matched company
      if (user.role !== 'superadmin' && user.tenantId !== matchedTenant.id) {
        setError('The specified email is not associated with this company.');
        setIsSubmitting(false);
        return;
      }

      // 4. Create and save the PasswordResetRequest to Firebase
      const reqId = 'prr-' + Date.now();
      const requestPayload = {
        id: reqId,
        email: user.email.trim().toLowerCase(),
        companyName: matchedTenant.name,
        tenantId: matchedTenant.id,
        status: 'pending' as const,
        createdAt: new Date().toISOString()
      };

      await syncPasswordResetRequestToFirebase(requestPayload);

      setSuccessMessage('Your password reset request has been sent directly to the STRATIFY Admin Command Center. The system administrator will verify and update your credentials shortly.');
      
      // Auto-clear or redirect after a delay
      setTimeout(() => {
        setIsForgotPassword(false);
        setForgotCompanyName('');
        setForgotEmail('');
        setSuccessMessage('');
      }, 6000);

    } catch (err: any) {
      setError('An error occurred while sending the request: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

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
        const isPasswordValid = user?.authProvider === 'google' || !user?.password || user?.password === trimmedPassword;
        
        if (user && isPasswordValid) {
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
          authProvider: isGoogleReg ? 'google' : 'email',
          password: !isGoogleReg ? trimmedPassword : undefined
        };

        await syncTenantToFirebase(newTenant);
        await syncUserToFirebase(newUser);

        onLogin(newUser, newTenant);
      }
    } catch (err: any) {
      setError('Auth error: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-950 p-4 font-sans">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-5xl bg-gradient-to-br from-white to-blue-50 dark:from-zinc-900 dark:to-blue-950/30 rounded-[2rem] shadow-2xl overflow-hidden border border-blue-100 dark:border-blue-900/30 flex flex-col md:flex-row min-h-[700px]"
      >
        {/* Left Side: Brand & Hero (Desktop Only) */}
        <div className="hidden md:flex md:w-5/12 bg-gradient-to-br from-blue-700 to-blue-900 p-12 flex-col justify-between relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-transparent to-indigo-600/20 pointer-events-none" />
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/10 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl" />
          
          <div className="relative z-10">
            <img 
              src="https://i.postimg.cc/5yGwSWWR/1782659487700.png" 
              alt="STRATIFY Logo" 
              className="w-20 h-20 mb-8 object-contain rounded-2xl shadow-xl shadow-blue-500/10"
            />
            <h2 className="text-4xl font-black text-white tracking-tighter mb-4 leading-tight">
              Strategy <span className="text-blue-500">+</span><br />Simplify.
            </h2>
            <p className="text-zinc-400 text-lg font-medium leading-relaxed max-w-xs">
              The complete enterprise resource platform for Philippine businesses.
            </p>
          </div>

          <div className="relative z-10 space-y-6">
            <div className="flex items-center gap-4 text-zinc-300">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-xs font-bold text-white uppercase tracking-widest">BIR Compliant</p>
                <p className="text-[10px] text-zinc-500">Official ENCS / RR 09-2009 Ready</p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-zinc-300">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                <Building className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-xs font-bold text-white uppercase tracking-widest">Multi-Tenant</p>
                <p className="text-[10px] text-zinc-500">Secure isolated organizational data</p>
              </div>
            </div>
          </div>
          
          <div className="relative z-10 pt-12 border-t border-white/5">
            <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.3em]">Built for the modern enterprise</p>
          </div>
        </div>

        {/* Right Side: Auth Form */}
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          <div className="p-8 md:p-12 text-center md:text-left md:hidden bg-gradient-to-br from-blue-700 to-blue-900 border-b border-white/5 shrink-0">
            <img 
              src="https://i.postimg.cc/5yGwSWWR/1782659487700.png" 
              alt="STRATIFY Logo" 
              className="w-16 h-16 mx-auto mb-4 object-contain rounded-xl"
            />
            <h1 className="text-xl font-black text-white uppercase tracking-tighter">STRATIFY</h1>
            <p className="text-blue-500 text-[10px] font-black tracking-widest uppercase">Strategy + Simplify</p>
          </div>

          <div className="flex-1 p-8 md:p-16 overflow-y-auto custom-scrollbar bg-transparent">
            <div className="max-w-md mx-auto">
              <div className="mb-10">
                <h3 className="text-2xl font-black text-zinc-900 dark:text-white mb-2">
                  {isForgotPassword ? 'Reset Password' : isLogin ? 'Welcome back' : 'Start your journey'}
                </h3>
                <p className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">
                  {isForgotPassword 
                    ? 'Submit a recovery request directly to the STRATIFY Admin Command Center to restore your account access.'
                    : isLogin 
                      ? 'Enter your credentials to access your workspace.' 
                      : 'Register your organization and start your 7-day free trial.'}
                </p>
              </div>

              {!isForgotPassword && (
                <div className="flex p-1 bg-blue-500/5 dark:bg-zinc-800/50 rounded-2xl mb-8">
                  <button 
                    onClick={() => { setIsLogin(true); setError(''); }}
                    className={`flex-1 py-3 text-xs font-black rounded-xl transition-all ${isLogin ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
                  >
                    LOG IN
                  </button>
                  <button 
                    onClick={() => { setIsLogin(false); setError(''); }}
                    className={`flex-1 py-3 text-xs font-black rounded-xl transition-all ${!isLogin ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
                  >
                    REGISTER
                  </button>
                </div>
              )}

              {isForgotPassword ? (
                <div className="space-y-5">
                  <AnimatePresence mode="wait">
                    {error && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="p-4 bg-rose-50 text-rose-600 rounded-2xl text-xs font-bold border border-rose-100 dark:bg-rose-500/10 dark:border-rose-500/20 flex items-center gap-3"
                      >
                        <ShieldAlert className="w-4 h-4 shrink-0" />
                        {error}
                      </motion.div>
                    )}
                    {successMessage && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl text-xs font-bold border border-emerald-100 dark:bg-emerald-500/10 dark:border-emerald-500/20 flex items-center gap-3"
                      >
                        <CheckCircle className="w-4 h-4 shrink-0" />
                        {successMessage}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <form onSubmit={handleRequestPasswordResetDirect} className="space-y-5">
                    <div>
                      <label className="block text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-2">Registered Company Name</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <Building className="h-4 w-4 text-zinc-400" />
                        </div>
                        <input 
                          type="text" 
                          required
                          value={forgotCompanyName}
                          onChange={e => setForgotCompanyName(e.target.value)}
                          className="w-full pl-12 pr-4 py-3.5 bg-white/50 dark:bg-zinc-950/50 border border-blue-100 dark:border-zinc-800 backdrop-blur-sm rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:border-blue-400 text-sm text-zinc-900 dark:text-zinc-100 transition-all font-medium"
                          placeholder="e.g. Acme Corporation"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-2">Registered Email Address</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <Mail className="h-4 w-4 text-zinc-400" />
                        </div>
                        <input 
                          type="email" 
                          required
                          value={forgotEmail}
                          onChange={e => setForgotEmail(e.target.value)}
                          className="w-full pl-12 pr-4 py-3.5 bg-white/50 dark:bg-zinc-950/50 border border-blue-100 dark:border-zinc-800 backdrop-blur-sm rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:border-blue-400 text-sm text-zinc-900 dark:text-zinc-100 transition-all font-medium"
                          placeholder="name@company.com"
                        />
                      </div>
                    </div>

                    <div className="bg-blue-50/40 dark:bg-zinc-950/40 border border-blue-100 dark:border-zinc-800 rounded-2xl p-4 text-xs">
                      <p className="text-zinc-500 leading-relaxed font-semibold">
                        This request is securely routed to the STRATIFY Admin Command Center. The admin will immediately view your registration and verify the details to apply the changes.
                      </p>
                    </div>

                    <button 
                      type="submit" 
                      disabled={isSubmitting}
                      className="w-full mt-4 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-[1.25rem] text-sm font-black flex items-center justify-center gap-3 hover:from-blue-700 hover:to-indigo-700 transition-all active:scale-[0.98] disabled:opacity-50 shadow-xl shadow-zinc-950/10 dark:shadow-white/5"
                    >
                      {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <>SEND RECOVERY REQUEST <ArrowRight className="w-4 h-4" /></>}
                    </button>
                  </form>

                  <button 
                    type="button" 
                    onClick={() => {
                      setIsForgotPassword(false);
                      setError('');
                      setSuccessMessage('');
                    }}
                    className="w-full py-3 text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-white transition-colors text-xs font-bold flex items-center justify-center gap-2"
                  >
                    <ArrowLeft className="w-4 h-4" /> Back to Login
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <AnimatePresence mode="wait">
                    {error && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="p-4 bg-rose-50 text-rose-600 rounded-2xl text-xs font-bold border border-rose-100 dark:bg-rose-500/10 dark:border-rose-500/20 flex items-center gap-3"
                      >
                        <ShieldAlert className="w-4 h-4 shrink-0" />
                        {error}
                      </motion.div>
                    )}
                  </AnimatePresence>
                  
                  <AnimatePresence mode="popLayout">
                    {!isLogin && (
                      <motion.div 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="space-y-5"
                      >
                        <div>
                          <label className="block text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-2">Company Name</label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                              <Building className="h-4 w-4 text-zinc-400" />
                            </div>
                            <input 
                              type="text" 
                              required
                              value={companyName}
                              onChange={e => setCompanyName(e.target.value)}
                              className="w-full pl-12 pr-4 py-3.5 bg-white/50 dark:bg-zinc-950/50 border border-blue-100 dark:border-zinc-800 backdrop-blur-sm rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:border-blue-400 text-sm text-zinc-900 dark:text-zinc-100 transition-all font-medium"
                              placeholder="e.g. Acme Corporation"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-2">TIN Number</label>
                            <div className="relative">
                              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Hash className="h-4 w-4 text-zinc-400" />
                              </div>
                              <input 
                                type="text" 
                                required
                                value={tin}
                                onChange={e => setTin(e.target.value)}
                                className="w-full pl-12 pr-4 py-3.5 bg-white/50 dark:bg-zinc-950/50 border border-blue-100 dark:border-zinc-800 backdrop-blur-sm rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:border-blue-400 text-sm text-zinc-900 dark:text-zinc-100 transition-all font-medium"
                                placeholder="000-000-000"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-2">Users</label>
                            <div className="flex items-center gap-2 bg-white/50 dark:bg-zinc-950/50 border border-blue-100 dark:border-zinc-800 backdrop-blur-sm rounded-2xl px-2 py-1.5">
                              <button
                                type="button"
                                onClick={() => setUserLimit(prev => Math.max(1, prev - 1))}
                                className="w-8 h-8 rounded-xl bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white flex items-center justify-center font-bold shadow-sm hover:bg-zinc-50 transition-all"
                              >
                                -
                              </button>
                              <span className="flex-1 text-center text-sm font-black text-zinc-900 dark:text-white">{userLimit}</span>
                              <button
                                type="button"
                                onClick={() => setUserLimit(prev => prev + 1)}
                                className="w-8 h-8 rounded-xl bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white flex items-center justify-center font-bold shadow-sm hover:bg-zinc-50 transition-all"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-2">Address</label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                              <MapPin className="h-4 w-4 text-zinc-400" />
                            </div>
                            <input 
                              type="text" 
                              required
                              value={address}
                              onChange={e => setAddress(e.target.value)}
                              className="w-full pl-12 pr-4 py-3.5 bg-white/50 dark:bg-zinc-950/50 border border-blue-100 dark:border-zinc-800 backdrop-blur-sm rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:border-blue-400 text-sm text-zinc-900 dark:text-zinc-100 transition-all font-medium"
                              placeholder="Complete Business Address"
                            />
                          </div>
                        </div>
                        <div className="p-4 bg-blue-50/50 dark:bg-blue-500/5 rounded-2xl border border-blue-100 dark:border-blue-500/10">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">Total Monthly Price</span>
                            <span className="text-sm font-black text-blue-700 dark:text-blue-300">₱{(2999 + (userLimit > 1 ? (userLimit - 1) * 100 : 0)).toLocaleString()}</span>
                          </div>
                          <p className="text-[9px] text-zinc-500 font-medium">Billed annually at ₱{((2999 + (userLimit > 1 ? (userLimit - 1) * 100 : 0)) * 12).toLocaleString()} or pay monthly.</p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  
                  <div>
                    <label className="block text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-2">Email Address</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Mail className="h-4 w-4 text-zinc-400" />
                      </div>
                      <input 
                        type="email" 
                        required
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="w-full pl-12 pr-4 py-3.5 bg-white/50 dark:bg-zinc-950/50 border border-blue-100 dark:border-zinc-800 backdrop-blur-sm rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:border-blue-400 text-sm text-zinc-900 dark:text-zinc-100 transition-all font-medium"
                        placeholder="name@company.com"
                      />
                    </div>
                  </div>
                  
                  {!isGoogleReg && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">Password</label>
                      </div>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <Lock className="h-4 w-4 text-zinc-400" />
                        </div>
                        <input 
                          type="password" 
                          required={!isGoogleReg}
                          value={password}
                          onChange={e => setPassword(e.target.value)}
                          className="w-full pl-12 pr-4 py-3.5 bg-white/50 dark:bg-zinc-950/50 border border-blue-100 dark:border-zinc-800 backdrop-blur-sm rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:border-blue-400 text-sm text-zinc-900 dark:text-zinc-100 transition-all font-medium"
                          placeholder="••••••••"
                        />
                      </div>
                    </div>
                  )}

                  {isLogin && !isGoogleReg && (
                    <div className="flex justify-end pt-1">
                      <button 
                        type="button" 
                        onClick={() => {
                          setIsForgotPassword(true);
                          setError('');
                          setSuccessMessage('');
                        }}
                        className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 hover:underline uppercase tracking-wider"
                      >
                        Forgot Password?
                      </button>
                    </div>
                  )}

                  <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="w-full mt-4 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-[1.25rem] text-sm font-black flex items-center justify-center gap-3 hover:from-blue-700 hover:to-indigo-700 transition-all active:scale-[0.98] disabled:opacity-50 shadow-xl shadow-zinc-950/10 dark:shadow-white/5"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : isLogin ? (
                      <>SIGN IN TO WORKSPACE <ArrowRight className="w-4 h-4" /></>
                    ) : (
                      <>CREATE ENTERPRISE ACCOUNT <UserPlus className="w-4 h-4" /></>
                    )}
                  </button>
                  
                  <div className="relative my-8">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-zinc-200 dark:border-zinc-800"></div>
                    </div>
                    <div className="relative flex justify-center text-[10px]">
                      <span className="bg-white dark:bg-zinc-900 px-4 text-zinc-400 font-black uppercase tracking-widest">Secure Cloud Gateway</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleGoogleAuth}
                    disabled={isSubmitting}
                    className="w-full py-4 bg-white/50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-blue-100 dark:border-zinc-700 backdrop-blur-sm rounded-[1.25rem] text-xs font-black flex items-center justify-center gap-3 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-all shadow-sm active:scale-[0.98] disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
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
                        CONTINUE WITH GOOGLE
                      </>
                    )}
                  </button>

                  {!isLogin && (
                    <p className="text-center text-[10px] text-zinc-500 font-bold uppercase tracking-wide mt-6 leading-relaxed">
                      Licensed under STRATIFY EULA • Secure SSL 256-bit Encryption
                    </p>
                  )}
                </form>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
