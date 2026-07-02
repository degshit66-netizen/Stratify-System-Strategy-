import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Plus, Trash2, HelpCircle } from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { LedgerEntry, COAAccount } from '../types';
import { getCompleteChartOfAccounts, saveCustomCoaAccount, deleteCustomCoaAccount, getCoaDetails } from '../data/chartOfAccounts';
import { r2, displayMoney, inPeriod, parseNum, formatCurrency } from '../utils/helpers';

interface COAModuleProps {
  ledger: LedgerEntry[];
  yearFilter: string;
  monthFilter: string;
  quarterFilter: string;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const COAModule: React.FC<COAModuleProps> = ({
  ledger,
  yearFilter,
  monthFilter,
  quarterFilter,
  showToast
}) => {
  const [customCode, setCustomCode] = useState('');
  const [customName, setCustomName] = useState('');
  const [customType, setCustomType] = useState<'Asset' | 'Liability' | 'Equity' | 'Income' | 'Expense'>('Expense');
  const [customNormal, setCustomNormal] = useState<'Debit' | 'Credit'>('Debit');
  const [customFs, setCustomFs] = useState<'Balance Sheet' | 'Income Statement'>('Income Statement');
  const [customCashFlow, setCustomCashFlow] = useState<'Operating' | 'Investing' | 'Financing' | 'None'>('Operating');

  const [coaCatalog, setCoaCatalog] = useState<Record<string, COAAccount>>({});

  React.useEffect(() => {
    setCoaCatalog(getCompleteChartOfAccounts());
  }, []);

  const handleSaveAccount = () => {
    const code = customCode.trim();
    const name = customName.trim();
    if (!code || !name) {
      showToast('Please enter both Account Code and Account Title.', 'error');
      return;
    }
    if (coaCatalog[code] && !coaCatalog[code].custom) {
      showToast('This account code is a protected built-in code.', 'error');
      return;
    }

    const newAcc: COAAccount = {
      name,
      type: customType,
      normal: customNormal,
      fs: customFs,
      cashFlow: customCashFlow,
      custom: true
    };

    saveCustomCoaAccount(code, newAcc);
    const updated = getCompleteChartOfAccounts();
    setCoaCatalog(updated);
    showToast(`Account ${code} - ${name} saved successfully.`, 'success');
    setCustomCode('');
    setCustomName('');
  };

  const handleDeleteAccount = (code: string) => {
    if (!confirm(`Are you sure you want to delete custom account ${code}?`)) return;
    deleteCustomCoaAccount(code);
    const updated = getCompleteChartOfAccounts();
    setCoaCatalog(updated);
    showToast(`Custom Account ${code} deleted.`, 'success');
  };

  const filteredRows = ledger.filter(r => r.status !== 'Void' && inPeriod(r, yearFilter, monthFilter, quarterFilter));

  // Compute Balances
  const balances: Record<string, { balance: number; txCount: number }> = {};
  Object.keys(coaCatalog).forEach(code => {
    balances[code] = { balance: 0, txCount: 0 };
  });

  const getCodeByName = (name: string): string | null => {
    const key = name.toLowerCase().trim();
    for (const code of Object.keys(coaCatalog)) {
      if (coaCatalog[code].name.toLowerCase().trim() === key) return code;
    }
    return null;
  };

  filteredRows.forEach(r => {
    const gross = r2(parseNum(r.gross));
    const net = r2(parseNum(r.net) || (gross / 1.12));
    const vat = r2(parseNum(r.vat));
    const ewt = r2(parseNum(r.ewt));
    const cash = r2(parseNum(r.cash !== undefined && r.cash !== null && r.cash !== '' ? r.cash : (gross - ewt)));
    const isCashEntry = String(r.postingNature || 'Cash Transaction').trim().toLowerCase() === 'cash transaction';

    if (r.type === 'Sales') {
      const revAcc = getCoaDetails(r.category, r.type).name;
      const revCode = getCodeByName(revAcc);
      const cashCode = getCodeByName(isCashEntry ? 'Cash in Bank / on Hand' : 'Accounts Receivable');
      const vatCode = getCodeByName('Output VAT Payable');
      const cwtCode = getCodeByName('Creditable Withholding Tax (CWT)');

      if (cashCode && balances[cashCode]) {
        balances[cashCode].balance = r2(balances[cashCode].balance + cash);
        balances[cashCode].txCount += 1;
      }
      if (ewt > 0 && cwtCode && balances[cwtCode]) {
        balances[cwtCode].balance = r2(balances[cwtCode].balance + ewt);
        balances[cwtCode].txCount += 1;
      }
      if (revCode && balances[revCode]) {
        balances[revCode].balance = r2(balances[revCode].balance - net); // Normal Credit side
        balances[revCode].txCount += 1;
      }
      if (vat > 0 && vatCode && balances[vatCode]) {
        balances[vatCode].balance = r2(balances[vatCode].balance - vat); // Normal Credit side
        balances[vatCode].txCount += 1;
      }
    } else if (r.type === 'Expense') {
      const expAcc = getCoaDetails(r.category || r.particulars, r.type).name;
      const expCode = getCodeByName(expAcc);
      let apTerm = 'Accounts Payable';
      if (['Accounts Payable - Trade', 'Accounts Payable - Non-Trade', 'Accrued Expenses'].includes(r.terms || '')) {
         apTerm = r.terms || 'Accounts Payable';
      }
      const cashCode = getCodeByName(isCashEntry ? 'Cash in Bank / on Hand' : apTerm);
      const vatCode = getCodeByName('Input VAT');
      const ewtCode = getCodeByName('EWT Payable');

      if (expCode && balances[expCode]) {
        balances[expCode].balance = r2(balances[expCode].balance + net); // Normal Debit side
        balances[expCode].txCount += 1;
      }
      if (vat > 0 && vatCode && balances[vatCode]) {
        balances[vatCode].balance = r2(balances[vatCode].balance + vat); // Normal Debit side
        balances[vatCode].txCount += 1;
      }
      if (cashCode && balances[cashCode]) {
        balances[cashCode].balance = r2(balances[cashCode].balance - cash); // Normal Credit side
        balances[cashCode].txCount += 1;
      }
      if (ewt > 0 && ewtCode && balances[ewtCode]) {
        balances[ewtCode].balance = r2(balances[ewtCode].balance - ewt); // Normal Credit side
        balances[ewtCode].txCount += 1;
      }
    } else if (r.type === 'Setup') {
      const setAcc = getCoaDetails(r.category, r.type).name;
      const setCode = getCodeByName(setAcc);
      const reCode = getCodeByName('Retained Earnings');
      if (setCode && balances[setCode]) {
        const side = coaCatalog[setCode].normal;
        balances[setCode].balance = r2(balances[setCode].balance + (side === 'Debit' ? gross : -gross));
        balances[setCode].txCount += 1;
      }
      if (reCode && balances[reCode]) {
        const side = coaCatalog[reCode].normal;
        balances[reCode].balance = r2(balances[reCode].balance + (side === 'Debit' ? -gross : gross));
        balances[reCode].txCount += 1;
      }
    }
  });

  const coaList = Object.keys(coaCatalog).map(code => {
    const acc = coaCatalog[code];
    const balInfo = balances[code] || { balance: 0, txCount: 0 };
    return {
      code,
      ...acc,
      balance: balInfo.balance,
      txCount: balInfo.txCount
    };
  }).sort((a, b) => a.code.localeCompare(b.code));

  // Category sum for charts
  const classTotals = { Asset: 0, Liability: 0, Equity: 0, Income: 0, Expense: 0 };
  coaList.forEach(a => {
    // Normal sides for display
    const rawVal = a.balance;
    const isDebitSide = a.normal === 'Debit';
    const displayVal = isDebitSide ? rawVal : -rawVal;
    classTotals[a.type] += displayVal;
  });

  const chartData = [
    { name: 'Assets', Balance: r2(classTotals.Asset) },
    { name: 'Liabilities', Balance: r2(classTotals.Liability) },
    { name: 'Equity', Balance: r2(classTotals.Equity) },
    { name: 'Income', Balance: r2(classTotals.Income) },
    { name: 'Expenses', Balance: r2(classTotals.Expense) }
  ];

  const activeAccounts = coaList.filter(a => Math.abs(a.balance) > 0.01 || a.txCount > 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white font-sans">🗂 Chart of Accounts</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">Configure account codes, normal ledger entry sides, and analyze trial run balances.</p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto bg-zinc-100 dark:bg-zinc-800 px-3 py-1.5 rounded-xl text-xs font-bold text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
          <span>{coaList.length} accounts configured</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
        {['Asset', 'Liability', 'Equity', 'Income', 'Expense'].map(type => {
          const val = classTotals[type as keyof typeof classTotals] || 0;
          return (
            <div key={type} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-2xl shadow-sm space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">{type}s</span>
              <div className={`text-base font-extrabold ${val < 0 ? 'text-red-500' : 'text-zinc-800 dark:text-zinc-100'}`}>
                {displayMoney(Math.abs(val))}
              </div>
              <div className="text-[10px] text-zinc-400 font-medium">{type === 'Asset' || type === 'Expense' ? 'Debit Normal' : 'Credit Normal'}</div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">Add Custom Account</h3>
            <span className="text-xs bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30 px-2 py-0.5 rounded-lg font-bold">ERP Core</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Account Code</label>
              <input 
                type="text" 
                placeholder="7000" 
                value={customCode}
                onChange={(e) => setCustomCode(e.target.value)}
                className="w-full text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-blue-400"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Account Title</label>
              <input 
                type="text" 
                placeholder="Freight Out - Local" 
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                className="w-full text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-blue-400"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Account Class</label>
              <select 
                value={customType} 
                onChange={(e) => {
                  const val = e.target.value as any;
                  setCustomType(val);
                  setCustomNormal(val === 'Asset' || val === 'Expense' ? 'Debit' : 'Credit');
                  setCustomFs(val === 'Asset' || val === 'Liability' || val === 'Equity' ? 'Balance Sheet' : 'Income Statement');
                }}
                className="w-full text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-800 dark:text-zinc-200 focus:outline-none"
              >
                <option>Asset</option>
                <option>Liability</option>
                <option>Equity</option>
                <option>Income</option>
                <option>Expense</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Normal Side</label>
              <select 
                value={customNormal} 
                onChange={(e) => setCustomNormal(e.target.value as any)}
                className="w-full text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-800 dark:text-zinc-200 focus:outline-none"
              >
                <option>Debit</option>
                <option>Credit</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Financial Statement</label>
              <select 
                value={customFs} 
                onChange={(e) => setCustomFs(e.target.value as any)}
                className="w-full text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-800 dark:text-zinc-200 focus:outline-none"
              >
                <option>Balance Sheet</option>
                <option>Income Statement</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Cash Flow Category</label>
              <select 
                value={customCashFlow} 
                onChange={(e) => setCustomCashFlow(e.target.value as any)}
                className="w-full text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-800 dark:text-zinc-200 focus:outline-none"
              >
                <option>Operating</option>
                <option>Investing</option>
                <option>Financing</option>
                <option>None</option>
              </select>
            </div>
          </div>
          <div className="pt-2">
            <button 
              onClick={handleSaveAccount}
              className="flex items-center gap-2 text-xs bg-zinc-900 hover:bg-zinc-800 text-white font-bold px-5 py-2.5 rounded-xl transition-colors shadow-sm focus:outline-none"
            >
              <Plus className="w-4 h-4" />
              <span>Save COA Account</span>
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm min-h-[380px] flex flex-col justify-between">
          <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider mb-4">Balancing Chart</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" className="dark:stroke-zinc-800" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', border: 'none', borderRadius: '12px', color: '#fff' }}
                  formatter={(val: number) => displayMoney(Math.abs(val))}
                />
                <Bar dataKey="Balance" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="border-b border-zinc-100 dark:border-zinc-800 p-5">
          <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">Account Registry and Activity</h3>
          <p className="text-xs text-zinc-500 mt-1">Showing all standard and custom chart accounts with active balances.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-950/60 border-b border-zinc-100 dark:border-zinc-800 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                <th className="px-5 py-3 w-28">Code</th>
                <th className="px-5 py-3">Account Title</th>
                <th className="px-5 py-3">Type</th>
                <th className="px-5 py-3">Normal Side</th>
                <th className="px-5 py-3">Financial Statement</th>
                <th className="px-5 py-3 text-right">Balance</th>
                <th className="px-5 py-3 text-center">Tx Count</th>
                <th className="px-5 py-3 text-center w-28">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-xs">
              {coaList.map(a => {
                // Determine raw display side
                const isDebit = a.normal === 'Debit';
                const bal = a.balance;
                const disp = isDebit ? bal : -bal;
                return (
                  <tr key={a.code} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/10 transition-colors">
                    <td className="px-5 py-3.5 font-bold font-mono text-zinc-800 dark:text-zinc-200">{a.code}</td>
                    <td className="px-5 py-3.5 font-bold text-zinc-800 dark:text-zinc-200">
                      <div className="flex items-center gap-2">
                        <span>{a.name}</span>
                        {a.custom && (
                          <span className="text-[9px] font-bold uppercase bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border border-blue-100 dark:border-blue-900/20 px-1.5 py-0.5 rounded">Custom</span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-zinc-500 dark:text-zinc-400">{a.type}</td>
                    <td className="px-5 py-3.5 font-medium text-zinc-500 dark:text-zinc-400">{a.normal}</td>
                    <td className="px-5 py-3.5 text-zinc-400">{a.fs}</td>
                    <td className={`px-5 py-3.5 text-right font-bold font-mono ${
                      disp === 0 
                        ? 'text-zinc-400' 
                        : isDebit 
                          ? (disp < 0 ? 'text-red-500' : 'text-emerald-600 dark:text-emerald-400') 
                          : (disp < 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500')
                    }`}>
                      {displayMoney(disp)}
                    </td>
                    <td className="px-5 py-3.5 text-center font-bold text-zinc-500 dark:text-zinc-400">{a.txCount}</td>
                    <td className="px-5 py-3.5 text-center">
                      {a.custom ? (
                        <button 
                          onClick={() => handleDeleteAccount(a.code)}
                          className="inline-flex p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors border border-transparent hover:border-rose-100 dark:hover:border-rose-900/30 shadow-sm"
                          title="Remove custom account"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <span className="text-zinc-300 dark:text-zinc-700">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
