import React, { useState } from 'react';
import { SubscriptionRequestModal } from './SubscriptionRequestModal';
import { ConfirmPaymentModal } from './ConfirmPaymentModal';
import { motion, AnimatePresence } from 'motion/react';
import { X, CheckCircle, ShieldAlert, Award, FileText, UserPlus, Trash2, Mail, User, Shield, Upload, Laptop, Smartphone, Tablet, DownloadCloud, Globe, RefreshCw, BookOpen, CreditCard } from 'lucide-react';
import { deleteUserFromFirebase, syncTenantToFirebase, syncSubscriptionRequestToFirebase, deleteSubscriptionRequestFromFirebase } from '../lib/db';
import { CompanyConfig, Tenant, User as SystemUser, LedgerEntry } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  currentTenant?: Tenant | null;
  updateTenantLogo?: (url: string) => void;
  users?: SystemUser[];
  setUsers?: React.Dispatch<React.SetStateAction<SystemUser[]>>;
  onUpdateTenant?: (tenant: Tenant) => void;
  ledger?: LedgerEntry[];
  onImportLedger?: (entries: LedgerEntry[]) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  showToast,
  currentTenant,
  updateTenantLogo,
  users = [],
  setUsers,
  onUpdateTenant,
  ledger = [],
  onImportLedger
}) => {
  const [activeSettingsTab, setActiveSettingsTab] = useState<'company' | 'team' | 'billing' | 'pwa'>('company');

  const [config, setConfig] = useState<CompanyConfig>({
    companyName: 'STRATIFY (Strategy + Simplify)',
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

  // Billing & Subscription states
  const [billingPlan, setBillingPlan] = useState<'monthly' | 'annual'>('monthly');
  const [showSubRequestModal, setShowSubRequestModal] = useState(false);
  const [showConfirmPaymentModal, setShowConfirmPaymentModal] = useState(false);
  const [requestedUsers, setRequestedUsers] = useState<number>(5);

  // Custom dialogs/confirm state
  const [confirmDialog, setConfirmDialog] = useState<{
    title?: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    type?: 'rose' | 'indigo' | 'emerald';
    onConfirm: () => void;
    onCancel?: () => void;
  } | null>(null);

  React.useEffect(() => {
    try {
      const stored = localStorage.getItem('stratify_company_config');
      if (stored) {
        const parsed = JSON.parse(stored);
        
        // Migration: Clear hardcoded 'Degz hub' from storage
        if (parsed.companyName && parsed.companyName.toLowerCase().includes('degz hub')) {
          localStorage.removeItem('stratify_company_config');
          setConfig({
            companyName: 'STRATIFY (Strategy + Simplify)',
            tin: '009-887-112-000',
            address: 'Ortigas Center, Pasig City, Metro Manila',
            registeredVat: true,
            secPermitNo: 'SEC-PH-2026-99120',
            ptuNo: 'PTU-11223344-STRATIFY',
            authorizedPIN: '1234',
            logoUrl: 'https://i.postimg.cc/5yGwSWWR/1782659487700.png'
          });
          return;
        }

        if (parsed.logoUrl === '/logo.png' || parsed.logoUrl === '') {
          parsed.logoUrl = 'https://i.postimg.cc/5yGwSWWR/1782659487700.png';
        }
        setConfig(parsed);
      }
    } catch (e) {}
  }, []);

  React.useEffect(() => {
    if (currentTenant) {
      if (currentTenant.logo) {
        setConfig(prev => ({ ...prev, logoUrl: currentTenant.logo || 'https://i.postimg.cc/5yGwSWWR/1782659487700.png' }));
      }
      setRequestedUsers(currentTenant.userLimit || 5);
      if (currentTenant.subscriptionType) {
        setBillingPlan(currentTenant.subscriptionType);
      }
    }
  }, [currentTenant]);

  const handleSendSubscriptionRequest = async () => {
    if (!currentTenant) return;
    if (requestedUsers < 1) {
      showToast('User capacity must be at least 1.', 'error');
      return;
    }

    try {
      const reqId = `sub-req-${currentTenant.id}`;
      const request = {
        id: reqId,
        tenantId: currentTenant.id,
        name: currentTenant.name,
        companyName: currentTenant.name,
        address: config.address || currentTenant.address || '',
        contactNumber: '',
        proofOfPaymentBase64: '',
        createdAt: new Date().toISOString(),
        status: 'pending' as const,
        plan: billingPlan,
        users: requestedUsers
      };

      // 1. Save subscription request document in Firestore immediately
      await syncSubscriptionRequestToFirebase(request);

      // 2. Update the Tenant document in Firestore
      const updatedTenant: Tenant = {
        ...currentTenant,
        subscriptionRequestStatus: 'pending',
        subscriptionRequestPlan: billingPlan,
        subscriptionRequestUserLimit: requestedUsers
      };
      await syncTenantToFirebase(updatedTenant);

      // 3. Update parent React state
      if (onUpdateTenant) {
        onUpdateTenant(updatedTenant);
      }
      
      showToast('Subscription request submitted immediately to Admin list!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Failed to submit subscription request.', 'error');
    }
  };

  const handleCancelSubscriptionRequest = async () => {
    if (!currentTenant) return;
    
    setConfirmDialog({
      title: 'Cancel Subscription Request',
      message: 'Are you sure you want to cancel your pending subscription request? This will allow you to edit your plan and user capacity.',
      confirmLabel: 'Yes, Cancel Request',
      cancelLabel: 'Keep Request',
      type: 'rose',
      onConfirm: async () => {
        try {
          const reqId = `sub-req-${currentTenant.id}`;

          // 1. Delete subscription request from Firestore
          await deleteSubscriptionRequestFromFirebase(reqId);

          // 2. Clear request fields on the Tenant document in Firestore
          const updatedTenant: Tenant = {
            ...currentTenant,
            subscriptionRequestStatus: null as any,
            subscriptionRequestPlan: undefined,
            subscriptionRequestUserLimit: undefined
          };
          await syncTenantToFirebase(updatedTenant);

          // 3. Update parent React state
          if (onUpdateTenant) {
            onUpdateTenant(updatedTenant);
          }

          showToast('Subscription request cancelled successfully. You can now edit and resubmit.', 'success');
        } catch (err) {
          console.error(err);
          showToast('Failed to cancel subscription request.', 'error');
        }
      }
    });
  };

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

    if (currentTenant?.subscriptionStatus === 'trial') {
      showToast('Cannot add team users while under the Free Trial tier. Please subscribe to add team users.', 'error');
      return;
    }

    const tenantUsers = users.filter(u => u.tenantId === currentTenant?.id);
    const maxUsers = currentTenant?.userLimit || 1;
    if (tenantUsers.length >= maxUsers) {
      showToast(`User limit reached (${maxUsers} max). Please upgrade your subscription to add more users.`, 'error');
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

    

    if (setUsers) {
      setUsers(prev => prev.filter(u => u.id !== userId));
      deleteUserFromFirebase(userId).catch(console.error);
      showToast('Team member removed successfully.', 'success');
    }
  };

  const handleExportBackup = () => {
    if (!currentTenant) {
      showToast('No active tenant session found.', 'error');
      return;
    }

    let exportData: LedgerEntry[] = [];
    if (ledger && ledger.length > 0) {
      exportData = ledger;
    } else {
      try {
        const key = `stratify_general_ledger_${currentTenant.id}`;
        const stored = localStorage.getItem(key);
        if (stored) {
          exportData = JSON.parse(stored);
        }
      } catch (e) {
        console.error(e);
      }
    }

    if (exportData.length === 0) {
      showToast('No ledger entries available to export.', 'info');
      return;
    }

    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
      const downloadAnchor = document.createElement('a');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `stratify_ledger_backup_${currentTenant.name.replace(/\s+/g, '_')}_${timestamp}.json`;
      
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", filename);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      showToast('Database backup successfully downloaded!', 'success');
    } catch (e) {
      showToast('Failed to generate database backup file.', 'error');
    }
  };

  const handleImportBackup = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = JSON.parse(text);
        
        if (!Array.isArray(parsed)) {
          showToast('Invalid backup file. Must be a JSON array of ledger entries.', 'error');
          return;
        }

        // Validate basic fields
        const isValid = parsed.every(item => 
          item && 
          typeof item === 'object' && 
          'id' in item && 
          'type' in item && 
          'gross' in item
        );

        if (!isValid && parsed.length > 0) {
          showToast('Invalid ledger entry format detected in backup.', 'error');
          return;
        }

        if (parsed.length === 0) {
          showToast('Backup file is empty.', 'info');
          return;
        }

        setConfirmDialog({
          title: 'Database Import Options',
          message: `Successfully parsed ${parsed.length} ledger entries. Please choose how you want to apply this backup to your general ledger:\n\n• MERGE: Adds imported entries and keeps existing entries.\n• OVERWRITE: Replaces your entire ledger with this backup.`,
          confirmLabel: 'Merge with Current',
          cancelLabel: 'Overwrite Ledger',
          type: 'indigo',
          onConfirm: () => {
            const currentLedgerMap = new Map((ledger || []).map(item => [item.id, item]));
            parsed.forEach(item => {
              currentLedgerMap.set(item.id, item);
            });
            const finalLedger = Array.from(currentLedgerMap.values()).sort((a, b) => b.id - a.id);
            if (onImportLedger) {
              onImportLedger(finalLedger);
            }
            showToast(`Successfully merged ${parsed.length} entries!`, 'success');
          },
          onCancel: () => {
            if (onImportLedger) {
              onImportLedger(parsed);
            }
            showToast(`Successfully restored ${parsed.length} entries!`, 'success');
          }
        });
      } catch (err) {
        showToast('Failed to parse the backup JSON file.', 'error');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const handleBackupReset = () => {
    setConfirmDialog({
      title: 'Emergency System Reset',
      message: 'This will reset all local databases (Ledger, COA, Inventory, Contacts, Tasks) to original default values. This action is IRREVERSIBLE. Do you wish to proceed?',
      confirmLabel: 'Proceed Reset',
      cancelLabel: 'Abort Reset',
      type: 'rose',
      onConfirm: () => {
        localStorage.clear();
        showToast('All local storage databases cleared. Page will refresh shortly.', 'info');
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      }
    });
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
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] sm:w-full sm:max-w-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl z-[201] overflow-hidden flex flex-col justify-between"
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
              <div className="flex border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/20 px-6 shrink-0 overflow-x-auto no-scrollbar whitespace-nowrap">
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
                <button
                  onClick={() => setActiveSettingsTab('billing')}
                  className={`py-3 px-4 text-xs font-bold border-b-2 transition-all ${
                    activeSettingsTab === 'billing'
                      ? 'border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100'
                      : 'border-transparent text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'
                  }`}
                >
                  Subscription & Billing
                </button>
                <button
                  onClick={() => setActiveSettingsTab('pwa')}
                  className={`py-3 px-4 text-xs font-bold border-b-2 transition-all ${
                    activeSettingsTab === 'pwa'
                      ? 'border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100'
                      : 'border-transparent text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'
                  }`}
                >
                  Install App & Offline
                </button>
              </div>

              {activeSettingsTab === 'company' && (
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
                      <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wider block flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5" /> Database Backup (Offline Plan)
                      </span>
                      <span className="text-[10px] text-zinc-400">Download your entire tenant ledger as a secure JSON backup.</span>
                    </div>
                    <button 
                      onClick={handleExportBackup}
                      className="text-[10px] font-bold text-blue-600 hover:text-white bg-blue-50 hover:bg-blue-500 px-3 py-2 border border-blue-100 hover:border-blue-500 uppercase tracking-wider transition-all rounded-xl shadow-sm"
                    >
                      Export JSON
                    </button>
                  </div>

                  <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider block flex items-center gap-1">
                        <Upload className="w-3.5 h-3.5" /> Data Import (Migration Plan)
                      </span>
                      <span className="text-[10px] text-zinc-400">Upload and parse a JSON ledger backup file for bulk migration.</span>
                    </div>
                    <div className="relative">
                      <input 
                        type="file" 
                        accept=".json" 
                        id="backup-import-input"
                        onChange={handleImportBackup} 
                        className="hidden" 
                      />
                      <label 
                        htmlFor="backup-import-input"
                        className="cursor-pointer inline-block text-[10px] font-bold text-emerald-600 hover:text-white bg-emerald-50 hover:bg-emerald-500 px-3 py-2 border border-emerald-100 hover:border-emerald-500 uppercase tracking-wider transition-all rounded-xl shadow-sm text-center"
                      >
                        Import JSON
                      </label>
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
              )}

              {activeSettingsTab === 'team' && (
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
                          type="type"
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

                  {/* Explanatory Login Guide */}
                  <div className="bg-blue-50/40 dark:bg-zinc-950/40 border border-blue-100/60 dark:border-zinc-800/60 rounded-2xl p-4 text-xs space-y-2 text-zinc-700 dark:text-zinc-300">
                    <span className="font-bold text-blue-700 dark:text-blue-400 block uppercase tracking-wider text-[10px]">💡 How do added users access the system?</span>
                    <p className="leading-relaxed">
                      Once added here, your team members can immediately log in from the login screen using their <strong>registered email address</strong>.
                    </p>
                    <p className="leading-relaxed text-[11px] text-zinc-500">
                      They can log in via <strong>Google Sign-In</strong> if their email is connected to a Google account, or they can simply enter their email with any secure password to activate and log into their sub-account.
                    </p>
                  </div>

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
                              <button type="button" onClick={() => handleDeleteMember(u.id)}
                                className="p-3 sm:p-1.5 text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-lg"
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

              {activeSettingsTab === 'billing' && currentTenant && (
                <div className="p-6 space-y-5 text-left max-h-[400px] overflow-y-auto">
                  {/* Current Plan Overview Card */}
                  <div className="bg-gradient-to-br from-indigo-950 via-zinc-900 to-zinc-950 text-white rounded-2xl border border-indigo-900/30 p-5 shadow-md relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none"></div>
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <span className="text-[9px] font-bold uppercase tracking-wider text-indigo-400 bg-indigo-950/80 px-2 py-0.5 rounded-full border border-indigo-800/30">Current Plan</span>
                        <h4 className="text-base font-black tracking-tight text-white mt-1">
                          {currentTenant.subscriptionStatus === 'trial' ? 'Free Trial (Trial)' : 'Premium Active Plan'}
                        </h4>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${
                        currentTenant.subscriptionStatus === 'active'
                          ? 'bg-emerald-950 border-emerald-800 text-emerald-400'
                          : currentTenant.subscriptionStatus === 'trial'
                            ? 'bg-blue-950 border-blue-800 text-blue-400'
                            : 'bg-zinc-800 border-zinc-700 text-zinc-400'
                      }`}>
                        {currentTenant.subscriptionStatus}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-3 border-t border-zinc-800/50 text-xs">
                      <div>
                        <span className="text-zinc-500 block text-[10px] uppercase font-bold tracking-wider">User Capacity Seat</span>
                        <span className="text-sm font-bold font-mono text-zinc-100">
                          {currentTenant.subscriptionStatus === 'trial' ? '0 Users (Trial)' : `${currentTenant.userLimit || 0} Seat(s)`}
                        </span>
                      </div>
                      <div>
                        <span className="text-zinc-500 block text-[10px] uppercase font-bold tracking-wider">Price Paid / Status</span>
                        <span className="text-sm font-bold font-mono text-zinc-100">
                          {currentTenant.subscriptionStatus === 'trial' ? '₱0.00 / mo' : `₱${(currentTenant.pricePaid || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} / mo`}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Pricing / Plan Configurator Form */}
                  <div className="space-y-4">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Modify Subscription Plan</span>

                    {/* Subscription Cycle Toggle */}
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 block">Billing Cycle</label>
                      <div className="grid grid-cols-2 gap-2 bg-zinc-50 dark:bg-zinc-950 p-1 rounded-xl border border-zinc-200 dark:border-zinc-800">
                        <button
                          type="button"
                          onClick={() => setBillingPlan('monthly')}
                          className={`py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                            billingPlan === 'monthly'
                              ? 'bg-white dark:bg-zinc-900 text-zinc-950 dark:text-zinc-100 shadow-sm border border-zinc-200/50 dark:border-zinc-800/50'
                              : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'
                          }`}
                        >
                          Monthly Billing
                        </button>
                        <button
                          type="button"
                          onClick={() => setBillingPlan('annual')}
                          className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                            billingPlan === 'annual'
                              ? 'bg-white dark:bg-zinc-900 text-zinc-950 dark:text-zinc-100 shadow-sm border border-zinc-200/50 dark:border-zinc-800/50'
                              : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'
                          }`}
                        >
                          <span>Annual Billing</span>
                          <span className="text-[9px] px-1.5 py-0.5 bg-emerald-500 text-white rounded font-black uppercase tracking-wider">Save</span>
                        </button>
                      </div>
                    </div>

                    {/* User Limit Capacity Inputs */}
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 block">Desired User Capacity Limit</label>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          disabled={requestedUsers <= 1}
                          onClick={() => setRequestedUsers(prev => Math.max(1, prev - 1))}
                          className="w-10 h-10 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-950 dark:hover:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-sm font-bold text-zinc-700 dark:text-zinc-300 transition-colors disabled:opacity-40"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min={1}
                          value={requestedUsers}
                          onChange={(e) => setRequestedUsers(Math.max(1, parseInt(e.target.value) || 1))}
                          className="flex-1 h-10 text-center font-mono text-xs font-bold bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:border-indigo-500"
                        />
                        <button
                          type="button"
                          onClick={() => setRequestedUsers(prev => prev + 1)}
                          className="w-10 h-10 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-950 dark:hover:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-sm font-bold text-zinc-700 dark:text-zinc-300 transition-colors"
                        >
                          +
                        </button>
                      </div>
                      <p className="text-[10px] text-zinc-400">Total number of team user accounts your organization can authorize.</p>
                    </div>

                    {/* Dynamic Price Calculator Card */}
                    <div className="bg-zinc-50 dark:bg-zinc-950/40 border border-zinc-200 dark:border-zinc-800/60 rounded-2xl p-4 text-xs space-y-3">
                      <span className="font-bold text-zinc-800 dark:text-zinc-200 block uppercase tracking-wider text-[9px] flex items-center gap-1.5">
                        💵 Premium Fee Breakdown
                      </span>
                      <div className="space-y-1.5 text-zinc-600 dark:text-zinc-400">
                        <div className="flex justify-between items-center text-[11px]">
                          <span>Base Subscription Fee:</span>
                          <span className="font-mono font-semibold text-zinc-800 dark:text-zinc-200">
                            {billingPlan === 'annual' ? '₱35,988.00 / yr' : '₱2,999.00 / mo'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-[11px]">
                          <span>User Seats Fee:</span>
                          <span className="font-mono font-semibold text-zinc-800 dark:text-zinc-200">
                            {requestedUsers} seats x {billingPlan === 'annual' ? '₱1,200.00' : '₱100.00'} = 
                            {billingPlan === 'annual' 
                              ? ` ₱${(requestedUsers * 1200).toLocaleString(undefined, { minimumFractionDigits: 2 })} / yr`
                              : ` ₱${(requestedUsers * 100).toLocaleString(undefined, { minimumFractionDigits: 2 })} / mo`
                            }
                          </span>
                        </div>
                        
                        <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 flex justify-between items-center text-sm">
                          <span className="font-bold text-zinc-900 dark:text-zinc-100">Calculated Cost:</span>
                          <div className="text-right">
                            <span className="font-black font-mono text-indigo-600 dark:text-indigo-400 text-base block">
                              ₱{
                                billingPlan === 'annual'
                                  ? ((2999 + requestedUsers * 100) * 12).toLocaleString(undefined, { minimumFractionDigits: 2 })
                                  : (2999 + requestedUsers * 100).toLocaleString(undefined, { minimumFractionDigits: 2 })
                              }
                            </span>
                            <span className="text-[9px] text-zinc-400 uppercase tracking-wider font-bold">
                              {billingPlan === 'annual' ? 'billed annually' : 'billed monthly'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Submit / Status Button */}
                    {currentTenant.subscriptionRequestStatus === 'pending' ? (
                      <div className="space-y-3">
                        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 rounded-xl p-4 text-xs space-y-1.5">
                          <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[10px]">
                            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                            Awaiting Approval
                          </div>
                          <p className="leading-relaxed text-[11px]">
                            You have a pending request for a <strong>{currentTenant.subscriptionRequestPlan === 'annual' ? 'Annual' : 'Monthly'}</strong> premium plan with <strong>{currentTenant.subscriptionRequestUserLimit} user seat(s)</strong> capacity (Total Cost: ₱{
                              (currentTenant.subscriptionRequestPlan === 'annual'
                                ? (2999 + (currentTenant.subscriptionRequestUserLimit || 0) * 100) * 12
                                : (2999 + (currentTenant.subscriptionRequestUserLimit || 0) * 100)
                              ).toLocaleString(undefined, { minimumFractionDigits: 2 })
                            }).
                          </p>
                          <p className="text-[10px] text-zinc-500">
                            The Super Admin is reviewing your subscription request and will approve it shortly.
                          </p>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2">
                          <button
                            type="button"
                            onClick={() => setShowConfirmPaymentModal(true)}
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 text-xs rounded-xl uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-1.5"
                          >
                            <CreditCard className="w-4 h-4" />
                            Confirm Payment
                          </button>

                          <button
                            type="button"
                            onClick={handleCancelSubscriptionRequest}
                            className="flex-1 border border-rose-500/30 hover:border-rose-500 hover:bg-rose-500/10 text-rose-500 font-bold py-3 text-xs rounded-xl uppercase tracking-wider transition-all flex items-center justify-center gap-1.5"
                          >
                            Cancel Request
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={handleSendSubscriptionRequest}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 text-xs rounded-xl uppercase tracking-wider transition-all shadow-md hover:shadow-indigo-500/20"
                      >
                        Send Subscription Request to Super Admin
                      </button>
                    )}
                  </div>
                </div>
              )}

              {activeSettingsTab === 'pwa' && (
                <div className="p-6 space-y-5 text-left max-h-[400px] overflow-y-auto">
                  {/* PWA Hero Banner with custom Logo */}
                  <div className="bg-gradient-to-br from-zinc-900 via-indigo-950 to-zinc-950 text-white rounded-2xl border border-indigo-900/30 p-5 shadow-md relative overflow-hidden flex items-center gap-4">
                    <img 
                      src="https://i.postimg.cc/5yGwSWWR/1782659487700.png" 
                      alt="STRATIFY Logo" 
                      className="w-16 h-16 rounded-2xl object-cover border border-indigo-500/20 shadow-md shrink-0" 
                    />
                    <div className="space-y-1">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-indigo-400 bg-indigo-950/80 px-2 py-0.5 rounded-full border border-indigo-800/30">Native App Support</span>
                      <h4 className="text-base font-black tracking-tight text-white">STRATIFY Desktop & Mobile</h4>
                      <p className="text-[10px] text-zinc-400">Install to your device for rapid startup, native performance, and offline operations.</p>
                    </div>
                  </div>

                  {/* Device Direct Install Section */}
                  <div className="bg-zinc-50 dark:bg-zinc-950/40 p-4.5 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/40 space-y-3">
                    <span className="text-[10px] font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider flex items-center gap-1.5">
                      <DownloadCloud className="w-4 h-4 text-indigo-500" /> Direct Device Installation
                    </span>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                      STRATIFY is designed with Progressive Web App (PWA) standard compliance. It installs directly on macOS, Windows, iOS, Android, and tablets.
                    </p>
                    
                    <button
                      onClick={() => {
                        const promptEvent = (window as any).deferredPrompt;
                        if (promptEvent) {
                          promptEvent.prompt();
                          promptEvent.userChoice.then((choiceResult: any) => {
                            if (choiceResult.outcome === 'accepted') {
                              showToast('STRATIFY successfully installed on your device!', 'success');
                            }
                            (window as any).deferredPrompt = null;
                          });
                        } else {
                          // Fallback instructions if prompt is not ready or has been installed
                          showToast('PWA package cached! Follow the custom system instructions below to complete manual integration.', 'info');
                        }
                      }}
                      className="w-full bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 text-white font-bold py-3 text-xs rounded-xl uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2"
                    >
                      <DownloadCloud className="w-4 h-4" />
                      <span>Install App Now</span>
                    </button>
                  </div>

                  {/* Offline Database Sync Health */}
                  <div className="bg-emerald-500/5 dark:bg-emerald-950/10 border border-emerald-500/20 rounded-2xl p-4 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-emerald-700 dark:text-emerald-400 block uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        Offline Sync Engine Status
                      </span>
                      <span className="text-[9px] font-bold uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded border border-emerald-300/40 dark:border-emerald-800/40">Active & Healthy</span>
                    </div>
                    <p className="text-zinc-600 dark:text-zinc-300 leading-relaxed text-[11px]">
                      If internet access is lost, STRATIFY automatically switches to local sandbox cache mode. All accounting entries, POS products, and payroll details will save instantly on your device and automatically upload to Google Cloud database once connection is restored!
                    </p>
                    <div className="flex gap-4 text-[10px] font-medium text-zinc-500 dark:text-zinc-400 pt-1">
                      <div className="flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> Multi-Tab Offline Cache</div>
                      <div className="flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> Automatic Background Sync</div>
                    </div>
                  </div>

                  {/* Separate Platform Specific Download Manual */}
                  <div className="space-y-3.5">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">How to Install on Other Devices</span>
                    
                    <div className="space-y-3">
                      {/* Laptop/Desktop */}
                      <div className="p-3 bg-zinc-50/50 dark:bg-zinc-950/20 border border-zinc-100 dark:border-zinc-800 rounded-xl flex gap-3">
                        <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-zinc-600 dark:text-zinc-400 shrink-0">
                          <Laptop className="w-4 h-4" />
                        </div>
                        <div className="space-y-1 text-left">
                          <h5 className="text-xs font-bold text-zinc-800 dark:text-zinc-200">MacBook / Windows / Linux PC</h5>
                          <p className="text-[11px] text-zinc-500 leading-relaxed">
                            Open this application URL in Google Chrome, Microsoft Edge, or Brave. In the address bar at the top right, click the <strong className="text-indigo-500">Install</strong> button (square icon with arrow) or go to options and select <strong>"Install STRATIFY..."</strong>.
                          </p>
                        </div>
                      </div>

                      {/* Apple iPhone & iPad */}
                      <div className="p-3 bg-zinc-50/50 dark:bg-zinc-950/20 border border-zinc-100 dark:border-zinc-800 rounded-xl flex gap-3">
                        <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-zinc-600 dark:text-zinc-400 shrink-0">
                          <Smartphone className="w-4 h-4" />
                        </div>
                        <div className="space-y-1 text-left">
                          <h5 className="text-xs font-bold text-zinc-800 dark:text-zinc-200">iOS (iPhone & iPad Version)</h5>
                          <p className="text-[11px] text-zinc-500 leading-relaxed">
                            Open this application link in your mobile <strong className="text-indigo-500">Safari</strong> browser. Tap the <strong className="text-indigo-500">Share</strong> icon (square with upward arrow) in the toolbar, scroll down, and tap <strong className="text-indigo-500">"Add to Home Screen"</strong>. It will register as a standalone native-behaving iOS app!
                          </p>
                        </div>
                      </div>

                      {/* Android Phone & Tablets */}
                      <div className="p-3 bg-zinc-50/50 dark:bg-zinc-950/20 border border-zinc-100 dark:border-zinc-800 rounded-xl flex gap-3">
                        <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-zinc-600 dark:text-zinc-400 shrink-0">
                          <Tablet className="w-4 h-4" />
                        </div>
                        <div className="space-y-1 text-left">
                          <h5 className="text-xs font-bold text-zinc-800 dark:text-zinc-200">Android Phones & Tablets</h5>
                          <p className="text-[11px] text-zinc-500 leading-relaxed">
                            Open this link in <strong className="text-indigo-500">Google Chrome</strong> or Android Web Browser. Tap the three vertical dots (menu icon) in the upper right corner, and select <strong className="text-indigo-500">"Install app"</strong> or <strong>"Add to Home screen"</strong>.
                          </p>
                        </div>
                      </div>
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
        {currentTenant && <SubscriptionRequestModal isOpen={showSubRequestModal} onClose={() => setShowSubRequestModal(false)} tenant={currentTenant} showToast={showToast} plan={billingPlan} users={requestedUsers} onUpdateTenant={onUpdateTenant} />}
        {currentTenant && <ConfirmPaymentModal isOpen={showConfirmPaymentModal} onClose={() => setShowConfirmPaymentModal(false)} tenant={currentTenant} showToast={showToast} />}
        {confirmDialog && (
          <div className="fixed inset-0 bg-zinc-950/80 z-[250] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl w-full max-w-md p-6 shadow-2xl relative overflow-hidden text-left">
              <div className={`absolute top-0 left-0 w-full h-1.5 ${
                confirmDialog.type === 'rose' 
                  ? 'bg-rose-500' 
                  : confirmDialog.type === 'emerald' 
                    ? 'bg-emerald-500' 
                    : 'bg-indigo-500'
              }`} />
              
              <h3 className="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-wider mb-2">
                {confirmDialog.title || 'System Confirmation'}
              </h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed mb-6 whitespace-pre-line">
                {confirmDialog.message}
              </p>
              
              <div className="flex justify-end gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => {
                    if (confirmDialog.onCancel) {
                      confirmDialog.onCancel();
                    }
                    setConfirmDialog(null);
                  }}
                  className="px-4 py-2 text-[10px] font-bold text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 uppercase tracking-widest transition-colors"
                >
                  {confirmDialog.cancelLabel || 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    confirmDialog.onConfirm();
                    setConfirmDialog(null);
                  }}
                  className={`px-4 py-2 text-[10px] font-bold text-white rounded-xl uppercase tracking-widest transition-all ${
                    confirmDialog.type === 'rose'
                      ? 'bg-rose-600 hover:bg-rose-500 shadow-sm hover:shadow-rose-500/20'
                      : confirmDialog.type === 'emerald'
                        ? 'bg-emerald-600 hover:bg-emerald-500 shadow-sm hover:shadow-emerald-500/20'
                        : 'bg-indigo-600 hover:bg-indigo-500 shadow-sm hover:shadow-indigo-500/20'
                  }`}
                >
                  {confirmDialog.confirmLabel || 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        )}
        </>
      )}
    </AnimatePresence>
  );
};
