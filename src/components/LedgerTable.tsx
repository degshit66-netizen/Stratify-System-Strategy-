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
  Wallet
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
  setSearchQuery: propSetSearchQuery
}) => {
  const [localSearch, setLocalSearch] = React.useState('');
  const searchQuery = propSearchQuery !== undefined ? propSearchQuery : localSearch;
  const setSearchQuery = propSetSearchQuery || setLocalSearch;

  const [sortCol, setSortCol] = React.useState<keyof LedgerEntry>('date');
  const [sortAsc, setSortAsc] = React.useState<boolean>(false);

  const handleSort = (col: keyof LedgerEntry) => {
    if (sortCol === col) {
      setSortAsc(!sortAsc);
    } else {
      setSortCol(col);
      setSortAsc(true);
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

  // Calculate totals for currently filtered transactions (excluding voided, closings, setups)
  const activeFiltered = filtered.filter(r => r.status !== 'Void' && r.type !== 'Closing' && r.type !== 'Setup');
  const totalSales = activeFiltered.filter(r => r.type === 'Sales').reduce((a, b) => a + b.gross, 0);
  const totalExpenses = activeFiltered.filter(r => r.type === 'Expense').reduce((a, b) => a + b.gross, 0);
  const totalNet = totalSales - totalExpenses;

  // Sorting
  const sorted = [...filtered].sort((a, b) => {
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 p-4 rounded-2xl flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-500">Filtered Sales Gross</span>
            <div className="text-base font-extrabold text-emerald-700 dark:text-emerald-400">{displayMoney(totalSales)}</div>
          </div>
          <div className="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 p-2 rounded-xl">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 p-4 rounded-2xl flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-500">Filtered Purchases Gross</span>
            <div className="text-base font-extrabold text-red-700 dark:text-red-400">{displayMoney(totalExpenses)}</div>
          </div>
          <div className="bg-rose-100 dark:bg-rose-900/40 text-red-700 dark:text-red-400 p-2 rounded-xl">
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
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input 
              type="text" 
              placeholder="Search references, clients, categories..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-10 pr-4 py-2 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
            />
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
                          <span className="text-[10px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/30 px-2 py-0.5 rounded border border-blue-200/40 dark:border-blue-900/20 uppercase tracking-wider">🔒 Locked</span>
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
                      <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                        row.type === 'Sales' 
                          ? 'bg-emerald-50 border-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:border-emerald-900/30 dark:text-emerald-400' 
                          : isClosing 
                            ? 'bg-zinc-50 border-zinc-200 text-zinc-600 dark:bg-zinc-950 dark:border-zinc-800'
                            : isSetup 
                              ? 'bg-indigo-50 border-indigo-100 text-indigo-700 dark:bg-indigo-950/30 dark:border-indigo-900/30 dark:text-indigo-400'
                              : 'bg-rose-50 border-rose-100 text-rose-700 dark:bg-rose-950/30 dark:border-rose-900/30 dark:text-rose-400'
                      }`}>
                        {row.type === 'Expense' ? 'Purchase' : row.type}
                        {row.taxType === 'Exempt' && <span className="ml-1 opacity-70 text-[9px] bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 px-1 rounded font-extrabold">Exempt</span>}
                        {row.taxType === 'ZeroRated' && <span className="ml-1 opacity-70 text-[9px] bg-sky-200 dark:bg-sky-900 text-sky-800 dark:text-sky-200 px-1 rounded font-extrabold">Zero</span>}
                      </span>
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
    </div>
  );
};
