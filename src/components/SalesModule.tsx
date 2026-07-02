import React from 'react';
import { motion } from 'motion/react';
import { TrendingUp, Percent, FileSpreadsheet, PlusCircle, Printer } from 'lucide-react';
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

interface SalesModuleProps {
  ledger: LedgerEntry[];
  yearFilter: string;
  monthFilter: string;
  quarterFilter: string;
  onOpenSalesModal: () => void;
}

export const SalesModule: React.FC<SalesModuleProps> = ({
  ledger,
  yearFilter,
  monthFilter,
  quarterFilter,
  onOpenSalesModal
}) => {
  const salesRows = ledger.filter(r => r.type === 'Sales' && r.status !== 'Void' && inPeriod(r, yearFilter, monthFilter, quarterFilter));
  
  const totalGross = salesRows.reduce((a, b) => a + r2(parseNum(b.gross)), 0);
  const totalVat = salesRows.reduce((a, b) => a + r2(parseNum(b.vat)), 0);
  const invoiceCount = salesRows.length;
  const avgInvoice = invoiceCount ? totalGross / invoiceCount : 0;

  // Group by Month
  const monthlySales = MONTH_NAMES.map(m => {
    const total = salesRows
      .filter(r => String(r.month).toUpperCase() === m)
      .reduce((sum, r) => sum + r2(parseNum(r.gross)), 0);
    return {
      name: m.slice(0, 3),
      Sales: r2(total)
    };
  });

  // Group by category
  const categories: Record<string, number> = {};
  salesRows.forEach(r => {
    const key = r.category || 'Sales Revenue - Goods';
    categories[key] = (categories[key] || 0) + r2(parseNum(r.gross));
  });

  const pieData = Object.entries(categories)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#06b6d4', '#14b8a6'];

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
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white font-sans">💰 Sales</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Manage client sales invoices, output taxes, revenue trends, and customer balances.</p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto no-print">
          <button 
            onClick={() => window.print()}
            className="flex items-center gap-2 text-xs bg-zinc-950 hover:bg-zinc-800 text-white font-bold px-4 py-2.5 rounded-xl transition-colors border border-zinc-800 shadow-sm focus:outline-none"
            title="Print sales invoice report"
          >
            <Printer className="w-4 h-4" />
            <span>Print Report</span>
          </button>
          <button 
            onClick={onOpenSalesModal}
            className="flex items-center gap-2 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2.5 rounded-xl transition-colors shadow-sm focus:outline-none"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Sales Invoice</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 no-print">
        <motion.div variants={itemVariants} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl flex items-start justify-between shadow-sm">
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Sales Gross</span>
            <div className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">{displayMoney(totalGross)}</div>
            <div className="text-xs text-zinc-400 font-medium">Sum of all gross invoices</div>
          </div>
          <div className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 p-2.5 rounded-xl">
            <TrendingUp className="w-5 h-5" />
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl flex items-start justify-between shadow-sm">
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Output VAT</span>
            <div className="text-lg font-extrabold text-zinc-800 dark:text-zinc-100">{displayMoney(totalVat)}</div>
            <div className="text-xs text-zinc-400 font-medium">12% VAT liability for eBIRForms</div>
          </div>
          <div className="bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 p-2.5 rounded-xl">
            <Percent className="w-5 h-5" />
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl flex items-start justify-between shadow-sm">
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Invoices</span>
            <div className="text-lg font-extrabold text-zinc-800 dark:text-zinc-100">{invoiceCount}</div>
            <div className="text-xs text-zinc-400 font-medium">Total sales records posted</div>
          </div>
          <div className="bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 p-2.5 rounded-xl">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl flex items-start justify-between shadow-sm">
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Average Invoice</span>
            <div className="text-lg font-extrabold text-zinc-800 dark:text-zinc-100">{displayMoney(avgInvoice)}</div>
            <div className="text-xs text-zinc-400 font-medium">Revenues divided by transactions</div>
          </div>
          <div className="bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 p-2.5 rounded-xl">
            <TrendingUp className="w-5 h-5" />
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 no-print">
        <motion.div variants={itemVariants} className="lg:col-span-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl shadow-sm min-h-[380px] flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider mb-4">Monthly Sales Gross Revenue</h3>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlySales} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" className="dark:stroke-zinc-800" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', border: 'none', borderRadius: '12px', color: '#fff' }}
                  labelStyle={{ fontWeight: 'bold' }}
                />
                <Bar dataKey="Sales" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl shadow-sm min-h-[380px] flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider mb-4">Revenue Category Shares</h3>
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
              <div className="text-xs text-zinc-400 italic">No revenue data recorded</div>
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
          <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">Posted Sales Invoices</h3>
          <p className="text-xs text-zinc-500 mt-1">Showing all sales transactions matching current filters.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-950/60 border-b border-zinc-100 dark:border-zinc-800 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3">Customer</th>
                <th className="px-5 py-3">Reference</th>
                <th className="px-5 py-3">Category</th>
                <th className="px-5 py-3 text-right">Gross</th>
                <th className="px-5 py-3 text-right">Net</th>
                <th className="px-5 py-3 text-right">VAT</th>
                <th className="px-5 py-3 text-right">Cash Inflow</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-xs">
              {salesRows.length ? salesRows.map(r => (
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
                </tr>
              )) : (
                <tr>
                  <td colSpan={8} className="px-5 py-8 text-center text-zinc-400 dark:text-zinc-500 italic">No sales transactions posted in this period.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </motion.div>
  );
};
