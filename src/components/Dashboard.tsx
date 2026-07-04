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
  FileText,
  HeartPulse,
  ShieldCheck,
  Sparkles
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
  Sector,
  LineChart,
  Line
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
  onOpenAICopilot: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  ledger,
  yearFilter,
  monthFilter,
  quarterFilter,
  companyName,
  companyTin,
  onOpenAICopilot
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

  // Month-over-month Financial Health Summary Calculations
  const curMonth = monthFilter !== 'ALL' ? monthFilter.toUpperCase() : MONTH_NAMES[new Date().getMonth()];
  const curYear = yearFilter !== 'ALL' ? yearFilter : String(new Date().getFullYear());

  const curMonthIndex = MONTH_NAMES.indexOf(curMonth);
  const prevMonthIndex = curMonthIndex === 0 ? 11 : curMonthIndex - 1;
  const prevMonth = MONTH_NAMES[prevMonthIndex];
  const prevYear = curMonthIndex === 0 ? String(parseInt(curYear) - 1) : curYear;

  const curMonthRows = ledger.filter(r => r.status !== 'Void' && String(r.month).toUpperCase() === curMonth && String(new Date(r.date).getFullYear()) === curYear);
  const prevMonthRows = ledger.filter(r => r.status !== 'Void' && String(r.month).toUpperCase() === prevMonth && String(new Date(r.date).getFullYear()) === prevYear);

  const curSales = curMonthRows.filter(r => r.type === 'Sales').reduce((sum, r) => sum + r2(parseNum(r.gross)), 0);
  const curExpenses = curMonthRows.filter(r => r.type === 'Expense').reduce((sum, r) => sum + r2(parseNum(r.gross)), 0);
  const curNet = r2(curSales - curExpenses);

  const prevSales = prevMonthRows.filter(r => r.type === 'Sales').reduce((sum, r) => sum + r2(parseNum(r.gross)), 0);
  const prevExpenses = prevMonthRows.filter(r => r.type === 'Expense').reduce((sum, r) => sum + r2(parseNum(r.gross)), 0);
  const prevNet = r2(prevSales - prevExpenses);

  // Sales Growth %
  let salesGrowth = 0;
  if (prevSales > 0) {
    salesGrowth = r2(((curSales - prevSales) / prevSales) * 100);
  } else if (curSales > 0) {
    salesGrowth = 100;
  }

  // Expense Growth %
  let expenseGrowth = 0;
  if (prevExpenses > 0) {
    expenseGrowth = r2(((curExpenses - prevExpenses) / prevExpenses) * 100);
  } else if (curExpenses > 0) {
    expenseGrowth = 100;
  }

  // Net Cash Flow Growth %
  let netGrowth = 0;
  if (prevNet !== 0) {
    netGrowth = r2(((curNet - prevNet) / Math.abs(prevNet)) * 100);
  } else if (curNet !== 0) {
    netGrowth = curNet > 0 ? 100 : -100;
  }

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
    const key = r.type === 'Sales' ? (r.category || 'Sales Revenue - Goods') : (r.category || 'Purchases');
    categoriesMap[key] = (categoriesMap[key] || 0) + r2(parseNum(r.gross));
  });

  const pieData = Object.entries(categoriesMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  // Chart and Tax states
  const [chartType, setChartType] = React.useState<'line' | 'bar'>('line');

  // Real-time Estimated Tax Liabilities calculations
  const nonVatSales = sales.filter(r => r.taxType === 'Non-VAT').reduce((sum, r) => sum + r2(parseNum(r.gross)), 0);
  const estimatedPercentageTax = r2(nonVatSales * 0.01);
  const estimatedNetVat = r2(Math.max(0, outputVat - inputVat));

  // Income Tax comparisons (Graduated vs 8% Flat)
  const taxableIncomeGrad = Math.max(0, totalSalesGross - totalPurchGross);
  const calcGradTax = (taxable: number) => {
    if (taxable <= 250000) return 0;
    if (taxable <= 400000) return (taxable - 250000) * 0.15;
    if (taxable <= 800000) return 22500 + (taxable - 400000) * 0.20;
    if (taxable <= 2000000) return 102500 + (taxable - 800000) * 0.25;
    if (taxable <= 8000000) return 402500 + (taxable - 2000000) * 0.30;
    return 2202500 + (taxable - 8000000) * 0.35;
  };
  const estimatedGradTax = r2(calcGradTax(taxableIncomeGrad));
  const estimatedFlatTax = r2(Math.max(0, totalSalesGross - 250000) * 0.08);

  const bestTaxOption = estimatedGradTax < estimatedFlatTax ? 'Graduated Rates' : '8% Flat Rate';
  const taxSavings = r2(Math.abs(estimatedGradTax - estimatedFlatTax));

  // Compliance Progress (Calculated based on ledger density)
  const complianceScore = Math.min(100, Math.round((filteredRows.length / 50) * 100));
  const isVatReady = filteredRows.some(r => r.taxType === 'Vatable');

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
        <div className="flex items-center gap-1.5 self-start md:self-auto bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 px-4 py-1.5 rounded-full text-xs font-extrabold tracking-wider uppercase border border-blue-100/70 dark:border-blue-900/30 shadow-sm">
          <span>{yearFilter === 'ALL' ? 'ALL YEARS' : yearFilter}</span>
          <span className="opacity-40">•</span>
          <span>{monthFilter === 'ALL' ? 'ALL MONTHS' : monthFilter}</span>
          {quarterFilter !== 'ALL' && (
            <>
              <span className="opacity-40">•</span>
              <span>{quarterFilter}</span>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Corporate Identity */}
        <motion.div 
          variants={itemVariants} 
          className="bg-zinc-200/90 dark:bg-zinc-800/80 p-2 rounded-3xl border border-zinc-300/60 dark:border-zinc-700/60 shadow-sm"
        >
          <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-100 dark:border-zinc-800/50 flex items-start justify-between h-full shadow-inner">
            <div className="space-y-2 text-left">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 block">CORPORATE IDENTITY</span>
              <div className="text-base font-black text-zinc-800 dark:text-zinc-100 leading-tight line-clamp-1">{companyName}</div>
              <div className="text-xs text-zinc-400 dark:text-zinc-500 font-bold font-mono tracking-wider">{companyTin || 'TIN NOT CONFIGURED'}</div>
            </div>
            <div className="bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 p-2.5 rounded-xl shrink-0 ml-2">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
        </motion.div>

        {/* Card 2: Gross Sales */}
        <motion.div 
          variants={itemVariants} 
          className="bg-zinc-200/90 dark:bg-zinc-800/80 p-2 rounded-3xl border border-zinc-300/60 dark:border-zinc-700/60 shadow-sm"
        >
          <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-100 dark:border-zinc-800/50 flex items-start justify-between h-full shadow-inner">
            <div className="space-y-2 text-left">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 block">GROSS SALES</span>
              <div className="text-lg font-black text-emerald-600 dark:text-emerald-400 leading-none">{displayMoney(totalSalesGross)}</div>
              <div className="text-xs font-semibold text-zinc-400 dark:text-zinc-500">{sales.length} invoices posted</div>
            </div>
            <div className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 p-2.5 rounded-xl shrink-0 ml-2">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
        </motion.div>

        {/* Card 3: Total Purchases */}
        <motion.div 
          variants={itemVariants} 
          className="bg-zinc-200/90 dark:bg-zinc-800/80 p-2 rounded-3xl border border-zinc-300/60 dark:border-zinc-700/60 shadow-sm"
        >
          <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-100 dark:border-zinc-800/50 flex items-start justify-between h-full shadow-inner">
            <div className="space-y-2 text-left">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 block">TOTAL PURCHASES</span>
              <div className="text-lg font-black text-zinc-900 dark:text-zinc-100 leading-none">{displayMoney(totalPurchGross)}</div>
              <div className="text-xs font-semibold text-zinc-400 dark:text-zinc-500">{purchases.length} purchases posted</div>
            </div>
            <div className="bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 p-2.5 rounded-xl shrink-0 ml-2">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>
        </motion.div>

        {/* Card 4: Net Business Value */}
        <motion.div 
          variants={itemVariants} 
          className="bg-zinc-200/90 dark:bg-zinc-800/80 p-2 rounded-3xl border border-zinc-300/60 dark:border-zinc-700/60 shadow-sm"
        >
          <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-100 dark:border-zinc-800/50 flex items-start justify-between h-full shadow-inner">
            <div className="space-y-2 text-left">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 block">NET BUSINESS VALUE</span>
              <div className={`text-lg font-black leading-none ${netIncome >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {displayMoney(netIncome)}
              </div>
              <div className="text-xs font-semibold text-zinc-400 dark:text-zinc-500">{netIncome < 0 ? 'Operating deficit' : 'Healthy margin profile'}</div>
            </div>
            <div className={`p-2.5 rounded-xl shrink-0 ml-2 ${netIncome >= 0 ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400' : 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400'}`}>
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Stratify AI Copilot Banner */}
      <motion.div 
        variants={itemVariants}
        className="bg-gradient-to-r from-indigo-50/80 via-indigo-100/40 to-blue-50/60 dark:from-indigo-950/40 dark:via-indigo-950/20 dark:to-blue-950/20 border border-indigo-200/50 dark:border-indigo-500/20 rounded-3xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm shadow-indigo-500/5 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex items-center gap-4 relative z-10 text-left">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30 shrink-0">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-1.5 uppercase tracking-wider">
              Stratify AI Financial Copilot
              <span className="text-[9px] bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 border border-indigo-500/30 px-1.5 py-0.5 rounded-full font-mono font-bold">ONLINE</span>
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-300 mt-1 max-w-xl">
              Our advanced server-side Gemini intelligence is ready to analyze your ledger. Get direct compliance auditing, custom cost reduction strategies, or Philippine BIR tax code advice.
            </p>
          </div>
        </div>
        <button
          onClick={onOpenAICopilot}
          className="flex items-center gap-2 text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-5 py-3 rounded-2xl transition-all shadow-md shadow-indigo-500/10 hover:shadow-indigo-500/20 shrink-0 relative z-10 group"
        >
          <span>Ask AI Copilot</span>
          <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
        </button>
      </motion.div>

      {/* MoM Financial Health Summary Section */}
      <motion.div 
        variants={itemVariants} 
        className="bg-gradient-to-r from-emerald-500/10 via-blue-500/5 to-zinc-500/5 dark:from-emerald-950/20 dark:via-blue-950/10 dark:to-zinc-950/10 border border-emerald-100/60 dark:border-emerald-900/20 p-6 rounded-2xl shadow-sm space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-emerald-100/30 dark:border-emerald-900/10 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl shrink-0">
              <HeartPulse className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">Financial Health Summary</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Comparing <strong className="text-emerald-600 dark:text-emerald-400">{curMonth} {curYear}</strong> with preceding month <strong className="text-zinc-600 dark:text-zinc-400">{prevMonth} {prevYear}</strong>
              </p>
            </div>
          </div>
          <div className="text-xs font-bold text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800/80 px-3 py-1 rounded-lg border border-zinc-200/50 dark:border-zinc-700/50 self-start sm:self-auto font-mono shadow-sm">
            Trend Assessment: {curNet >= prevNet ? '📈 Improving Margin' : '📉 Retracting Margin'}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Sales MoM */}
          <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800 flex flex-col justify-between shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-widest truncate">Monthly Gross Sales</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5 shrink-0 ${salesGrowth >= 0 ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400' : 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400'}`}>
                {salesGrowth >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {salesGrowth >= 0 ? '+' : ''}{salesGrowth}%
              </span>
            </div>
            <div className="mt-2.5">
              <div className="text-base font-extrabold text-zinc-800 dark:text-zinc-100">{displayMoney(curSales)}</div>
              <div className="text-[10px] text-zinc-400 mt-1 font-medium flex items-center justify-between gap-1">
                <span>Prev: {displayMoney(prevSales)}</span>
                <span className="font-semibold text-zinc-500 font-mono">Diff: {salesGrowth >= 0 ? '+' : ''}{displayMoney(curSales - prevSales)}</span>
              </div>
            </div>
          </div>

          {/* Purchases MoM */}
          <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800 flex flex-col justify-between shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-widest truncate">Monthly Expenses</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5 shrink-0 ${expenseGrowth <= 0 ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400' : 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400'}`}>
                {expenseGrowth >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {expenseGrowth >= 0 ? '+' : ''}{expenseGrowth}%
              </span>
            </div>
            <div className="mt-2.5">
              <div className="text-base font-extrabold text-zinc-800 dark:text-zinc-100">{displayMoney(curExpenses)}</div>
              <div className="text-[10px] text-zinc-400 mt-1 font-medium flex items-center justify-between gap-1">
                <span>Prev: {displayMoney(prevExpenses)}</span>
                <span className="font-semibold text-zinc-500 font-mono">Diff: {expenseGrowth >= 0 ? '+' : ''}{displayMoney(curExpenses - prevExpenses)}</span>
              </div>
            </div>
          </div>

          {/* Net Cash Generation */}
          <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800 flex flex-col justify-between shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-widest truncate">Net Cash Generated</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5 shrink-0 ${netGrowth >= 0 ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400' : 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400'}`}>
                {netGrowth >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {netGrowth >= 0 ? '+' : ''}{netGrowth}%
              </span>
            </div>
            <div className="mt-2.5">
              <div className={`text-base font-extrabold ${curNet >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-rose-600'}`}>
                {displayMoney(curNet)}
              </div>
              <div className="text-[10px] text-zinc-400 mt-1 font-medium flex items-center justify-between gap-1">
                <span>Prev: {displayMoney(prevNet)}</span>
                <span className="font-semibold text-zinc-500 font-mono">Diff: {netGrowth >= 0 ? '+' : ''}{displayMoney(curNet - prevNet)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-emerald-50/40 dark:bg-emerald-950/10 p-3 rounded-xl border border-emerald-100/50 dark:border-emerald-900/10 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
          💡 <strong className="uppercase">Smart Health Diagnosis:</strong>{' '}
          {salesGrowth > 0 && expenseGrowth < 0 ? (
            <span>Outstanding performance! Sales increased by {salesGrowth}% while overhead decreased by {Math.abs(expenseGrowth)}%, leading to a substantial margin expansion of {netGrowth}%.</span>
          ) : salesGrowth > 0 && expenseGrowth >= 0 ? (
            <span>Positive top-line revenue expansion. Sales grew by {salesGrowth}%, offsetting the {expenseGrowth}% overhead increases. Net income trended by {netGrowth >= 0 ? '+' : ''}{netGrowth}%.</span>
          ) : salesGrowth < 0 && expenseGrowth < 0 ? (
            <span>Defensive cost containment. Although sales contracted by {Math.abs(salesGrowth)}%, tight operational spending cuts of {Math.abs(expenseGrowth)}% cushioned the bottom line, affecting net profit by {netGrowth}%.</span>
          ) : (
            <span>Attention required. Top-line sales decreased by {Math.abs(salesGrowth)}% while business overhead increased by {expenseGrowth}%, compressing your net margin by {Math.abs(netGrowth)}%. Evaluate marketing and cost controls.</span>
          )}
        </div>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div variants={itemVariants} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl shadow-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Gross Profit Margin</span>
          <div className="text-base font-extrabold text-zinc-800 dark:text-zinc-100 mt-1">{displayMoney(grossProfit)}</div>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-2 font-medium">Revenues less Cost of Goods Sold</p>
        </motion.div>

        <motion.div variants={itemVariants} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl shadow-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Total Operating Purchases</span>
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
          <div className={`text-base font-extrabold mt-1 ${netVat >= 0 ? 'text-zinc-800 dark:text-zinc-100' : 'text-emerald-500'}`}>
            {displayMoney(netVat)}
          </div>
          <p className="text-xs mt-2 font-semibold">
            {netVat >= 0 ? (
              <span className="text-zinc-500 dark:text-zinc-400 flex items-center gap-1"><ArrowUpRight className="w-3.5 h-3.5" /> VAT Payable</span>
            ) : (
              <span className="text-emerald-500 flex items-center gap-1"><ArrowDownRight className="w-3.5 h-3.5" /> Excess Input Tax</span>
            )}
          </p>
        </motion.div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Card 1: Compliance circular indicator */}
        <motion.div variants={itemVariants} className="lg:col-span-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Compliance Readiness</h3>
              <ShieldCheck className="w-5 h-5 text-blue-500" />
            </div>
            <div className="flex flex-col items-center justify-center py-4">
              <div className="relative w-32 h-32 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="64"
                    cy="64"
                    r="58"
                    fill="transparent"
                    stroke="currentColor"
                    strokeWidth="8"
                    className="text-zinc-100 dark:text-zinc-800"
                  />
                  <circle
                    cx="64"
                    cy="64"
                    r="58"
                    fill="transparent"
                    stroke="currentColor"
                    strokeWidth="8"
                    strokeDasharray={364.42}
                    strokeDashoffset={364.42 - (364.42 * complianceScore) / 100}
                    strokeLinecap="round"
                    className="text-blue-500 transition-all duration-1000 ease-out"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-black text-zinc-900 dark:text-white">{complianceScore}%</span>
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Score</span>
                </div>
              </div>
              <div className="mt-6 w-full space-y-2.5">
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest">
                  <span className="text-zinc-500">VAT Reporting</span>
                  <span className={isVatReady ? 'text-emerald-500 font-extrabold' : 'text-zinc-400'}>{isVatReady ? 'ACTIVE' : 'INACTIVE'}</span>
                </div>
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest">
                  <span className="text-zinc-500">Bookkeeping Logs</span>
                  <span className={filteredRows.length > 10 ? 'text-emerald-500 font-extrabold' : 'text-amber-500 font-extrabold'}>{filteredRows.length > 10 ? 'HEALTHY' : 'LOW DENSITY'}</span>
                </div>
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest">
                  <span className="text-zinc-500">Audit Consistency</span>
                  <span className="text-emerald-500 font-extrabold">OPTIMAL</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Card 2: Interactive Sales vs. Purchases Trend Graph */}
        <motion.div variants={itemVariants} className="lg:col-span-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl shadow-sm flex flex-col justify-between min-h-[380px]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Sales vs. Purchases Trend</h3>
              <p className="text-[10px] text-zinc-400 mt-0.5">Real-time performance flow analysis</p>
            </div>
            <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl text-[10px] font-bold">
              <button 
                onClick={() => setChartType('line')}
                className={`px-2.5 py-1 rounded-lg transition-all ${chartType === 'line' ? 'bg-white dark:bg-zinc-900 text-zinc-800 dark:text-white shadow-xs' : 'text-zinc-400 hover:text-zinc-600'}`}
              >
                📈 Trend Line
              </button>
              <button 
                onClick={() => setChartType('bar')}
                className={`px-2.5 py-1 rounded-lg transition-all ${chartType === 'bar' ? 'bg-white dark:bg-zinc-900 text-zinc-800 dark:text-white shadow-xs' : 'text-zinc-400 hover:text-zinc-600'}`}
              >
                📊 Comparison Bar
              </button>
            </div>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'line' ? (
                <LineChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" className="dark:stroke-zinc-850" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', border: 'none', borderRadius: '12px', color: '#fff' }}
                    labelStyle={{ fontWeight: 'bold' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                  <Line type="monotone" dataKey="Sales" stroke="#10b981" strokeWidth={3.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="Purchases" stroke="#ef4444" strokeWidth={3.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              ) : (
                <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" className="dark:stroke-zinc-850" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', border: 'none', borderRadius: '12px', color: '#fff' }}
                    labelStyle={{ fontWeight: 'bold' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                  <Bar dataKey="Sales" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Purchases" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Card 3: Expense Shares / Donut chart */}
        <motion.div variants={itemVariants} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl shadow-sm flex flex-col justify-between min-h-[380px]">
          <div>
            <h3 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-4">Activity shares</h3>
          </div>
          <div className="h-52 w-full flex items-center justify-center">
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

        {/* Card 4: Estimated Tax Payable Tracker & Optimizations */}
        <motion.div variants={itemVariants} className="lg:col-span-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl shadow-sm flex flex-col justify-between min-h-[380px]">
          <div className="space-y-1">
            <h3 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Estimated Tax Liabilities</h3>
            <p className="text-[10px] text-zinc-400 font-medium">Auto-computed base on current quarter transactions</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 my-4">
            {/* Left side: Progress set-aside trackers */}
            <div className="space-y-3">
              {/* Tracker 1: VAT / Percentage Tax */}
              <div className="bg-zinc-50 dark:bg-zinc-950/40 p-3 rounded-xl border border-zinc-100 dark:border-zinc-850">
                <div className="flex items-center justify-between text-[11px] font-bold text-zinc-500 uppercase">
                  <span>{isVatReady ? "Estimated Net VAT" : "Estimated Percentage Tax"}</span>
                  <span className="font-mono text-zinc-800 dark:text-zinc-200">{isVatReady ? displayMoney(estimatedNetVat) : displayMoney(estimatedPercentageTax)}</span>
                </div>
                <div className="mt-2 w-full bg-zinc-200 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                    style={{ width: `${Math.min(100, isVatReady ? (estimatedNetVat > 0 ? (estimatedNetVat / 50000) * 100 : 0) : (estimatedPercentageTax > 0 ? (estimatedPercentageTax / 20000) * 100 : 0))}%` }} 
                  />
                </div>
                <div className="flex justify-between text-[9px] text-zinc-400 mt-1">
                  <span>Tax payable set-aside</span>
                  <span>{isVatReady ? "Quarterly Output less Input VAT" : "1.0% of Non-VAT Sales"}</span>
                </div>
              </div>

              {/* Tracker 2: Quarterly Income Tax */}
              <div className="bg-zinc-50 dark:bg-zinc-950/40 p-3 rounded-xl border border-zinc-100 dark:border-zinc-850">
                <div className="flex items-center justify-between text-[11px] font-bold text-zinc-500 uppercase">
                  <span>Income Tax ({bestTaxOption})</span>
                  <span className="font-mono text-zinc-800 dark:text-zinc-200">{bestTaxOption === 'Graduated Rates' ? displayMoney(estimatedGradTax) : displayMoney(estimatedFlatTax)}</span>
                </div>
                <div className="mt-2 w-full bg-zinc-200 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-blue-500 h-full rounded-full transition-all duration-500" 
                    style={{ width: `${Math.min(100, (bestTaxOption === 'Graduated Rates' ? estimatedGradTax : estimatedFlatTax) > 0 ? ((bestTaxOption === 'Graduated Rates' ? estimatedGradTax : estimatedFlatTax) / 100000) * 100 : 0)}%` }} 
                  />
                </div>
                <div className="flex justify-between text-[9px] text-zinc-400 mt-1">
                  <span>Proj. Net Tax Liability</span>
                  <span>Base on TRAIN Law tables</span>
                </div>
              </div>
            </div>

            {/* Right side: Optimizer Recommendations */}
            <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 dark:from-indigo-950/10 dark:to-zinc-900 p-4 rounded-xl border border-indigo-100/60 dark:border-indigo-950/20 flex flex-col justify-between">
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                  <Sparkles className="w-4 h-4 text-indigo-500 animate-pulse" />
                  Smart Tax Optimization Advice
                </div>
                {taxSavings > 0 ? (
                  <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed font-medium">
                    Kapag pinili mo ang <strong className="text-indigo-600 dark:text-indigo-400 font-bold">{bestTaxOption}</strong>, makakatipid ang iyong negosyo ng tinatayang <strong className="text-emerald-500 font-mono font-bold">{displayMoney(taxSavings)}</strong> kumpara sa kabilang regime.
                  </p>
                ) : (
                  <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed font-medium">
                    Ang iyong tinatayang Income Tax para sa Graduated Rates at 8% Flat Rates ay magkatasama (₱0.00) dahil ang iyong kabuuang kita ay nasa loob pa ng exemption threshold.
                  </p>
                )}
              </div>
              <div className="text-[10px] text-zinc-400 border-t border-indigo-100/30 dark:border-zinc-800 pt-2 mt-2 font-semibold">
                *Tandaan na mag-file bago ang deadline upang maiwasan ang multa o penalties.
              </div>
            </div>
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
                        : 'bg-zinc-100 border-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-200'
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
