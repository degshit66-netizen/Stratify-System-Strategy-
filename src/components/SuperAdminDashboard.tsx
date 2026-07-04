import React, { useState, useEffect } from 'react';
import { ShieldAlert, LogOut, CheckCircle, Search, Edit3, Save, XCircle, Users, Activity, Play, Pause, MoreVertical, CreditCard, LayoutDashboard, Megaphone, Plus, Trash2, Settings2, FileSpreadsheet, FileCheck2, RefreshCw, Cpu, Server, Globe2, Radio, Zap, Database, Key, Eye, EyeOff, Lock, ShieldCheck } from 'lucide-react';
import { Tenant, User, SystemAnnouncement, PasswordResetRequest } from '../types';
import { format } from 'date-fns';
import { syncConfigToFirebase, loadConfigFromFirebase, loadTenantsFromFirebase, syncTenantToFirebase, syncSubscriptionRequestToFirebase, syncUserToFirebase, deletePasswordResetRequestFromFirebase } from '../lib/db';
import { onSnapshot, collection } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface SuperAdminDashboardProps {
  tenants: Tenant[];
  setTenants: React.Dispatch<React.SetStateAction<Tenant[]>>;
  users: User[];
  onLogout: () => void;
  onSelectTenant?: (tenant: Tenant) => void;
}

export const SuperAdminDashboard: React.FC<SuperAdminDashboardProps> = ({ tenants, setTenants, users, onLogout, onSelectTenant }) => {
  const [activeTab, setActiveTab] = useState<'tenants' | 'announcements' | 'system' | 'requests' | 'credentials'>('tenants');
  const [subRequests, setSubRequests] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Registered Users & Password Reset Requests States
  const [localUsers, setLocalUsers] = useState<User[]>(users || []);
  const [resetRequests, setResetRequests] = useState<PasswordResetRequest[]>([]);
  const [credentialsSearch, setCredentialsSearch] = useState('');
  
  // Password Change Override Modal State
  const [isPassModalOpen, setIsPassModalOpen] = useState(false);
  const [passTargetUser, setPassTargetUser] = useState<User | null>(null);
  const [passNewPassword, setPassNewPassword] = useState('');
  const [passAdminVerify, setPassAdminVerify] = useState('');
  const [passModalError, setPassModalError] = useState('');
  const [revealedPassUsers, setRevealedPassUsers] = useState<Record<string, boolean>>({});

  // Announcements State
  const [announcements, setAnnouncements] = useState<SystemAnnouncement[]>([]);
  const [showAnnounceModal, setShowAnnounceModal] = useState(false);
  const [newAnnouncement, setNewAnnouncement] = useState<Partial<SystemAnnouncement>>({ title: '', message: '', type: 'info' });

  // Subscription Update Modal State
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [updateDate, setUpdateDate] = useState<string>('');
  const [editModules, setEditModules] = useState<{ payroll?: boolean; inventory?: boolean; ecommerce?: boolean; fixedAssets?: boolean }>({});

  // Toast State for SuperAdmin notifications
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleApproveSubscription = async (req: any) => {
    try {
      const basePrice = req.plan === 'annual'
        ? (2999 + (req.users || 5) * 100) * 12
        : (2999 + (req.users || 5) * 100);

      const durationDays = req.plan === 'annual' ? 365 : 30;
      const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString();

      const targetTenant = tenants.find(t => t.id === req.tenantId);
      if (targetTenant) {
        const updatedTenant: Tenant = {
          ...targetTenant,
          subscriptionStatus: 'active',
          subscriptionType: req.plan || 'monthly',
          userLimit: req.users || 5,
          pricePaid: basePrice,
          expiresAt: expiresAt,
          subscriptionRequestStatus: 'approved'
        };

        await syncTenantToFirebase(updatedTenant);
        setTenants(prev => prev.map(t => t.id === req.tenantId ? updatedTenant : t));
      }

      const updatedReq = {
        ...req,
        status: 'approved' as const
      };
      await syncSubscriptionRequestToFirebase(updatedReq);
      setSubRequests(prev => prev.map(r => r.id === req.id ? updatedReq : r));
      
      setToast({ message: 'Subscription approved and tenant activated!', type: 'success' });
    } catch (e) {
      console.error('Error approving subscription:', e);
      setToast({ message: 'Error approving subscription request.', type: 'error' });
    }
  };

  const handleDeclineSubscription = async (req: any) => {
    try {
      const updatedReq = {
        ...req,
        status: 'declined' as const
      };
      await syncSubscriptionRequestToFirebase(updatedReq);
      setSubRequests(prev => prev.map(r => r.id === req.id ? updatedReq : r));

      const targetTenant = tenants.find(t => t.id === req.tenantId);
      if (targetTenant) {
        const updatedTenant: Tenant = {
          ...targetTenant,
          subscriptionRequestStatus: 'declined'
        };
        await syncTenantToFirebase(updatedTenant);
        setTenants(prev => prev.map(t => t.id === req.tenantId ? updatedTenant : t));
      }

      setToast({ message: 'Subscription request declined.', type: 'success' });
    } catch (e) {
      console.error('Error declining subscription:', e);
      setToast({ message: 'Error declining subscription request.', type: 'error' });
    }
  };

  const [isSyncing, setIsSyncing] = useState(false);

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      const { loadSubscriptionRequestsFromFirebase, loadTenantsFromFirebase } = await import('../lib/db');
      const reqs = await loadSubscriptionRequestsFromFirebase();
      reqs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setSubRequests(reqs);

      const loadedTenants = await loadTenantsFromFirebase();
      setTenants(loadedTenants);

      setToast({ message: 'Real-Time Database Synced successfully!', type: 'success' });
    } catch (e) {
      console.error(e);
      setToast({ message: 'Sync failed. Check connection.', type: 'error' });
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    // Real-time listener for subscription requests
    const unsubRequests = onSnapshot(collection(db, 'subscription_requests'), (snapshot) => {
      const reqs = snapshot.docs.map(doc => doc.data() as any);
      // Sort by newest first
      reqs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setSubRequests(reqs);
    }, (error) => {
      console.error('Error sync subscription_requests:', error);
    });

    // Real-time listener for tenants matrix to prevent local state lag
    const unsubTenants = onSnapshot(collection(db, 'tenants'), (snapshot) => {
      const loadedTenants = snapshot.docs.map(doc => doc.data() as Tenant);
      setTenants(loadedTenants);
    }, (error) => {
      console.error('Error sync tenants:', error);
    });

    // Real-time listener for registered users credentials management
    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const loadedUsers = snapshot.docs.map(doc => doc.data() as User);
      setLocalUsers(loadedUsers);
    }, (error) => {
      console.error('Error sync users:', error);
    });

    // Real-time listener for password reset requests from credentials command center
    const unsubPasswordResets = onSnapshot(collection(db, 'password_reset_requests'), (snapshot) => {
      const reqs = snapshot.docs.map(doc => doc.data() as PasswordResetRequest);
      reqs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setResetRequests(reqs);
    }, (error) => {
      console.error('Error sync password_reset_requests:', error);
    });

    return () => {
      unsubRequests();
      unsubTenants();
      unsubUsers();
      unsubPasswordResets();
    };
  }, [setTenants]);
  useEffect(() => {
    if (subRequests.filter(r => r.status === 'pending').length > 0) {
      setActiveTab('requests');
    }
  }, [subRequests]);

  useEffect(() => {
    const loadAnnouncements = async () => {
      const saved = await loadConfigFromFirebase('stratify_announcements');
      if (saved) setAnnouncements(JSON.parse(saved));
    };
    loadAnnouncements();
  }, []);

  const saveAnnouncements = async (data: SystemAnnouncement[]) => {
    setAnnouncements(data);
    await syncConfigToFirebase('stratify_announcements', JSON.stringify(data));
  };

  const handleAddAnnouncement = () => {
    if (!newAnnouncement.title || !newAnnouncement.message) return;
    const item: SystemAnnouncement = {
      id: Date.now().toString(),
      title: newAnnouncement.title,
      message: newAnnouncement.message,
      type: newAnnouncement.type as any || 'info',
      active: true,
      createdAt: new Date().toISOString()
    };
    saveAnnouncements([item, ...announcements]);
    setShowAnnounceModal(false);
    setNewAnnouncement({ title: '', message: '', type: 'info' });
  };

  const handleDeleteAnnouncement = (id: string) => {
    
    saveAnnouncements(announcements.filter(a => a.id !== id));
  };

  const toggleAnnouncementActive = (id: string) => {
    saveAnnouncements(announcements.map(a => a.id === id ? { ...a, active: !a.active } : a));
  };

  const handleOpenPassModal = (user: User) => {
    setPassTargetUser(user);
    setPassNewPassword('');
    setPassAdminVerify('');
    setPassModalError('');
    setIsPassModalOpen(true);
  };

  const handleCommitPasswordChange = async () => {
    setPassModalError('');
    if (!passTargetUser) return;
    if (!passNewPassword || passNewPassword.trim().length < 6) {
      setPassModalError('Password must be at least 6 characters.');
      return;
    }
    if (passAdminVerify !== 'stratify@2026') {
      setPassModalError('Authorization Failed: Incorrect Admin Password.');
      return;
    }

    try {
      const updatedUser: User = {
        ...passTargetUser,
        password: passNewPassword.trim()
      };

      await syncUserToFirebase(updatedUser);

      // Clean/resolve password reset requests for this user email
      const pendingReqs = resetRequests.filter(r => r.email === passTargetUser.email && r.status === 'pending');
      for (const pr of pendingReqs) {
        await deletePasswordResetRequestFromFirebase(pr.id);
      }

      setToast({ message: `Password changed successfully for ${passTargetUser.email}!`, type: 'success' });
      setIsPassModalOpen(false);
    } catch (e: any) {
      console.error('Error changing password:', e);
      setPassModalError('Error: ' + e.message);
    }
  };

  const handleRejectResetRequest = async (id: string) => {
    try {
      await deletePasswordResetRequestFromFirebase(id);
      setToast({ message: 'Password recovery request dismissed.', type: 'success' });
    } catch (e) {
      console.error('Error rejecting reset request:', e);
      setToast({ message: 'Failed to remove request.', type: 'error' });
    }
  };

  const openUpdateModal = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setUpdateDate(tenant.expiresAt ? new Date(tenant.expiresAt).toISOString().slice(0, 10) : new Date(tenant.trialEndsAt).toISOString().slice(0, 10));
    setEditModules(tenant.modules || { payroll: true, inventory: true, ecommerce: true, fixedAssets: true });
    setIsUpdateModalOpen(true);
  };

  const handleSaveUpdate = async () => {
    if (selectedTenant && updateDate) {
      const updatedTenants = tenants.map(t => t.id === selectedTenant.id ? { 
        ...t, 
        subscriptionStatus: 'active' as const,
        expiresAt: new Date(updateDate).toISOString(),
        modules: editModules
      } : t);
      setTenants(updatedTenants);
      const tenantToSync = updatedTenants.find(t => t.id === selectedTenant.id);
      if (tenantToSync) {
        await syncTenantToFirebase(tenantToSync);
      }
      setIsUpdateModalOpen(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: 'active' | 'paused' | 'terminated') => {
    
    const updatedTenants = tenants.map(t => t.id === id ? { ...t, subscriptionStatus: status } : t);
    setTenants(updatedTenants);
    const tenantToSync = updatedTenants.find(t => t.id === id);
    if (tenantToSync) {
      await syncTenantToFirebase(tenantToSync);
    }
  };

  const filteredTenants = tenants.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || t.subscriptionStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const activeTenantsCount = tenants.filter(t => ['active', 'trial'].includes(t.subscriptionStatus)).length;
  const mrr = tenants.filter(t => t.subscriptionStatus === 'active').reduce((sum, t) => sum + (t.pricePaid || 0), 0);

  return (
    <div className="h-screen bg-zinc-100 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col font-sans overflow-hidden relative">
      <header className="bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-950 border-b border-blue-900 text-white px-6 py-4 flex items-center justify-between shadow-md shrink-0 z-40">
        <div className="flex items-center gap-4">
          <img src="https://i.postimg.cc/5yGwSWWR/1782659487700.png" alt="STRATIFY Logo" className="w-10 h-10 object-contain drop-shadow-md rounded-xl" />
          <div>
            <h1 className="text-xl font-bold uppercase tracking-widest text-white">STRATIFY Admin Center</h1>
            <p className="text-[10px] font-semibold text-blue-300 tracking-wide">SYSTEM MANAGEMENT</p>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <button 
            onClick={onLogout}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl transition-all shadow-sm text-sm font-bold tracking-wider"
          >
            <LogOut className="w-4 h-4" />
            <span>LOGOUT</span>
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-auto p-4 md:p-6 space-y-6 relative z-10 scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-zinc-700 scrollbar-track-transparent">
        {/* KPI Section */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl shadow-[inset_0_0_20px_rgba(8,145,178,0.05)] relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1 h-full bg-blue-600 dark:bg-blue-500 group-hover:shadow-[0_0_20px_rgba(34,211,238,1)] transition-all" />
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-50 dark:bg-blue-50 dark:bg-blue-950/50 text-zinc-900 dark:text-white rounded-xl border border-zinc-200 dark:border-zinc-200 dark:border-zinc-800">
                <Globe2 className="w-6 h-6" />
              </div>
              <div>
                <div className="text-[10px] font-bold text-zinc-900 dark:text-white uppercase tracking-[0.2em] mb-1">Global Active Tenants</div>
                <div className="text-2xl font-black font-mono text-zinc-900 dark:text-white ">{activeTenantsCount}</div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl shadow-[inset_0_0_20px_rgba(8,145,178,0.05)] relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 group-hover:shadow-[0_0_20px_rgba(59,130,246,1)] transition-all" />
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-50 dark:bg-blue-950/50 text-zinc-900 dark:text-white rounded-xl border border-zinc-200 dark:border-zinc-800">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <div className="text-[10px] font-bold text-zinc-900 dark:text-white uppercase tracking-[0.2em] mb-1">Total Connected Users</div>
                <div className="text-2xl font-black font-mono text-zinc-900 dark:text-white ">{users.length}</div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-emerald-900/30 p-5 rounded-2xl shadow-[inset_0_0_20px_rgba(16,185,129,0.05)] relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500 group-hover:shadow-[0_0_20px_rgba(16,185,129,1)] transition-all" />
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 text-zinc-900 dark:text-white rounded-xl border border-emerald-200 dark:border-emerald-900/50">
                <CreditCard className="w-6 h-6" />
              </div>
              <div>
                <div className="text-[10px] font-bold text-zinc-900 dark:text-white uppercase tracking-[0.2em] mb-1">Total MRR (PHP)</div>
                <div className="text-2xl font-black font-mono text-zinc-900 dark:text-white ">
                  ₱{mrr.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-purple-900/30 p-5 rounded-2xl shadow-[inset_0_0_20px_rgba(168,85,247,0.05)] relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1 h-full bg-purple-500 group-hover:shadow-[0_0_20px_rgba(168,85,247,1)] transition-all" />
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-50 dark:bg-purple-950/50 text-zinc-900 dark:text-white rounded-xl border border-purple-200 dark:border-purple-900/50">
                <Zap className="w-6 h-6" />
              </div>
              <div>
                <div className="text-[10px] font-bold text-zinc-900 dark:text-white uppercase tracking-[0.2em] mb-1">Compute Load</div>
                <div className="text-2xl font-black font-mono text-zinc-900 dark:text-white ">
                  {Math.min(100, Math.max(12, tenants.length * 2.5)).toFixed(1)}%
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2 overflow-x-auto whitespace-nowrap">
          {[
            { id: 'tenants', label: 'TENANT MATRIX', icon: LayoutDashboard },
            { id: 'announcements', label: 'BROADCAST LINK', icon: Radio },
            { id: 'requests', label: 'SUBSCRIPTION REQUESTS', icon: CreditCard },
            { id: 'credentials', label: 'USER CREDENTIALS', icon: Key },
            { id: 'system', label: 'CORE SYSTEM', icon: Cpu }
          ].map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-black uppercase tracking-[0.1em] rounded-t-xl transition-all ${
                activeTab === tab.id 
                  ? 'bg-blue-50 dark:bg-blue-950/80 text-zinc-900 dark:text-white border-t border-l border-r border-blue-500/50 shadow-[0_-5px_15px_rgba(34,211,238,0.1)]' 
                  : 'text-zinc-900 dark:text-white hover:text-zinc-900 dark:text-white hover:bg-blue-50 dark:bg-blue-950/30 border-t border-l border-r border-transparent'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        {activeTab === 'tenants' && (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-blue-900/40 rounded-2xl shadow-[0_0_30px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col min-h-[500px]">
            <div className="p-4 border-b border-zinc-200 dark:border-blue-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/80 dark:bg-zinc-950/50">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-900 dark:text-white " />
                <input 
                  type="text" 
                  placeholder="Scan tenant matrix..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-4 py-2 w-full sm:w-64 bg-white/80 dark:bg-zinc-950/80 border border-zinc-200 dark:border-zinc-200 dark:border-zinc-800 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs font-mono text-zinc-900 dark:text-white placeholder-cyan-800 transition-all shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]"
                />
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={async () => {
                    const latest = await loadTenantsFromFirebase();
                    setTenants(latest);
                  }}
                  className="px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-200 dark:border-zinc-800 hover:bg-blue-50 dark:bg-blue-950 hover:border-blue-500 rounded-lg text-zinc-900 dark:text-white flex items-center gap-2 transition-all shadow-[0_0_10px_rgba(8,145,178,0.2)]"
                  title="Refresh Matrix"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-500 animate-ping" />
                  <span className="text-[10px] font-bold text-zinc-900 dark:text-white uppercase tracking-widest">Live Sync</span>
                </div>
                <select 
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 bg-white/80 dark:bg-zinc-950/80 border border-zinc-200 dark:border-zinc-200 dark:border-zinc-800 rounded-lg text-xs font-mono text-zinc-900 dark:text-white focus:ring-1 focus:ring-blue-500 uppercase tracking-wider"
                >
                  <option value="all">ALL NODES</option>
                  <option value="trial">TRIAL NODES</option>
                  <option value="active">ACTIVE NODES</option>
                  <option value="paused">PAUSED NODES</option>
                  <option value="terminated">TERMINATED</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto flex-1 custom-scrollbar">
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead>
                  <tr className="bg-blue-50 dark:bg-blue-950/30 text-zinc-900 dark:text-white text-[10px] uppercase tracking-[0.2em] font-black border-b border-zinc-200 dark:border-blue-900/40">
                    <th className="p-4 py-3">Entity Identifier</th>
                    <th className="p-4 py-3">Node Status</th>
                    <th className="p-4 py-3">Subscription Data</th>
                    <th className="p-4 py-3">Capacity</th>
                    <th className="p-4 py-3">Initialization</th>
                    <th className="p-4 py-3">Lifespan End</th>
                    <th className="p-4 py-3 text-right">Command Overrides</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cyan-900/20 text-xs font-mono">
                  {filteredTenants.map(tenant => {
                    const isExpiringSoon = tenant.subscriptionStatus === 'trial' && new Date(tenant.trialEndsAt).getTime() - new Date().getTime() < 3 * 24 * 60 * 60 * 1000;
                    return (
                    <tr key={tenant.id} className="hover:bg-blue-50 dark:bg-blue-950/20 transition-colors group">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-white/80 dark:bg-zinc-950 border border-zinc-200 dark:border-blue-800 flex items-center justify-center text-zinc-900 dark:text-white font-black shadow-[inset_0_0_10px_rgba(34,211,238,0.2)] shrink-0">
                            {tenant.name.substring(0,2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-zinc-900 dark:text-white font-sans tracking-wide">{tenant.name}</div>
                            <div className="text-[10px] text-zinc-900 dark:text-white ">{tenant.id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`
                          inline-flex items-center gap-1.5 px-2 py-1 rounded border text-[10px] font-bold uppercase tracking-widest shadow-[0_0_10px_currentColor_inset]
                          ${tenant.subscriptionStatus === 'active' ? 'border-emerald-500/50 text-zinc-900 dark:text-white bg-emerald-950/30' : ''}
                          ${tenant.subscriptionStatus === 'trial' ? isExpiringSoon ? 'border-amber-500/50 text-amber-400 bg-amber-950/30' : 'border-blue-500/50 text-zinc-900 dark:text-white bg-blue-950/30' : ''}
                          ${tenant.subscriptionStatus === 'paused' ? 'border-orange-500/50 text-orange-400 bg-orange-950/30' : ''}
                          ${tenant.subscriptionStatus === 'terminated' || tenant.subscriptionStatus === 'expired' ? 'border-rose-500/50 text-rose-400 bg-rose-950/30' : ''}
                        `}>
                          <span className={`w-1.5 h-1.5 rounded-full ${tenant.subscriptionStatus === 'active' ? 'bg-emerald-400 shadow-[0_0_5px_rgba(52,211,153,1)]' : tenant.subscriptionStatus === 'trial' ? 'bg-blue-400 shadow-[0_0_5px_rgba(96,165,250,1)]' : tenant.subscriptionStatus === 'paused' ? 'bg-orange-400' : 'bg-rose-400'}`}></span>
                          {tenant.subscriptionStatus}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="text-zinc-900 dark:text-white ">
                          {tenant.subscriptionStatus === 'trial' ? 'FREE_TRIAL' : `PREM_${tenant.subscriptionType === 'annual' ? 'ANNUAL' : 'MONTHLY'}`}
                        </div>
                        <div className="text-[10px] text-zinc-900 dark:text-white ">
                          PHP {(tenant.pricePaid || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2 text-zinc-900 dark:text-white ">
                          <Users className="w-3.5 h-3.5 opacity-50" />
                          <span>{users.filter(u => u.tenantId === tenant.id).length} / {tenant.subscriptionStatus === 'trial' ? '0' : (tenant.userLimit || 0)}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="text-zinc-900 dark:text-white ">{format(new Date(tenant.createdAt), 'yyyy-MM-dd')}</div>
                        <div className="text-[10px] text-zinc-900 dark:text-white ">{format(new Date(tenant.createdAt), 'HH:mm:ss')}</div>
                      </td>
                      <td className="p-4">
                        <div className="text-zinc-900 dark:text-white ">
                          {tenant.expiresAt 
                            ? format(new Date(tenant.expiresAt), 'yyyy-MM-dd') 
                            : format(new Date(tenant.trialEndsAt), 'yyyy-MM-dd')}
                        </div>
                        <div className="text-[10px] text-zinc-900 dark:text-white ">
                          {tenant.expiresAt ? 'SYS_EXPIRE' : 'TRIAL_END'}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex justify-end gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                          
                          <button type="button" onClick={() => openUpdateModal(tenant)} className="p-3 sm:p-1.5 border border-indigo-800 text-indigo-400 hover:bg-indigo-900/50 hover:border-indigo-400 hover:shadow-[0_0_10px_rgba(129,140,248,0.5)] rounded transition-all" title="Modify Node Parameters">
                            <Settings2 className="w-3.5 h-3.5" />
                          </button>
                          {tenant.subscriptionStatus !== 'active' && (
                            <button type="button" onClick={() => handleUpdateStatus(tenant.id, 'active')} className="p-3 sm:p-1.5 border border-emerald-800 text-zinc-900 dark:text-white hover:bg-emerald-900/50 hover:border-emerald-400 hover:shadow-[0_0_10px_rgba(52,211,153,0.5)] rounded transition-all" title="Force Activate">
                              <Activity className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {tenant.subscriptionStatus === 'active' && (
                            <button type="button" onClick={() => handleUpdateStatus(tenant.id, 'paused')} className="p-3 sm:p-1.5 border border-amber-800 text-amber-400 hover:bg-amber-900/50 hover:border-amber-400 hover:shadow-[0_0_10px_rgba(251,191,36,0.5)] rounded transition-all" title="Halt Operations">
                              <Pause className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {tenant.subscriptionStatus !== 'terminated' && (
                            <button type="button" onClick={() => handleUpdateStatus(tenant.id, 'terminated')} className="p-3 sm:p-1.5 border border-rose-800 text-rose-400 hover:bg-rose-900/50 hover:border-rose-400 hover:shadow-[0_0_10px_rgba(244,63,94,0.5)] rounded transition-all" title="Purge Node">
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    );
                  })}
                  {filteredTenants.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-16 text-center">
                        <div className="flex flex-col items-center justify-center text-blue-800 dark:text-blue-300">
                          <Globe2 className="w-12 h-12 mb-4 opacity-50" />
                          <p className="font-mono text-sm tracking-widest uppercase">NO ACTIVE NODES DETECTED</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'announcements' && (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-blue-900/40 rounded-2xl shadow-[0_0_30px_rgba(0,0,0,0.5)] p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 pb-4 border-b border-zinc-200 dark:border-blue-900/40 gap-4">
              <div>
                <h2 className="text-xl font-black text-zinc-900 dark:text-white uppercase tracking-widest flex items-center gap-3">
                  <Radio className="w-6 h-6 text-zinc-900 dark:text-white animate-pulse" />
                  Global Broadcast Network
                </h2>
                <p className="text-xs font-mono text-zinc-900 dark:text-white mt-2 uppercase tracking-wider">Transmit emergency alerts or system updates to all active nodes.</p>
              </div>
              <button 
                onClick={() => setShowAnnounceModal(true)}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-50 dark:bg-blue-950 border border-blue-500 hover:bg-cyan-900 text-zinc-900 dark:text-white hover:text-zinc-900 dark:text-white rounded-lg shadow-[0_0_15px_rgba(34,211,238,0.2)] hover:shadow-[0_0_25px_rgba(34,211,238,0.4)] transition-all text-xs font-black uppercase tracking-[0.2em]"
              >
                <Plus className="w-4 h-4" />
                INITIATE BROADCAST
              </button>
            </div>

            <div className="space-y-4">
              {announcements.length === 0 ? (
                <div className="text-center py-20 border border-dashed border-zinc-200 dark:border-zinc-200 dark:border-zinc-800 rounded-xl bg-white/80 dark:bg-zinc-950/30">
                  <p className="font-mono text-zinc-900 dark:text-white tracking-widest uppercase text-sm">Communication channel is silent. No active broadcasts.</p>
                </div>
              ) : (
                announcements.map((ann) => (
                  <div key={ann.id} className={`p-5 rounded-xl border relative overflow-hidden group transition-all ${ann.active ? 'border-blue-500/50 bg-blue-50 dark:bg-blue-950/20 shadow-[inset_0_0_20px_rgba(34,211,238,0.05)]' : 'border-zinc-800 bg-white/80 dark:bg-zinc-950/50 opacity-60'}`}>
                    {ann.active && <div className="absolute left-0 top-0 w-1 h-full bg-blue-600 dark:bg-blue-500 shadow-[0_0_15px_rgba(34,211,238,1)]" />}
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <span className={`px-2.5 py-1 rounded border text-[10px] font-black uppercase tracking-[0.2em] shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]
                            ${ann.type === 'info' ? 'border-blue-500/50 text-zinc-900 dark:text-white bg-blue-50 dark:bg-blue-950/50' : ''}
                            ${ann.type === 'warning' ? 'border-amber-500/50 text-amber-400 bg-amber-950/50' : ''}
                            ${ann.type === 'success' ? 'border-emerald-500/50 text-zinc-900 dark:text-white bg-emerald-50 dark:bg-emerald-950/50' : ''}
                          `}>
                            {ann.type}
                          </span>
                          <h3 className="font-bold text-zinc-900 dark:text-white tracking-wide text-lg">{ann.title}</h3>
                        </div>
                        <p className="text-sm font-sans text-zinc-900 dark:text-white leading-relaxed max-w-3xl">{ann.message}</p>
                        <div className="flex items-center gap-4 text-[10px] text-zinc-900 dark:text-white font-mono">
                          <span>ID: {ann.id}</span>
                          <span>TIME: {format(new Date(ann.createdAt), 'yyyy-MM-dd HH:mm:ss')}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <button 
                          onClick={() => toggleAnnouncementActive(ann.id)}
                          className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all border ${ann.active ? 'border-zinc-200 dark:border-blue-800 text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900/30' : 'border-zinc-700 text-zinc-900 dark:text-white hover:bg-slate-100 dark:bg-slate-800'}`}
                        >
                          {ann.active ? 'SILENCE' : 'RE-BROADCAST'}
                        </button>
                        <button 
                          onClick={() => handleDeleteAnnouncement(ann.id)}
                          className="p-2 text-rose-500/50 hover:text-rose-400 border border-rose-900/30 hover:border-rose-500/50 hover:bg-rose-950/30 rounded-lg transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'requests' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800">
            <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-blue-500" />
              Subscription Requests
            </h3>
            <button
              onClick={handleManualSync}
              disabled={isSyncing}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-850 dark:text-zinc-200 text-xs font-bold rounded-xl border border-zinc-200 dark:border-zinc-700 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-indigo-500' : ''}`} />
              <span>{isSyncing ? 'Syncing...' : 'Sync & Refresh'}</span>
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {subRequests.map((req, idx) => (
              <div key={idx} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-3 relative flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-bold text-zinc-900 dark:text-white">{req.companyName}</h4>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      req.status === 'pending'
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                        : req.status === 'approved'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                          : 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'
                    }`}>
                      {req.status}
                    </span>
                  </div>
                  <div className="text-xs text-zinc-600 dark:text-zinc-400 space-y-1">
                    <p><strong>Name:</strong> {req.name}</p>
                    <p><strong>Address:</strong> {req.address}</p>
                    <p><strong>Phone:</strong> {req.contactNumber}</p>
                    <p><strong>Date:</strong> {new Date(req.createdAt).toLocaleDateString()}</p>
                    <p><strong>Plan:</strong> {req.plan === 'annual' ? 'Annual' : 'Monthly'} ({req.users} users)</p>
                    {req.paymentMethod && <p><strong>Payment Channel:</strong> {req.paymentMethod}</p>}
                    {req.referenceNumber && <p><strong>Ref / Transaction No:</strong> <span className="font-mono bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded text-indigo-600 dark:text-indigo-400 font-bold">{req.referenceNumber}</span></p>}
                    {req.paymentDate && <p><strong>Payment Date:</strong> {req.paymentDate}</p>}
                    {req.amountPaid !== undefined && <p><strong>Amount Paid:</strong> ₱{Number(req.amountPaid).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>}
                  </div>
                  {req.proofOfPaymentBase64 && (
                    <div className="mt-3 border border-zinc-200 dark:border-zinc-800 rounded-xl p-2 bg-zinc-50 dark:bg-zinc-950">
                      <p className="text-[10px] font-bold text-zinc-500 uppercase mb-2">Proof of Payment</p>
                      <img src={req.proofOfPaymentBase64} alt="Proof" className="max-h-32 object-contain rounded" />
                    </div>
                  )}
                </div>
                <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex gap-2 mt-4">
                  <a href="https://www.facebook.com/share/1BVqhwRTeW/" target="_blank" rel="noopener noreferrer" className="flex-1 text-center py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg text-xs font-bold transition-colors flex items-center justify-center dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-blue-400">
                    Reply via FB Page
                  </a>
                  {req.status === 'pending' && (
                    <>
                      <button 
                        type="button"
                        onClick={() => handleApproveSubscription(req)}
                        className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-md hover:shadow-emerald-500/20"
                      >
                        Approve & Subscribe
                      </button>
                      <button 
                        type="button"
                        onClick={() => handleDeclineSubscription(req)}
                        className="py-2 px-3 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-500 rounded-lg text-xs font-bold transition-all"
                      >
                        Decline
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
            
            {subRequests.length === 0 && (
              <div className="col-span-full py-12 text-center text-zinc-500 text-sm">
                No subscription requests found.
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'system' && (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-blue-900/40 rounded-2xl shadow-[0_0_30px_rgba(0,0,0,0.5)] p-6 md:p-8 space-y-8">
            <div className="border-b border-zinc-200 dark:border-blue-900/40 pb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-zinc-900 dark:text-white uppercase tracking-widest flex items-center gap-3">
                  <Cpu className="w-6 h-6 text-zinc-900 dark:text-white " />
                  CORE SYSTEM ARCHITECTURE
                </h2>
                <p className="text-xs font-mono text-zinc-900 dark:text-white mt-2 uppercase tracking-wider">Master overrides and environmental diagnostics.</p>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 rounded-lg">
                <CheckCircle className="w-4 h-4 text-zinc-900 dark:text-white " />
                <span className="text-[10px] font-mono text-zinc-900 dark:text-white uppercase tracking-widest">System Nominal</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="bg-white/80 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-600/10 rounded-full" />
                  <h3 className="text-xs font-black text-zinc-900 dark:text-white mb-4 uppercase tracking-[0.2em] flex items-center gap-2">
                    <FileCheck2 className="w-4 h-4" />
                    Render Engine Configuration
                  </h3>
                  <div className="space-y-4 font-mono text-xs">
                    <div className="flex justify-between items-center border-b border-zinc-200 dark:border-zinc-800 pb-2">
                      <span className="text-zinc-900 dark:text-white ">ENGINE_VERSION</span>
                      <span className="text-zinc-900 dark:text-white ">v2.4.1 (Native HTML-to-PDF)</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-zinc-200 dark:border-zinc-800 pb-2">
                      <span className="text-zinc-900 dark:text-white ">TEMPLATE_INJECTION</span>
                      <span className="text-amber-400">DISABLED (Strict Mode)</span>
                    </div>
                    <div className="flex justify-between items-center pb-2">
                      <span className="text-zinc-900 dark:text-white ">AUTO_MAPPING</span>
                      <span className="text-zinc-900 dark:text-white ">ACTIVE</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white/80 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 relative overflow-hidden">
                   <h3 className="text-xs font-black text-zinc-900 dark:text-white mb-4 uppercase tracking-[0.2em] flex items-center gap-2">
                    <Database className="w-4 h-4" />
                    Data Grid Status
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl">
                      <div className="text-[10px] font-mono text-zinc-900 dark:text-white uppercase mb-2">Primary Store</div>
                      <div className="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-wide">Firestore DB</div>
                    </div>
                    <div className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl">
                      <div className="text-[10px] font-mono text-zinc-900 dark:text-white uppercase mb-2">Replication</div>
                      <div className="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-wide">Multi-Region</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-500/30 rounded-2xl p-6 shadow-[inset_0_0_30px_rgba(34,211,238,0.05)] flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-black text-zinc-900 dark:text-white mb-4 uppercase tracking-[0.2em] flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4" />
                    Security Protocols
                  </h3>
                  <ul className="space-y-4 font-mono text-xs text-zinc-900 dark:text-white ">
                    <li className="flex items-start gap-3">
                      <span className="text-blue-500 mt-0.5">[{'>'}]</span>
                      <span>Electron binary compilation sequence uses strict code signing for generated `.exe` packages.</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-blue-500 mt-0.5">[{'>'}]</span>
                      <span>Cross-tenant data pollution prevention is strictly enforced at the Firestore Security Rules layer.</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-blue-500 mt-0.5">[{'>'}]</span>
                      <span>External API key exposure is zero. All third-party communication proxies through the embedded Express node.</span>
                    </li>
                  </ul>
                </div>
                
                <div className="mt-8 p-4 bg-white/80 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-200 dark:border-zinc-800 rounded-xl flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full border-2 border-blue-500 border-t-transparent animate-spin shrink-0" />
                  <div>
                    <div className="text-[10px] font-mono text-blue-500 uppercase tracking-widest mb-1">Background Worker</div>
                    <div className="text-xs font-sans font-bold text-zinc-900 dark:text-white ">Monitoring System Telemetry...</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'credentials' && (
          <div className="space-y-8">
            {/* Password Reset Requests Section */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-blue-900/40 rounded-2xl shadow-[0_0_30px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col">
              <div className="p-5 border-b border-zinc-200 dark:border-blue-900/40 bg-white/80 dark:bg-zinc-950/50 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-amber-500 animate-pulse" />
                    Pending Password Reset Requests
                  </h2>
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono mt-0.5 uppercase">Direct emergency password reset signals received from user terminal</p>
                </div>
                <span className="text-[10px] font-mono bg-amber-500/10 text-amber-500 px-2.5 py-1 rounded-full border border-amber-500/20 font-bold">
                  {resetRequests.filter(r => r.status === 'pending').length} SIGNAL(S) ACTIVE
                </span>
              </div>

              <div className="p-4 bg-zinc-50/50 dark:bg-zinc-950/20">
                {resetRequests.length === 0 ? (
                  <div className="p-8 text-center text-zinc-400 dark:text-zinc-500 italic space-y-1">
                    <div className="text-xl">🛡️</div>
                    <p className="text-xs font-semibold uppercase tracking-wider">No Pending Requests</p>
                    <p className="text-[10px] font-mono">All user login credentials are fully synced and nominal.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse font-sans text-xs">
                      <thead>
                        <tr className="border-b border-zinc-200 dark:border-zinc-800 text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                          <th className="py-3 px-4 font-mono">Request Date</th>
                          <th className="py-3 px-4">Company Name</th>
                          <th className="py-3 px-4">User Email (Gmail)</th>
                          <th className="py-3 px-4 font-mono">Request ID</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                        {resetRequests.map(req => {
                          // Find corresponding user in system to easily pre-populate or fetch current password
                          const matchedUser = localUsers.find(u => u.email.toLowerCase() === req.email.toLowerCase());
                          return (
                            <tr key={req.id} className="hover:bg-zinc-100/50 dark:hover:bg-zinc-950/40 transition-colors">
                              <td className="py-3.5 px-4 font-mono font-semibold text-zinc-900 dark:text-white">
                                {format(new Date(req.createdAt), 'yyyy-MM-dd HH:mm:ss')}
                              </td>
                              <td className="py-3.5 px-4 font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
                                {req.companyName}
                              </td>
                              <td className="py-3.5 px-4 font-bold text-blue-500 font-mono">
                                {req.email}
                              </td>
                              <td className="py-3.5 px-4 font-mono text-zinc-400 text-[10px]">
                                {req.id}
                              </td>
                              <td className="py-3.5 px-4">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-mono font-bold border uppercase ${
                                  req.status === 'pending'
                                    ? 'bg-amber-500/10 text-amber-500 border-amber-500/20 animate-pulse'
                                    : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                                }`}>
                                  <span className={`w-1 h-1 rounded-full ${req.status === 'pending' ? 'bg-amber-500' : 'bg-emerald-500'}`}></span>
                                  {req.status}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  {matchedUser ? (
                                    <button
                                      onClick={() => handleOpenPassModal(matchedUser)}
                                      className="px-3 py-1.5 bg-blue-600 dark:bg-blue-500 hover:bg-blue-500 text-zinc-950 font-black text-[10px] rounded uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-[0_0_10px_rgba(34,211,238,0.2)]"
                                    >
                                      <Key className="w-3.5 h-3.5 text-zinc-950" />
                                      Override Pass
                                    </button>
                                  ) : (
                                    <span className="text-[10px] text-rose-500 font-mono italic">User not found</span>
                                  )}
                                  <button
                                    onClick={() => handleRejectResetRequest(req.id)}
                                    className="p-1.5 text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 rounded transition-all"
                                    title="Dismiss request"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Registered Users Credentials Terminal */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-blue-900/40 rounded-2xl shadow-[0_0_30px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col">
              <div className="p-5 border-b border-zinc-200 dark:border-blue-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/80 dark:bg-zinc-950/50">
                <div>
                  <h2 className="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
                    <Database className="w-5 h-5 text-blue-500" />
                    Security Credentials Command Center
                  </h2>
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono mt-0.5 uppercase">Live database of active tenant users, login keys, and plain-text credentials</p>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-900 dark:text-white" />
                  <input
                    type="text"
                    placeholder="Filter credentials database..."
                    value={credentialsSearch}
                    onChange={(e) => setCredentialsSearch(e.target.value)}
                    className="pl-9 pr-4 py-2 w-full sm:w-72 bg-white/80 dark:bg-zinc-950/80 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:ring-1 focus:ring-blue-500 text-xs font-mono text-zinc-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="overflow-x-auto p-4 bg-zinc-50/50 dark:bg-zinc-950/20">
                <table className="w-full text-left border-collapse font-sans text-xs">
                  <thead>
                    <tr className="border-b border-zinc-200 dark:border-zinc-800 text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                      <th className="py-3 px-4">User Name</th>
                      <th className="py-3 px-4">Registered Email / Gmail</th>
                      <th className="py-3 px-4">Associated Company (Tenant)</th>
                      <th className="py-3 px-4">Account Role</th>
                      <th className="py-3 px-4 font-mono">Plain-Text Password</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                    {localUsers
                      .filter(user => {
                        const s = credentialsSearch.toLowerCase();
                        if (!s) return true;
                        const tenantName = tenants.find(t => t.id === user.tenantId)?.name || '';
                        return (
                          user.name.toLowerCase().includes(s) ||
                          user.email.toLowerCase().includes(s) ||
                          user.role.toLowerCase().includes(s) ||
                          tenantName.toLowerCase().includes(s)
                        );
                      })
                      .map(user => {
                        const matchedTenant = tenants.find(t => t.id === user.tenantId);
                        const isPassRevealed = !!revealedPassUsers[user.id];
                        return (
                          <tr key={user.id} className="hover:bg-zinc-100/50 dark:hover:bg-zinc-950/40 transition-colors">
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-blue-600/10 border border-blue-500/20 text-blue-500 flex items-center justify-center font-bold text-xs uppercase">
                                  {user.name.slice(0, 2)}
                                </div>
                                <div>
                                  <div className="font-bold text-zinc-900 dark:text-white uppercase tracking-wider">{user.name}</div>
                                  <div className="text-[9px] font-mono text-zinc-400 uppercase">UID: {user.id}</div>
                                </div>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 font-bold text-zinc-900 dark:text-white font-mono">
                              {user.email}
                            </td>
                            <td className="py-3.5 px-4 font-bold text-cyan-500 uppercase tracking-wider">
                              {matchedTenant ? matchedTenant.name : 'STRATIFY GLOBAL'}
                            </td>
                            <td className="py-3.5 px-4">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-mono font-bold border uppercase ${
                                user.role === 'superadmin'
                                  ? 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                                  : user.role === 'admin'
                                    ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                    : 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                              }`}>
                                {user.role}
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-2 font-mono">
                                <span className={`font-semibold tracking-widest text-sm ${isPassRevealed ? 'text-zinc-900 dark:text-white select-all tracking-normal text-xs' : 'text-zinc-400'}`}>
                                  {isPassRevealed ? user.password : '••••••••'}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setRevealedPassUsers(prev => ({ ...prev, [user.id]: !prev[user.id] }))}
                                  className="text-zinc-500 hover:text-white transition-all p-1 hover:bg-zinc-800 rounded"
                                >
                                  {isPassRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                </button>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <button
                                onClick={() => handleOpenPassModal(user)}
                                className="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-zinc-900 dark:text-white hover:text-blue-500 font-bold text-[10px] rounded uppercase tracking-wider border border-zinc-200 dark:border-zinc-750 transition-all flex items-center gap-1 ml-auto"
                              >
                                <Edit3 className="w-3 h-3 text-blue-500" />
                                Edit Pass
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Modals with matching dark neon theme */}
      {isUpdateModalOpen && selectedTenant && (
        <div className="fixed inset-0 bg-white/80 dark:bg-zinc-950/95 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-blue-500/50 rounded-2xl w-full max-w-lg p-6 shadow-[0_0_50px_rgba(34,211,238,0.15)]">
            <h2 className="text-xl font-black text-zinc-900 dark:text-white uppercase tracking-widest mb-1">Modify Node Parameters</h2>
            <p className="text-xs font-mono text-zinc-900 dark:text-white mb-6 uppercase">Target ID: {selectedTenant.id}</p>
            
            <div className="space-y-6 mb-8">
              <div>
                <label className="block text-[10px] font-black text-zinc-900 dark:text-white mb-2 uppercase tracking-[0.2em]">Lifecycle Extension</label>
                <input 
                  type="date"
                  value={updateDate}
                  onChange={(e) => setUpdateDate(e.target.value)}
                  className="w-full px-4 py-3 bg-white/80 dark:bg-zinc-950 border border-zinc-200 dark:border-blue-900 focus:border-blue-500 rounded-lg text-zinc-900 dark:text-white font-mono text-sm outline-none transition-all shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]"
                />
                <div className="flex gap-2 mt-3">
                  <button 
                    onClick={() => setUpdateDate(new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().slice(0, 10))}
                    className="px-3 py-1.5 bg-blue-50 dark:bg-blue-950 border border-zinc-200 dark:border-blue-900 hover:border-blue-500 text-zinc-900 dark:text-white rounded transition-all text-xs font-mono font-bold uppercase"
                  >
                    +30 DAYS
                  </button>
                  <button 
                    onClick={() => setUpdateDate(new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().slice(0, 10))}
                    className="px-3 py-1.5 bg-blue-50 dark:bg-blue-950 border border-zinc-200 dark:border-blue-900 hover:border-blue-500 text-zinc-900 dark:text-white rounded transition-all text-xs font-mono font-bold uppercase"
                  >
                    +365 DAYS
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-zinc-900 dark:text-white mb-3 uppercase tracking-[0.2em]">Feature Provisioning</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: 'payroll', label: 'PAYROLL_SYS' },
                    { key: 'inventory', label: 'INV_TRACKER' },
                    { key: 'ecommerce', label: 'ECOM_BRIDGE' },
                    { key: 'fixedAssets', label: 'ASSET_MGR' }
                  ].map(mod => (
                    <label key={mod.key} className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all ${editModules[mod.key as keyof typeof editModules] !== false ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30' : 'border-zinc-800 bg-white/80 dark:bg-zinc-950 hover:border-zinc-200 dark:border-blue-900'}`}>
                      <input 
                        type="checkbox" 
                        checked={editModules[mod.key as keyof typeof editModules] ?? true}
                        onChange={(e) => setEditModules(prev => ({ ...prev, [mod.key]: e.target.checked }))}
                        className="hidden"
                      />
                      <div className={`w-4 h-4 rounded-sm border flex items-center justify-center ${editModules[mod.key as keyof typeof editModules] !== false ? 'border-cyan-400 bg-blue-600 dark:bg-blue-500' : 'border-zinc-700 bg-transparent'}`}>
                        {editModules[mod.key as keyof typeof editModules] !== false && <CheckCircle className="w-3 h-3 text-zinc-950" />}
                      </div>
                      <span className={`text-xs font-mono font-bold ${editModules[mod.key as keyof typeof editModules] !== false ? 'text-zinc-900 dark:text-white ' : 'text-zinc-900 dark:text-white '}`}>{mod.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-zinc-200 dark:border-zinc-800">
              <button 
                onClick={() => setIsUpdateModalOpen(false)}
                className="px-6 py-2 text-xs font-black text-zinc-900 dark:text-white hover:text-zinc-900 dark:text-white uppercase tracking-widest transition-colors"
              >
                ABORT
              </button>
              <button 
                onClick={handleSaveUpdate}
                className="px-6 py-2 text-xs font-black bg-blue-600 dark:bg-blue-500 hover:bg-blue-500 text-zinc-950 rounded-lg shadow-[0_0_15px_rgba(34,211,238,0.5)] transition-all uppercase tracking-widest"
              >
                COMMIT CHANGES
              </button>
            </div>
          </div>
        </div>
      )}

      {showAnnounceModal && (
        <div className="fixed inset-0 bg-white/80 dark:bg-zinc-950/95 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-blue-500/50 rounded-2xl w-full max-w-md p-6 shadow-[0_0_50px_rgba(34,211,238,0.15)]">
            <h2 className="text-xl font-black text-zinc-900 dark:text-white uppercase tracking-widest mb-6">Initialize Broadcast</h2>
            <div className="space-y-5 mb-8">
              <div>
                <label className="block text-[10px] font-black text-zinc-900 dark:text-white mb-2 uppercase tracking-[0.2em]">Signal Header</label>
                <input 
                  type="text"
                  value={newAnnouncement.title}
                  onChange={(e) => setNewAnnouncement({...newAnnouncement, title: e.target.value})}
                  className="w-full px-4 py-3 bg-white/80 dark:bg-zinc-950 border border-zinc-200 dark:border-blue-900 focus:border-blue-500 rounded-lg text-zinc-900 dark:text-white font-mono text-sm outline-none transition-all"
                  placeholder="e.g. MAINTENANCE_WINDOW"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-zinc-900 dark:text-white mb-2 uppercase tracking-[0.2em]">Severity Level</label>
                <select
                  value={newAnnouncement.type}
                  onChange={(e) => setNewAnnouncement({...newAnnouncement, type: e.target.value as any})}
                  className="w-full px-4 py-3 bg-white/80 dark:bg-zinc-950 border border-zinc-200 dark:border-blue-900 focus:border-blue-500 rounded-lg text-zinc-900 dark:text-white font-mono text-sm outline-none uppercase tracking-wider"
                >
                  <option value="info">STANDARD (INFO)</option>
                  <option value="warning">ELEVATED (WARNING)</option>
                  <option value="success">RESOLVED (SUCCESS)</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black text-zinc-900 dark:text-white mb-2 uppercase tracking-[0.2em]">Payload Message</label>
                <textarea 
                  value={newAnnouncement.message}
                  onChange={(e) => setNewAnnouncement({...newAnnouncement, message: e.target.value})}
                  className="w-full px-4 py-3 bg-white/80 dark:bg-zinc-950 border border-zinc-200 dark:border-blue-900 focus:border-blue-500 rounded-lg text-zinc-900 dark:text-white font-mono text-sm outline-none h-32 resize-none"
                  placeholder="Enter transmission payload..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-6 border-t border-zinc-200 dark:border-zinc-800">
              <button 
                onClick={() => setShowAnnounceModal(false)}
                className="px-6 py-2 text-xs font-black text-zinc-900 dark:text-white hover:text-zinc-900 dark:text-white uppercase tracking-widest transition-colors"
              >
                ABORT
              </button>
              <button 
                onClick={handleAddAnnouncement}
                className="px-6 py-2 text-xs font-black bg-blue-600 dark:bg-blue-500 hover:bg-blue-500 text-zinc-950 rounded-lg shadow-[0_0_15px_rgba(34,211,238,0.5)] transition-all uppercase tracking-widest flex items-center gap-2"
              >
                <Radio className="w-4 h-4" />
                TRANSMIT
              </button>
            </div>
          </div>
        </div>
      )}

      {isPassModalOpen && passTargetUser && (
        <div className="fixed inset-0 bg-white/85 dark:bg-zinc-950/95 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 border border-blue-500/50 rounded-2xl w-full max-w-md p-6 shadow-[0_0_50px_rgba(34,211,238,0.25)] relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-600 via-cyan-400 to-indigo-600" />
            
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-600/10 text-blue-500 rounded-xl">
                <Lock className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <h2 className="text-lg font-black text-zinc-900 dark:text-white uppercase tracking-widest">Override User Credentials</h2>
                <p className="text-[10px] font-mono text-zinc-400 uppercase">Target user: {passTargetUser.name}</p>
              </div>
            </div>

            <div className="space-y-4 mb-6">
              <div className="p-3 bg-zinc-100 dark:bg-zinc-950/40 rounded-xl border border-zinc-200 dark:border-zinc-800/80 font-mono text-xs">
                <div className="flex justify-between py-1 border-b border-zinc-200 dark:border-zinc-800/40">
                  <span className="text-zinc-500">USER_EMAIL:</span>
                  <span className="font-bold text-zinc-900 dark:text-white">{passTargetUser.email}</span>
                </div>
                <div className="flex justify-between py-1 mt-1">
                  <span className="text-zinc-500">CURRENT_PASS:</span>
                  <span className="font-bold text-amber-500 select-all">{passTargetUser.password}</span>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-zinc-900 dark:text-white mb-2 uppercase tracking-[0.2em] flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-blue-500" />
                  Define New Password
                </label>
                <input 
                  type="text"
                  value={passNewPassword}
                  onChange={(e) => setPassNewPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-100 dark:bg-zinc-950/80 border border-zinc-200 dark:border-zinc-850 focus:border-blue-500 rounded-lg text-zinc-900 dark:text-white font-mono text-sm outline-none transition-all"
                  placeholder="Minimum 6 characters"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-rose-500 mb-2 uppercase tracking-[0.2em] flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-rose-500" />
                  Verify Super Admin Password
                </label>
                <input 
                  type="password"
                  value={passAdminVerify}
                  onChange={(e) => setPassAdminVerify(e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-100 dark:bg-zinc-950/80 border border-zinc-200 dark:border-zinc-850 focus:border-rose-500 rounded-lg text-zinc-900 dark:text-white font-mono text-sm outline-none transition-all"
                  placeholder="Enter super admin password"
                />
              </div>

              {passModalError && (
                <div className="p-3 bg-rose-950/50 border border-rose-500/30 text-rose-400 font-bold font-mono text-[10px] rounded-lg">
                  ⚠ {passModalError.toUpperCase()}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
              <button 
                type="button"
                onClick={() => setIsPassModalOpen(false)}
                className="px-5 py-2 text-xs font-black text-zinc-900 dark:text-white hover:text-rose-500 uppercase tracking-widest transition-colors"
              >
                Cancel
              </button>
              <button 
                type="button"
                onClick={handleCommitPasswordChange}
                className="px-5 py-2 text-xs font-black bg-blue-600 dark:bg-blue-500 hover:bg-blue-500 text-zinc-950 rounded-lg shadow-[0_0_15px_rgba(34,211,238,0.4)] transition-all uppercase tracking-widest"
              >
                Commit Pass Override
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-4 right-4 z-50 p-4 rounded-xl shadow-lg border text-xs font-bold font-sans uppercase tracking-wider flex items-center gap-2 ${
          toast.type === 'success'
            ? 'bg-emerald-950/90 text-emerald-400 border-emerald-500/30'
            : 'bg-rose-950/90 text-rose-400 border-rose-500/30'
        }`}>
          <span className={`w-2 h-2 rounded-full ${toast.type === 'success' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400 animate-pulse'}`}></span>
          {toast.message}
        </div>
      )}
    </div>
  );
};
