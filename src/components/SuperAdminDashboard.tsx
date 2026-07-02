import React, { useState, useMemo } from 'react';
import { Tenant, User } from '../types';
import { ShieldCheck, Building, Users, Play, Pause, XCircle, LogOut, Search, TrendingUp, DollarSign, Activity, MoreVertical, CreditCard, Calendar, CheckCircle } from 'lucide-react';
import { format, addMonths } from 'date-fns';

interface SuperAdminDashboardProps {
  tenants: Tenant[];
  setTenants: React.Dispatch<React.SetStateAction<Tenant[]>>;
  users: User[];
  onLogout: () => void;
}

export const SuperAdminDashboard: React.FC<SuperAdminDashboardProps> = ({ tenants, setTenants, users, onLogout }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Subscription Update Modal State
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [updateDate, setUpdateDate] = useState<string>('');

  const openUpdateModal = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setUpdateDate(tenant.expiresAt ? new Date(tenant.expiresAt).toISOString().slice(0, 10) : new Date(tenant.trialEndsAt).toISOString().slice(0, 10));
    setIsUpdateModalOpen(true);
  };

  const handleSaveUpdate = () => {
    if (selectedTenant && updateDate) {
      setTenants(tenants.map(t => t.id === selectedTenant.id ? { 
        ...t, 
        subscriptionStatus: 'active',
        expiresAt: new Date(updateDate).toISOString() 
      } : t));
      setIsUpdateModalOpen(false);
    }
  };

  const handleUpdateStatus = (tenantId: string, status: Tenant['subscriptionStatus']) => {
    setTenants(tenants.map(t => t.id === tenantId ? { ...t, subscriptionStatus: status } : t));
  };

  const activeTenants = tenants.filter(t => t.subscriptionStatus === 'active' || t.subscriptionStatus === 'trial');
  
  // Calculate estimated MRR (assuming average of 2500 per active tenant)
  const mrr = activeTenants.length * 2500;

  const filteredTenants = useMemo(() => {
    return tenants.filter(t => {
      const matchesSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || t.subscriptionStatus === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [tenants, searchTerm, statusFilter]);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col font-sans">
      <header className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 p-4 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-md shadow-indigo-600/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-zinc-900 dark:text-zinc-100 leading-tight">Stratify Command Center</h1>
              <p className="text-xs text-zinc-500 font-medium">Super Administrator Dashboard</p>
            </div>
          </div>
          <button 
            onClick={onLogout}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-lg text-sm font-bold hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8 space-y-8">
        
        {/* KPI Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5" />
              </div>
              <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-full">
                <TrendingUp className="w-3 h-3" /> +12.5%
              </span>
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-500 mb-1">Monthly Recurring Revenue</p>
              <h2 className="text-3xl font-black text-zinc-900 dark:text-zinc-100 font-mono tracking-tight">
                ₱{mrr.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h2>
            </div>
          </div>
          
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 rounded-lg flex items-center justify-center">
                <Building className="w-5 h-5" />
              </div>
              <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-full">
                <TrendingUp className="w-3 h-3" /> +3 this week
              </span>
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-500 mb-1">Active Tenants</p>
              <h2 className="text-3xl font-black text-zinc-900 dark:text-zinc-100">{activeTenants.length}</h2>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
              <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-full">
                <TrendingUp className="w-3 h-3" /> +18.2%
              </span>
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-500 mb-1">Total System Users</p>
              <h2 className="text-3xl font-black text-zinc-900 dark:text-zinc-100">{users.length}</h2>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 bg-rose-100 dark:bg-rose-900/30 text-rose-600 rounded-lg flex items-center justify-center">
                <Activity className="w-5 h-5" />
              </div>
              <span className="flex items-center gap-1 text-xs font-bold text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-full">
                Live Data
              </span>
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-500 mb-1">Currently Online</p>
              <h2 className="text-3xl font-black text-zinc-900 dark:text-zinc-100 flex items-center gap-3">
                {tenants.filter(t => t.isOnline).length} 
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
              </h2>
            </div>
          </div>
        </div>

        {/* Charts & Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm p-6 flex flex-col">
            <h3 className="font-bold text-zinc-900 dark:text-zinc-100 mb-6">Recent Tenant Registrations</h3>
            <div className="flex-1 overflow-y-auto pr-2 space-y-4 max-h-[300px]">
              {tenants.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5).map((t) => (
                <div key={t.id} className="flex gap-4 items-start">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-blue-50 text-blue-500 dark:bg-blue-900/20">
                    <Building className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 leading-snug">{t.name}</p>
                    <p className="text-xs text-zinc-500">{format(new Date(t.createdAt), 'MMM dd, yyyy hh:mm a')}</p>
                  </div>
                </div>
              ))}
              {tenants.length === 0 && <p className="text-sm text-zinc-500">No tenants yet.</p>}
            </div>
          </div>
          
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm p-6 flex flex-col">
            <h3 className="font-bold text-zinc-900 dark:text-zinc-100 mb-6">Recent User Registrations</h3>
            <div className="flex-1 overflow-y-auto pr-2 space-y-4 max-h-[300px]">
              {users.slice(0, 5).map((u) => (
                <div key={u.id} className="flex gap-4 items-start">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${u.authProvider === 'google' ? 'bg-rose-50 text-rose-500 dark:bg-rose-900/20' : 'bg-emerald-50 text-emerald-500 dark:bg-emerald-900/20'}`}>
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 leading-snug">{u.email}</p>
                    <p className="text-xs text-zinc-500">
                      {u.authProvider === 'google' ? 'Registered via Google' : 'Registered via Email'} • Role: {u.role}
                    </p>
                  </div>
                </div>
              ))}
              {users.length === 0 && <p className="text-sm text-zinc-500">No users yet.</p>}
            </div>
          </div>
        </div>

        {/* Tenants Table */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950 flex flex-col sm:flex-row justify-between items-center gap-4">
            <h3 className="font-bold text-zinc-900 dark:text-zinc-100 whitespace-nowrap">Tenant Management</h3>
            
            <div className="flex w-full sm:w-auto items-center gap-3">
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input 
                  type="text"
                  placeholder="Search tenants..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                />
              </div>
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm rounded-lg px-3 py-2 font-medium outline-none focus:border-indigo-500"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="trial">Trial</option>
                <option value="paused">Paused</option>
                <option value="terminated">Terminated</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-zinc-50 dark:bg-zinc-900/50 text-xs text-zinc-500 uppercase tracking-wider border-b border-zinc-200 dark:border-zinc-800">
                  <th className="p-4 font-semibold">Tenant Organization</th>
                  <th className="p-4 font-semibold">Status</th>
                  <th className="p-4 font-semibold">Plan / MRR</th>
                  <th className="p-4 font-semibold">Users</th>
                  <th className="p-4 font-semibold">Registration Date</th>
                  <th className="p-4 font-semibold">Expiration / Trial End</th>
                  <th className="p-4 font-semibold text-right">Controls</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-zinc-100 dark:divide-zinc-800">
                {filteredTenants.map(tenant => {
                  const owner = users.find(u => u.tenantId === tenant.id && u.role === 'tenant_owner');
                  return (
                  <tr key={tenant.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors group">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                           <div className="w-10 h-10 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl flex items-center justify-center font-bold text-lg text-zinc-500 shadow-sm">
                             {tenant.logo ? <img src={tenant.logo} className="w-10 h-10 rounded-xl object-cover" /> : tenant.name.charAt(0)}
                           </div>
                           <div className="absolute -bottom-1 -right-1">
                             <div className={`absolute -inset-1 rounded-full ${tenant.isOnline ? 'bg-emerald-500/30 animate-ping' : ''}`}></div>
                             <div className={`relative w-3.5 h-3.5 border-2 border-white dark:border-zinc-900 rounded-full ${tenant.isOnline ? 'bg-emerald-500' : 'bg-zinc-400'}`}></div>
                           </div>
                        </div>
                        <div>
                          <span className="font-bold text-zinc-900 dark:text-zinc-100 block">{tenant.name}</span>
                          <span className="text-xs text-zinc-500 font-medium">Owner: {owner?.email} {owner?.authProvider === 'google' && '(Google)'}</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider inline-flex items-center gap-1.5
                        ${tenant.subscriptionStatus === 'active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : ''}
                        ${tenant.subscriptionStatus === 'trial' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : ''}
                        ${tenant.subscriptionStatus === 'paused' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : ''}
                        ${tenant.subscriptionStatus === 'terminated' || tenant.subscriptionStatus === 'expired' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' : ''}
                      `}>
                        <span className={`w-1.5 h-1.5 rounded-full ${tenant.subscriptionStatus === 'active' ? 'bg-emerald-500' : tenant.subscriptionStatus === 'trial' ? 'bg-blue-500' : tenant.subscriptionStatus === 'paused' ? 'bg-amber-500' : 'bg-rose-500'}`}></span>
                        {tenant.subscriptionStatus}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="font-medium text-zinc-900 dark:text-zinc-100">Pro Tier</div>
                      <div className="text-xs font-mono text-zinc-500">₱2,500.00/mo</div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-zinc-400" />
                        <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                          {users.filter(u => u.tenantId === tenant.id).length}
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="text-zinc-600 dark:text-zinc-400 font-medium">{format(new Date(tenant.createdAt), 'MMM dd, yyyy')}</span>
                      <div className="text-xs text-zinc-400 dark:text-zinc-500">{format(new Date(tenant.createdAt), 'hh:mm a')}</div>
                    </td>
                    <td className="p-4">
                      <span className="text-zinc-600 dark:text-zinc-400 font-medium">
                        {tenant.expiresAt 
                          ? format(new Date(tenant.expiresAt), 'MMM dd, yyyy') 
                          : format(new Date(tenant.trialEndsAt), 'MMM dd, yyyy')}
                      </span>
                      <div className="text-xs text-zinc-400 dark:text-zinc-500">
                        {tenant.expiresAt ? 'Subscription Ends' : 'Trial Ends'}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex justify-end gap-1.5 opacity-100 sm:opacity-50 sm:group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openUpdateModal(tenant)} className="p-2 text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 rounded-lg transition-colors" title="Manage Subscription">
                          <CheckCircle className="w-4 h-4" />
                        </button>
                        {tenant.subscriptionStatus !== 'active' && (
                          <button onClick={() => handleUpdateStatus(tenant.id, 'active')} className="p-2 text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 rounded-lg transition-colors" title="Activate / Continue">
                            <Play className="w-4 h-4" />
                          </button>
                        )}
                        {tenant.subscriptionStatus === 'active' && (
                          <button onClick={() => handleUpdateStatus(tenant.id, 'paused')} className="p-2 text-amber-600 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/40 rounded-lg transition-colors" title="Pause Account">
                            <Pause className="w-4 h-4" />
                          </button>
                        )}
                        {tenant.subscriptionStatus !== 'terminated' && (
                          <button onClick={() => handleUpdateStatus(tenant.id, 'terminated')} className="p-2 text-rose-600 bg-rose-50 dark:bg-rose-900/20 hover:bg-rose-100 dark:hover:bg-rose-900/40 rounded-lg transition-colors" title="Terminate Account">
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                        <button className="p-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors ml-1" title="More Options">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  );
                })}
                {filteredTenants.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-12 text-center">
                      <div className="flex flex-col items-center justify-center text-zinc-400">
                        <Search className="w-8 h-8 mb-3 opacity-20" />
                        <p className="font-medium text-zinc-500">No tenants found matching your criteria.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Subscription Update Modal */}
      {isUpdateModalOpen && selectedTenant && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-md p-6 border border-zinc-200 dark:border-zinc-800">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-4">Manage Subscription</h2>
            <p className="text-sm text-zinc-500 mb-6">Convert {selectedTenant.name}'s trial into an active subscription and set the new expiration date.</p>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">New Expiration Date</label>
                <input 
                  type="date"
                  value={updateDate}
                  onChange={(e) => setUpdateDate(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm text-zinc-900 dark:text-zinc-100"
                />
              </div>
              <div className="flex gap-2 text-sm text-zinc-500">
                <button 
                  onClick={() => setUpdateDate(new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().slice(0, 10))}
                  className="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                >
                  +1 Month
                </button>
                <button 
                  onClick={() => setUpdateDate(new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().slice(0, 10))}
                  className="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                >
                  +1 Year
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-3">
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
                Activate Subscription
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

