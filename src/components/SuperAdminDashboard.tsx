import React, { useState, useEffect } from 'react';
import { ShieldAlert, LogOut, CheckCircle, Search, Edit3, Save, XCircle, Users, Activity, Play, Pause, MoreVertical, CreditCard, LayoutDashboard, Megaphone, Plus, Trash2, Home, Building2, Settings } from 'lucide-react';
import { Tenant, User, SystemAnnouncement } from '../types';
import { format } from 'date-fns';

interface SuperAdminDashboardProps {
  tenants: Tenant[];
  setTenants: React.Dispatch<React.SetStateAction<Tenant[]>>;
  users: User[];
  onLogout: () => void;
}

export const SuperAdminDashboard: React.FC<SuperAdminDashboardProps> = ({ tenants, setTenants, users, onLogout }) => {
  const [activeTab, setActiveTab] = useState<'home' | 'tenants' | 'users' | 'announcements'>('home');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Announcements State
  const [announcements, setAnnouncements] = useState<SystemAnnouncement[]>([]);
  const [showAnnounceModal, setShowAnnounceModal] = useState(false);
  const [newAnnouncement, setNewAnnouncement] = useState<Partial<SystemAnnouncement>>({ title: '', message: '', type: 'info' });

  // Subscription Update Modal State
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [updateDate, setUpdateDate] = useState<string>('');
  const [editModules, setEditModules] = useState<{ payroll?: boolean; inventory?: boolean; ecommerce?: boolean; fixedAssets?: boolean }>({});

  useEffect(() => {
    const saved = localStorage.getItem('stratify_announcements');
    if (saved) setAnnouncements(JSON.parse(saved));

    // PWA Install Prompt for Super Admin
    const promptEvent = (window as any).deferredPrompt;
    if (promptEvent) {
      setTimeout(() => {
        promptEvent.prompt();
        promptEvent.userChoice.then((choiceResult: any) => {
          if (choiceResult.outcome === 'accepted') {
            console.log('User accepted the A2HS prompt');
          }
          (window as any).deferredPrompt = null;
        });
      }, 1000); // Small delay to let UI load
    }
  }, []);

  const saveAnnouncements = (data: SystemAnnouncement[]) => {
    setAnnouncements(data);
    localStorage.setItem('stratify_announcements', JSON.stringify(data));
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
    if(!confirm('Are you sure you want to delete this announcement?')) return;
    saveAnnouncements(announcements.filter(a => a.id !== id));
  };

  const toggleAnnouncementActive = (id: string) => {
    saveAnnouncements(announcements.map(a => a.id === id ? { ...a, active: !a.active } : a));
  };

  const openUpdateModal = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setUpdateDate(tenant.expiresAt ? new Date(tenant.expiresAt).toISOString().slice(0, 10) : new Date(tenant.trialEndsAt).toISOString().slice(0, 10));
    setEditModules(tenant.modules || { payroll: true, inventory: true, ecommerce: true, fixedAssets: true });
    setIsUpdateModalOpen(true);
  };

  const handleSaveUpdate = () => {
    if (selectedTenant && updateDate) {
      setTenants(tenants.map(t => t.id === selectedTenant.id ? { 
        ...t, 
        subscriptionStatus: 'active',
        expiresAt: new Date(updateDate).toISOString(),
        modules: editModules
      } : t));
      setIsUpdateModalOpen(false);
    }
  };

  const handleUpdateStatus = (id: string, status: 'active' | 'paused' | 'terminated') => {
    if (!confirm(`Are you sure you want to change this tenant's status to ${status}?`)) return;
    setTenants(tenants.map(t => t.id === id ? { ...t, subscriptionStatus: status } : t));
  };

  const filteredTenants = tenants.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || t.subscriptionStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const activeTenantsCount = tenants.filter(t => ['active', 'trial'].includes(t.subscriptionStatus)).length;
  const mrr = tenants.filter(t => t.subscriptionStatus === 'active').reduce((sum, t) => {
    return sum + (t.pricePaid || 0); // basic MRR calc for display
  }, 0);

  return (
    <div className="h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col font-sans text-zinc-900 dark:text-zinc-100 overflow-hidden relative">
      <div className="w-full bg-white dark:bg-zinc-950 flex flex-col h-full relative">
        {/* Universal Header */}
        <header className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 px-4 py-3 flex items-center justify-between shrink-0 shadow-sm z-10 md:px-6 md:py-4">
          <div className="flex items-center gap-8">
            <h1 className="text-xl font-black uppercase tracking-tight text-[#2f6ce6] dark:text-[#4b88f8]">Admin</h1>
            <nav className="hidden md:flex items-center gap-2">
              <button onClick={() => setActiveTab('home')} className={`px-3 py-2 rounded-lg text-sm font-bold transition-colors ${activeTab === 'home' ? 'bg-indigo-50 text-[#2f6ce6] dark:bg-indigo-900/30 dark:text-indigo-400' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'}`}>Home</button>
              <button onClick={() => setActiveTab('tenants')} className={`px-3 py-2 rounded-lg text-sm font-bold transition-colors ${activeTab === 'tenants' ? 'bg-indigo-50 text-[#2f6ce6] dark:bg-indigo-900/30 dark:text-indigo-400' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'}`}>Tenants</button>
              <button onClick={() => setActiveTab('users')} className={`px-3 py-2 rounded-lg text-sm font-bold transition-colors ${activeTab === 'users' ? 'bg-indigo-50 text-[#2f6ce6] dark:bg-indigo-900/30 dark:text-indigo-400' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'}`}>Users</button>
              <button onClick={() => setActiveTab('announcements')} className={`px-3 py-2 rounded-lg text-sm font-bold transition-colors ${activeTab === 'announcements' ? 'bg-indigo-50 text-[#2f6ce6] dark:bg-indigo-900/30 dark:text-indigo-400' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'}`}>Announcements</button>
            </nav>
          </div>
          <div className="flex items-center gap-3 md:gap-4">
            <button className="p-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">
              <Search className="w-5 h-5" />
            </button>
            <button onClick={onLogout} className="p-1.5 md:px-3 md:py-1.5 rounded-full md:rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors flex items-center gap-2">
              <LogOut className="w-5 h-5 md:w-4 md:h-4" />
              <span className="hidden md:inline text-sm font-bold">Sign Out</span>
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto overflow-x-hidden p-2 md:p-6 pb-20 md:pb-6 bg-zinc-50 dark:bg-zinc-950">
          <div className="space-y-4 max-w-7xl mx-auto">
            {(activeTab === 'home') && (
            <>
              {/* GLOBAL METRICS */}
              <section>
                <h2 className="text-lg font-black uppercase tracking-tight text-zinc-900 dark:text-zinc-100 mb-3">Global Metrics</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-xl shadow-sm flex flex-col justify-between h-[100px]">
                    <div className="text-[10px] font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">Total MRR</div>
                    <div className="flex items-end justify-between">
                      <div className="text-2xl font-black">₱{(mrr).toLocaleString()}</div>
                      <Activity className="w-8 h-8 text-emerald-500 opacity-80 -mb-1 -mr-1" />
                    </div>
                  </div>
                  <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-xl shadow-sm flex flex-col justify-between h-[100px]">
                    <div className="text-[10px] font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">Active Tenants</div>
                    <div className="text-2xl font-black mt-auto">{activeTenantsCount}</div>
                  </div>
                  <div className="col-span-2 md:col-span-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-xl shadow-sm flex flex-col justify-between h-[100px]">
                    <div className="text-[10px] font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">Global Users</div>
                    <div className="text-2xl font-black mt-auto">{users.length}</div>
                  </div>
                </div>
              </section>

              {/* SYSTEM ANNOUNCEMENTS */}
              <section>
                <h2 className="text-lg font-black uppercase tracking-tight text-zinc-900 dark:text-zinc-100 mb-3">System Announcements</h2>
                
                {announcements.length > 0 && (
                  <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-sm flex flex-col relative mb-4">
                     <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider self-start mb-3
                        ${announcements[0].type === 'info' ? 'bg-blue-100 text-blue-700' : ''}
                        ${announcements[0].type === 'warning' ? 'bg-amber-100 text-amber-700' : ''}
                        ${announcements[0].type === 'success' ? 'bg-emerald-100 text-emerald-700' : ''}
                      `}>
                        {announcements[0].type}
                     </span>
                     
                     <button onClick={() => setShowAnnounceModal(true)} className="absolute top-4 right-4 bg-[#2f6ce6] hover:bg-blue-700 text-white rounded-lg px-3 py-1.5 flex items-center justify-center shadow-md text-[10px] font-bold leading-tight">
                       <Plus className="w-3.5 h-3.5 mr-1" />
                       <div className="text-left">
                         <div>NEW</div>
                         <div>BROADCAST</div>
                       </div>
                     </button>
                     
                     <h3 className="font-black text-sm uppercase tracking-tight text-zinc-900 dark:text-zinc-100 pr-24 leading-tight mb-2">{announcements[0].title}</h3>
                     <p className="text-xs text-zinc-800 dark:text-zinc-300 leading-relaxed line-clamp-4">{announcements[0].message}</p>
                  </div>
                )}
                
                <div className="space-y-4 mt-2 px-1">
                   {announcements.slice(announcements.length > 0 ? 1 : 0).map(ann => (
                      <div key={ann.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-4 last:border-0">
                         <div className="flex flex-col gap-1">
                           <div className="flex items-center gap-2">
                             <span className="bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider">Broadcast</span>
                             <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100">{ann.title}</span>
                           </div>
                           <span className="text-xs text-zinc-500">{format(new Date(ann.createdAt), 'MMM dd, yyyy hh:mm a')}</span>
                         </div>
                         <div className="flex items-center gap-2 self-end sm:self-auto shrink-0 mt-2 sm:mt-0">
                           <button onClick={() => toggleAnnouncementActive(ann.id)} className="bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 px-3 py-1.5 rounded text-xs font-bold transition-colors shadow-sm">{ann.active ? 'Deactivate' : 'Reactivate'}</button>
                           <button onClick={() => handleDeleteAnnouncement(ann.id)} className="text-rose-500 hover:text-rose-600 p-1.5">
                             <Trash2 className="w-5 h-5" />
                           </button>
                         </div>
                      </div>
                   ))}
                </div>
              </section>
            </>
          )}

          {activeTab === 'tenants' && (
            <div className="space-y-4">
              <h2 className="text-lg font-black uppercase tracking-tight text-zinc-900 dark:text-zinc-100">Tenants Management</h2>
              {/* the mobile tenant list */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <input 
                    type="text" 
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 pr-3 py-2 w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:ring-1 focus:ring-indigo-500 text-[10px]"
                  />
                </div>
                <select 
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-2 py-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-[10px] focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="all">All</option>
                  <option value="trial">Trial</option>
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="terminated">Term.</option>
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredTenants.length === 0 ? (
                  <div className="col-span-full p-8 text-center flex flex-col items-center justify-center text-zinc-400 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg">
                    <Search className="w-6 h-6 mb-2 opacity-20" />
                    <p className="font-medium text-zinc-500 text-xs">No tenants found.</p>
                  </div>
                ) : (
                  filteredTenants.map(tenant => {
                    const isExpiringSoon = tenant.subscriptionStatus === 'trial' && new Date(tenant.trialEndsAt).getTime() - new Date().getTime() < 3 * 24 * 60 * 60 * 1000;
                    return (
                      <div key={tenant.id} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded p-3 flex flex-col gap-2 shadow-sm">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-sm shrink-0 text-[10px]">
                              {tenant.name.substring(0,2).toUpperCase()}
                            </div>
                            <div className="font-bold text-xs text-zinc-900 dark:text-zinc-100 leading-tight truncate max-w-[140px]">{tenant.name}</div>
                          </div>
                          <span className={`
                            inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider
                            ${tenant.subscriptionStatus === 'active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : ''}
                            ${tenant.subscriptionStatus === 'trial' ? isExpiringSoon ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : ''}
                            ${tenant.subscriptionStatus === 'paused' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : ''}
                            ${tenant.subscriptionStatus === 'terminated' || tenant.subscriptionStatus === 'expired' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' : ''}
                          `}>
                            {tenant.subscriptionStatus}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-zinc-500 dark:text-zinc-400">
                          <div className="flex items-center gap-1">
                            <span className="font-semibold text-zinc-700 dark:text-zinc-300">{tenant.subscriptionStatus === 'trial' ? 'Trial' : `Premium`}</span>
                            <span>•</span>
                            <Users className="w-3 h-3" />
                            <span>{users.filter(u => u.tenantId === tenant.id).length}/{tenant.subscriptionStatus === 'trial' ? '0' : (tenant.userLimit || 0)}</span>
                          </div>
                          <div>Exp: {tenant.expiresAt ? format(new Date(tenant.expiresAt), 'MMM dd') : format(new Date(tenant.trialEndsAt), 'MMM dd')}</div>
                        </div>

                        <div className="flex items-center justify-end gap-1.5 mt-1">
                          <button onClick={() => openUpdateModal(tenant)} className="flex-1 justify-center flex items-center gap-1 px-2 py-1.5 text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 rounded transition-colors font-bold text-[10px]" title="Manage">
                            <CheckCircle className="w-3 h-3" />
                            Manage
                          </button>
                          {tenant.subscriptionStatus !== 'active' && (
                            <button onClick={() => handleUpdateStatus(tenant.id, 'active')} className="p-1.5 text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 rounded transition-colors" title="Activate">
                              <Play className="w-3 h-3" />
                            </button>
                          )}
                          {tenant.subscriptionStatus === 'active' && (
                            <button onClick={() => handleUpdateStatus(tenant.id, 'paused')} className="p-1.5 text-amber-600 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/40 rounded transition-colors" title="Pause">
                              <Pause className="w-3 h-3" />
                            </button>
                          )}
                          {tenant.subscriptionStatus !== 'terminated' && (
                            <button onClick={() => handleUpdateStatus(tenant.id, 'terminated')} className="p-1.5 text-rose-600 bg-rose-50 dark:bg-rose-900/20 hover:bg-rose-100 dark:hover:bg-rose-900/40 rounded transition-colors" title="Terminate">
                              <XCircle className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-black uppercase tracking-tight text-zinc-900 dark:text-zinc-100">Global Users</h2>
                <div className="text-xs font-medium text-zinc-500">{users.length} Total Users</div>
              </div>
              
              <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500 dark:text-zinc-400 uppercase font-bold">
                      <tr>
                        <th className="px-4 py-3">User</th>
                        <th className="px-4 py-3">Email</th>
                        <th className="px-4 py-3">Tenant</th>
                        <th className="px-4 py-3">Role</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                      {users.map(user => {
                        const tenant = tenants.find(t => t.id === user.tenantId);
                        return (
                          <tr key={user.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                            <td className="px-4 py-3 font-semibold text-zinc-900 dark:text-zinc-100">{user.name}</td>
                            <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{user.email}</td>
                            <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{tenant?.name || 'N/A'}</td>
                            <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400 capitalize">{user.role || 'User'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'announcements' && (
            <div className="space-y-4">
              <h2 className="text-lg font-black uppercase tracking-tight text-zinc-900 dark:text-zinc-100">All Announcements</h2>
              <button onClick={() => setShowAnnounceModal(true)} className="w-full bg-[#2f6ce6] hover:bg-blue-700 text-white rounded-lg px-4 py-3 flex items-center justify-center shadow-md font-bold text-sm">
                 <Plus className="w-4 h-4 mr-2" />
                 NEW BROADCAST
              </button>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 {announcements.length === 0 && (
                    <p className="col-span-full text-center text-zinc-500 text-xs py-8">No announcements found.</p>
                 )}
                 {announcements.map(ann => (
                    <div key={ann.id} className={`p-4 flex flex-col justify-between rounded-xl border ${ann.active ? 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950' : 'border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 opacity-60'}`}>
                       <div className="flex flex-col gap-1">
                         <div className="flex items-center gap-2">
                           <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider
                              ${ann.type === 'info' ? 'bg-blue-100 text-blue-700' : ''}
                              ${ann.type === 'warning' ? 'bg-amber-100 text-amber-700' : ''}
                              ${ann.type === 'success' ? 'bg-emerald-100 text-emerald-700' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'}
                            `}>
                              {ann.type}
                           </span>
                           <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100">{ann.title}</span>
                         </div>
                         <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">{ann.message}</p>
                         <span className="text-[10px] text-zinc-500 font-mono mt-1">{format(new Date(ann.createdAt), 'MMM dd, yyyy hh:mm a')}</span>
                       </div>
                       <div className="flex items-center gap-2 shrink-0 mt-3 border-t border-zinc-200 dark:border-zinc-800 pt-3">
                         <button onClick={() => toggleAnnouncementActive(ann.id)} className="bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 px-3 py-1.5 rounded text-xs font-bold transition-colors shadow-sm flex-1">{ann.active ? 'Deactivate' : 'Reactivate'}</button>
                         <button onClick={() => handleDeleteAnnouncement(ann.id)} className="text-rose-500 bg-rose-50 hover:bg-rose-100 p-1.5 rounded">
                           <Trash2 className="w-4 h-4" />
                         </button>
                       </div>
                    </div>
                 ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Bottom Navigation */}
      <div className="md:hidden absolute bottom-0 left-0 right-0 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 flex justify-around items-center py-2 pb-safe shadow-[0_-4px_10px_rgba(0,0,0,0.05)] z-20">
        <button onClick={() => setActiveTab('home')} className={`flex flex-col items-center justify-center w-16 p-1 ${activeTab === 'home' ? 'text-[#2f6ce6]' : 'text-zinc-500'}`}>
          <Home className={`w-6 h-6 ${activeTab === 'home' ? 'fill-current' : ''}`} />
          <span className="text-[10px] mt-1 font-medium">Home</span>
        </button>
        <button onClick={() => setActiveTab('tenants')} className={`flex flex-col items-center justify-center w-16 p-1 ${activeTab === 'tenants' ? 'text-[#2f6ce6]' : 'text-zinc-500'}`}>
          <Building2 className={`w-6 h-6 ${activeTab === 'tenants' ? 'fill-current' : ''}`} />
          <span className="text-[10px] mt-1 font-medium">Tenants</span>
        </button>
        <button onClick={() => setActiveTab('users')} className={`flex flex-col items-center justify-center w-16 p-1 ${activeTab === 'users' ? 'text-[#2f6ce6]' : 'text-zinc-500'}`}>
          <Users className={`w-6 h-6 ${activeTab === 'users' ? 'fill-current' : ''}`} />
          <span className="text-[10px] mt-1 font-medium">Users</span>
        </button>
        <button onClick={() => setActiveTab('announcements')} className={`flex flex-col items-center justify-center w-20 p-1 ${activeTab === 'announcements' ? 'text-[#2f6ce6]' : 'text-zinc-500'}`}>
          <Megaphone className={`w-6 h-6 ${activeTab === 'announcements' ? 'fill-current' : ''}`} />
          <span className="text-[10px] mt-1 font-medium">Announcements</span>
        </button>
      </div>

      {/* Subscription & Modules Update Modal */}
      {isUpdateModalOpen && selectedTenant && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-2 sm:p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-xl md:rounded-2xl w-full max-w-lg p-4 md:p-6 border border-zinc-200 dark:border-zinc-800">
            <h2 className="text-lg md:text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-1 md:mb-2">Manage Tenant</h2>
            <p className="text-xs md:text-sm text-zinc-500 mb-4 md:mb-6">Update {selectedTenant.name}'s subscription and provisioned modules.</p>
            
            <div className="space-y-4 md:space-y-6 mb-4 md:mb-6">
              <div>
                <label className="block text-[10px] md:text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5 md:mb-2">New Expiration Date</label>
                <input 
                  type="date"
                  value={updateDate}
                  onChange={(e) => setUpdateDate(e.target.value)}
                  className="w-full px-2 py-1.5 md:px-3 md:py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg md:rounded-xl focus:ring-1 md:focus:ring-2 focus:ring-indigo-500 text-xs md:text-sm text-zinc-900 dark:text-zinc-100"
                />
                <div className="flex gap-1.5 md:gap-2 text-xs md:text-sm text-zinc-500 mt-2">
                  <button 
                    onClick={() => setUpdateDate(new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().slice(0, 10))}
                    className="px-1.5 py-0.5 md:px-2 md:py-1 bg-zinc-100 dark:bg-zinc-800 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors text-[10px] md:text-xs"
                  >
                    +1 Month
                  </button>
                  <button 
                    onClick={() => setUpdateDate(new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().slice(0, 10))}
                    className="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors text-xs"
                  >
                    +1 Year
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-3 uppercase tracking-wider">Module Provisioning</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: 'payroll', label: 'HR & Payroll' },
                    { key: 'inventory', label: 'Inventory Management' },
                    { key: 'ecommerce', label: 'E-Commerce Integrations' },
                    { key: 'fixedAssets', label: 'Fixed Assets' }
                  ].map(mod => (
                    <label key={mod.key} className="flex items-center gap-3 p-3 border border-zinc-200 dark:border-zinc-800 rounded-xl cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                      <input 
                        type="checkbox" 
                        checked={editModules[mod.key as keyof typeof editModules] ?? true}
                        onChange={(e) => setEditModules(prev => ({ ...prev, [mod.key]: e.target.checked }))}
                        className="w-4 h-4 text-indigo-600 rounded border-zinc-300 focus:ring-indigo-500"
                      />
                      <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{mod.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
              <button 
                onClick={() => setIsUpdateModalOpen(false)}
                className="px-4 py-2 text-sm font-bold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveUpdate}
                className="px-4 py-2 text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md transition-all"
              >
                Save & Activate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Announcement Modal */}
      {showAnnounceModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-md p-6 border border-zinc-200 dark:border-zinc-800">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-4">Create Broadcast</h2>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">Title</label>
                <input 
                  type="text"
                  value={newAnnouncement.title}
                  onChange={(e) => setNewAnnouncement({...newAnnouncement, title: e.target.value})}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm"
                  placeholder="e.g. System Maintenance"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">Type</label>
                <select
                  value={newAnnouncement.type}
                  onChange={(e) => setNewAnnouncement({...newAnnouncement, type: e.target.value as any})}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm"
                >
                  <option value="info">Information</option>
                  <option value="warning">Warning / Alert</option>
                  <option value="success">Success / Update</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">Message</label>
                <textarea 
                  value={newAnnouncement.message}
                  onChange={(e) => setNewAnnouncement({...newAnnouncement, message: e.target.value})}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm h-24 resize-none"
                  placeholder="Type the message to broadcast to all tenants..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setShowAnnounceModal(false)}
                className="px-4 py-2 text-sm font-bold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                Cancel
              </button>
              <button 
                onClick={handleAddAnnouncement}
                className="px-4 py-2 text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md transition-all flex items-center gap-2"
              >
                <Megaphone className="w-4 h-4" />
                Publish Broadcast
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};
