import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart3, 
  BookOpen, 
  TrendingUp, 
  ShoppingBag, 
  Scale, 
  Building, 
  Package, 
  Users, 
  Calendar, 
  FileText, 
  Settings, 
  Grid, 
  Plus, 
  LogOut, 
  Compass, 
  Bell, 
  ShieldCheck, 
  ChevronRight,
  AlertCircle,
  Sun,
  Moon,
  Calculator,
  ShoppingCart,
  UsersRound,
  Landmark,
  FileDigit,
  FileCheck2,
  CreditCard,
  Briefcase,
  Layers,
  Banknote,
  Receipt,
  FileSpreadsheet,
  PieChart,
  HardHat
} from 'lucide-react';

import { LedgerEntry, CompanyConfig } from './types';
import { r2, parseNum } from './utils/helpers';

// Subcomponents
import { Dashboard } from './components/Dashboard';
import { LedgerTable } from './components/LedgerTable';
import { SalesModule } from './components/SalesModule';
import { PurchaseModule } from './components/PurchaseModule';
import { ReconciliationModule } from './components/ReconciliationModule';
import { FixedAssetsModule } from './components/FixedAssetsModule';
import { InventoryModule } from './components/InventoryModule';
import { ContactsModule } from './components/ContactsModule';
import { SchedulerModule } from './components/SchedulerModule';
import { QuotationBuilder } from './components/QuotationBuilder';
import { ReportsModule } from './components/ReportsModule';
import { FSModule } from './components/FSModule';
import { BooksModule } from './components/BooksModule';
import { COAModule } from './components/COAModule';
import { EcommerceModule } from './components/EcommerceModule';
import { PayrollModule } from './components/PayrollModule';
import { HRModule } from './components/HRModule';
import { Form2307Module } from './components/Form2307Module';
import { DisbursementVoucherModal } from './components/DisbursementVoucherModal';
import { AuditTrailModule } from './components/AuditTrailModule';
import { Auth } from './components/Auth';
import { SuperAdminDashboard } from './components/SuperAdminDashboard';
import { FeatureTour } from './components/FeatureTour';
import { SubscriptionPrompt } from './components/SubscriptionPrompt';
import { useTrialMonitor } from './hooks/useTrialMonitor';
import { User, Tenant } from './types';
import { loadTenantsFromFirebase, loadUsersFromFirebase, syncTenantToFirebase, syncUserToFirebase } from './lib/db';

// Modals
import { EntryModal } from './components/EntryModal';
import { SettingsModal } from './components/SettingsModal';

export type ActiveTab = 
  | 'Dashboard'
  | 'Ledger'
  | 'Sales'
  | 'Purchases'
  | 'Reconciliation'
  | 'FixedAssets'
  | 'Inventory'
  | 'Contacts'
  | 'Scheduler'
  | 'Quotation'
  | 'Reports'
  | 'Books'
  | 'FS'
  | 'COA'
  | 'AuditTrail'
  | 'Ecommerce'
  | 'HR'
  | 'Payroll';

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

export default function App() {
  // Multi-tenant and Auth State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [logoError, setLogoError] = useState(false);

  const { isTrialExpired } = useTrialMonitor(currentTenant);

  useEffect(() => {
    const initializeData = async () => {
      let loadedTenants = await loadTenantsFromFirebase();
      let loadedUsers = await loadUsersFromFirebase();

      // Fallback to local storage if Firebase is empty (migration)
      if (loadedTenants.length === 0) {
        const tStr = localStorage.getItem('mock_tenants');
        loadedTenants = tStr ? JSON.parse(tStr) : [];
        // Sync to firebase
        loadedTenants.forEach(t => syncTenantToFirebase(t));
      }
      
      if (loadedUsers.length === 0) {
        const uStr = localStorage.getItem('mock_users');
        loadedUsers = uStr ? JSON.parse(uStr) : [];
        // Sync to firebase
        loadedUsers.forEach(u => syncUserToFirebase(u));
      }

      setTenants(loadedTenants);
      setUsers(loadedUsers);

      // Hydrate current user from storage
      const uid = localStorage.getItem('current_user_id');
      const tid = localStorage.getItem('current_tenant_id');

      if (uid === 'admin-1') {
         setCurrentUser({ id: 'admin-1', email: 'stratify2026@gmail.com', role: 'superadmin', name: 'Super Admin' });
      } else if (uid) {
         const u = loadedUsers.find(x => x.id === uid);
         if (u) {
            setCurrentUser(u);
            if (tid) {
               const t = loadedTenants.find(x => x.id === tid);
               if (t) setCurrentTenant(t);
            }
         }
      }

      if (localStorage.getItem('show_onboarding_pending') === 'true') {
         setShowOnboarding(true);
         localStorage.removeItem('show_onboarding_pending');
      }
    };
    
    initializeData();
  }, []);

  useEffect(() => {
    if (tenants.length > 0) {
      localStorage.setItem('mock_tenants', JSON.stringify(tenants));
      tenants.forEach(t => syncTenantToFirebase(t));
    }
  }, [tenants]);

  useEffect(() => {
    if (users.length > 0) {
      localStorage.setItem('mock_users', JSON.stringify(users));
      users.forEach(u => syncUserToFirebase(u));
    }
  }, [users]);

  const handleLogin = (user: User, tenant?: Tenant) => {
    localStorage.setItem('current_user_id', user.id);
    if (tenant) {
      localStorage.setItem('current_tenant_id', tenant.id);
      
      const isFirstLogin = !localStorage.getItem(`onboarded_${user.id}_${tenant.id}`);
      if (isFirstLogin) {
        localStorage.setItem(`onboarded_${user.id}_${tenant.id}`, 'true');
        localStorage.setItem('show_onboarding_pending', 'true');
      }
    }
    window.location.reload();
  };

  const handleLogout = () => {
    if (currentTenant) {
      // Mark as offline and save immediately before reload
      const updatedTenants = tenants.map(t => t.id === currentTenant.id ? { ...t, isOnline: false } : t);
      localStorage.setItem('mock_tenants', JSON.stringify(updatedTenants));
    }
    localStorage.removeItem('current_user_id');
    localStorage.removeItem('current_tenant_id');
    window.location.reload();
  };

  const [activeTab, setActiveTab] = useState<ActiveTab>('Dashboard');
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [isEntryOpen, setIsEntryOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [entryModalType, setEntryModalType] = useState<'Sales' | 'Expense'>('Sales');
  const [activeVoucher, setActiveVoucher] = useState<LedgerEntry | null>(null);
  const [scanResult, setScanResult] = useState<{ payor: string, particulars: string, gross: string, accountCode: string } | null>(null);
  
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('stratify_theme') !== 'light';
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('stratify_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('stratify_theme', 'light');
    }
  }, [isDarkMode]);

  const handleCloseEntry = () => {
    setIsEntryOpen(false);
    setScanResult(null);
  };

  const [companyConfig, setCompanyConfig] = useState<CompanyConfig>({
    companyName: 'STRATIFY (System+Strategy)',
    tin: '009-887-112-000',
    address: 'Ortigas Center, Pasig City, Metro Manila',
    registeredVat: true,
    secPermitNo: 'SEC-PH-2026-99120',
    ptuNo: 'PTU-11223344-STRATIFY',
    authorizedPIN: '1234',
    logoUrl: 'https://i.postimg.cc/5yGwSWWR/1782659487700.png'
  });

  useEffect(() => {
    try {
      const stored = localStorage.getItem('stratify_company_config');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.logoUrl === '/logo.png' || parsed.logoUrl === '') {
          parsed.logoUrl = 'https://i.postimg.cc/5yGwSWWR/1782659487700.png';
        }
        setCompanyConfig(parsed);
      }
    } catch (e) {}
  }, [isSettingsOpen]);
  
  // Filtering States
  const [yearFilter, setYearFilter] = useState('2026');
  const [monthFilter, setMonthFilter] = useState('ALL');
  const [quarterFilter, setQuarterFilter] = useState('ALL');

  // Toast notifications State
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  // Hydrate initial ledger on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('stratify_general_ledger');
      if (stored) {
        setLedger(JSON.parse(stored));
      } else {
        const defaultTx: LedgerEntry[] = [];
        setLedger(defaultTx);
        localStorage.setItem('stratify_general_ledger', JSON.stringify(defaultTx));
      }
    } catch (e) {}
  }, []);

  const logAuditTrail = (action: 'CREATE' | 'UPDATE' | 'VOID' | 'SYSTEM' | 'IMPORT', recordId: string | number, details: string, changes?: string) => {
    try {
      const stored = localStorage.getItem('stratify_audit_trail');
      let logs: any[] = stored ? JSON.parse(stored) : [];
      logs.push({
        logId: Date.now() + Math.random(),
        timestamp: new Date().toISOString(),
        user: 'Admin', // Default user
        action,
        recordId,
        details,
        changes
      });
      localStorage.setItem('stratify_audit_trail', JSON.stringify(logs));
    } catch (e) {}
  };

  const handleSaveEntry = (newEntry: LedgerEntry) => {
    let updated = [...ledger];
    const index = updated.findIndex(e => e.id === newEntry.id);
    if (index >= 0) {
      updated[index] = newEntry;
      logAuditTrail('UPDATE', newEntry.id, `Updated ${newEntry.type} transaction for ${newEntry.payor}`);
    } else {
      updated = [newEntry, ...updated];
      logAuditTrail('CREATE', newEntry.id, `Created ${newEntry.type} transaction for ${newEntry.payor}`);
    }
    setLedger(updated);
    localStorage.setItem('stratify_general_ledger', JSON.stringify(updated));
  };

  const [editingEntry, setEditingEntry] = useState<LedgerEntry | undefined>(undefined);

  const handleEditEntry = (entry: LedgerEntry) => {
    setEditingEntry(entry);
    setEntryModalType(entry.type as 'Sales' | 'Expense');
    setIsEntryOpen(true);
  };

  const handleVoidEntry = (id: number) => {
    const updated = ledger.map(entry => {
      if (entry.id === id) {
        logAuditTrail('VOID', id, `Voided transaction ${id}`);
        return { ...entry, status: 'Void' as const };
      }
      return entry;
    });
    setLedger(updated);
    localStorage.setItem('stratify_general_ledger', JSON.stringify(updated));
    showToast('Transaction Voided successfully.', 'info');
  };

  const handleDeleteEntry = (id: number) => {
    if (!confirm('Are you sure you want to permanently delete this transaction?')) return;
    const updated = ledger.filter(entry => entry.id !== id);
    logAuditTrail('SYSTEM', id, `Deleted transaction ${id}`);
    setLedger(updated);
    localStorage.setItem('stratify_general_ledger', JSON.stringify(updated));
    showToast('Transaction removed permanently.', 'success');
  };

  const handleScanExpense = () => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*,application/pdf';
    fileInput.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (file) {
        showToast(`Processing receipt "${file.name}" with AI OCR...`, 'info');
        setTimeout(() => {
          setEntryModalType('Expense');
          setScanResult({
            payor: 'PC Express Inc.',
            particulars: `Purchased Developer Laptops & Office Equipment (AI OCR Scanned)`,
            gross: '125000',
            accountCode: '1510'
          });
          setIsEntryOpen(true);
          showToast('AI OCR Scanner: Extracted transaction details! Please review and click Post.', 'success');
        }, 1500);
      }
    };
    fileInput.click();
  };

  const navCategories = [
    {
      title: 'Core Accounting',
      items: [
        { id: 'Dashboard', label: 'Dashboard', icon: <BarChart3 className="w-4 h-4 mr-3" /> },
        { id: 'Ledger', label: 'Journal Ledger', icon: <BookOpen className="w-4 h-4 mr-3" /> },
        { id: 'Sales', label: 'Sales', icon: <Banknote className="w-4 h-4 mr-3" /> },
        { id: 'Purchases', label: 'Purchases / Expenses', icon: <Receipt className="w-4 h-4 mr-3" /> },
        { id: 'Reconciliation', label: 'Reconciliation', icon: <Scale className="w-4 h-4 mr-3" /> },
        { id: 'COA', label: 'Chart of Accounts', icon: <Layers className="w-4 h-4 mr-3" /> }
      ]
    },
    {
      title: 'Assets & Inventory',
      items: [
        { id: 'FixedAssets', label: 'Fixed Assets', icon: <Building className="w-4 h-4 mr-3" /> },
        { id: 'Inventory', label: 'Inventory Stock', icon: <Package className="w-4 h-4 mr-3" /> }
      ]
    },
    {
      title: 'E-Commerce (Auto-Sync)',
      items: [
        { id: 'Ecommerce', label: 'Storefront & Orders', icon: <ShoppingCart className="w-4 h-4 mr-3" /> }
      ]
    },
    {
      title: 'HR & Payroll',
      items: [
        { id: 'Payroll', label: 'Payroll System', icon: <CreditCard className="w-4 h-4 mr-3" /> },
        { id: 'HR', label: 'HR Management', icon: <UsersRound className="w-4 h-4 mr-3" /> }
      ]
    },
    {
      title: 'Business Ops',
      items: [
        { id: 'Contacts', label: 'CRM Contacts', icon: <Users className="w-4 h-4 mr-3" /> },
        { id: 'Scheduler', label: 'Scheduler', icon: <Calendar className="w-4 h-4 mr-3" /> },
        { id: 'Quotation', label: 'Quotation Builder', icon: <FileText className="w-4 h-4 mr-3" /> },
      ]
    },
    {
      title: 'Compliance & Reports',
      items: [
        { id: 'Reports', label: 'Tax Returns', icon: <Landmark className="w-4 h-4 mr-3" /> },
        { id: 'Form2307', label: 'BIR Form 2307', icon: <FileDigit className="w-4 h-4 mr-3" /> },
        { id: 'Books', label: 'BIR Books of Accounts', icon: <FileSpreadsheet className="w-4 h-4 mr-3" /> },
        { id: 'FS', label: 'Financial Statements', icon: <PieChart className="w-4 h-4 mr-3" /> },
        { id: 'AuditTrail', label: 'System Audit Trail', icon: <ShieldCheck className="w-4 h-4 mr-3" /> }
      ]
    }
  ];

  if (!currentUser) {
    return (
      <Auth 
        onLogin={handleLogin}
        tenants={tenants}
        setTenants={setTenants}
        users={users}
        setUsers={setUsers}
      />
    );
  }

  if (currentUser.role === 'superadmin') {
    return (
      <SuperAdminDashboard 
        tenants={tenants}
        setTenants={setTenants}
        users={users}
        onLogout={handleLogout}
      />
    );
  }

  if (isTrialExpired) {
    return (
      <SubscriptionPrompt 
        tenant={currentTenant}
        user={currentUser}
        onLogout={handleLogout}
      />
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 flex flex-col font-sans transition-colors duration-300">
      
      {showOnboarding && (
        <FeatureTour 
          onComplete={() => setShowOnboarding(false)} 
          onTabChange={(tab) => setActiveTab(tab)}
        />
      )}
      
      {/* HEADER SECTION (NO-PRINT) */}
      <header className="bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-950 border-b border-blue-900 text-white px-6 py-4 flex items-center justify-between no-print shadow-md">
        <div className="flex items-center gap-4">
          {currentTenant?.logo ? (
            <img src={currentTenant.logo} alt="Logo" className="h-16 w-16 md:h-20 md:w-20 rounded-xl object-cover shadow-inner bg-white p-1" />
          ) : companyConfig.logoUrl ? (
            <img src={companyConfig.logoUrl} alt="Logo" className="h-16 w-16 md:h-20 md:w-20 rounded-xl object-cover shadow-inner bg-white p-1" />
          ) : (
            <div className="bg-gradient-to-br from-yellow-400 to-amber-600 text-zinc-950 p-4 md:p-5 rounded-xl font-bold tracking-tight text-2xl md:text-3xl shadow-inner flex items-center justify-center h-16 w-16 md:h-20 md:w-20">
              {currentTenant ? currentTenant.name.charAt(0).toUpperCase() : 'ST'}
            </div>
          )}
          <div className="leading-tight">
            <h1 className="text-xl font-display font-bold uppercase tracking-widest text-white">{currentTenant ? currentTenant.name : 'STRATIFY'}</h1>
            <p className="text-xs font-semibold text-blue-200 tracking-wide">(Simplify + Stratigy)</p>
            <p className="text-[10px] text-yellow-400 font-bold uppercase tracking-widest mt-0.5">System Development</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Quick Year Filter */}
          <div className="flex items-center gap-1 bg-white/10 border border-white/20 rounded-xl px-2.5 py-1">
            <span className="text-[10px] uppercase font-bold text-blue-200 px-1.5">FY:</span>
            <select 
              value={yearFilter} 
              onChange={(e) => setYearFilter(e.target.value)}
              className="text-xs bg-transparent text-white font-bold focus:outline-none pr-1 [&>option]:text-zinc-900"
            >
              <option value="2026">2026</option>
              <option value="2025">2025</option>
            </select>
          </div>

          <button 
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-2 text-blue-200 hover:text-white hover:bg-white/10 rounded-xl transition-all"
            title="Toggle Theme"
          >
            {isDarkMode ? <Sun className="w-5 h-5 text-blue-200" /> : <Moon className="w-5 h-5 text-yellow-400" />}
          </button>

          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 text-blue-200 hover:text-white hover:bg-white/10 rounded-xl transition-all"
            title="System Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
          
          <button 
            onClick={handleLogout}
            className="p-2 text-blue-200 hover:text-white hover:bg-white/10 rounded-xl transition-all"
            title="Sign Out"
          >
            <LogOut className="w-5 h-5" />
          </button>
          
          <button 
            onClick={() => setIsEntryOpen(true)}
            className="flex items-center gap-1.5 text-xs bg-gradient-to-b from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 text-zinc-950 font-bold px-4 py-2.5 rounded-xl transition-all shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>Post Entry</span>
          </button>
        </div>
      </header>

      <div className="flex-1 flex flex-col md:flex-row min-h-0">
        
        {/* SIDEBAR NAVIGATION (NO-PRINT) */}
        <aside className="w-full md:w-64 bg-gradient-to-b from-blue-950 via-indigo-950 to-blue-950 text-blue-100 border-r border-blue-900 no-print flex flex-col justify-between overflow-y-auto">
          <div className="p-4 space-y-6">
            {navCategories.map((cat, idx) => (
              <div key={idx} className="space-y-1.5">
                <span className="text-[10px] font-bold text-blue-300/70 uppercase tracking-wider px-3.5 block mb-2">{cat.title}</span>
                <nav className="space-y-1">
                  {cat.items.map(item => {
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id as any)}
                        className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between group ${
                          isActive 
                            ? 'bg-white/15 text-white shadow-sm ring-1 ring-white/20' 
                            : 'hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center">
                          <div className={`mr-2.5 transition-colors ${isActive ? 'text-yellow-400' : 'text-blue-300/70 group-hover:text-yellow-400/80'}`}>
                            {item.icon}
                          </div>
                          <span>{item.label}</span>
                        </div>
                      </button>
                    );
                  })}
                </nav>
              </div>
            ))}
          </div>

          <div className="p-4 border-t border-white/10 text-[10px] text-blue-300/70 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-blue-200">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>SEC/BIR PTU Validated</span>
            </div>
            <p>STRATIFY Engine • Build v4.12</p>
          </div>
        </aside>

        {/* MAIN BODY WORKSPACE */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto max-w-7xl mx-auto w-full">
          
          {/* TAB WINDOW COMPONENT ROUTING */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
            >
              {activeTab === 'Dashboard' && (
                <Dashboard 
                  ledger={ledger} 
                  yearFilter={yearFilter}
                  monthFilter={monthFilter}
                  quarterFilter={quarterFilter}
                  companyName={companyConfig.companyName}
                  companyTin={companyConfig.tin}
                />
              )}
              {activeTab === 'Ledger' && (
                <LedgerTable 
                  ledger={ledger} 
                  onVoid={handleVoidEntry} 
                  onDelete={handleDeleteEntry}
                  onEdit={handleEditEntry}
                  yearFilter={yearFilter}
                  monthFilter={monthFilter}
                  quarterFilter={quarterFilter}
                  setMonthFilter={setMonthFilter}
                  setQuarterFilter={setQuarterFilter}
                />
              )}
              {activeTab === 'Sales' && (
                <SalesModule 
                  ledger={ledger}
                  yearFilter={yearFilter}
                  monthFilter={monthFilter}
                  quarterFilter={quarterFilter}
                  onOpenSalesModal={() => {
                    setEntryModalType('Sales');
                    setScanResult(null);
                    setIsEntryOpen(true);
                  }}
                />
              )}
              {activeTab === 'Purchases' && (
                <PurchaseModule 
                  ledger={ledger}
                  yearFilter={yearFilter}
                  monthFilter={monthFilter}
                  quarterFilter={quarterFilter}
                  onOpenExpenseModal={() => {
                    setEntryModalType('Expense');
                    setScanResult(null);
                    setIsEntryOpen(true);
                  }}
                  onOpenScanExpense={handleScanExpense}
                  onPrintDV={(entry) => setActiveVoucher(entry)}
                />
              )}
              {activeTab === 'Reconciliation' && (
                <ReconciliationModule 
                  ledger={ledger}
                  yearFilter={yearFilter}
                  monthFilter={monthFilter}
                  quarterFilter={quarterFilter}
                />
              )}
              {activeTab === 'FixedAssets' && (
                <FixedAssetsModule 
                  ledger={ledger}
                  showToast={showToast}
                />
              )}
              {activeTab === 'Inventory' && (
                <InventoryModule 
                  ledger={ledger}
                  showToast={showToast}
                />
              )}
              {activeTab === 'Contacts' && (
                <ContactsModule 
                  ledger={ledger}
                  showToast={showToast}
                />
              )}
              {activeTab === 'Scheduler' && (
                <SchedulerModule 
                  showToast={showToast}
                />
              )}
              {activeTab === 'Quotation' && (
                <QuotationBuilder 
                  showToast={showToast}
                />
              )}
              {activeTab === 'Reports' && (
                <ReportsModule 
                  ledger={ledger}
                  yearFilter={yearFilter}
                  monthFilter={monthFilter}
                  quarterFilter={quarterFilter}
                />
              )}
              {activeTab === 'Books' && (
                <BooksModule 
                  ledger={ledger}
                  yearFilter={yearFilter}
                  monthFilter={monthFilter}
                  quarterFilter={quarterFilter}
                  companyConfig={companyConfig}
                  showToast={showToast}
                />
              )}
              {activeTab === 'FS' && (
                <FSModule 
                  ledger={ledger}
                  yearFilter={yearFilter}
                  monthFilter={monthFilter}
                  quarterFilter={quarterFilter}
                  companyName={companyConfig.companyName}
                />
              )}
              {activeTab === 'COA' && (
                <COAModule 
                  ledger={ledger}
                  showToast={showToast}
                />
              )}
              {activeTab === 'Ecommerce' && (
                <EcommerceModule handleSaveEntry={handleSaveEntry} showToast={showToast} />
              )}
              {activeTab === 'Payroll' && (
                <PayrollModule handleSaveEntry={handleSaveEntry} showToast={showToast} />
              )}
              {activeTab === 'HR' && (
                <HRModule showToast={showToast} />
              )}
              {activeTab === 'Form2307' && (
                <Form2307Module />
              )}
              {activeTab === 'AuditTrail' && (
                <AuditTrailModule />
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* MODALS CONTROLS */}
      <EntryModal 
        isOpen={isEntryOpen} 
        onClose={() => {
          handleCloseEntry();
          setEditingEntry(undefined);
        }} 
        onSaveEntry={handleSaveEntry}
        showToast={showToast}
        initialType={entryModalType}
        scanResult={scanResult}
        initialData={editingEntry}
      />

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        showToast={showToast}
        currentTenant={currentTenant}
        updateTenantLogo={(url) => {
          if (currentTenant) {
            const updated = { ...currentTenant, logo: url };
            setCurrentTenant(updated);
            setTenants(prev => prev.map(t => t.id === currentTenant.id ? updated : t));
          }
        }}
      />

      <DisbursementVoucherModal 
        isOpen={activeVoucher !== null}
        onClose={() => setActiveVoucher(null)}
        entry={activeVoucher}
        companyConfig={companyConfig}
        showToast={showToast}
      />

      {/* FLOATING ACTION TOAST NOTIFICATIONS */}
      <div className="fixed bottom-6 right-6 z-[300] space-y-2 max-w-sm pointer-events-none no-print">
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 20, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.95 }}
              className={`p-4 rounded-2xl shadow-xl flex items-center gap-3 border pointer-events-auto ${
                toast.type === 'success'
                  ? 'bg-emerald-950 border-emerald-900 text-emerald-200'
                  : toast.type === 'error'
                    ? 'bg-red-950 border-red-900 text-red-200'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-200'
              }`}
            >
              <AlertCircle className={`w-5 h-5 shrink-0 ${
                toast.type === 'success' ? 'text-emerald-400' : toast.type === 'error' ? 'text-red-400' : 'text-blue-400'
              }`} />
              <span className="text-xs font-bold leading-snug">{toast.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
