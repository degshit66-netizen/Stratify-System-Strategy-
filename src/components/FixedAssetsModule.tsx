import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Plus, HelpCircle, HardDrive, Calendar, DollarSign, Clock } from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { LedgerEntry, FixedAsset, COAAccount } from '../types';
import { r2, displayMoney, parseNum, cleanDate, formatCurrency } from '../utils/helpers';

interface FixedAssetsModuleProps {
  ledger: LedgerEntry[];
  coa?: COAAccount[];
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const FixedAssetsModule: React.FC<FixedAssetsModuleProps> = ({
  ledger,
  coa = [],
  showToast
}) => {
  const [assetName, setAssetName] = useState('');
  const [assetAcquired, setAssetAcquired] = useState('');
  const [assetCost, setAssetCost] = useState('');
  const [assetLife, setAssetLife] = useState(5);
  const [assetAccount, setAssetAccount] = useState('');
  const [accDepAccount, setAccDepAccount] = useState('');
  const [depreciationMethod, setDepreciationMethod] = useState<'Straight-Line' | 'Declining Balance' | 'Sum-of-Years-Digits'>('Straight-Line');
  const [salvageValue, setSalvageValue] = useState('');
  const [manualAssets, setManualAssets] = useState<FixedAsset[]>([]);

  React.useEffect(() => {
    try {
      const stored = localStorage.getItem('stratify_assets');
      if (stored) setManualAssets(JSON.parse(stored));
    } catch (e) {}
  }, []);

  // Filter candidates from ledger (capital expenditures)
  const ledgerAssetCandidates = ledger
    .filter(r => r.status !== 'Void' && r.type === 'Expense')
    .filter(r => {
      const hay = `${r.category || ''} ${r.particulars || ''}`.toLowerCase();
      return /equipment|asset|vehicle|furniture|computer|software|machinery|building|property/.test(hay);
    })
    .map(r => ({
      id: r.id,
      name: r.particulars || r.category || 'Capital Asset',
      acquired: cleanDate(r.date) || new Date().toISOString().slice(0, 10),
      cost: r.gross,
      lifeYears: 5,
      source: 'Ledger' as const
    }));

  const allAssets: FixedAsset[] = [
    ...manualAssets.map(x => ({ ...x, source: 'Manual' as const })),
    ...ledgerAssetCandidates
  ];

  // Calculate Asset NBV (Net Book Value) and Deprecations
  const assetNBV = (asset: FixedAsset) => {
    const cost = r2(parseNum(asset.cost));
    const lifeYears = Math.max(parseNum(asset.lifeYears) || 5, 1);
    const acquired = new Date(asset.acquired || new Date().toISOString().slice(0, 10));
    const today = new Date();
    
    // Calculate months between
    const months = Math.max(0, (today.getFullYear() - acquired.getFullYear()) * 12 + (today.getMonth() - acquired.getMonth()));
    const monthlyDep = cost / (lifeYears * 12);
    const accumulated = Math.min(cost, monthlyDep * months);
    
    return {
      nbv: r2(Math.max(0, cost - accumulated)),
      accumulated: r2(accumulated),
      monthlyDep: r2(monthlyDep)
    };
  };

  const handleSaveAsset = () => {
    const name = assetName.trim();
    const cost = parseNum(assetCost);
    if (!name || !assetAcquired || !cost) {
      showToast('Please fill in Asset Name, Date Acquired, and Cost.', 'error');
      return;
    }

    const newAsset: FixedAsset = {
      id: Date.now(),
      name,
      acquired: assetAcquired,
      cost,
      lifeYears: assetLife,
      source: 'Manual',
      assetAccountName: assetAccount,
      accDepAccountName: accDepAccount,
      depreciationMethod,
      salvageValue: parseNum(salvageValue)
    };

    const nextList = [newAsset, ...manualAssets];
    setManualAssets(nextList);
    localStorage.setItem('stratify_assets', JSON.stringify(nextList));
    showToast(`Asset "${name}" successfully registered.`, 'success');
    
    setAssetName('');
    setAssetAcquired('');
    setAssetCost('');
    setAssetLife(5);
    setAssetAccount('');
    setAccDepAccount('');
    setDepreciationMethod('Straight-Line');
    setSalvageValue('');
  };

  const totalCost = allAssets.reduce((sum, a) => sum + r2(parseNum(a.cost)), 0);
  const totalNBV = allAssets.reduce((sum, a) => sum + assetNBV(a).nbv, 0);
  const totalAccumulated = r2(totalCost - totalNBV);

  // Recharts Pie Chart Data grouped by source
  const sourceTotals: Record<string, number> = {};
  allAssets.forEach(a => {
    const key = a.source || 'Manual';
    sourceTotals[key] = (sourceTotals[key] || 0) + r2(parseNum(a.cost));
  });

  const chartData = Object.entries(sourceTotals).map(([name, value]) => ({ name, value }));
  const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6'];

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
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white font-sans">🏢 Fixed Assets</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Fixed assets register, accumulated depreciation tables, useful life controls, and lapsing schedules.</p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto bg-zinc-100 dark:bg-zinc-800 px-3 py-1.5 rounded-xl text-xs font-bold text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
          <span>{allAssets.length} assets registered</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <motion.div variants={itemVariants} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl shadow-sm space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Total Fixed Asset Cost</span>
          <div className="text-base font-extrabold text-zinc-800 dark:text-zinc-100">{displayMoney(totalCost)}</div>
          <div className="text-[10px] text-zinc-400 font-medium">Acquisition cost on ledger record</div>
        </motion.div>

        <motion.div variants={itemVariants} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl shadow-sm space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Accumulated Depreciation</span>
          <div className="text-base font-extrabold text-red-500">{displayMoney(totalAccumulated)}</div>
          <div className="text-[10px] text-zinc-400 font-medium">Accumulated expense write-off</div>
        </motion.div>

        <motion.div variants={itemVariants} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl shadow-sm space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Net Book Value (NBV)</span>
          <div className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">{displayMoney(totalNBV)}</div>
          <div className="text-[10px] text-zinc-400 font-medium">Asset value on books today</div>
        </motion.div>

        <motion.div variants={itemVariants} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl shadow-sm space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Registry Count</span>
          <div className="text-base font-extrabold text-zinc-800 dark:text-zinc-100">{allAssets.length}</div>
          <div className="text-[10px] text-zinc-400 font-medium">Items tracking depreciation</div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div variants={itemVariants} className="lg:col-span-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">Register Fixed Capital Asset</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-left items-end">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Asset Name</label>
              <input 
                type="text" 
                placeholder="e.g. Office Desktop M4" 
                value={assetName}
                onChange={(e) => setAssetName(e.target.value)}
                className="w-full text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-blue-400"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Date Acquired</label>
              <input 
                type="date" 
                value={assetAcquired}
                onChange={(e) => setAssetAcquired(e.target.value)}
                className="w-full text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-800 dark:text-zinc-200 focus:outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Asset Account (COA)</label>
              <select
                value={assetAccount}
                onChange={(e) => setAssetAccount(e.target.value)}
                className="w-full text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-blue-400"
              >
                <option value="">-- Select Asset Account --</option>
                {coa.filter(c => c.type === 'Asset').map(c => (
                  <option key={c.code} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Capital Cost</label>
              <input 
                type="text" 
                placeholder="0.00" 
                value={assetCost}
                onChange={(e) => setAssetCost(e.target.value)}
                className="w-full text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-800 dark:text-zinc-200 focus:outline-none currency-input"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Useful Lifespan (Years)</label>
              <input 
                type="number" 
                min={1} 
                value={assetLife}
                onChange={(e) => setAssetLife(parseInt(e.target.value, 10) || 5)}
                className="w-full text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-800 dark:text-zinc-200 focus:outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Accumulated Depreciation Account (COA)</label>
              <select
                value={accDepAccount}
                onChange={(e) => setAccDepAccount(e.target.value)}
                className="w-full text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-blue-400"
              >
                <option value="">-- Select Acc. Dep. Account --</option>
                {coa.filter(c => c.type === 'Asset' || c.type === 'Expense').map(c => (
                  <option key={c.code} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="pb-0.5 pt-2">
              <button 
                onClick={handleSaveAsset}
                className="flex items-center justify-center gap-2 text-xs bg-zinc-900 hover:bg-zinc-800 text-white font-bold px-5 py-2.5 rounded-xl transition-colors shadow-sm focus:outline-none w-full sm:w-auto"
              >
                <Plus className="w-4 h-4" />
                <span>Save Asset Registry Row</span>
              </button>
            </div>
            <div className="hidden lg:block"></div>
            <div className="space-y-1.5 pt-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Depreciation Method</label>
              <select
                value={depreciationMethod}
                onChange={(e) => setDepreciationMethod(e.target.value as any)}
                className="w-full text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-blue-400"
              >
                <option value="Straight-Line">Straight-Line</option>
                <option value="Declining Balance">Declining Balance</option>
                <option value="Sum-of-Years-Digits">Sum-of-Years-Digits</option>
              </select>
            </div>
          </div>
        </motion.div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl shadow-sm min-h-[380px] flex flex-col justify-between">
          <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider mb-4">Capital Asset Cost Shares</h3>
          <div className="h-64 w-full">
            {allAssets.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
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
              <div className="text-xs text-zinc-400 italic flex items-center justify-center h-full">No assets recorded</div>
            )}
          </div>
        </div>
      </div>

      <motion.div variants={itemVariants} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="border-b border-zinc-100 dark:border-zinc-800 p-5">
          <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">Fixed Asset Registry</h3>
          <p className="text-xs text-zinc-500 mt-1">Listing capital assets and auto-calculating linear depreciation lapsing schedules.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-950/60 border-b border-zinc-100 dark:border-zinc-800 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                <th className="px-5 py-3">Asset</th>
                <th className="px-5 py-3">Acquired Date</th>
                <th className="px-5 py-3 text-right">Capital Cost</th>
                <th className="px-5 py-3 text-center">Life Years</th>
                <th className="px-5 py-3 text-right">Annual Dep.</th>
                <th className="px-5 py-3 text-right">Acc. Dep.</th>
                <th className="px-5 py-3 text-right">Book Value</th>
                <th className="px-5 py-3">Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-xs">
              {allAssets.length ? allAssets.map((a, idx) => {
                const cost = r2(parseNum(a.cost));
                const lifeYears = Math.max(parseNum(a.lifeYears) || 5, 1);
                const annual = r2(cost / lifeYears);
                const calc = assetNBV(a);

                return (
                  <tr key={idx} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/10 transition-colors">
                    <td className="px-5 py-3.5 font-bold text-zinc-800 dark:text-zinc-200">{a.name}</td>
                    <td className="px-5 py-3.5 font-semibold text-zinc-800 dark:text-zinc-300">{cleanDate(a.acquired)}</td>
                    <td className="px-5 py-3.5 text-right font-bold font-mono text-zinc-800 dark:text-zinc-300">{displayMoney(cost)}</td>
                    <td className="px-5 py-3.5 text-center font-bold text-zinc-500 dark:text-zinc-400">{lifeYears} Yrs</td>
                    <td className="px-5 py-3.5 text-right font-medium font-mono text-zinc-500 dark:text-zinc-400">{displayMoney(annual)}</td>
                    <td className="px-5 py-3.5 text-right font-medium font-mono text-rose-500">{displayMoney(calc.accumulated)}</td>
                    <td className="px-5 py-3.5 text-right font-extrabold font-mono text-emerald-600 dark:text-emerald-400">{displayMoney(calc.nbv)}</td>
                    <td className="px-5 py-3.5"><span className="badge-soft">{a.source || 'Manual'}</span></td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={8} className="px-5 py-8 text-center text-zinc-400 dark:text-zinc-500 italic">No assets registered in database.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </motion.div>
  );
};
