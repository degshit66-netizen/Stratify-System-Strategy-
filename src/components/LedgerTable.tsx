import React from 'react';
import { motion } from 'motion/react';
import { 
  Edit2, 
  Trash2, 
  FileText, 
  Search, 
  Paperclip,
  CheckCircle,
  XCircle,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Wallet,
  Lock,
  Unlock,
  Key,
  Printer
} from 'lucide-react';
import { LedgerEntry } from '../types';
import { displayMoney, formatCurrency, cleanDate, isMonthLocked } from '../utils/helpers';

interface LedgerTableProps {
  ledger: LedgerEntry[];
  currentUserRole?: string;
  yearFilter: string;
  monthFilter: string;
  quarterFilter: string;
  searchQuery?: string;
  onEdit?: (entry: LedgerEntry) => void;
  onVoid: (id: number) => void;
  onDelete?: (id: number) => void;
  onPrintDV?: (entry: LedgerEntry) => void;
  lockedQuarters?: Record<string, boolean>;
  lockedMonths?: Record<string, boolean>;
  onUpdateLocks?: (months: Record<string, boolean>, quarters: Record<string, boolean>) => void;
  authorizedPIN?: string;
  setSearchQuery?: (query: string) => void;
  setMonthFilter?: (month: string) => void;
  setQuarterFilter?: (quarter: string) => void;
}

export const LedgerTable: React.FC<LedgerTableProps> = ({
  ledger,
  currentUserRole = 'admin',
  yearFilter,
  monthFilter,
  quarterFilter,
  searchQuery: propSearchQuery,
  onEdit,
  onVoid,
  onDelete,
  onPrintDV,
  lockedQuarters = {},
  lockedMonths = {},
  onUpdateLocks,
  authorizedPIN = '1234',
  setSearchQuery: propSetSearchQuery,
  setMonthFilter
}) => {
  const [localSearch, setLocalSearch] = React.useState('');
  const searchQuery = propSearchQuery !== undefined ? propSearchQuery : localSearch;
  const setSearchQuery = propSetSearchQuery || setLocalSearch;

  const [isLockManagerOpen, setIsLockManagerOpen] = React.useState(false);
  const [sortCol, setSortCol] = React.useState<keyof LedgerEntry>('date');
  const [sortAsc, setSortAsc] = React.useState<boolean>(false);
  const [subTab, setSubTab] = React.useState<'all' | 'sales' | 'purchases'>('all');

  // Custom prompt/confirm modal state
  const [customPrompt, setCustomPrompt] = React.useState<{
    title: string;
    message: string;
    isPinInput?: boolean;
    confirmLabel?: string;
    cancelLabel?: string;
    type?: 'rose' | 'indigo' | 'emerald';
    onConfirm: (inputValue?: string) => void;
  } | null>(null);

  const [pinValue, setPinValue] = React.useState('');

  const handleSort = (col: keyof LedgerEntry) => {
    if (sortCol === col) {
      setSortAsc(!sortAsc);
    } else {
      setSortCol(col);
      setSortAsc(true);
    }
  };

  const handleToggleMonthLock = (m: string) => {
    if (!onUpdateLocks) return;
    const key = `${m.toUpperCase()}_${yearFilter}`;
    const currentlyLocked = lockedMonths[key] === true;
    
    if (currentlyLocked) {
      setCustomPrompt({
        title: `Unlock ${m} ${yearFilter}`,
        message: `Please enter your Admin PIN to unlock editing for ${m} ${yearFilter}:`,
        isPinInput: true,
        confirmLabel: 'Unlock',
        cancelLabel: 'Cancel',
        type: 'indigo',
        onConfirm: (pin) => {
          if (pin === authorizedPIN) {
            const nextMonths = { ...lockedMonths };
            delete nextMonths[key];
            onUpdateLocks(nextMonths, lockedQuarters);
          } else {
            setCustomPrompt({
              title: 'Access Denied',
              message: 'Incorrect Admin PIN. Access was denied.',
              confirmLabel: 'Okay',
              type: 'rose',
              onConfirm: () => {}
            });
          }
        }
      });
    } else {
      setCustomPrompt({
        title: `Lock ${m} ${yearFilter}`,
        message: `Are you sure you want to lock ${m} ${yearFilter}? This will prevent any editing or voiding of transactions in this period.`,
        confirmLabel: 'Lock Period',
        cancelLabel: 'Cancel',
        type: 'rose',
        onConfirm: () => {
          const nextMonths = { ...lockedMonths, [key]: true };
          onUpdateLocks(nextMonths, lockedQuarters);
        }
      });
    }
  };

  const handleToggleQuarterLock = (q: string) => {
    if (!onUpdateLocks) return;
    const key = `${q.toUpperCase()}_${yearFilter}`;
    const currentlyLocked = lockedQuarters[key] === true;
    
    if (currentlyLocked) {
      setCustomPrompt({
        title: `Unlock ${q} ${yearFilter}`,
        message: `Please enter your Admin PIN to unlock editing for ${q} ${yearFilter}:`,
        isPinInput: true,
        confirmLabel: 'Unlock',
        cancelLabel: 'Cancel',
        type: 'indigo',
        onConfirm: (pin) => {
          if (pin === authorizedPIN) {
            const nextQuarters = { ...lockedQuarters };
            delete nextQuarters[key];
            onUpdateLocks(lockedMonths, nextQuarters);
          } else {
            setCustomPrompt({
              title: 'Access Denied',
              message: 'Incorrect Admin PIN. Access was denied.',
              confirmLabel: 'Okay',
              type: 'rose',
              onConfirm: () => {}
            });
          }
        }
      });
    } else {
      setCustomPrompt({
        title: `Lock ${q} ${yearFilter}`,
        message: `Are you sure you want to lock ${q} ${yearFilter}? This will prevent any editing or voiding in all months within this quarter.`,
        confirmLabel: 'Lock Period',
        cancelLabel: 'Cancel',
        type: 'rose',
        onConfirm: () => {
          const nextQuarters = { ...lockedQuarters, [key]: true };
          onUpdateLocks(lockedMonths, nextQuarters);
        }
      });
    }
  };

  const filtered = ledger.filter(row => {
    // Period filter
    const cleanDt = cleanDate(row.date);
    if (yearFilter !== 'ALL' && (!cleanDt || !cleanDt.includes(yearFilter))) return false;
    if (monthFilter !== 'ALL' && String(row.month || '').toUpperCase() !== monthFilter.toUpperCase()) return false;
    
    if (quarterFilter !== 'ALL') {
      const quarterMonths: Record<string, string[]> = {
        Q1: ['JANUARY', 'FEBRUARY', 'MARCH'],
        Q2: ['APRIL', 'MAY', 'JUNE'],
        Q3: ['JULY', 'AUGUST', 'SEPTEMBER'],
        Q4: ['OCTOBER', 'NOVEMBER', 'DECEMBER']
      };
      const rowMonth = String(row.month || '').toUpperCase();
      const qMonths = quarterMonths[quarterFilter] || [];
      if (!qMonths.includes(rowMonth)) return false;
    }

    // Search query filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const fields = [
        row.payor,
        row.tin,
        row.ref,
        row.particulars,
        row.category,
        row.type,
        row.paymentMode
      ].join(' ').toLowerCase();
      return fields.includes(q);
    }

    return true;
  });

  const subFiltered = filtered.filter(row => {
    if (subTab === 'sales') return row.type === 'Sales';
    if (subTab === 'purchases') return row.type === 'Expense';
    return true;
  });

  // Calculate totals for currently filtered transactions (excluding voided, closings, setups)
  const activeFiltered = filtered.filter(r => r.status !== 'Void' && r.type !== 'Closing' && r.type !== 'Setup');
  const totalSales = activeFiltered.filter(r => r.type === 'Sales').reduce((a, b) => a + b.gross, 0);
  const totalExpenses = activeFiltered.filter(r => r.type === 'Expense').reduce((a, b) => a + b.gross, 0);
  const totalNet = totalSales - totalExpenses;

  // Sorting
  const sorted = [...subFiltered].sort((a, b) => {
    let valA = a[sortCol];
    let valB = b[sortCol];
    
    if (typeof valA === 'string') valA = valA.toLowerCase();
    if (typeof valB === 'string') valB = valB.toLowerCase();
    
    if (valA < valB) return sortAsc ? -1 : 1;
    if (valA > valB) return sortAsc ? 1 : -1;
    return 0;
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 no-print">
        <div className="bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 p-4 rounded-2xl flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-500">Filtered Sales Gross</span>
            <div className="text-base font-extrabold text-emerald-700 dark:text-emerald-400">{displayMoney(totalSales)}</div>
          </div>
          <div className="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 p-2 rounded-xl">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-zinc-100/50 dark:bg-zinc-800/20 border border-zinc-200 dark:border-zinc-700/50 p-4 rounded-2xl flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">Filtered Purchases Gross</span>
            <div className="text-base font-extrabold text-zinc-800 dark:text-zinc-200">{displayMoney(totalExpenses)}</div>
          </div>
          <div className="bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 p-2 rounded-xl">
            <TrendingDown className="w-4 h-4" />
          </div>
        </div>

        <div className={`border p-4 rounded-2xl flex items-center justify-between ${
          totalNet >= 0 
            ? 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900/30' 
            : 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900/30'
        }`}>
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-500">Filtered Operating Margin</span>
            <div className={`text-base font-extrabold ${totalNet >= 0 ? 'text-blue-700 dark:text-blue-400' : 'text-rose-700 dark:text-rose-400'}`}>
              {displayMoney(totalNet)}
            </div>
          </div>
          <div className={`p-2 rounded-xl ${totalNet >= 0 ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400' : 'bg-rose-100 dark:bg-rose-900/40 text-red-700'}`}>
            <Wallet className="w-4 h-4" />
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="border-b border-zinc-100 dark:border-zinc-800 p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">General Ledger Registry</h3>
            <p className="text-xs text-zinc-500 mt-1">Listing {sorted.length} transaction entries based on current filters.</p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
            {setMonthFilter && (
              <div className="relative">
                <select
                  value={monthFilter}
                  onChange={(e) => setMonthFilter(e.target.value)}
                  className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-bold py-2 pl-3 pr-8 rounded-xl appearance-none focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                >
                  <option value="ALL">All Months</option>
                  <option value="JANUARY">January</option>
                  <option value="FEBRUARY">February</option>
                  <option value="MARCH">March</option>
                  <option value="APRIL">April</option>
                  <option value="MAY">May</option>
                  <option value="JUNE">June</option>
                  <option value="JULY">July</option>
                  <option value="AUGUST">August</option>
                  <option value="SEPTEMBER">September</option>
                  <option value="OCTOBER">October</option>
                  <option value="NOVEMBER">November</option>
                  <option value="DECEMBER">December</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-zinc-400">
                  <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                </div>
              </div>
            )}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input 
                type="text" 
                placeholder="Search references, clients, categories..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-10 pr-4 py-2 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
              />
            </div>
            <button
              onClick={() => window.print()}
              className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs bg-zinc-900 hover:bg-zinc-800 text-white font-bold transition-all border border-zinc-800 shadow-sm shrink-0 no-print"
              title="Print current filtered ledger entries"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Registry</span>
            </button>

            {onUpdateLocks && (
              <button
                onClick={() => setIsLockManagerOpen(!isLockManagerOpen)}
                className={`flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all border shadow-sm shrink-0 ${
                  isLockManagerOpen 
                    ? 'bg-blue-50 border-blue-200 text-blue-600 dark:bg-blue-950/40 dark:border-blue-900/40 dark:text-blue-400 font-extrabold'
                    : 'bg-zinc-50 hover:bg-zinc-100 border-zinc-200 dark:bg-zinc-950 dark:hover:bg-zinc-900 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300'
                }`}
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Lock Mgr</span>
              </button>
            )}
          </div>
        </div>

        {/* Collapsible Lock Manager Panel */}
        {isLockManagerOpen && onUpdateLocks && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            className="border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/10 p-5 space-y-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-blue-500 shrink-0" />
                <div>
                  <h4 className="text-xs font-extrabold uppercase tracking-widest text-zinc-800 dark:text-zinc-200">Period Lock Control ({yearFilter})</h4>
                  <p className="text-[10px] text-zinc-500 font-medium">Toggle locks on months or quarters. Locked periods prevent editing/voiding transactions.</p>
                </div>
              </div>
              <div className="text-[10px] font-bold bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 px-2.5 py-1 rounded-lg border border-amber-200/50 dark:border-amber-900/20 flex items-center gap-1 self-start sm:self-auto">
                <Key className="w-3 h-3 text-amber-500" /> Admin Auth PIN Required for Unlocks
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Quarters Column */}
              <div className="space-y-2.5">
                <h5 className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span> Quarterly Locks
                </h5>
                <div className="grid grid-cols-2 gap-2">
                  {['Q1', 'Q2', 'Q3', 'Q4'].map(q => {
                    const key = `${q}_${yearFilter}`;
                    const isLocked = lockedQuarters[key] === true;
                    return (
                      <button
                        key={q}
                        onClick={() => handleToggleQuarterLock(q)}
                        className={`flex items-center justify-between p-2.5 rounded-xl text-xs font-bold transition-all border ${
                          isLocked 
                            ? 'bg-blue-50/50 border-blue-200 text-blue-600 dark:bg-blue-950/30 dark:border-blue-900/30 dark:text-blue-400 font-extrabold' 
                            : 'bg-white hover:bg-zinc-50 border-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800/60 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300'
                        }`}
                      >
                        <span>{q}</span>
                        <span>{isLocked ? '🔒 Locked' : '🔓 Open'}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Months Column */}
              <div className="space-y-2.5 md:col-span-2">
                <h5 className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span> Monthly Locks
                </h5>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {[
                    'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
                    'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
                  ].map(m => {
                    const key = `${m}_${yearFilter}`;
                    const isLocked = lockedMonths[key] === true;
                    return (
                      <button
                        key={m}
                        onClick={() => handleToggleMonthLock(m)}
                        className={`flex items-center justify-between px-3 py-2 rounded-xl text-[10px] font-bold transition-all border ${
                          isLocked 
                            ? 'bg-blue-50/50 border-blue-200 text-blue-600 dark:bg-blue-950/30 dark:border-blue-900/30 dark:text-blue-400 font-extrabold shadow-inner' 
                            : 'bg-white hover:bg-zinc-50 border-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800/60 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400'
                        }`}
                      >
                        <span className="truncate pr-1">{m.charAt(0) + m.slice(1).toLowerCase()}</span>
                        <span>{isLocked ? '🔒' : '🔓'}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* 3 Ledger Subtabs Bar */}
        <div className="border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/40 dark:bg-zinc-950/20 px-5 py-3 flex items-center justify-between gap-4 overflow-hidden">
          <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl border border-zinc-200/50 dark:border-zinc-800/30 overflow-x-auto no-scrollbar whitespace-nowrap">
            <button
              onClick={() => setSubTab('all')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                subTab === 'all'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm border border-zinc-200/30 dark:border-zinc-700/50'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
              }`}
            >
              General Ledger
            </button>
            <button
              onClick={() => setSubTab('sales')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                subTab === 'sales'
                  ? 'bg-white dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 shadow-sm border border-zinc-200/30 dark:border-zinc-700/50'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
              }`}
            >
              Sales Ledger
            </button>
            <button
              onClick={() => setSubTab('purchases')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                subTab === 'purchases'
                  ? 'bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow-sm border border-zinc-200/30 dark:border-zinc-700/50'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
              }`}
            >
              Purchase Ledger
            </button>
          </div>
          <div className="text-[10px] font-mono text-zinc-400 font-bold uppercase tracking-wider hidden sm:block">
            Showing {sorted.length} {subTab === 'all' ? 'GL' : subTab === 'sales' ? 'Sales' : 'Purchase'} entries
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1500px]">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-950/60 border-b border-zinc-100 dark:border-zinc-800 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                <th className="px-5 py-3 text-center w-28">Actions</th>
                <th className="px-5 py-3 cursor-pointer select-none hover:text-zinc-600 dark:hover:text-zinc-200" onClick={() => handleSort('date')}>Date {sortCol === 'date' ? (sortAsc ? '▲' : '▼') : ''}</th>
                <th className="px-5 py-3 cursor-pointer select-none hover:text-zinc-600 dark:hover:text-zinc-200" onClick={() => handleSort('month')}>Month {sortCol === 'month' ? (sortAsc ? '▲' : '▼') : ''}</th>
                <th className="px-5 py-3 cursor-pointer select-none hover:text-zinc-600 dark:hover:text-zinc-200" onClick={() => handleSort('type')}>Type {sortCol === 'type' ? (sortAsc ? '▲' : '▼') : ''}</th>
                <th className="px-5 py-3 cursor-pointer select-none hover:text-zinc-600 dark:hover:text-zinc-200" onClick={() => handleSort('category')}>Account / Class {sortCol === 'category' ? (sortAsc ? '▲' : '▼') : ''}</th>
                <th className="px-5 py-3 cursor-pointer select-none hover:text-zinc-600 dark:hover:text-zinc-200" onClick={() => handleSort('payor')}>Client / Vendor {sortCol === 'payor' ? (sortAsc ? '▲' : '▼') : ''}</th>
                <th className="px-5 py-3 max-w-[200px]">Particulars</th>
                <th className="px-5 py-3 font-mono">TIN</th>
                <th className="px-5 py-3 font-mono cursor-pointer select-none hover:text-zinc-600 dark:hover:text-zinc-200" onClick={() => handleSort('ref')}>S.I / Ref {sortCol === 'ref' ? (sortAsc ? '▲' : '▼') : ''}</th>
                <th className="px-5 py-3">Payment</th>
                <th className="px-5 py-3 text-right bg-blue-50/30 dark:bg-blue-900/10 font-bold text-blue-600 dark:text-blue-400">Debit</th>
                <th className="px-5 py-3 text-right bg-emerald-50/30 dark:bg-emerald-900/10 font-bold text-emerald-600 dark:text-emerald-400">Credit</th>
                <th className="px-5 py-3 text-right">Net</th>
                <th className="px-5 py-3 text-right">VAT</th>
                <th className="px-5 py-3 text-right">EWT</th>
                <th className="px-5 py-3 text-right">Cash Impact</th>
                <th className="px-5 py-3 text-center">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-xs">
              {sorted.length ? sorted.map(row => {
                const isVoid = row.status === 'Void';
                const isClosing = row.type === 'Closing';
                const isSetup = row.type === 'Setup';
                const isLocked = isMonthLocked(row.month, row.date, lockedQuarters, lockedMonths);
                
                return (
                  <tr key={row.id} className={`hover:bg-zinc-50/50 dark:hover:bg-zinc-800/10 transition-colors ${
                    isVoid ? 'bg-red-50/40 dark:bg-red-950/10 text-zinc-400 dark:text-zinc-500 line-through' : ''
                  } ${isClosing ? 'bg-zinc-50/70 dark:bg-zinc-900/40 italic font-medium' : ''}`}>
                    <td className="px-5 py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5 no-line-through">
                        {isVoid ? (
                          <span className="text-[10px] font-bold text-red-500 bg-red-100 dark:bg-red-950/30 px-2 py-0.5 rounded border border-red-200/50 dark:border-red-900/30 uppercase tracking-wider">Voided</span>
                        ) : isClosing ? (
                          <span className="text-[10px] font-bold text-zinc-500 bg-zinc-100 dark:bg-zinc-800/50 px-2 py-0.5 rounded border border-zinc-200/50 dark:border-zinc-800/30 uppercase tracking-wider">System</span>
                        ) : isLocked ? (
                          <button
                            onClick={() => handleToggleMonthLock(row.month)}
                            className="text-[10px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/30 dark:hover:bg-blue-900/40 px-2 py-0.5 rounded border border-blue-200/40 dark:border-blue-900/20 uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-all shrink-0 shadow-sm"
                            title="This month is locked. Click to unlock using Admin PIN."
                          >
                            <span>🔒 Locked</span>
                          </button>
                        ) : (
                          <>
                            {currentUserRole === 'admin' ? (
                              <>
                                {onEdit && (
                                  <button 
                                    onClick={() => onEdit(row)}
                                    className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg transition-colors border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700 shadow-sm"
                                    title="Edit entry"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                <button 
                                  onClick={() => onVoid(row.id)}
                                  className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg transition-colors border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700 shadow-sm"
                                  title="Void entry"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            ) : (
                              <span className="text-[10px] font-bold text-zinc-400 bg-zinc-50 dark:bg-zinc-900/60 px-2 py-0.5 rounded border border-zinc-200/50 dark:border-zinc-800/20 uppercase tracking-wider">Read Only</span>
                            )}
                            {row.type === 'Expense' && onPrintDV && (
                              <button 
                                onClick={() => onPrintDV(row)}
                                className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-blue-500 dark:hover:text-blue-400 rounded-lg transition-colors border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700 shadow-sm"
                                title="Print Disbursement Voucher"
                              >
                                <FileText className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3 font-semibold text-zinc-800 dark:text-zinc-300">{cleanDate(row.date)}</td>
                    <td className="px-5 py-3 font-bold text-zinc-400 dark:text-zinc-500 text-[11px]">{row.month}</td>
                    <td className="px-5 py-3">
                      <div className="flex flex-col items-start gap-1">
                        <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                          row.type === 'Sales' 
                            ? 'bg-emerald-50 border-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:border-emerald-900/30 dark:text-emerald-400' 
                            : isClosing 
                              ? 'bg-zinc-50 border-zinc-200 text-zinc-600 dark:bg-zinc-950 dark:border-zinc-800'
                              : isSetup 
                                ? 'bg-indigo-50 border-indigo-100 text-indigo-700 dark:bg-indigo-950/30 dark:border-indigo-900/30 dark:text-indigo-400'
                                : 'bg-zinc-100 border-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-200'
                        }`}>
                          {row.type === 'Expense' ? 'Purchase' : row.type}
                          {row.taxType === 'Exempt' && <span className="ml-1 opacity-70 text-[9px] bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 px-1 rounded font-extrabold">Exempt</span>}
                          {row.taxType === 'ZeroRated' && <span className="ml-1 opacity-70 text-[9px] bg-sky-200 dark:bg-sky-900 text-sky-800 dark:text-sky-200 px-1 rounded font-extrabold">Zero</span>}
                        </span>
                        {row.itemType && (
                          <span className={`inline-flex px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider border ${
                            row.itemType === 'Services'
                              ? 'bg-purple-50 text-purple-700 border-purple-100 dark:bg-purple-950/20 dark:text-purple-400 dark:border-purple-900/20'
                              : 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/20'
                          }`}>
                            {row.itemType}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3 font-semibold text-zinc-500 dark:text-zinc-400">{row.category}</td>
                    <td className="px-5 py-3 font-bold text-zinc-800 dark:text-zinc-200 max-w-[200px] truncate">{row.payor}</td>
                    <td className="px-5 py-3 text-zinc-600 dark:text-zinc-400 max-w-[240px] truncate">{row.particulars}</td>
                    <td className="px-5 py-3 font-mono font-medium text-zinc-400">{row.tin || '—'}</td>
                    <td className="px-5 py-3 font-mono font-bold text-zinc-800 dark:text-zinc-300">{row.ref}</td>
                    <td className="px-5 py-3 font-medium text-zinc-600 dark:text-zinc-400">
                      <div>{row.paymentMode}</div>
                      {row.payRef && <div className="text-[10px] text-blue-600 dark:text-blue-400 font-bold font-mono">#{row.payRef}</div>}
                    </td>
                    <td className="px-5 py-3 text-right font-extrabold font-mono text-blue-600 dark:text-blue-400 bg-blue-50/10">{displayMoney(row.gross)}</td>
                    <td className="px-5 py-3 text-right font-extrabold font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-50/10">{displayMoney(row.gross)}</td>
                    <td className="px-5 py-3 text-right font-medium font-mono text-zinc-500 dark:text-zinc-400">{displayMoney(row.net !== undefined ? row.net : (row.taxType === 'Vatable' ? row.gross / 1.12 : row.gross))}</td>
                    <td className="px-5 py-3 text-right font-medium font-mono text-zinc-400 dark:text-zinc-500">{displayMoney(row.vat)}</td>
                    <td className="px-5 py-3 text-right font-semibold font-mono text-blue-500">{displayMoney(row.ewt)}</td>
                    <td className="px-5 py-3 text-right font-extrabold font-mono text-zinc-900 dark:text-zinc-100">{displayMoney(row.cash)}</td>
                    <td className="px-5 py-3 text-center no-line-through">
                      {row.attachment ? (
                        <a 
                          href={row.attachment} 
                          target="_blank" 
                          referrerPolicy="no-referrer"
                          className="inline-flex p-1 bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100/50 transition-colors shadow-sm"
                          title="Open attached receipt"
                        >
                          <Paperclip className="w-3.5 h-3.5" />
                        </a>
                      ) : (
                        <span className="text-zinc-300 dark:text-zinc-700">—</span>
                      )}
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={16} className="px-5 py-12 text-center text-zinc-400 dark:text-zinc-500 italic">No transactions found matching your criteria. Try adjusting filters or search query.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {customPrompt && (
        <div className="fixed inset-0 bg-zinc-950/80 z-[250] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl w-full max-w-sm p-6 shadow-2xl relative overflow-hidden text-left">
            <div className={`absolute top-0 left-0 w-full h-1.5 ${
              customPrompt.type === 'rose' 
                ? 'bg-rose-500' 
                : customPrompt.type === 'emerald' 
                  ? 'bg-emerald-500' 
                  : 'bg-indigo-500'
            }`} />
            
            <h3 className="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-wider mb-2">
              {customPrompt.title}
            </h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed mb-4">
              {customPrompt.message}
            </p>

            {customPrompt.isPinInput && (
              <div className="mb-6">
                <input
                  type="password"
                  maxLength={4}
                  value={pinValue}
                  onChange={(e) => setPinValue(e.target.value)}
                  className="w-full px-4 py-3 text-center bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-white font-mono text-lg font-bold tracking-[0.5em] focus:outline-none focus:border-indigo-500"
                  placeholder="••••"
                  autoFocus
                />
              </div>
            )}
            
            <div className="flex justify-end gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
              {customPrompt.cancelLabel && (
                <button
                  type="button"
                  onClick={() => {
                    setCustomPrompt(null);
                    setPinValue('');
                  }}
                  className="px-4 py-2 text-[10px] font-bold text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 uppercase tracking-widest transition-colors"
                >
                  {customPrompt.cancelLabel}
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  const val = pinValue;
                  setCustomPrompt(null);
                  setPinValue('');
                  customPrompt.onConfirm(val);
                }}
                className={`px-4 py-2 text-[10px] font-bold text-white rounded-xl uppercase tracking-widest transition-all ${
                  customPrompt.type === 'rose'
                    ? 'bg-rose-600 hover:bg-rose-500 shadow-sm hover:shadow-rose-500/20'
                    : customPrompt.type === 'emerald'
                      ? 'bg-emerald-600 hover:bg-emerald-500 shadow-sm hover:shadow-emerald-500/20'
                      : 'bg-indigo-600 hover:bg-indigo-500 shadow-sm hover:shadow-indigo-500/20'
                }`}
              >
                {customPrompt.confirmLabel || 'OK'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
