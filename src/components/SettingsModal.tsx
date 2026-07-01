import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, CheckCircle, ShieldAlert, Award, FileText } from 'lucide-react';
import { CompanyConfig, Tenant } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  currentTenant?: Tenant | null;
  updateTenantLogo?: (url: string) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  showToast,
  currentTenant,
  updateTenantLogo
}) => {
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

  const handleBackupReset = () => {
    if (!confirm('This resets all mock databases (Ledger, COA, Inventory, Contacts, Tasks) to original default values. Proceed?')) return;
    localStorage.clear();
    showToast('All local storage databases cleared. Page will refresh shortly.', 'info');
    setTimeout(() => {
      window.location.reload();
    }, 1500);
  };

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
                    <h3 className="text-sm font-bold uppercase tracking-wider">Enterprise Company Settings</h3>
                    <p className="text-[10px] text-zinc-400 mt-0.5">Configure government registration parameters for BIR Forms outputs.</p>
                  </div>
                </div>
                <button 
                  onClick={onClose}
                  className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4 text-left">
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
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Company Logo</label>
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
                    <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider block flex items-center gap-1">
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
            </div>

            <div className="bg-zinc-50 dark:bg-zinc-950/40 p-5 border-t border-zinc-100 dark:border-zinc-800 flex items-center gap-3">
              <button 
                onClick={handleSave}
                className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-white font-bold py-3 text-xs rounded-xl transition-all shadow-sm"
              >
                Save Configuration
              </button>
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
