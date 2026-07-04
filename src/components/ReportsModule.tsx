import React, { useState } from 'react';
import { motion } from 'motion/react';
import { FileText, Calendar, ShieldCheck, Scale, AlertTriangle, CheckCircle, Printer, Download, Percent, ShieldAlert, Award, FileSpreadsheet, Building } from 'lucide-react';
import { LedgerEntry } from '../types';
import { r2, displayMoney, inPeriod, parseNum, formatCurrency } from '../utils/helpers';

interface ReportsModuleProps {
  ledger: LedgerEntry[];
  yearFilter: string;
  monthFilter: string;
  quarterFilter: string;
  companyConfig?: { registeredVat: boolean };
}

export const ReportsModule: React.FC<ReportsModuleProps> = ({
  ledger,
  yearFilter,
  monthFilter,
  quarterFilter,
  companyConfig
}) => {
  const [activeReport, setActiveReport] = useState<'Tax' | 'Form1701Q' | 'Form2551Q' | 'ARAging' | 'APAging' | 'AnnualSummary'>('Tax');
  const [taxRegime, setTaxRegime] = useState<'graduated' | 'flat8'>('graduated');
  const [deductionMethod, setDeductionMethod] = useState<'itemized' | 'osd'>('itemized');
  const [percentageTaxRate, setPercentageTaxRate] = useState<number>(0.01);

  const activeRows = ledger.filter(r => r.status !== 'Void' && inPeriod(r, yearFilter, monthFilter, quarterFilter));

  // 1. VAT Calculations (2550Q/M)
  const vatableSales = activeRows
    .filter(r => r.type === 'Sales' && r.taxType === 'Vatable')
    .reduce((sum, r) => sum + r2(parseNum(r.taxable)), 0);
  const vatSalesOutput = activeRows
    .filter(r => r.type === 'Sales' && r.taxType === 'Vatable')
    .reduce((sum, r) => sum + r2(parseNum(r.vat)), 0);

  // Goods vs Services breakdowns
  const vatableSalesGoods = activeRows
    .filter(r => r.type === 'Sales' && r.taxType === 'Vatable' && (r.itemType === 'Goods' || !r.itemType))
    .reduce((sum, r) => sum + r2(parseNum(r.taxable)), 0);
  const vatableSalesServices = activeRows
    .filter(r => r.type === 'Sales' && r.taxType === 'Vatable' && r.itemType === 'Services')
    .reduce((sum, r) => sum + r2(parseNum(r.taxable)), 0);

  const vatSalesOutputGoods = activeRows
    .filter(r => r.type === 'Sales' && r.taxType === 'Vatable' && (r.itemType === 'Goods' || !r.itemType))
    .reduce((sum, r) => sum + r2(parseNum(r.vat)), 0);
  const vatSalesOutputServices = activeRows
    .filter(r => r.type === 'Sales' && r.taxType === 'Vatable' && r.itemType === 'Services')
    .reduce((sum, r) => sum + r2(parseNum(r.vat)), 0);

  const exemptSales = activeRows
    .filter(r => r.type === 'Sales' && r.taxType === 'Exempt')
    .reduce((sum, r) => sum + r2(parseNum(r.gross)), 0);
  const zeroRatedSales = activeRows
    .filter(r => r.type === 'Sales' && r.taxType === 'Zero-Rated')
    .reduce((sum, r) => sum + r2(parseNum(r.gross)), 0);

  // Purchases Input VAT
  const vatablePurchases = activeRows
    .filter(r => r.type === 'Expense' && r.taxType === 'Vatable')
    .reduce((sum, r) => sum + r2(parseNum(r.taxable)), 0);
  const vatPurchasesInput = activeRows
    .filter(r => r.type === 'Expense' && r.taxType === 'Vatable')
    .reduce((sum, r) => sum + r2(parseNum(r.vat)), 0);

  const vatablePurchasesGoods = activeRows
    .filter(r => r.type === 'Expense' && r.taxType === 'Vatable' && (r.itemType === 'Goods' || !r.itemType))
    .reduce((sum, r) => sum + r2(parseNum(r.taxable)), 0);
  const vatablePurchasesServices = activeRows
    .filter(r => r.type === 'Expense' && r.taxType === 'Vatable' && r.itemType === 'Services')
    .reduce((sum, r) => sum + r2(parseNum(r.taxable)), 0);

  const vatPurchasesInputGoods = activeRows
    .filter(r => r.type === 'Expense' && r.taxType === 'Vatable' && (r.itemType === 'Goods' || !r.itemType))
    .reduce((sum, r) => sum + r2(parseNum(r.vat)), 0);
  const vatPurchasesInputServices = activeRows
    .filter(r => r.type === 'Expense' && r.taxType === 'Vatable' && r.itemType === 'Services')
    .reduce((sum, r) => sum + r2(parseNum(r.vat)), 0);

  const netVatPayable = r2(vatSalesOutput - vatPurchasesInput);

  // 2. Percentage Tax (2551Q) - 1% rate as of PH legislation changes
  const grossNonVatSales = activeRows
    .filter(r => r.type === 'Sales' && r.taxType === 'Non-VAT')
    .reduce((sum, r) => sum + r2(parseNum(r.gross)), 0);
  const percentageTaxDue = r2(grossNonVatSales * 0.01);

  // 3. Accounts Receivable (AR) & Accounts Payable (AP) Aging Calculations
  // Group by payor
  const arAgingMap: Record<string, { company: string; current: number; d1_30: number; d31_60: number; d61_plus: number; total: number }> = {};
  const apAgingMap: Record<string, { company: string; current: number; d1_30: number; d31_60: number; d61_plus: number; total: number }> = {};

  activeRows.forEach(r => {
    const payor = String(r.payor || '').trim() || 'General Customer';
    const amount = r2(parseNum(r.gross));
    if (amount <= 0) return;

    // Simulate due date vs date
    const txDate = new Date(r.date);
    const today = new Date();
    const diffDays = Math.floor((today.getTime() - txDate.getTime()) / (1000 * 3600 * 24));

    if (r.type === 'Sales' && r.terms && r.terms !== 'COD' && r.terms !== 'Cash') {
      // Uncollected (Receivables)
      if (!arAgingMap[payor]) {
        arAgingMap[payor] = { company: payor, current: 0, d1_30: 0, d31_60: 0, d61_plus: 0, total: 0 };
      }
      const client = arAgingMap[payor];
      if (diffDays <= 0) client.current = r2(client.current + amount);
      else if (diffDays <= 30) client.d1_30 = r2(client.d1_30 + amount);
      else if (diffDays <= 60) client.d31_60 = r2(client.d31_60 + amount);
      else client.d61_plus = r2(client.d61_plus + amount);
      client.total = r2(client.total + amount);
    } else if (r.type === 'Expense' && r.terms && r.terms !== 'COD' && r.terms !== 'Cash') {
      // Unpaid (Payables)
      if (!apAgingMap[payor]) {
        apAgingMap[payor] = { company: payor, current: 0, d1_30: 0, d31_60: 0, d61_plus: 0, total: 0 };
      }
      const vendor = apAgingMap[payor];
      if (diffDays <= 0) vendor.current = r2(vendor.current + amount);
      else if (diffDays <= 30) vendor.d1_30 = r2(vendor.d1_30 + amount);
      else if (diffDays <= 60) vendor.d31_60 = r2(vendor.d31_60 + amount);
      else vendor.d61_plus = r2(vendor.d61_plus + amount);
      vendor.total = r2(vendor.total + amount);
    }
  });

  const arAgingList = Object.values(arAgingMap);
  const apAgingList = Object.values(apAgingMap);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.05 } }
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
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white font-sans">📈 BIR Compliance & Aging Schedules</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">Verify eBIRForms VAT liability, compile percentage tax schedules, and analyze AR/AP outstanding age distributions.</p>
        </div>
      </div>

      <div className="flex border-b border-zinc-100 dark:border-zinc-800 overflow-x-auto scrollbar-none whitespace-nowrap">
        <button
          onClick={() => setActiveReport('Tax')}
          className={`px-5 py-3 text-xs font-bold border-b-2 uppercase tracking-wider transition-colors shrink-0 ${
            activeReport === 'Tax'
              ? 'border-blue-400 text-blue-500'
              : 'border-transparent text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200'
          }`}
        >
          {companyConfig?.registeredVat === false ? 'BIR Form 2551Q (Percentage)' : 'BIR Form 2550M (VAT)'}
        </button>
        <button
          onClick={() => setActiveReport('Form1701Q')}
          className={`px-5 py-3 text-xs font-bold border-b-2 uppercase tracking-wider transition-colors shrink-0 ${
            activeReport === 'Form1701Q'
              ? 'border-blue-400 text-blue-500'
              : 'border-transparent text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200'
          }`}
        >
          BIR Form 1701Q (Income)
        </button>
        <button
          onClick={() => setActiveReport('Form2551Q')}
          className={`px-5 py-3 text-xs font-bold border-b-2 uppercase tracking-wider transition-colors shrink-0 ${
            activeReport === 'Form2551Q'
              ? 'border-blue-400 text-blue-500'
              : 'border-transparent text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200'
          }`}
        >
          BIR Form 2551Q (Interactive)
        </button>
        <button
          onClick={() => setActiveReport('ARAging')}
          className={`px-5 py-3 text-xs font-bold border-b-2 uppercase tracking-wider transition-colors shrink-0 ${
            activeReport === 'ARAging'
              ? 'border-blue-400 text-blue-500'
              : 'border-transparent text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200'
          }`}
        >
          AR Aging Schedule
        </button>
        <button
          onClick={() => setActiveReport('APAging')}
          className={`px-5 py-3 text-xs font-bold border-b-2 uppercase tracking-wider transition-colors shrink-0 ${
            activeReport === 'APAging'
              ? 'border-blue-400 text-blue-500'
              : 'border-transparent text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200'
          }`}
        >
          AP Aging Schedule
        </button>
        <button
          onClick={() => setActiveReport('AnnualSummary')}
          className={`px-5 py-3 text-xs font-bold border-b-2 uppercase tracking-wider transition-colors shrink-0 ${
            activeReport === 'AnnualSummary'
              ? 'border-blue-400 text-blue-500'
              : 'border-transparent text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200'
          }`}
        >
          Annual Tax Summary
        </button>
      </div>

      {activeReport === 'Tax' && (
        <div className="space-y-6">
          {companyConfig?.registeredVat !== false && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <motion.div variants={itemVariants} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl flex items-start justify-between shadow-sm">
                <div className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Total Output VAT</span>
                  <div className="text-lg font-extrabold text-zinc-800 dark:text-zinc-100">{displayMoney(vatSalesOutput)}</div>
                  <div className="text-xs text-zinc-400 font-medium">12% VAT charged on sales</div>
                </div>
                <div className="bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 p-2.5 rounded-xl">
                  <FileText className="w-5 h-5" />
                </div>
              </motion.div>

              <motion.div variants={itemVariants} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl flex items-start justify-between shadow-sm">
                <div className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Total Input VAT Credit</span>
                  <div className="text-lg font-extrabold text-zinc-800 dark:text-zinc-100">{displayMoney(vatPurchasesInput)}</div>
                  <div className="text-xs text-zinc-400 font-medium">12% VAT paid on capital/expenses</div>
                </div>
                <div className="bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 p-2.5 rounded-xl">
                  <Scale className="w-5 h-5" />
                </div>
              </motion.div>

              <motion.div variants={itemVariants} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl flex items-start justify-between shadow-sm">
                <div className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Net VAT Payable</span>
                  <div className={`text-lg font-extrabold ${netVatPayable >= 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                    {displayMoney(netVatPayable)}
                  </div>
                  <div className="text-xs text-zinc-400 font-medium">{netVatPayable >= 0 ? 'Due for payment' : 'Input VAT excess credit'}</div>
                </div>
                <div className={`p-2.5 rounded-xl ${netVatPayable >= 0 ? 'bg-red-50 dark:bg-red-950/40 text-red-500' : 'bg-emerald-50 text-emerald-500'}`}>
                  <ShieldCheck className="w-5 h-5" />
                </div>
              </motion.div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-left">
            {companyConfig?.registeredVat !== false && (
              <motion.div variants={itemVariants} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl shadow-sm space-y-4">
                <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-800 pb-2">
                  <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">BIR Form 2550M VAT Summary</h3>
                  <span className="text-[10px] bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 font-extrabold px-2 py-0.5 rounded uppercase">Goods & Services Split</span>
                </div>
                <div className="space-y-2.5 text-xs text-zinc-500">
                  <div className="flex justify-between">
                    <span>Vatable Sales - Goods (Net):</span>
                    <span className="font-mono font-semibold text-zinc-800 dark:text-zinc-300">₱ {formatCurrency(vatableSalesGoods)}</span>
                  </div>
                  <div className="flex justify-between border-b border-zinc-100 dark:border-zinc-800/50 pb-1.5 pl-3 text-[11px] italic">
                    <span>Output VAT - Goods (12%):</span>
                    <span className="font-mono text-zinc-600 dark:text-zinc-400">₱ {formatCurrency(vatSalesOutputGoods)}</span>
                  </div>

                  <div className="flex justify-between">
                    <span>Vatable Sales - Services (Net):</span>
                    <span className="font-mono font-semibold text-zinc-800 dark:text-zinc-300">₱ {formatCurrency(vatableSalesServices)}</span>
                  </div>
                  <div className="flex justify-between border-b border-zinc-100 dark:border-zinc-800 pb-1.5 pl-3 text-[11px] italic">
                    <span>Output VAT - Services (12%):</span>
                    <span className="font-mono text-zinc-600 dark:text-zinc-400">₱ {formatCurrency(vatSalesOutputServices)}</span>
                  </div>

                  <div className="flex justify-between border-b border-zinc-100 dark:border-zinc-800/60 pb-1.5">
                    <span>Exempt / Zero-Rated Sales:</span>
                    <span className="font-mono font-semibold text-zinc-800 dark:text-zinc-300">₱ {formatCurrency(exemptSales + zeroRatedSales)}</span>
                  </div>

                  <div className="flex justify-between">
                    <span>Vatable Purchases - Goods (Net):</span>
                    <span className="font-mono font-semibold text-zinc-800 dark:text-zinc-300">₱ {formatCurrency(vatablePurchasesGoods)}</span>
                  </div>
                  <div className="flex justify-between border-b border-zinc-100 dark:border-zinc-800/50 pb-1.5 pl-3 text-[11px] italic">
                    <span>Input VAT - Goods (12%):</span>
                    <span className="font-mono text-zinc-600 dark:text-zinc-400">₱ {formatCurrency(vatPurchasesInputGoods)}</span>
                  </div>

                  <div className="flex justify-between">
                    <span>Vatable Purchases - Services (Net):</span>
                    <span className="font-mono font-semibold text-zinc-800 dark:text-zinc-300">₱ {formatCurrency(vatablePurchasesServices)}</span>
                  </div>
                  <div className="flex justify-between border-b border-zinc-100 dark:border-zinc-800 pb-1.5 pl-3 text-[11px] italic">
                    <span>Input VAT - Services (12%):</span>
                    <span className="font-mono text-zinc-600 dark:text-zinc-400">₱ {formatCurrency(vatPurchasesInputServices)}</span>
                  </div>

                  <div className="flex justify-between text-sm font-extrabold text-zinc-900 dark:text-white pt-2 border-t border-zinc-200 dark:border-zinc-800">
                    <span>Net Tax Payable / (Excess Credit):</span>
                    <span className="font-mono">₱ {formatCurrency(netVatPayable)}</span>
                  </div>
                </div>
              </motion.div>
            )}

            {companyConfig?.registeredVat === false && (
              <motion.div variants={itemVariants} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">BIR Form 2551Q Percentage Tax Summary</h3>
                <p className="text-xs text-zinc-500">Applicable to small merchants and non-VAT registered taxpayers with gross annual sales below ₱ 3,000,000.</p>
                <div className="space-y-3 text-xs text-zinc-500 pt-2">
                  <div className="flex justify-between border-b border-zinc-100 dark:border-zinc-800 pb-2.5">
                    <span>Gross Non-VAT Sales:</span>
                    <span className="font-mono font-semibold text-zinc-800 dark:text-zinc-300">₱ {formatCurrency(grossNonVatSales)}</span>
                  </div>
                  <div className="flex justify-between border-b border-zinc-100 dark:border-zinc-800 pb-2.5">
                    <span>Percentage Tax Rate (PH Legislative rate):</span>
                    <span className="font-semibold text-zinc-800 dark:text-zinc-300">1.0%</span>
                  </div>
                  <div className="flex justify-between text-sm font-extrabold text-zinc-900 dark:text-white pt-2">
                    <span>Form 2551Q Tax Due:</span>
                    <span className="font-mono text-red-500">₱ {formatCurrency(percentageTaxDue)}</span>
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* SLSP / Summary Lists Section */}
          {companyConfig?.registeredVat !== false && (
            <motion.div variants={itemVariants} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden text-left">
              <div className="border-b border-zinc-100 dark:border-zinc-800 p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">BIR Summary Lists of Sales & Purchases (SLSP) / VAT Relief</h3>
                  <p className="text-xs text-zinc-500 mt-1">Mandatory quarterly electronic submission separating declarations of Gross Sales/Purchases for Goods vs. Services.</p>
                </div>
                <span className="text-xs bg-zinc-100 dark:bg-zinc-800 px-3 py-1 rounded-xl text-zinc-600 dark:text-zinc-400 font-mono font-bold">
                  Relief v1.4 Compliance
                </span>
              </div>
            
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-6 border-b border-zinc-100 dark:border-zinc-800">
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-blue-500">Summary List of Sales (SLS)</h4>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="bg-zinc-50 dark:bg-zinc-950/40 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800">
                    <div className="text-zinc-400 font-bold uppercase text-[9px] tracking-wider">Gross Sales of Goods</div>
                    <div className="text-sm font-extrabold font-mono text-zinc-800 dark:text-zinc-200 mt-1">
                      ₱ {formatCurrency(activeRows.filter(r => r.type === 'Sales' && (r.itemType === 'Goods' || !r.itemType)).reduce((a, b) => a + parseNum(b.gross), 0))}
                    </div>
                  </div>
                  <div className="bg-zinc-50 dark:bg-zinc-950/40 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800">
                    <div className="text-zinc-400 font-bold uppercase text-[9px] tracking-wider">Gross Sales of Services</div>
                    <div className="text-sm font-extrabold font-mono text-zinc-800 dark:text-zinc-200 mt-1">
                      ₱ {formatCurrency(activeRows.filter(r => r.type === 'Sales' && r.itemType === 'Services').reduce((a, b) => a + parseNum(b.gross), 0))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-500">Summary List of Purchases (SLP)</h4>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="bg-zinc-50 dark:bg-zinc-950/40 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800">
                    <div className="text-zinc-400 font-bold uppercase text-[9px] tracking-wider">Gross Purchases of Goods</div>
                    <div className="text-sm font-extrabold font-mono text-zinc-800 dark:text-zinc-200 mt-1">
                      ₱ {formatCurrency(activeRows.filter(r => r.type === 'Expense' && (r.itemType === 'Goods' || !r.itemType)).reduce((a, b) => a + parseNum(b.gross), 0))}
                    </div>
                  </div>
                  <div className="bg-zinc-50 dark:bg-zinc-950/40 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800">
                    <div className="text-zinc-400 font-bold uppercase text-[9px] tracking-wider">Gross Purchases of Services</div>
                    <div className="text-sm font-extrabold font-mono text-zinc-800 dark:text-zinc-200 mt-1">
                      ₱ {formatCurrency(activeRows.filter(r => r.type === 'Expense' && r.itemType === 'Services').reduce((a, b) => a + parseNum(b.gross), 0))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead>
                  <tr className="bg-zinc-50 dark:bg-zinc-950/60 border-b border-zinc-100 dark:border-zinc-800 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    <th className="px-5 py-3">Date</th>
                    <th className="px-5 py-3">Registered Name</th>
                    <th className="px-5 py-3">TIN</th>
                    <th className="px-5 py-3">Journal Type</th>
                    <th className="px-5 py-3">Tax Type</th>
                    <th className="px-5 py-3">Nature</th>
                    <th className="px-5 py-3 text-right">Taxable Base</th>
                    <th className="px-5 py-3 text-right">VAT (12%)</th>
                    <th className="px-5 py-3 text-right">EWT / CWT</th>
                    <th className="px-5 py-3 text-right">Gross Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-xs">
                  {activeRows.length ? activeRows.map((r) => {
                    const isExpense = r.type === 'Expense';
                    const nature = r.itemType || 'Goods';
                    const rateText = nature === 'Goods' ? '1%' : '2%';
                    const ewtVal = r.ewt || 0;

                    return (
                      <tr key={r.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/10 transition-colors">
                        <td className="px-5 py-3 text-zinc-500 font-mono">{r.date}</td>
                        <td className="px-5 py-3 font-bold text-zinc-800 dark:text-zinc-200">{r.payor}</td>
                        <td className="px-5 py-3 font-mono text-zinc-500">{r.tin || 'N/A'}</td>
                        <td className="px-5 py-3">
                          <span className={`inline-flex px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${
                            isExpense 
                              ? 'bg-red-50 border-red-100 text-red-700 dark:bg-red-950/20 dark:border-red-900/20' 
                              : 'bg-emerald-50 border-emerald-100 text-emerald-700 dark:bg-emerald-950/20 dark:border-emerald-900/20'
                          }`}>
                            {isExpense ? 'Purchase' : 'Sales'}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-zinc-600 font-semibold">{r.taxType}</td>
                        <td className="px-5 py-3">
                          <span className={`inline-flex px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${
                            nature === 'Services' 
                              ? 'bg-purple-50 border-purple-100 text-purple-700 dark:bg-purple-950/20 dark:border-purple-900/20' 
                              : 'bg-zinc-50 border-zinc-200 text-zinc-700 dark:bg-zinc-950/20 dark:border-zinc-800/20'
                          }`}>
                            {nature}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right font-mono text-zinc-600 dark:text-zinc-400">{displayMoney(r.taxable)}</td>
                        <td className="px-5 py-3 text-right font-mono text-zinc-600 dark:text-zinc-400">{displayMoney(r.vat)}</td>
                        <td className="px-5 py-3 text-right font-mono text-blue-600 dark:text-blue-400 font-semibold" title={`${rateText} Withholding`}>
                          {ewtVal > 0 ? displayMoney(ewtVal) : <span className="text-zinc-300">—</span>}
                          {ewtVal > 0 && <span className="text-[9px] text-zinc-400 ml-1">({rateText})</span>}
                        </td>
                        <td className="px-5 py-3 text-right font-mono font-bold text-zinc-900 dark:text-white">{displayMoney(r.gross)}</td>
                      </tr>
                    );
                  }) : (
                    <tr>
                      <td colSpan={10} className="px-5 py-8 text-center text-zinc-400 italic">No transactions recorded for this period.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
          )}
        </div>
      )}

      {activeReport === 'Form1701Q' && (() => {
        const grossSales1701Q = activeRows
          .filter(r => r.type === 'Sales')
          .reduce((sum, r) => sum + r2(parseNum(r.gross)), 0);

        const costOfSales1701Q = activeRows
          .filter(r => r.type === 'Expense' && (r.category?.toLowerCase().includes('cost of sales') || r.category?.toLowerCase().includes('cogs') || r.category?.toLowerCase().includes('inventory') || r.category?.toLowerCase().includes('materials')))
          .reduce((sum, r) => sum + r2(parseNum(r.gross)), 0);

        const operatingExpenses1701Q = activeRows
          .filter(r => r.type === 'Expense' && !(r.category?.toLowerCase().includes('cost of sales') || r.category?.toLowerCase().includes('cogs') || r.category?.toLowerCase().includes('inventory') || r.category?.toLowerCase().includes('materials')))
          .reduce((sum, r) => sum + r2(parseNum(r.gross)), 0);

        const totalDeductions1701Q = costOfSales1701Q + operatingExpenses1701Q;
        const osd1701Q = r2(grossSales1701Q * 0.40);
        const ewtCredits1701Q = activeRows
          .filter(r => r.type === 'Sales')
          .reduce((sum, r) => sum + r2(parseNum(r.ewt || 0)), 0);

        // Deductions chosen
        const effectiveDeductions = deductionMethod === 'osd' ? osd1701Q : totalDeductions1701Q;
        const taxableIncomeGraduated = Math.max(0, grossSales1701Q - effectiveDeductions);

        // Graduated Tax calculation
        const calculateGraduatedTax = (taxable: number) => {
          if (taxable <= 250000) {
            return {
              tax: 0,
              breakdown: "₱0.00 (Hindi lalampas sa ₱250,000 - Exempted)"
            };
          } else if (taxable <= 400000) {
            const tax = (taxable - 250000) * 0.15;
            return {
              tax,
              breakdown: `15% ng excess over ₱250,000 = 15% x ₱${formatCurrency(taxable - 250000)}`
            };
          } else if (taxable <= 800000) {
            const tax = 22500 + (taxable - 400000) * 0.20;
            return {
              tax,
              breakdown: `₱22,500 + 20% ng excess over ₱400,000 = ₱22,500 + ₱${formatCurrency((taxable - 400000) * 0.20)}`
            };
          } else if (taxable <= 2000000) {
            const tax = 102500 + (taxable - 800000) * 0.25;
            return {
              tax,
              breakdown: `₱102,500 + 25% ng excess over ₱800,000 = ₱102,500 + ₱${formatCurrency((taxable - 800000) * 0.25)}`
            };
          } else if (taxable <= 8000000) {
            const tax = 402500 + (taxable - 2000000) * 0.30;
            return {
              tax,
              breakdown: `₱402,500 + 30% ng excess over ₱2,000,000 = ₱402,500 + ₱${formatCurrency((taxable - 2000000) * 0.30)}`
            };
          } else {
            const tax = 2202500 + (taxable - 8000000) * 0.35;
            return {
              tax,
              breakdown: `₱2,202,500 + 35% ng excess over ₱8,000,000 = ₱2,202,500 + ₱${formatCurrency((taxable - 8000000) * 0.35)}`
            };
          }
        };

        const graduatedTaxResult = calculateGraduatedTax(taxableIncomeGraduated);

        // 8% Flat calculation
        const taxableIncomeFlat = Math.max(0, grossSales1701Q - 250000);
        const flatTaxDue = r2(taxableIncomeFlat * 0.08);

        // Active Calculation Values
        const activeTaxableIncome = taxRegime === 'graduated' ? taxableIncomeGraduated : taxableIncomeFlat;
        const activeTaxDue = taxRegime === 'graduated' ? graduatedTaxResult.tax : flatTaxDue;
        const netTaxPayable1701Q = Math.max(0, activeTaxDue - ewtCredits1701Q);

        // Period display
        const getQuarterDisplay = () => {
          if (quarterFilter !== 'ALL') return quarterFilter;
          if (monthFilter === 'JANUARY' || monthFilter === 'FEBRUARY' || monthFilter === 'MARCH') return 'Q1';
          if (monthFilter === 'APRIL' || monthFilter === 'MAY' || monthFilter === 'JUNE') return 'Q2';
          if (monthFilter === 'JULY' || monthFilter === 'AUGUST' || monthFilter === 'SEPTEMBER') return 'Q3';
          return 'Q4';
        };
        const currentQuarter = getQuarterDisplay();

        return (
          <motion.div variants={itemVariants} className="space-y-6 text-left">
            {/* Top Info Banner */}
            <div className="bg-gradient-to-r from-blue-500/10 to-indigo-500/5 dark:from-blue-950/20 dark:to-indigo-950/10 border border-blue-100/60 dark:border-blue-900/20 p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-xl">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">BIR Form 1701Q Tax Optimizer</h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Matalinong pag-analisa at kompyutasyon para sa iyong Income Tax Return (Self-Employed o Propesyonal).</p>
                </div>
              </div>
              <div className="flex items-center gap-2 self-start md:self-auto">
                <button 
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-750 text-zinc-600 dark:text-zinc-300 font-bold text-xs rounded-xl transition-all shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" /> Print Form
                </button>
              </div>
            </div>

            {/* Smart Comparison Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Option A Card */}
              <div 
                onClick={() => setTaxRegime('graduated')}
                className={`p-5 rounded-2xl border cursor-pointer transition-all ${
                  taxRegime === 'graduated' 
                    ? 'bg-blue-50/40 dark:bg-blue-950/10 border-blue-400 shadow-md shadow-blue-500/5' 
                    : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-750'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <span className="text-[10px] font-extrabold text-blue-500 uppercase tracking-widest">Option A</span>
                    <h4 className="text-xs font-black text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">Graduated Income Tax Rates</h4>
                  </div>
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${taxRegime === 'graduated' ? 'border-blue-500 bg-blue-500' : 'border-zinc-300'}`}>
                    {taxRegime === 'graduated' && <span className="w-1.5 h-1.5 bg-white rounded-full" />}
                  </div>
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 font-medium">Bawas ang Cost of Sales at operational expenses sa iyong Kita bago apply-an ng Tax Table.</p>
                <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800/60 flex items-baseline justify-between">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Estimated Tax Due</span>
                  <span className="text-sm font-extrabold text-zinc-800 dark:text-zinc-200 font-mono">{displayMoney(graduatedTaxResult.tax)}</span>
                </div>
              </div>

              {/* Option B Card */}
              <div 
                onClick={() => {
                  if (grossSales1701Q > 3000000) {
                    alert("Hindi kwalipikado sa 8% Flat Rate dahil ang iyong kabuuang benta ay lumampas sa ₱3,000,000 VAT Threshold.");
                    return;
                  }
                  setTaxRegime('flat8');
                }}
                className={`p-5 rounded-2xl border transition-all ${
                  grossSales1701Q > 3000000 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                } ${
                  taxRegime === 'flat8' 
                    ? 'bg-blue-50/40 dark:bg-blue-950/10 border-blue-400 shadow-md shadow-blue-500/5' 
                    : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-750'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <span className="text-[10px] font-extrabold text-emerald-500 uppercase tracking-widest">Option B</span>
                    <h4 className="text-xs font-black text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">8% Flat Income Tax Rate</h4>
                  </div>
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${taxRegime === 'flat8' ? 'border-blue-500 bg-blue-500' : 'border-zinc-300'}`}>
                    {taxRegime === 'flat8' && <span className="w-1.5 h-1.5 bg-white rounded-full" />}
                  </div>
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 font-medium">Mas mabilis! 8% ng gross sales na binawasan ng ₱250,000 standard deduction (para sa non-VAT business).</p>
                <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800/60 flex items-baseline justify-between">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Estimated Tax Due</span>
                  <span className="text-sm font-extrabold text-zinc-800 dark:text-zinc-200 font-mono">{displayMoney(flatTaxDue)}</span>
                </div>
              </div>
            </div>

            {/* BIR Form Layout Container */}
            <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-sm font-sans">
              {/* Form Heading Header */}
              <div className="bg-zinc-50 dark:bg-zinc-900/40 p-6 border-b border-zinc-100 dark:border-zinc-800 flex flex-col md:flex-row items-center justify-between text-center md:text-left gap-4">
                <div className="space-y-1">
                  <div className="text-[10px] font-extrabold tracking-widest text-zinc-400 dark:text-zinc-500">REPUBLIKA NG PILIPINAS • KAGAWARAN NG PANANALAPI</div>
                  <h2 className="text-base font-black text-zinc-800 dark:text-zinc-100 uppercase tracking-wider">BIR FORM NO. 1701Q</h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-wide">Quarterly Income Tax Return for Individuals, Estates & Trusts</p>
                </div>
                <div className="bg-zinc-200 dark:bg-zinc-850 px-4 py-2.5 rounded-2xl shrink-0 text-center border border-zinc-300/40 font-mono font-black text-zinc-800 dark:text-zinc-200">
                  <div className="text-[9px] uppercase font-bold text-zinc-400">Quarter & Year</div>
                  <div className="text-sm">{currentQuarter} | {yearFilter}</div>
                </div>
              </div>

              {/* Part I: Taxpayer Information */}
              <div className="p-6 border-b border-zinc-100 dark:border-zinc-800/60 space-y-4">
                <h4 className="text-xs font-bold uppercase text-zinc-400 tracking-wider">Part I: Taxpayer Profile Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div className="bg-zinc-50 dark:bg-zinc-900/20 p-3 rounded-xl border border-zinc-100 dark:border-zinc-850">
                    <span className="text-[9px] font-bold uppercase text-zinc-400 block">Registered Name</span>
                    <span className="font-bold text-zinc-800 dark:text-zinc-200 mt-1 block">{companyConfig?.registeredVat !== undefined ? 'Taxpayer Registered Identity' : 'Sole Proprietor Entity'}</span>
                  </div>
                  <div className="bg-zinc-50 dark:bg-zinc-900/20 p-3 rounded-xl border border-zinc-100 dark:border-zinc-850">
                    <span className="text-[9px] font-bold uppercase text-zinc-400 block">Taxpayer TIN</span>
                    <span className="font-bold font-mono text-zinc-800 dark:text-zinc-200 mt-1 block">{(ledger.find(r => r.tin) || {}).tin || 'PH-TIN-PENDING'}</span>
                  </div>
                  <div className="bg-zinc-50 dark:bg-zinc-900/20 p-3 rounded-xl border border-zinc-100 dark:border-zinc-850">
                    <span className="text-[9px] font-bold uppercase text-zinc-400 block">Tax Regime selected</span>
                    <span className="inline-flex items-center gap-1.5 font-bold text-blue-500 mt-1 uppercase">
                      <Scale className="w-3.5 h-3.5" />
                      {taxRegime === 'graduated' ? 'Graduated Rates' : '8% Flat rate'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Part II: Detailed Computations */}
              <div className="p-6 space-y-4">
                <h4 className="text-xs font-bold uppercase text-zinc-400 tracking-wider">Part II: Computation of Tax Liabilities</h4>

                {/* Regime-specific Inputs & Options */}
                {taxRegime === 'graduated' && (
                  <div className="bg-zinc-50 dark:bg-zinc-900/40 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div>
                      <h5 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wide">Deduction Method Option</h5>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">Piliin kung anong bawas ang gagamitin sa kompyutasyon.</p>
                    </div>
                    <div className="flex bg-zinc-200 dark:bg-zinc-800 p-1 rounded-xl text-xs font-bold shrink-0">
                      <button
                        onClick={() => setDeductionMethod('itemized')}
                        className={`px-3 py-1.5 rounded-lg transition-all ${deductionMethod === 'itemized' ? 'bg-white dark:bg-zinc-900 text-zinc-800 dark:text-white shadow-xs' : 'text-zinc-500'}`}
                      >
                        Itemized (Actual)
                      </button>
                      <button
                        onClick={() => setDeductionMethod('osd')}
                        className={`px-3 py-1.5 rounded-lg transition-all ${deductionMethod === 'osd' ? 'bg-white dark:bg-zinc-900 text-zinc-800 dark:text-white shadow-xs' : 'text-zinc-500'}`}
                      >
                        OSD (40% Standard)
                      </button>
                    </div>
                  </div>
                )}

                {/* Computational Rows */}
                <div className="space-y-2 text-xs">
                  {/* Row 1: Gross Sales */}
                  <div className="flex items-center justify-between py-2 border-b border-zinc-100 dark:border-zinc-800/40">
                    <span className="text-zinc-600 dark:text-zinc-400 font-medium">1. Gross Sales / Revenues / Receipts for the Quarter</span>
                    <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200">{displayMoney(grossSales1701Q)}</span>
                  </div>

                  {/* Graduated Specific Deduction Rows */}
                  {taxRegime === 'graduated' && (
                    <>
                      {deductionMethod === 'itemized' ? (
                        <>
                          <div className="flex items-center justify-between py-2 border-b border-zinc-100 dark:border-zinc-800/40 pl-4">
                            <span className="text-zinc-500 dark:text-zinc-500 font-medium">Less: 1.a. Cost of Sales (Direct Inventory Expenses)</span>
                            <span className="font-mono text-zinc-600 dark:text-zinc-400 font-semibold">- {displayMoney(costOfSales1701Q)}</span>
                          </div>
                          <div className="flex items-center justify-between py-2 border-b border-zinc-100 dark:border-zinc-800/40 pl-4">
                            <span className="text-zinc-500 dark:text-zinc-500 font-medium">Less: 1.b. Allowable Operating Expenses (OpEx)</span>
                            <span className="font-mono text-zinc-600 dark:text-zinc-400 font-semibold">- {displayMoney(operatingExpenses1701Q)}</span>
                          </div>
                        </>
                      ) : (
                        <div className="flex items-center justify-between py-2 border-b border-zinc-100 dark:border-zinc-800/40 pl-4">
                          <span className="text-zinc-500 dark:text-zinc-500 font-medium">Less: Optional Standard Deduction (OSD) (40% of Gross)</span>
                          <span className="font-mono text-zinc-600 dark:text-zinc-400 font-semibold">- {displayMoney(osd1701Q)}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between py-2 border-b border-zinc-100 dark:border-zinc-800/40 bg-zinc-50/50 dark:bg-zinc-900/10 px-2 rounded-lg">
                        <span className="text-zinc-700 dark:text-zinc-300 font-bold">2. Total Deductions Applied</span>
                        <span className="font-mono font-extrabold text-zinc-800 dark:text-zinc-200">{displayMoney(effectiveDeductions)}</span>
                      </div>
                    </>
                  )}

                  {/* 8% Flat Specific reduction */}
                  {taxRegime === 'flat8' && (
                    <div className="flex items-center justify-between py-2 border-b border-zinc-100 dark:border-zinc-800/40 pl-4">
                      <span className="text-zinc-500 dark:text-zinc-500 font-medium">Less: 2. Standard Personal Reduction business exemption allowance</span>
                      <span className="font-mono text-zinc-600 dark:text-zinc-400 font-semibold">- ₱ 250,000.00</span>
                    </div>
                  )}

                  {/* Net Taxable Income */}
                  <div className="flex items-center justify-between py-2.5 border-b border-zinc-100 dark:border-zinc-800/40 bg-zinc-50 dark:bg-zinc-900/30 px-2 rounded-lg font-bold">
                    <span className="text-zinc-800 dark:text-zinc-200">3. Net Taxable Income for the Quarter</span>
                    <span className="font-mono font-extrabold text-zinc-900 dark:text-white">{displayMoney(activeTaxableIncome)}</span>
                  </div>

                  {/* Tax Due row */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between py-3 border-b border-zinc-100 dark:border-zinc-800/40 pl-2">
                    <div className="text-left space-y-0.5">
                      <span className="text-zinc-800 dark:text-zinc-200 font-bold block">4. Total Quarterly Income Tax Due</span>
                      {taxRegime === 'graduated' && (
                        <span className="text-[10px] text-zinc-400 block font-medium">Formula: {graduatedTaxResult.breakdown}</span>
                      )}
                    </div>
                    <span className="font-mono font-black text-sm text-blue-500 mt-1 md:mt-0">{displayMoney(activeTaxDue)}</span>
                  </div>

                  {/* 2307 Credits row */}
                  <div className="flex items-center justify-between py-2 border-b border-zinc-100 dark:border-zinc-800/40 pl-2">
                    <span className="text-zinc-600 dark:text-zinc-400 font-medium">Less: 5. Creditable Tax Withheld (BIR Form 2307 Credits per Ledgers)</span>
                    <span className="font-mono text-red-500 font-semibold">- {displayMoney(ewtCredits1701Q)}</span>
                  </div>

                  {/* Net Payable */}
                  <div className="flex items-center justify-between py-4 bg-blue-500/10 dark:bg-blue-500/5 px-4 rounded-2xl font-black text-sm text-zinc-900 dark:text-white border border-blue-100 dark:border-blue-900/30">
                    <span className="uppercase tracking-wider flex items-center gap-1.5">
                      <ShieldCheck className="w-5 h-5 text-emerald-500" />
                      {netTaxPayable1701Q >= 0 ? '6. Net Tax Payable to BIR' : '6. Refundable Excess Credits'}
                    </span>
                    <span className="font-mono text-base font-black text-emerald-500">{displayMoney(netTaxPayable1701Q)}</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        );
      })()}

      {activeReport === 'Form2551Q' && (() => {
        const percentageGrossReceipts = activeRows
          .filter(r => r.type === 'Sales' && r.taxType === 'Non-VAT')
          .reduce((sum, r) => sum + r2(parseNum(r.gross)), 0);

        const ewtCredits2551Q = activeRows
          .filter(r => r.type === 'Sales')
          .reduce((sum, r) => sum + r2(parseNum(r.ewt || 0)), 0);

        const taxDue2551Q = r2(percentageGrossReceipts * percentageTaxRate);
        const netPercentageTaxPayable = Math.max(0, taxDue2551Q - ewtCredits2551Q);

        return (
          <motion.div variants={itemVariants} className="space-y-6 text-left">
            {/* Top Info Banner */}
            <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/5 dark:from-amber-950/20 dark:to-orange-950/10 border border-amber-100/60 dark:border-amber-900/20 p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-xl">
                  <Percent className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">BIR Form 2551Q Percentage Tax Return</h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Kompyutasyon ng Percentage Tax para sa mga negosyong Non-VAT na may benta na hindi hihigit sa ₱3M.</p>
                </div>
              </div>
              <div className="flex items-center gap-2 self-start md:self-auto">
                <button 
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-750 text-zinc-600 dark:text-zinc-300 font-bold text-xs rounded-xl transition-all shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" /> Print Form
                </button>
              </div>
            </div>

            {/* Rate Modifier Area */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h4 className="text-xs font-black text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">Legislated Tax Rate Selection</h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Maaaring baguhin ang Percentage Tax Rate base sa uri ng iyong industriya o pinakahuling batas.</p>
              </div>
              <div className="flex bg-zinc-200 dark:bg-zinc-800 p-1 rounded-xl text-xs font-bold shrink-0">
                <button
                  onClick={() => setPercentageTaxRate(0.01)}
                  className={`px-3 py-1.5 rounded-lg transition-all ${percentageTaxRate === 0.01 ? 'bg-white dark:bg-zinc-900 text-zinc-800 dark:text-white shadow-xs' : 'text-zinc-500'}`}
                >
                  1% Standard Rate (EOPT Act)
                </button>
                <button
                  onClick={() => setPercentageTaxRate(0.03)}
                  className={`px-3 py-1.5 rounded-lg transition-all ${percentageTaxRate === 0.03 ? 'bg-white dark:bg-zinc-900 text-zinc-800 dark:text-white shadow-xs' : 'text-zinc-500'}`}
                >
                  3% Traditional Rate
                </button>
              </div>
            </div>

            {/* BIR Form Layout Container */}
            <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-sm font-sans">
              {/* Form Heading Header */}
              <div className="bg-zinc-50 dark:bg-zinc-900/40 p-6 border-b border-zinc-100 dark:border-zinc-800 flex flex-col md:flex-row items-center justify-between text-center md:text-left gap-4">
                <div className="space-y-1">
                  <div className="text-[10px] font-extrabold tracking-widest text-zinc-400 dark:text-zinc-500">REPUBLIKA NG PILIPINAS • KAGAWARAN NG PANANALAPI</div>
                  <h2 className="text-base font-black text-zinc-800 dark:text-zinc-100 uppercase tracking-wider">BIR FORM NO. 2551Q</h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-wide">Quarterly Percentage Tax Return</p>
                </div>
                <div className="bg-zinc-200 dark:bg-zinc-850 px-4 py-2.5 rounded-2xl shrink-0 text-center border border-zinc-300/40 font-mono font-black text-zinc-800 dark:text-zinc-200">
                  <div className="text-[9px] uppercase font-bold text-zinc-400">Quarter & Year</div>
                  <div className="text-sm">{quarterFilter === 'ALL' ? 'Q1' : quarterFilter} | {yearFilter}</div>
                </div>
              </div>

              {/* Part I: Taxpayer Information */}
              <div className="p-6 border-b border-zinc-100 dark:border-zinc-800/60 space-y-4">
                <h4 className="text-xs font-bold uppercase text-zinc-400 tracking-wider">Part I: Taxpayer Profile Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="bg-zinc-50 dark:bg-zinc-900/20 p-3 rounded-xl border border-zinc-100 dark:border-zinc-850">
                    <span className="text-[9px] font-bold uppercase text-zinc-400 block">Registered Business Identity</span>
                    <span className="font-bold text-zinc-800 dark:text-zinc-200 mt-1 block">Non-VAT Qualified Taxpayer</span>
                  </div>
                  <div className="bg-zinc-50 dark:bg-zinc-900/20 p-3 rounded-xl border border-zinc-100 dark:border-zinc-850">
                    <span className="text-[9px] font-bold uppercase text-zinc-400 block">Taxpayer TIN</span>
                    <span className="font-bold font-mono text-zinc-800 dark:text-zinc-200 mt-1 block">{(ledger.find(r => r.tin) || {}).tin || 'PH-TIN-PENDING'}</span>
                  </div>
                </div>
              </div>

              {/* Part II: Detailed Computations */}
              <div className="p-6 space-y-4">
                <h4 className="text-xs font-bold uppercase text-zinc-400 tracking-wider">Part II: Computation of Percentage Tax Liabilities</h4>

                <div className="space-y-2 text-xs">
                  {/* Row 1: Gross Sales */}
                  <div className="flex items-center justify-between py-2 border-b border-zinc-100 dark:border-zinc-800/40">
                    <span className="text-zinc-600 dark:text-zinc-400 font-medium">1. Gross Taxable Sales / Receipts for the Quarter (Non-VAT)</span>
                    <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200">{displayMoney(percentageGrossReceipts)}</span>
                  </div>

                  {/* Row 2: Tax Rate */}
                  <div className="flex items-center justify-between py-2 border-b border-zinc-100 dark:border-zinc-800/40">
                    <span className="text-zinc-600 dark:text-zinc-400 font-medium">2. Percentage Tax Rate</span>
                    <span className="font-mono font-bold text-zinc-850 dark:text-zinc-200">{(percentageTaxRate * 100).toFixed(1)}%</span>
                  </div>

                  {/* Row 3: Total Tax Due */}
                  <div className="flex items-center justify-between py-2.5 border-b border-zinc-100 dark:border-zinc-800/40 bg-zinc-50 dark:bg-zinc-900/30 px-2 rounded-lg font-bold">
                    <span className="text-zinc-850 dark:text-zinc-200">3. Percentage Tax Due for the Quarter</span>
                    <span className="font-mono font-extrabold text-blue-500">{displayMoney(taxDue2551Q)}</span>
                  </div>

                  {/* Row 4: Less Withholding */}
                  <div className="flex items-center justify-between py-2 border-b border-zinc-100 dark:border-zinc-800/40 pl-2">
                    <span className="text-zinc-500 dark:text-zinc-500 font-medium">Less: 4. Creditable Percentage Tax Withheld per BIR Form 2307</span>
                    <span className="font-mono text-red-500 font-semibold">- {displayMoney(ewtCredits2551Q)}</span>
                  </div>

                  {/* Net Percentage Tax Payable */}
                  <div className="flex items-center justify-between py-4 bg-amber-500/10 dark:bg-amber-500/5 px-4 rounded-2xl font-black text-sm text-zinc-900 dark:text-white border border-amber-100 dark:border-amber-900/30">
                    <span className="uppercase tracking-wider flex items-center gap-1.5">
                      <ShieldCheck className="w-5 h-5 text-amber-500 animate-pulse" />
                      Net Percentage Tax Payable to BIR
                    </span>
                    <span className="font-mono text-base font-black text-amber-600">{displayMoney(netPercentageTaxPayable)}</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        );
      })()}

      {activeReport === 'ARAging' && (
        <motion.div variants={itemVariants} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="border-b border-zinc-100 dark:border-zinc-800 p-5 text-left">
            <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">Accounts Receivable (AR) Aging Summary</h3>
            <p className="text-xs text-zinc-500 mt-1">Listing customer outstanding receivables categorized by the age of uncollected invoice periods.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-zinc-50 dark:bg-zinc-950/60 border-b border-zinc-100 dark:border-zinc-800 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  <th className="px-5 py-3">Customer Company</th>
                  <th className="px-5 py-3 text-right">Current</th>
                  <th className="px-5 py-3 text-right">1 - 30 Days</th>
                  <th className="px-5 py-3 text-right">31 - 60 Days</th>
                  <th className="px-5 py-3 text-right">61+ Days</th>
                  <th className="px-5 py-3 text-right">Total Outstanding</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-xs">
                {arAgingList.length ? arAgingList.map(item => (
                  <tr key={item.company} className="hover:bg-zinc-50/50">
                    <td className="px-5 py-3.5 font-bold text-zinc-800 dark:text-zinc-200">{item.company}</td>
                    <td className="px-5 py-3.5 text-right font-mono font-medium text-zinc-500">{displayMoney(item.current)}</td>
                    <td className="px-5 py-3.5 text-right font-mono font-semibold text-zinc-700 dark:text-zinc-300">{displayMoney(item.d1_30)}</td>
                    <td className="px-5 py-3.5 text-right font-mono font-bold text-blue-500">{displayMoney(item.d31_60)}</td>
                    <td className="px-5 py-3.5 text-right font-mono font-bold text-red-500">{displayMoney(item.d61_plus)}</td>
                    <td className="px-5 py-3.5 text-right font-mono font-extrabold text-zinc-900 dark:text-white">{displayMoney(item.total)}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-zinc-400 italic">No credit terms sales recorded. Add sales invoices with credit terms to populate aging.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {activeReport === 'APAging' && (
        <motion.div variants={itemVariants} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="border-b border-zinc-100 dark:border-zinc-800 p-5 text-left">
            <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">Accounts Payable (AP) Aging Summary</h3>
            <p className="text-xs text-zinc-500 mt-1">Listing outstanding obligations to suppliers categorized by unpaid lapse periods.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-zinc-50 dark:bg-zinc-950/60 border-b border-zinc-100 dark:border-zinc-800 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  <th className="px-5 py-3">Supplier Name</th>
                  <th className="px-5 py-3 text-right">Current</th>
                  <th className="px-5 py-3 text-right">1 - 30 Days</th>
                  <th className="px-5 py-3 text-right">31 - 60 Days</th>
                  <th className="px-5 py-3 text-right">61+ Days</th>
                  <th className="px-5 py-3 text-right">Total Outstanding</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-xs">
                {apAgingList.length ? apAgingList.map(item => (
                  <tr key={item.company} className="hover:bg-zinc-50/50">
                    <td className="px-5 py-3.5 font-bold text-zinc-800 dark:text-zinc-200">{item.company}</td>
                    <td className="px-5 py-3.5 text-right font-mono font-medium text-zinc-500">{displayMoney(item.current)}</td>
                    <td className="px-5 py-3.5 text-right font-mono font-semibold text-zinc-700 dark:text-zinc-300">{displayMoney(item.d1_30)}</td>
                    <td className="px-5 py-3.5 text-right font-mono font-bold text-blue-500">{displayMoney(item.d31_60)}</td>
                    <td className="px-5 py-3.5 text-right font-mono font-bold text-red-500">{displayMoney(item.d61_plus)}</td>
                    <td className="px-5 py-3.5 text-right font-mono font-extrabold text-zinc-900 dark:text-white">{displayMoney(item.total)}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-zinc-400 italic">No credit terms expenses/purchases recorded.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {activeReport === 'AnnualSummary' && (() => {
        const annualRows = ledger.filter(r => r.status !== 'Void' && r.date.startsWith(yearFilter));
        const totalSales = annualRows.filter(r => r.type === 'Sales').reduce((a, b) => a + r2(parseNum(b.gross)), 0);
        const totalExpenses = annualRows.filter(r => r.type === 'Expense').reduce((a, b) => a + r2(parseNum(b.gross)), 0);
        const annualOutputVat = annualRows.filter(r => r.type === 'Sales').reduce((a, b) => a + r2(parseNum(b.vat)), 0);
        const annualInputVat = annualRows.filter(r => r.type === 'Expense').reduce((a, b) => a + r2(parseNum(b.vat)), 0);
        const annualNetVat = annualOutputVat - annualInputVat;
        const annualNetIncome = totalSales - totalExpenses;

        return (
          <motion.div variants={itemVariants} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl flex flex-col items-center justify-center text-center shadow-sm">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">Annual Sales (Gross)</span>
                <span className="text-2xl font-extrabold text-emerald-500">{displayMoney(totalSales)}</span>
              </div>
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl flex flex-col items-center justify-center text-center shadow-sm">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">Annual Expenses (Gross)</span>
                <span className="text-2xl font-extrabold text-red-500">{displayMoney(totalExpenses)}</span>
              </div>
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl flex flex-col items-center justify-center text-center shadow-sm">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">Net Income</span>
                <span className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-100">{displayMoney(annualNetIncome)}</span>
              </div>
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl flex flex-col items-center justify-center text-center shadow-sm">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">Annual Output VAT</span>
                <span className="text-2xl font-extrabold text-blue-500">{displayMoney(annualOutputVat)}</span>
              </div>
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl flex flex-col items-center justify-center text-center shadow-sm">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">Annual Input VAT</span>
                <span className="text-2xl font-extrabold text-amber-500">{displayMoney(annualInputVat)}</span>
              </div>
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl flex flex-col items-center justify-center text-center shadow-sm">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">Annual Net VAT Payable</span>
                <span className="text-2xl font-extrabold text-purple-500">{displayMoney(annualNetVat)}</span>
              </div>
            </div>
            
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 text-sm text-zinc-600 dark:text-zinc-400">
              <p><strong>Note:</strong> This annual summary aggregates all transactions for the selected Fiscal Year ({yearFilter}), ignoring any active month or quarter filters. Use this view for a high-level tax planning overview and quick reference during year-end income tax return filing (e.g., BIR Form 1702Q / 1702-RT).</p>
            </div>
          </motion.div>
        );
      })()}
    </motion.div>
  );
};
