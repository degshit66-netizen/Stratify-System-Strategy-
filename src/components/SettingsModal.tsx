import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, CheckCircle, ShieldAlert, Award, FileText, UserPlus, Trash2, Mail, User, Shield } from 'lucide-react';
import { CompanyConfig, Tenant, User as SystemUser } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  currentTenant?: Tenant | null;
  updateTenantLogo?: (url: string) => void;
  users?: SystemUser[];
  setUsers?: React.Dispatch<React.SetStateAction<SystemUser[]>>;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  showToast,
  currentTenant,
  updateTenantLogo,
  users = [],
  setUsers
}) => {
  const [activeSettingsTab, setActiveSettingsTab] = useState<'company' | 'team'>('company');

  const [config, setConfig] = useState<CompanyConfig>({
    companyName: 'STRATIFY (System+Strategy)',
    tin: '009-887-112-000',
    address: 'Ortigas Center, Pasig City, Metro Manila',
    registeredVat: true,
    secPermitNo: 'SEC-PH-2026-99120',
    ptuNo: 'PTU-11223344-STRATIFY',
    authorizedPIN: '1234',
    logoUrl: 'https://i.postimg.cc/5yGwSWWR/1782659487700.png'
  });

  // New Team Member inputs
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<'tenant_admin' | 'accountant' | 'staff'>('accountant');

  React.useEffect(() => {
    try {
      const stored = localStorage.getItem('stratify_company_config');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.logoUrl === '/logo.png' || parsed.logoUrl === '') {
          parsed.logoUrl = 'https://i.postimg.cc/5yGwSWWR/1782659487700.png';
        }
        setConfig(parsed);
      }
    } catch (e) {}
  }, []);

  React.useEffect(() => {
    if (currentTenant && currentTenant.logo) {
      setConfig(prev => ({ ...prev, logoUrl: currentTenant.logo || 'https://i.postimg.cc/5yGwSWWR/1782659487700.png' }));
    }
  }, [currentTenant]);

  const handleSave = () => {
    const name = config.companyName.trim();
    if (!name) {
      showToast('Company Name cannot be blank.', 'error');
      return;
    }

    localStorage.setItem('stratify_company_config', JSON.stringify(config));
    
    if (updateTenantLogo) {
      updateTenantLogo(config.logoUrl || 'https://i.postimg.cc/5yGwSWWR/1782659487700.png');
    }

    showToast('Settings successfully persisted.', 'success');
    onClose();
  };

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    const email = newMemberEmail.trim();
    const name = newMemberName.trim();
    
    if (!email || !name) {
      showToast('Please enter both name and email.', 'error');
      return;
    }

    if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
      showToast('A user with this email already exists.', 'error');
      return;
    }

    const newUser: SystemUser = {
      id: 'u-' + Date.now(),
      email,
      name,
      role: newMemberRole,
      tenantId: currentTenant?.id || '',
      authProvider: 'email'
    };

    if (setUsers) {
      setUsers(prev => [...prev, newUser]);
      showToast('Team member added successfully!', 'success');
      setNewMemberEmail('');
      setNewMemberName('');
    }
  };

  const handleDeleteMember = (userId: string) => {
    const userToDelete = users.find(u => u.id === userId);
    if (!userToDelete) return;

    if (userToDelete.role === 'tenant_owner') {
      showToast('Cannot delete the organization owner.', 'error');
      return;
    }

    if (!confirm(`Are you sure you want to remove ${userToDelete.name || userToDelete.email} from the team?`)) {
      return;
    }

    if (setUsers) {
      setUsers(prev => prev.filter(u => u.id !== userId));
      showToast('Team member removed successfully.', 'success');
    }
  };

  const handleBackupReset = () => {
    if (!confirm('This resets all mock databases (Ledger, COA, Inventory, Contacts, Tasks) to original default values. Proceed?')) return;
    localStorage.clear();
    showToast('All local storage databases cleared. Page will refresh shortly.', 'info');
    setTimeout(() => {
      window.location.reload();
    }, 1500);
  };

  // Filter users to current tenant only
  const tenantUsers = users.filter(u => u.tenantId === currentTenant?.id);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-zinc-950/80 z-[200] backdrop-blur-sm"
          />
          {/* Modal Container */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', duration: 0.3 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl z-[201] overflow-hidden flex flex-col justify-between"
          >
            <div>
              <div className="bg-zinc-900 text-white p-5 flex items-center justify-between border-b border-zinc-800">
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-blue-400" />
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider">Enterprise & Team Settings</h3>
                    <p className="text-[10px] text-zinc-400 mt-0.5">Configure organization credentials, branding, and add team users.</p>
                  </div>
                </div>
                <button 
                  onClick={onClose}
                  className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Tabs Switcher */}
              <div className="flex border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/20 px-6 shrink-0">
                <button
                  onClick={() => setActiveSettingsTab('company')}
                  className={`py-3 px-4 text-xs font-bold border-b-2 transition-all ${
                    activeSettingsTab === 'company'
                      ? 'border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100'
                      : 'border-transparent text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'
                  }`}
                >
                  Company Configuration
                </button>
                <button
                  onClick={() => setActiveSettingsTab('team')}
                  className={`py-3 px-4 text-xs font-bold border-b-2 transition-all ${
                    activeSettingsTab === 'team'
                      ? 'border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100'
                      : 'border-transparent text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'
                  }`}
                >
                  Team Members / Users
                </button>
              </div>

              {activeSettingsTab === 'company' ? (
                <div className="p-6 space-y-4 text-left max-h-[400px] overflow-y-auto">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Company Name</label>
                    <input 
                      type="text" 
                      value={config.companyName}
                      onChange={(e) => setConfig({ ...config, companyName: e.target.value })}
                      className="w-full text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-blue-400"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Company Logo URL (Private)</label>
                    <input 
                      type="text" 
                      value={config.logoUrl || ''}
                      placeholder="https://i.postimg.cc/5yGwSWWR/1782659487700.png"
                      onChange={(e) => setConfig({ ...config, logoUrl: e.target.value })}
                      className="w-full text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-blue-400"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">SEC Registered TIN No</label>
                      <input 
                        type="text" 
                        value={config.tin}
                        onChange={(e) => setConfig({ ...config, tin: e.target.value })}
                        placeholder="000-000-000-000"
                        className="w-full text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-800 dark:text-zinc-200 focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">VAT Registration Status</label>
                      <select 
                        value={config.registeredVat ? 'VAT' : 'Non-VAT'}
                        onChange={(e) => setConfig({ ...config, registeredVat: e.target.value === 'VAT' })}
                        className="w-full text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-800 dark:text-zinc-200 focus:outline-none"
                      >
                        <option value="VAT">VAT Registered (12%)</option>
                        <option value="Non-VAT">Non-VAT Registered</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Company Logo File</label>
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setConfig({ ...config, logoUrl: reader.result as string });
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="w-full text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-blue-400 file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    {config.logoUrl && (
                      <div className="mt-2">
                        <img src={config.logoUrl} alt="Preview" className="h-10 w-10 rounded-lg object-cover border border-zinc-200 dark:border-zinc-800" />
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Registered Address</label>
                    <input 
                      type="text" 
                      value={config.address}
                      onChange={(e) => setConfig({ ...config, address: e.target.value })}
                      className="w-full text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-blue-400"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">SEC Permit / License No</label>
                      <input 
                        type="text" 
                        value={config.secPermitNo}
                        onChange={(e) => setConfig({ ...config, secPermitNo: e.target.value })}
                        className="w-full text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-800 dark:text-zinc-200 focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Permit to Use (PTU) No</label>
                      <input 
                        type="text" 
                        value={config.ptuNo}
                        onChange={(e) => setConfig({ ...config, ptuNo: e.target.value })}
                        className="w-full text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-800 dark:text-zinc-200 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Seller Hub Access PIN</label>
                      <input 
                        type="text" 
                        maxLength={4}
                        value={config.authorizedPIN}
                        onChange={(e) => setConfig({ ...config, authorizedPIN: e.target.value })}
                        className="w-full text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-800 dark:text-zinc-200 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider block flex items-center gap-1">
                        <ShieldAlert className="w-3.5 h-3.5" /> Emergency System Reset
                      </span>
                      <span className="text-[10px] text-zinc-400">Clear all locally saved records and restore original defaults.</span>
                    </div>
                    <button 
                      onClick={handleBackupReset}
                      className="text-[10px] font-bold text-rose-600 hover:text-white bg-rose-50 hover:bg-rose-500 px-3 py-2 border border-rose-100 hover:border-rose-500 uppercase tracking-wider transition-all rounded-xl shadow-sm"
                    >
                      Reset System
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-6 space-y-5 text-left max-h-[400px] overflow-y-auto">
                  {/* Add New Member Form */}
                  <form onSubmit={handleAddMember} className="bg-zinc-50 dark:bg-zinc-950/40 p-4 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/40 space-y-3">
                    <span className="text-[10px] font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider flex items-center gap-1.5">
                      <UserPlus className="w-4 h-4 text-emerald-500" /> Add New Team User
                    </span>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 block">Full Name</label>
                        <input 
                          type="text"
                          required
                          placeholder="e.g. Maria Clara"
                          value={newMemberName}
                          onChange={(e) => setNewMemberName(e.target.value)}
                          className="w-full text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-zinc-800 dark:text-zinc-200 focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 block">Email Address</label>
                        <input 
                          type="email"
                          required
                          placeholder="maria@company.com"
                          value={newMemberEmail}
                          onChange={(e) => setNewMemberEmail(e.target.value)}
                          className="w-full text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-zinc-800 dark:text-zinc-200 focus:outline-none"
                        />
                      </div>
                    </div>
                    <div className="flex justify-between items-center gap-3 pt-1">
                      <div className="flex-1 space-y-1">
                        <label className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 block">System Role</label>
                        <select 
                          value={newMemberRole}
                          onChange={(e: any) => setNewMemberRole(e.target.value)}
                          className="w-full text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-zinc-800 dark:text-zinc-200 focus:outline-none"
                        >
                          <option value="tenant_admin">Admin / Manager</option>
                          <option value="accountant">Senior Accountant</option>
                          <option value="staff">Staff Bookkeeper</option>
                        </select>
                      </div>
                      <button 
                        type="submit"
                        className="bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 self-end transition-colors shadow-sm"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>Add Member</span>
                      </button>
                    </div>
                  </form>

                  {/* Team Members List */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Authorized Members ({tenantUsers.length})</span>
                    <div className="space-y-2 divide-y divide-zinc-100 dark:divide-zinc-800">
                      {tenantUsers.map((u) => (
                        <div key={u.id} className="flex items-center justify-between py-3 first:pt-0">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0 font-bold text-xs uppercase">
                              {u.name ? u.name.charAt(0) : 'U'}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">{u.name || 'Invited User'}</span>
                                {u.role === 'tenant_owner' && (
                                  <span className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider">Owner</span>
                                )}
                              </div>
                              <span className="text-[10px] text-zinc-500 flex items-center gap-1"><Mail className="w-3 h-3" /> {u.email}</span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] font-semibold text-zinc-500 bg-zinc-50 dark:bg-zinc-900 px-2 py-1 rounded-lg capitalize">
                              {u.role?.replace('tenant_admin', 'Admin').replace('tenant_owner', 'Owner')}
                            </span>
                            {u.role !== 'tenant_owner' && (
                              <button 
                                onClick={() => handleDeleteMember(u.id)}
                                className="p-1.5 text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-lg"
                                title="Remove team member"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-zinc-50 dark:bg-zinc-950/40 p-5 border-t border-zinc-100 dark:border-zinc-800 flex items-center gap-3">
              {activeSettingsTab === 'company' ? (
                <button 
                  onClick={handleSave}
                  className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-white font-bold py-3 text-xs rounded-xl transition-all shadow-sm"
                >
                  Save Configuration
                </button>
              ) : (
                <button 
                  onClick={onClose}
                  className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-white font-bold py-3 text-xs rounded-xl transition-all shadow-sm"
                >
                  Close Settings
                </button>
              )}
              <button 
                onClick={onClose}
                className="flex-1 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 font-bold py-3 text-xs border border-zinc-200 dark:border-zinc-800 rounded-xl transition-all shadow-sm"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
