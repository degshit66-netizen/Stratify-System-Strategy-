import React from 'react';
import { motion } from 'motion/react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Building2, 
  Wallet, 
  Percent, 
  ArrowUpRight, 
  ArrowDownRight,
  FileText
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Sector
} from 'recharts';
import { LedgerEntry } from '../types';
import { r2, displayMoney, inPeriod, parseNum, MONTH_NAMES, cleanDate } from '../utils/helpers';
import { getCoaDetails } from '../data/chartOfAccounts';

interface DashboardProps {
  ledger: LedgerEntry[];
  yearFilter: string;
  monthFilter: string;
  quarterFilter: string;
  companyName: string;
  companyTin: string;
}

export const Dashboard: React.FC<DashboardProps> = ({
  ledger,
  yearFilter,
  monthFilter,
  quarterFilter,
  companyName,
  companyTin
}) => {
  const filteredRows = ledger.filter(r => r.status !== 'Void' && inPeriod(r, yearFilter, monthFilter, quarterFilter));
  
  const sales = filteredRows.filter(r => r.type === 'Sales');
  const purchases = filteredRows.filter(r => r.type === 'Expense');
  
  const totalSalesGross = sales.reduce((a, b) => a + r2(parseNum(b.gross)), 0);
  const totalSalesNet = sales.reduce((a, b) => a + r2(parseNum(b.net) || (b.taxType === 'Vatable' ? parseNum(b.gross) / 1.12 : parseNum(b.gross))), 0);
  const totalPurchGross = purchases.reduce((a, b) => a + r2(parseNum(b.gross)), 0);
  const totalPurchNet = purchases.reduce((a, b) => a + r2(parseNum(b.net) || (b.taxType === 'Vatable' ? parseNum(b.gross) / 1.12 : parseNum(b.gross))), 0);
  const outputVat = sales.reduce((a, b) => a + r2(parseNum(b.vat)), 0);
  const inputVat = purchases.reduce((a, b) => a + r2(parseNum(b.vat)), 0);
  const netVat = r2(outputVat - inputVat);
  const totalCash = filteredRows.reduce((a, b) => a + r2(parseNum(b.cash || 0)), 0);

  const costOfSales = purchases.filter(r => {
    const ref = `${r.category || ''} ${r.particulars || ''}`.toLowerCase();
    return /cost of sales|cogs|inventory|materials|purchase/.test(ref);
  }).reduce((a, b) => a + r2(parseNum(b.net) || parseNum(b.gross)), 0);

  const operatingExpenses = Math.max(0, r2(totalPurchNet - costOfSales));
  const grossProfit = r2(totalSalesNet - costOfSales);
  const netIncome = r2(grossProfit - operatingExpenses);

  const recent = [...filteredRows]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  // Group by Month for Bar Chart
  const monthlyData = MONTH_NAMES.map(m => {
    const monthSales = filteredRows
      .filter(r => r.type === 'Sales' && String(r.month).toUpperCase() === m)
      .reduce((sum, r) => sum + r2(parseNum(r.gross)), 0);
    const monthPurch = filteredRows
      .filter(r => r.type === 'Expense' && String(r.month).toUpperCase() === m)
      .reduce((sum, r) => sum + r2(parseNum(r.gross)), 0);
    return {
      name: m.slice(0, 3),
      Sales: r2(monthSales),
      Purchases: r2(monthPurch)
    };
  });

  // Group by category for Pie Chart
  const categoriesMap: Record<string, number> = {};
  filteredRows.forEach(r => {
    const key = r.type === 'Sales' ? (r.category || 'Sales Revenue') : (r.category || 'Purchases');
    categoriesMap[key] = (categoriesMap[key] || 0) + r2(parseNum(r.gross));
  });

  const pieData = Object.entries(categoriesMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  const COLORS = ['#10b981', '#ef4444', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6'];

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
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
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5">
        <div>
          <h2 className="text-2xl font-display font-bold tracking-tight text-zinc-900 dark:text-white">Enterprise Dashboard</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Real-time financial status, profit & loss, and operational sync logs.</p>
        </div>
        <div className="flex items-center gap-2 self-start md:self-auto bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 px-3 py-1.5 rounded-xl text-xs font-semibold tracking-wider uppercase border border-blue-100 dark:border-blue-900/30">
          <span>{yearFilter === 'ALL' ? 'All Years' : yearFilter}</span>
          <span className="opacity-40">•</span>
          <span>{monthFilter === 'ALL' ? 'All Months' : monthFilter}</span>
          {quarterFilter !== 'ALL' && (
            <>
              <span className="opacity-40">•</span>
              <span>{quarterFilter}</span>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div variants={itemVariants} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl flex items-start justify-between shadow-sm">
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Corporate Identity</span>
            <div className="text-base font-extrabold text-zinc-800 dark:text-zinc-200 line-clamp-1">{companyName}</div>
            <div className="text-xs text-zinc-400 font-medium font-mono">{companyTin || 'TIN NOT CONFIGURED'}</div>
          </div>
          <div className="bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 p-2.5 rounded-xl">
            <Building2 className="w-5 h-5" />
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl flex items-start justify-between shadow-sm">
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Gross Sales</span>
            <div className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">{displayMoney(totalSalesGross)}</div>
            <div className="text-xs font-medium text-zinc-400">{sales.length} invoices posted</div>
          </div>
          <div className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 p-2.5 rounded-xl">
            <TrendingUp className="w-5 h-5" />
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl flex items-start justify-between shadow-sm">
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Purchases & Expenses</span>
            <div className="text-lg font-extrabold text-zinc-900 dark:text-zinc-100">{displayMoney(totalPurchGross)}</div>
            <div className="text-xs font-medium text-zinc-400">{purchases.length} expenses posted</div>
          </div>
          <div className="bg-zinc-50 dark:bg-zinc-950/40 text-zinc-900 dark:text-zinc-100 p-2.5 rounded-xl">
            <TrendingDown className="w-5 h-5" />
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl flex items-start justify-between shadow-sm">
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Net Business Value</span>
            <div className={`text-lg font-extrabold ${netIncome >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {displayMoney(netIncome)}
            </div>
            <div className="text-xs font-medium text-zinc-400">{netIncome < 0 ? 'Operating deficit' : 'Healthy margin profile'}</div>
          </div>
          <div className={`p-2.5 rounded-xl ${netIncome >= 0 ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400' : 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400'}`}>
            <DollarSign className="w-5 h-5" />
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div variants={itemVariants} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl shadow-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Gross Profit Margin</span>
          <div className="text-base font-extrabold text-zinc-800 dark:text-zinc-100 mt-1">{displayMoney(grossProfit)}</div>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-2 font-medium">Revenues less Cost of Goods Sold</p>
        </motion.div>

        <motion.div variants={itemVariants} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl shadow-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Total Operating Expenses</span>
          <div className="text-base font-extrabold text-zinc-800 dark:text-zinc-100 mt-1">{displayMoney(operatingExpenses)}</div>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-2 font-medium">Fixed and administrative costs</p>
        </motion.div>

        <motion.div variants={itemVariants} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl shadow-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Net Cash Position</span>
          <div className="text-base font-extrabold text-zinc-800 dark:text-zinc-100 mt-1">{displayMoney(totalCash)}</div>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-2 font-medium">Cash in hand less direct disbursements</p>
        </motion.div>

        <motion.div variants={itemVariants} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl shadow-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Value-Added Tax (VAT)</span>
          <div className={`text-base font-extrabold mt-1 ${netVat >= 0 ? 'text-red-500' : 'text-emerald-500'}`}>
            {displayMoney(netVat)}
          </div>
          <p className="text-xs mt-2 font-semibold">
            {netVat >= 0 ? (
              <span className="text-rose-500 flex items-center gap-1"><ArrowUpRight className="w-3.5 h-3.5" /> VAT Payable</span>
            ) : (
              <span className="text-emerald-500 flex items-center gap-1"><ArrowDownRight className="w-3.5 h-3.5" /> Excess Input Tax</span>
            )}
          </p>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div variants={itemVariants} className="lg:col-span-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl shadow-sm flex flex-col justify-between min-h-[380px]">
          <div>
            <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider mb-4">Monthly sales vs purchases</h3>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" className="dark:stroke-zinc-800" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', border: 'none', borderRadius: '12px', color: '#fff' }}
                  labelStyle={{ fontWeight: 'bold' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                <Bar dataKey="Sales" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Purchases" fill="#18181b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl shadow-sm flex flex-col justify-between min-h-[380px]">
          <div>
            <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider mb-4">Activity Category Shares</h3>
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
              <div className="text-sm text-zinc-400 italic">No category data recorded</div>
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
          <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">Recent Transactions</h3>
          <p className="text-xs text-zinc-500 mt-1">Showing the latest 5 ledger rows.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-950/60 border-b border-zinc-100 dark:border-zinc-800">
                <th className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 px-5 py-3">Date</th>
                <th className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 px-5 py-3">Type</th>
                <th className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 px-5 py-3">Account / Category</th>
                <th className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 px-5 py-3">Client / Vendor</th>
                <th className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 px-5 py-3">Reference</th>
                <th className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 px-5 py-3 text-right">Gross</th>
                <th className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 px-5 py-3 text-right">Net</th>
                <th className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 px-5 py-3 text-right">VAT</th>
                <th className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 px-5 py-3 text-right">Cash Impact</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {recent.length ? recent.map(r => (
                <tr key={r.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/20 transition-colors">
                  <td className="px-5 py-3.5 text-xs font-semibold text-zinc-800 dark:text-zinc-300">{cleanDate(r.date)}</td>
                  <td className="px-5 py-3.5 text-xs">
                    <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                      r.type === 'Sales' 
                        ? 'bg-emerald-50 border-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:border-emerald-900/30 dark:text-emerald-400' 
                        : 'bg-rose-50 border-rose-100 text-rose-700 dark:bg-rose-950/30 dark:border-rose-900/30 dark:text-rose-400'
                    }`}>
                      {r.type === 'Sales' ? 'Sales' : 'Purchase'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-xs text-zinc-500 dark:text-zinc-400 truncate max-w-[160px] font-semibold">{r.category}</td>
                  <td className="px-5 py-3.5 text-xs text-zinc-800 dark:text-zinc-200 font-bold truncate max-w-[180px]">{r.payor}</td>
                  <td className="px-5 py-3.5 text-xs text-zinc-500 font-mono font-medium">{r.ref}</td>
                  <td className="px-5 py-3.5 text-xs text-right font-semibold font-mono text-zinc-800 dark:text-zinc-300">{displayMoney(r.gross)}</td>
                  <td className="px-5 py-3.5 text-xs text-right font-medium font-mono text-zinc-500 dark:text-zinc-400">{displayMoney(r.net !== undefined ? r.net : (r.taxType === 'Vatable' ? r.gross / 1.12 : r.gross))}</td>
                  <td className="px-5 py-3.5 text-xs text-right font-medium font-mono text-zinc-400 dark:text-zinc-500">{displayMoney(r.vat)}</td>
                  <td className="px-5 py-3.5 text-xs text-right font-bold font-mono text-zinc-800 dark:text-zinc-100">{displayMoney(r.cash)}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={9} className="px-5 py-8 text-center text-zinc-400 dark:text-zinc-500 italic">No transactions found for the selected period.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </motion.div>
  );
};
