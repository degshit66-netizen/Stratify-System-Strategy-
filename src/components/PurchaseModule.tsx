import React from 'react';
import { motion } from 'motion/react';
import { TrendingDown, Percent, FileText, Camera, PlusCircle, Printer } from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { LedgerEntry } from '../types';
import { r2, displayMoney, inPeriod, parseNum, MONTH_NAMES, cleanDate } from '../utils/helpers';

interface PurchaseModuleProps {
  ledger: LedgerEntry[];
  yearFilter: string;
  monthFilter: string;
  quarterFilter: string;
  onOpenExpenseModal: () => void;
  onOpenScanExpense: () => void;
  onPrintDV: (entry: LedgerEntry) => void;
}

export const PurchaseModule: React.FC<PurchaseModuleProps> = ({
  ledger,
  yearFilter,
  monthFilter,
  quarterFilter,
  onOpenExpenseModal,
  onOpenScanExpense,
  onPrintDV
}) => {
  const expenseRows = ledger.filter(r => r.type === 'Expense' && r.status !== 'Void' && inPeriod(r, yearFilter, monthFilter, quarterFilter));
  
  const totalGross = expenseRows.reduce((a, b) => a + r2(parseNum(b.gross)), 0);
  const totalVat = expenseRows.reduce((a, b) => a + r2(parseNum(b.vat)), 0);
  const expenseCount = expenseRows.length;
  const avgExpense = expenseCount ? totalGross / expenseCount : 0;

  // Group by Month
  const monthlyExpenses = MONTH_NAMES.map(m => {
    const total = expenseRows
      .filter(r => String(r.month).toUpperCase() === m)
      .reduce((sum, r) => sum + r2(parseNum(r.gross)), 0);
    return {
      name: m.slice(0, 3),
      Purchases: r2(total)
    };
  });

  // Group by category
  const categories: Record<string, number> = {};
  expenseRows.forEach(r => {
    const key = r.category || 'Miscellaneous Expense';
    categories[key] = (categories[key] || 0) + r2(parseNum(r.gross));
  });

  const pieData = Object.entries(categories)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const COLORS = ['#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899', '#10b981', '#6366f1', '#14b8a6'];

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100 } }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white font-sans">🛒 Purchases</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Track company disbursements, operating purchases, input taxes, and print disbursement vouchers.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto no-print">
          <button 
            onClick={() => window.print()}
            className="flex items-center gap-2 text-xs bg-zinc-950 hover:bg-zinc-800 text-white font-bold px-4 py-2.5 rounded-xl transition-colors border border-zinc-800 shadow-sm focus:outline-none"
            title="Print purchases expense report"
          >
            <Printer className="w-4 h-4" />
            <span>Print Report</span>
          </button>
          <button 
            onClick={onOpenScanExpense}
            className="flex items-center gap-2 text-xs bg-zinc-800 hover:bg-zinc-700 text-white font-bold px-4 py-2.5 rounded-xl transition-colors shadow-sm focus:outline-none border border-zinc-700"
          >
            <Camera className="w-4 h-4" />
            <span>AI Scan Bill</span>
          </button>
          <button 
            onClick={onOpenExpenseModal}
            className="flex items-center gap-2 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2.5 rounded-xl transition-colors shadow-sm focus:outline-none"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Purchase</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 no-print">
        <motion.div variants={itemVariants} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl flex items-start justify-between shadow-sm">
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Purchases Gross</span>
            <div className="text-lg font-extrabold text-zinc-900 dark:text-zinc-100">{displayMoney(totalGross)}</div>
            <div className="text-xs text-zinc-400 font-medium">Operating outflow sum</div>
          </div>
          <div className="bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 p-2.5 rounded-xl">
            <TrendingDown className="w-5 h-5" />
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl flex items-start justify-between shadow-sm">
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Input VAT</span>
            <div className="text-lg font-extrabold text-zinc-800 dark:text-zinc-100">{displayMoney(totalVat)}</div>
            <div className="text-xs text-zinc-400 font-medium">12% VAT tax deduction credit</div>
          </div>
          <div className="bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 p-2.5 rounded-xl">
            <Percent className="w-5 h-5" />
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl flex items-start justify-between shadow-sm">
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Purchases Count</span>
            <div className="text-lg font-extrabold text-zinc-800 dark:text-zinc-100">{expenseCount}</div>
            <div className="text-xs text-zinc-400 font-medium">Disbursements in period</div>
          </div>
          <div className="bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 p-2.5 rounded-xl">
            <FileText className="w-5 h-5" />
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl flex items-start justify-between shadow-sm">
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Average Purchase</span>
            <div className="text-lg font-extrabold text-zinc-800 dark:text-zinc-100">{displayMoney(avgExpense)}</div>
            <div className="text-xs text-zinc-400 font-medium">Purchases divided by transactions</div>
          </div>
          <div className="bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 p-2.5 rounded-xl">
            <TrendingDown className="w-5 h-5" />
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 no-print">
        <motion.div variants={itemVariants} className="lg:col-span-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl shadow-sm min-h-[380px] flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider mb-4">Monthly Operating Disbursements</h3>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyExpenses} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', border: 'none', borderRadius: '12px', color: '#fff' }}
                  labelStyle={{ fontWeight: 'bold' }}
                />
                <Bar dataKey="Purchases" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl shadow-sm min-h-[380px] flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider mb-4">Cost Distribution</h3>
          </div>
          <div className="h-56 w-full flex items-center justify-center">
            {pieData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', border: 'none', borderRadius: '12px', color: '#fff' }}
                    formatter={(val: number) => displayMoney(val)}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-xs text-zinc-400 italic">No disbursement data recorded</div>
            )}
          </div>
          <div className="space-y-1.5 overflow-y-auto max-h-24 pr-1 scrollbar-thin">
            {pieData.map((entry, idx) => (
              <div key={entry.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 truncate">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                  <span className="text-zinc-600 dark:text-zinc-400 font-medium truncate">{entry.name}</span>
                </div>
                <span className="font-semibold text-zinc-700 dark:text-zinc-300 ml-1">{displayMoney(entry.value)}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      <motion.div variants={itemVariants} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="border-b border-zinc-100 dark:border-zinc-800 p-5">
          <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">Purchase Ledger</h3>
          <p className="text-xs text-zinc-500 mt-1">Showing all purchase transactions matching current filters.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1100px]">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-950/60 border-b border-zinc-100 dark:border-zinc-800 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3">Supplier</th>
                <th className="px-5 py-3">Reference</th>
                <th className="px-5 py-3">Category</th>
                <th className="px-5 py-3 text-right">Gross</th>
                <th className="px-5 py-3 text-right">Net</th>
                <th className="px-5 py-3 text-right">VAT</th>
                <th className="px-5 py-3 text-right">Cash Outflow</th>
                <th className="px-5 py-3 text-center">Voucher</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-xs">
              {expenseRows.length ? expenseRows.map(r => (
                <tr key={r.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/10 transition-colors">
                  <td className="px-5 py-3.5 font-semibold text-zinc-800 dark:text-zinc-300">{cleanDate(r.date)}</td>
                  <td className="px-5 py-3.5 font-bold text-zinc-800 dark:text-zinc-200 truncate max-w-[200px]">{r.payor}</td>
                  <td className="px-5 py-3.5">
                    <div className="font-mono font-bold text-zinc-800 dark:text-zinc-300">{r.ref || '—'}</div>
                    {r.itemType && (
                      <span className={`inline-flex mt-1 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                        r.itemType === 'Services'
                          ? 'bg-purple-50 text-purple-700 border border-purple-100 dark:bg-purple-950/20 dark:text-purple-400 dark:border-purple-900/20'
                          : 'bg-amber-50 text-amber-700 border border-amber-100 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/20'
                      }`}>
                        {r.itemType}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-zinc-500 font-semibold">{r.category}</td>
                  <td className="px-5 py-3.5 text-right font-extrabold font-mono text-zinc-800 dark:text-zinc-200">{displayMoney(r.gross)}</td>
                  <td className="px-5 py-3.5 text-right font-medium font-mono text-zinc-500 dark:text-zinc-400">{displayMoney(parseNum(r.net) || (r.taxType === 'Vatable' ? parseNum(r.gross) / 1.12 : parseNum(r.gross)))}</td>
                  <td className="px-5 py-3.5 text-right font-medium font-mono text-zinc-400 dark:text-zinc-500">{displayMoney(r.vat)}</td>
                  <td className="px-5 py-3.5 text-right font-bold font-mono text-zinc-900 dark:text-zinc-100">{displayMoney(r.cash)}</td>
                  <td className="px-5 py-3.5 text-center">
                    <button 
                      onClick={() => onPrintDV(r)}
                      className="inline-flex p-1 bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100/50 transition-colors shadow-sm"
                      title="Print disbursement voucher"
                    >
                      <FileText className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={9} className="px-5 py-8 text-center text-zinc-400 dark:text-zinc-500 italic">No purchase transactions posted in this period.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </motion.div>
  );
};
