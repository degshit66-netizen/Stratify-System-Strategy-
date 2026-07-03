import React, { useState, useEffect, useMemo } from 'react';
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
  Menu,
  X,
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
  HardHat,
  ShieldAlert
} from 'lucide-react';

import { LedgerEntry, CompanyConfig, User, Tenant, SchedulerTask, SystemAnnouncement } from './types';
import { r2, parseNum, cleanDate } from './utils/helpers';
import { getCompleteChartOfAccounts } from './data/chartOfAccounts';

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
import { DisbursementVoucherModal } from './components/DisbursementVoucherModal';
import { AuditTrailModule } from './components/AuditTrailModule';
import { Auth } from './components/Auth';
import { SuperAdminDashboard } from './components/SuperAdminDashboard';
import { FeatureTour } from './components/FeatureTour';
import { SubscriptionPrompt } from './components/SubscriptionPrompt';
import { useTrialMonitor } from './hooks/useTrialMonitor';
import { loadTenantsFromFirebase, loadUsersFromFirebase, syncTenantToFirebase, syncUserToFirebase, loadStorageFromFirebase, loadConfigFromFirebase } from './lib/db';

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
  // --- States ---
  const [stratifyTasks, setStratifyTasks] = useState<SchedulerTask[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [logoError, setLogoError] = useState(false);
  const [announcements, setAnnouncements] = useState<SystemAnnouncement[]>([]);
  const [isInitializing, setIsInitializing] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>('Dashboard');
  const [isViewingAsAdmin, setIsViewingAsAdmin] = useState(false);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [isEntryOpen, setIsEntryOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [entryModalType, setEntryModalType] = useState<'Sales' | 'Expense'>('Sales');
  const [activeVoucher, setActiveVoucher] = useState<LedgerEntry | null>(null);
  const [scanResult, setScanResult] = useState<{ payor: string, particulars: string, gross: string, accountCode: string, tin?: string } | null>(null);
  const [lockedMonths, setLockedMonths] = useState<Record<string, boolean>>({});
  const [lockedQuarters, setLockedQuarters] = useState<Record<string, boolean>>({});
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('stratify_theme') !== 'light');
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [companyConfig, setCompanyConfig] = useState<CompanyConfig>({
    companyName: 'STRATIFY (Strategy + Simplify)',
    tin: '009-887-112-000',
    address: 'Ortigas Center, Pasig City, Metro Manila',
    registeredVat: true,
    secPermitNo: 'SEC-PH-2026-99120',
    ptuNo: 'PTU-11223344-STRATIFY',
    authorizedPIN: '1234',
    logoUrl: 'https://i.postimg.cc/5yGwSWWR/1782659487700.png'
  });
  const [yearFilter, setYearFilter] = useState(() => new Date().getFullYear().toString());
  const [monthFilter, setMonthFilter] = useState('ALL');
  const [quarterFilter, setQuarterFilter] = useState('ALL');
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [editingEntry, setEditingEntry] = useState<LedgerEntry | undefined>(undefined);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // --- Custom Hooks ---
  const { isTrialExpired } = useTrialMonitor(currentTenant);

  // --- Memoized Values ---
  const coa = useMemo(() => Object.entries(getCompleteChartOfAccounts()).map(([code, value]) => ({ ...value, code })), []);

  const dynamicYears = useMemo(() => {
    const yearsSet = new Set<string>();
    const currentYearStr = new Date().getFullYear().toString();
    yearsSet.add(currentYearStr);
    
    ledger.forEach(entry => {
      if (entry.date) {
        try {
          const yr = new Date(entry.date).getFullYear().toString();
          if (!isNaN(Number(yr)) && Number(yr) > 1900) {
            yearsSet.add(yr);
          }
        } catch (e) {}
      }
    });

    return Array.from(yearsSet).sort((a, b) => Number(b) - Number(a));
  }, [ledger]);

  const notifications = useMemo(() => {
    const notifs: { id: string; type: 'task' | 'subscription' | 'system'; title: string; desc: string; severity: 'high' | 'medium' | 'info' }[] = [];

    stratifyTasks.forEach(t => {
      if (t.status !== 'Done') {
        const due = new Date(t.dueDate);
        due.setHours(0, 0, 0, 0);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const diffTime = due.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays < 0) {
          notifs.push({
            id: `task-overdue-${t.id}`,
            type: 'task',
            title: `Overdue Event Alert`,
            desc: `"${t.title}" was due on ${cleanDate(t.dueDate)} (${Math.abs(diffDays)} days overdue).`,
            severity: 'high'
          });
        } else if (diffDays <= 5) {
          notifs.push({
            id: `task-soon-${t.id}`,
            type: 'task',
            title: `Deadline Approaching`,
            desc: `"${t.title}" is due in ${diffDays} day${diffDays === 1 ? '' : 's'} (${cleanDate(t.dueDate)}).`,
            severity: 'medium'
          });
        }
      }
    });

    if (currentTenant) {
      const trialEnd = new Date(currentTenant.trialEndsAt);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      trialEnd.setHours(0, 0, 0, 0);
      const diffTime = trialEnd.getTime() - today.getTime();
      const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (daysRemaining <= 10 && daysRemaining > 0) {
        notifs.push({
          id: `tenant-expire-${currentTenant.id}`,
          type: 'subscription',
          title: `Subscription Renewal Warning`,
          desc: `Your subscription for organization "${currentTenant.name}" expires in ${daysRemaining} days (${cleanDate(currentTenant.trialEndsAt)}).`,
          severity: 'high'
        });
      } else if (daysRemaining <= 0) {
        notifs.push({
          id: `tenant-expired-${currentTenant.id}`,
          type: 'subscription',
          title: `Subscription Expired`,
          desc: `Your organization's active subscription period has lapsed. Please renew billing to retain team access.`,
          severity: 'high'
        });
      }
    }

    // Admin visibility for other expiring tenants
    if (currentUser?.role === 'superadmin' && tenants.length > 0) {
      tenants.forEach(tenant => {
        if (tenant.id !== currentTenant?.id) {
          const trialEnd = new Date(tenant.trialEndsAt);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          trialEnd.setHours(0, 0, 0, 0);
          const diffTime = trialEnd.getTime() - today.getTime();
          const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          if (daysRemaining <= 10 && daysRemaining > 0) {
            notifs.push({
              id: `tenant-expire-admin-${tenant.id}`,
              type: 'subscription',
              title: `Admin Alert: Tenant Expiring`,
              desc: `The subscriber group "${tenant.name}" is expiring in ${daysRemaining} days (${cleanDate(tenant.trialEndsAt)}).`,
              severity: 'medium'
            });
          }
        }
      });
    }

    return notifs;
  }, [stratifyTasks, currentTenant, currentUser, tenants]);

  // --- Effects ---

  useEffect(() => {
    const fetchAnnouncements = async () => {
      const saved = await loadConfigFromFirebase('stratify_announcements');
      if (saved) {
        setAnnouncements(JSON.parse(saved));
      }
    };
    fetchAnnouncements();
  }, [currentUser]);

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
               if (t) {
                  await loadStorageFromFirebase(tid);
                  setCurrentTenant(t);
               }
            }
         }
      }

      if (localStorage.getItem('show_onboarding_pending') === 'true') {
         setShowOnboarding(true);
         localStorage.removeItem('show_onboarding_pending');
      }

      setIsInitializing(false);
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



  // Hydrate task schedule on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('stratify_tasks');
      if (stored) {
        setStratifyTasks(JSON.parse(stored));
      } else {
        const defaults: SchedulerTask[] = [
          { id: 1, title: 'BIR 2550M (Monthly Value-Added Tax Declaration)', dueDate: `${new Date().getFullYear()}-07-20`, module: 'Value-Added Tax', status: 'Open' },
          { id: 2, title: 'Annual Income Tax 1702 Return Compilation', dueDate: `${new Date().getFullYear()}-04-15`, module: 'Income Tax', status: 'Done' },
          { id: 3, title: 'Monthly SEC/BIR S.A.S. Submission', dueDate: `${new Date().getFullYear()}-07-10`, module: 'Financial Statements', status: 'In Progress' },
          { id: 4, title: 'Submit Bound Loose-Leaf Books (Affidavit Annex C)', dueDate: `${new Date().getFullYear()}-01-30`, module: 'Loose Leaf Compliance', status: 'Open' }
        ];
        setStratifyTasks(defaults);
        localStorage.setItem('stratify_tasks', JSON.stringify(defaults));
      }
    } catch (e) {}
  }, []);

  const handleUpdateLocks = (nextMonths: Record<string, boolean>, nextQuarters: Record<string, boolean>) => {
    if (currentTenant) {
      setLockedMonths(nextMonths);
      setLockedQuarters(nextQuarters);
      localStorage.setItem(`stratify_locked_months_${currentTenant.id}`, JSON.stringify(nextMonths));
      localStorage.setItem(`stratify_locked_quarters_${currentTenant.id}`, JSON.stringify(nextQuarters));
      showToast('Period lock settings saved successfully.', 'success');
      logAuditTrail('SYSTEM', 'LOCKS', 'Updated period locks: ' + JSON.stringify({ months: nextMonths, quarters: nextQuarters }));
    }
  };
  


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



  useEffect(() => {
    try {
      const stored = localStorage.getItem('stratify_company_config');
      if (stored) {
        const parsed = JSON.parse(stored);
        
        // Migration: Clear hardcoded 'Degz hub enterprises' if found in storage
        if (parsed.companyName && parsed.companyName.toLowerCase().includes('degz hub')) {
          localStorage.removeItem('stratify_company_config');
          setCompanyConfig({
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
        setCompanyConfig(parsed);
      }
    } catch (e) {}
  }, [isSettingsOpen]);
  




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
      if (currentTenant) {
        const key = `stratify_general_ledger_${currentTenant.id}`;
        const stored = localStorage.getItem(key);
        if (stored) {
          setLedger(JSON.parse(stored));
        } else {
          const defaultTx: LedgerEntry[] = [];
          setLedger(defaultTx);
          localStorage.setItem(key, JSON.stringify(defaultTx));
        }

        // Hydrate period locks
        const lockMonthsKey = `stratify_locked_months_${currentTenant.id}`;
        const lockQuartersKey = `stratify_locked_quarters_${currentTenant.id}`;
        const storedMonths = localStorage.getItem(lockMonthsKey);
        const storedQuarters = localStorage.getItem(lockQuartersKey);
        setLockedMonths(storedMonths ? JSON.parse(storedMonths) : {});
        setLockedQuarters(storedQuarters ? JSON.parse(storedQuarters) : {});
      } else {
        setLedger([]);
        setLockedMonths({});
        setLockedQuarters({});
      }
    } catch (e) {}
  }, [currentTenant]);

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
    if (currentTenant) {
      localStorage.setItem(`stratify_general_ledger_${currentTenant.id}`, JSON.stringify(updated));
    }
  };



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
    if (currentTenant) {
      localStorage.setItem(`stratify_general_ledger_${currentTenant.id}`, JSON.stringify(updated));
    }
    showToast('Transaction Voided successfully.', 'info');
  };

  const handleDeleteEntry = (id: number) => {
    const updated = ledger.filter(entry => entry.id !== id);
    logAuditTrail('SYSTEM', id, `Deleted transaction ${id}`);
    setLedger(updated);
    if (currentTenant) {
      localStorage.setItem(`stratify_general_ledger_${currentTenant.id}`, JSON.stringify(updated));
    }
    showToast('Transaction removed permanently.', 'success');
  };

  const handleScanExpense = () => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (file) {
        showToast(`Processing receipt "${file.name}" with AI OCR...`, 'info');
        
        try {
          // Convert file to base64
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = async () => {
            const base64Data = (reader.result as string).split(',')[1];
            
            const response = await fetch("/api/scan-receipt", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                image: base64Data,
                mimeType: file.type,
              }),
            });
            
            if (!response.ok) {
              throw new Error("Failed to process image");
            }
            
            const data = await response.json();
            // Try to parse the markdown JSON block returned by Gemini
            const textResult = data.result.replace(/```json\n/g, '').replace(/```/g, '').trim();
            const parsed = JSON.parse(textResult);

            setEntryModalType('Expense');
            setScanResult({
              payor: parsed.payor || 'Unknown Payor',
              particulars: parsed.particulars || 'AI Scanned Expense',
              gross: parsed.gross || '0',
              accountCode: '5000' // Default to a general expense code, they can change it
            });
            setIsEntryOpen(true);
            showToast('AI OCR Scanner: Extracted transaction details! Please review and click Post.', 'success');
          };
        } catch (error) {
          console.error(error);
          showToast('Failed to analyze receipt. Please try again or enter manually.', 'error');
        }
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
        { id: 'Purchases', label: 'Purchases', icon: <Receipt className="w-4 h-4 mr-3" /> },
        { id: 'Reconciliation', label: 'Reconciliation', icon: <Scale className="w-4 h-4 mr-3" /> },
        { id: 'COA', label: 'Chart of Accounts', icon: <Layers className="w-4 h-4 mr-3" /> }
      ]
    },
    (currentTenant?.modules?.fixedAssets !== false || currentTenant?.modules?.inventory !== false) ? {
      title: 'Assets & Inventory',
      items: [
        ...(currentTenant?.modules?.fixedAssets !== false ? [{ id: 'FixedAssets', label: 'Fixed Assets', icon: <Building className="w-4 h-4 mr-3" /> }] : []),
        ...(currentTenant?.modules?.inventory !== false ? [{ id: 'Inventory', label: 'Inventory Stock', icon: <Package className="w-4 h-4 mr-3" /> }] : [])
      ]
    } : null,
    currentTenant?.modules?.ecommerce !== false ? {
      title: 'E-Commerce (Auto-Sync)',
      items: [
        { id: 'Ecommerce', label: 'Storefront & Orders', icon: <ShoppingCart className="w-4 h-4 mr-3" /> }
      ]
    } : null,
    currentTenant?.modules?.payroll !== false ? {
      title: 'HR & Payroll',
      items: [
        { id: 'Payroll', label: 'Payroll System', icon: <CreditCard className="w-4 h-4 mr-3" /> },
        { id: 'HR', label: 'HR Management', icon: <UsersRound className="w-4 h-4 mr-3" /> }
      ]
    } : null,
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
        { id: 'Books', label: 'BIR Books of Accounts', icon: <FileSpreadsheet className="w-4 h-4 mr-3" /> },
        { id: 'FS', label: 'Financial Statements', icon: <PieChart className="w-4 h-4 mr-3" /> },
        { id: 'AuditTrail', label: 'System Audit Trail', icon: <ShieldCheck className="w-4 h-4 mr-3" /> }
      ]
    }
  ].filter(Boolean) as { title: string, items: { id: string, label: string, icon: any }[] }[];

  if (isInitializing) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-zinc-950 text-white">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-zinc-400 font-medium animate-pulse tracking-wide uppercase text-sm">Loading STRATIFY Workspace...</p>
      </div>
    );
  }

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

  if (currentUser.role === 'superadmin' && !isViewingAsAdmin) {
    return (
      <SuperAdminDashboard 
        tenants={tenants}
        setTenants={setTenants}
        users={users}
        onLogout={handleLogout}
        onSelectTenant={async (tenant) => {
          setCurrentTenant(tenant);
          setIsViewingAsAdmin(true);
          localStorage.setItem('current_tenant_id', tenant.id);
          await loadStorageFromFirebase(tenant.id);
          showToast(`Now managing ${tenant.name} workspace as Super Admin.`, 'info');
        }}
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
    <div className="h-screen h-[100dvh] overflow-hidden bg-white dark:bg-zinc-950 flex flex-col font-sans transition-colors duration-300 overscroll-none">
      
      {showOnboarding && (
        <FeatureTour 
          onComplete={() => setShowOnboarding(false)} 
          onTabChange={(tab) => setActiveTab(tab)}
        />
      )}
      
      {/* HEADER SECTION (NO-PRINT) */}
      <header className="bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-950 border-b border-blue-900 text-white px-4 md:px-6 py-3 md:py-4 flex items-center justify-between no-print shadow-md shrink-0 z-40">
        <div className="flex items-center gap-3 md:gap-4">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="md:hidden p-2 text-blue-200 hover:text-white hover:bg-white/10 rounded-xl transition-all"
          >
            {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <img 
            src={currentTenant?.logo || companyConfig.logoUrl || 'https://i.postimg.cc/5yGwSWWR/1782659487700.png'} 
            alt="Logo" 
            className="h-10 w-10 md:h-14 md:w-14 rounded-xl md:rounded-2xl object-cover shadow-md shrink-0"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://i.postimg.cc/5yGwSWWR/1782659487700.png';
            }}
          />
          <div className="leading-tight">
            <h1 className="text-base md:text-xl font-display font-bold uppercase tracking-widest text-white">{currentTenant ? currentTenant.name : 'STRATIFY'}</h1>
            <p className="text-[10px] md:text-xs font-semibold text-blue-200 tracking-wide">(Strategy + Simplify)</p>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          {currentUser.role === 'superadmin' && (
            <button 
              onClick={() => setIsViewingAsAdmin(false)}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md shadow-rose-900/20 ring-2 ring-rose-500/50"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              Exit Admin Session
            </button>
          )}

          {/* Quick Year Filter - Hidden on small mobile */}
          <div className="hidden sm:flex items-center gap-1 bg-white/10 border border-white/20 rounded-xl px-2.5 py-1">
            <span className="text-[10px] uppercase font-bold text-blue-200 px-1.5">FY:</span>
            <select 
              value={yearFilter} 
              onChange={(e) => setYearFilter(e.target.value)}
              className="text-xs bg-transparent text-white font-bold focus:outline-none pr-1 [&>option]:text-zinc-900"
            >
              {dynamicYears.map(yr => (
                <option key={yr} value={yr}>{yr}</option>
              ))}
            </select>
          </div>

          <div className="relative">
            <button 
              onClick={() => setIsNotificationOpen(!isNotificationOpen)}
              className="p-2 text-blue-200 hover:text-white hover:bg-white/10 rounded-xl transition-all relative"
              title="Notifications"
            >
              <Bell className="w-5 h-5" />
              {notifications.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4.5 h-4.5 bg-rose-500 text-[8px] font-extrabold rounded-full flex items-center justify-center text-white ring-2 ring-blue-900 animate-pulse">
                  {notifications.length}
                </span>
              )}
            </button>
            
            {isNotificationOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl z-50 text-zinc-800 dark:text-zinc-100 overflow-hidden text-left">
                <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/40 flex items-center justify-between">
                  <h4 className="text-xs font-extrabold uppercase tracking-widest text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                    <Bell className="w-4 h-4 text-amber-500" /> Notifications & Alerts
                  </h4>
                  {notifications.length > 0 && (
                    <span className="text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-400 px-2 py-0.5 rounded-full">
                      {notifications.length} Active
                    </span>
                  )}
                </div>
                
                <div className="max-h-72 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800/80">
                  {notifications.length > 0 ? (
                    notifications.map(notif => (
                      <div key={notif.id} className="p-3.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/25 transition-colors space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <span className={`text-[10px] font-extrabold uppercase tracking-wider ${
                            notif.severity === 'high' 
                              ? 'text-red-500' 
                              : notif.severity === 'medium' 
                                ? 'text-amber-500' 
                                : 'text-blue-500'
                          }`}>
                            {notif.title}
                          </span>
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 mt-1 ${
                            notif.severity === 'high' 
                              ? 'bg-red-500' 
                              : notif.severity === 'medium' 
                                ? 'bg-amber-500' 
                                : 'bg-blue-500'
                          }`}></span>
                        </div>
                        <p className="text-xs text-zinc-600 dark:text-zinc-300 font-medium leading-relaxed">
                          {notif.desc}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-zinc-400 dark:text-zinc-500 italic space-y-2">
                      <div className="text-2xl">✨</div>
                      <p className="text-xs font-semibold">All systems fully operational</p>
                      <p className="text-[10px]">No pending task deadlines or expiring subscription warnings found.</p>
                    </div>
                  )}
                </div>
                
                <div className="p-2 border-t border-zinc-100 dark:border-zinc-800 text-center bg-zinc-50/50 dark:bg-zinc-950/20">
                  <button 
                    onClick={() => {
                      setActiveTab('Scheduler');
                      setIsNotificationOpen(false);
                    }}
                    className="text-[10px] font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 font-sans"
                  >
                    Open Business Scheduler →
                  </button>
                </div>
              </div>
            )}
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

      {/* SYSTEM ANNOUNCEMENTS */}
      {announcements.filter(a => a.active).map(ann => (
        <div key={ann.id} className={`w-full px-6 py-2.5 flex items-center justify-between text-sm shadow-sm z-20 shrink-0
          ${ann.type === 'info' ? 'bg-blue-600 text-white' : ''}
          ${ann.type === 'warning' ? 'bg-amber-500 text-white' : ''}
          ${ann.type === 'success' ? 'bg-emerald-600 text-white' : ''}
        `}>
          <div className="flex items-center gap-3">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <div>
              <span className="font-bold mr-2">{ann.title}:</span>
              <span>{ann.message}</span>
            </div>
          </div>
        </div>
      ))}

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        
        {/* SIDEBAR NAVIGATION (NO-PRINT) */}
        <aside className={`
          fixed md:relative inset-0 md:inset-auto z-40 md:z-auto
          w-64 bg-gradient-to-b from-blue-950 via-indigo-950 to-blue-950 text-blue-100 border-r border-blue-900 no-print 
          flex flex-col justify-between overflow-y-auto shrink-0 h-full overscroll-contain
          transition-transform duration-300 ease-in-out
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}>
          <div className="p-4 space-y-6">
            <div className="flex md:hidden items-center justify-between mb-4 px-2">
              <span className="text-[10px] font-bold text-blue-300 uppercase tracking-widest">Navigation</span>
              <button onClick={() => setIsSidebarOpen(false)} className="p-1.5 text-blue-300 hover:text-white hover:bg-white/10 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            {navCategories.map((cat, idx) => (
              <div key={idx} className="space-y-1.5">
                <span className="text-[10px] font-bold text-blue-300/70 uppercase tracking-wider px-3.5 block mb-2">{cat.title}</span>
                <nav className="space-y-1">
                  {cat.items.map(item => {
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setActiveTab(item.id as any);
                          setIsSidebarOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between group ${
                          isActive 
                            ? 'bg-white/15 text-white shadow-sm ring-1 ring-white/20' 
                            : 'hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center">
                          <div className={`mr-3 transition-colors ${isActive ? 'text-yellow-400' : 'text-blue-300/70 group-hover:text-yellow-400/80'}`}>
                            {React.cloneElement(item.icon, { className: 'w-4 h-4' })}
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

        {/* MOBILE OVERLAY */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-30 md:hidden backdrop-blur-sm transition-opacity"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* MAIN BODY WORKSPACE */}
        <main className="flex-1 p-4 md:p-5 overflow-y-auto max-w-7xl mx-auto w-full overscroll-contain">
          
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
                  lockedMonths={lockedMonths}
                  lockedQuarters={lockedQuarters}
                  onUpdateLocks={handleUpdateLocks}
                  authorizedPIN={companyConfig.authorizedPIN}
                  currentUserRole={currentUser?.role}
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
                  coa={coa}
                  showToast={showToast}
                />
              )}
              {activeTab === 'Inventory' && (
                <InventoryModule 
                  ledger={ledger}
                  coa={coa}
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
                  tasks={stratifyTasks}
                  setTasks={(nextTasks) => {
                    setStratifyTasks(nextTasks);
                    localStorage.setItem('stratify_tasks', JSON.stringify(nextTasks));
                  }}
                  companyConfig={companyConfig}
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
                  companyConfig={companyConfig}
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
        ledger={ledger}
      />

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        showToast={showToast}
        currentTenant={currentTenant}
        users={users}
        setUsers={setUsers}
        ledger={ledger}
        onImportLedger={(entries) => {
          setLedger(entries);
          if (currentTenant) {
            localStorage.setItem(`stratify_general_ledger_${currentTenant.id}`, JSON.stringify(entries));
          }
        }}
        onUpdateTenant={(updated) => {
          setCurrentTenant(updated);
          setTenants(prev => prev.map(t => t.id === updated.id ? updated : t));
        }}
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
