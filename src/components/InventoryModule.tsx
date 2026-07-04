import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Plus, AlertTriangle, CheckCircle, Package } from 'lucide-react';
import { LedgerEntry, COAAccount } from '../types';
import { r2, displayMoney, parseNum, formatCurrency } from '../utils/helpers';

interface InventoryModuleProps {
  ledger: LedgerEntry[];
  coa?: COAAccount[];
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

const INVENTORY_CATEGORIES = [
  'Raw Materials',
  'Finished Goods',
  'Packaging',
  'Office Supplies',
  'Equipment',
  'Consumables',
  'Services',
  'Others'
];

export const InventoryModule: React.FC<InventoryModuleProps> = ({
  ledger,
  coa = [],
  showToast
}) => {
  const [invSku, setInvSku] = useState('');
  const [invItem, setInvItem] = useState('');
  const [invCategory, setInvCategory] = useState(INVENTORY_CATEGORIES[0]);
  const [invQty, setInvQty] = useState('');
  const [invCost, setInvCost] = useState('');
  const [invPrice, setInvPrice] = useState('');
  const [invReorder, setInvReorder] = useState('');
  const [invCogs, setInvCogs] = useState('');
  const [invItemType, setInvItemType] = useState<'Goods' | 'Services'>('Goods');
  
  const [manualInventory, setManualInventory] = useState<any[]>([]);

  React.useEffect(() => {
    try {
      const stored = localStorage.getItem('stratify_inventory');
      if (stored) setManualInventory(JSON.parse(stored));
    } catch (e) {}
  }, []);

  // Filter candidates from ledger (sales rows with unique descriptions)
  const ledgerCandidatesMap: Record<string, { sku: string; item: string; qty: number; cost: number; price: number; reorder: number }> = {};
  ledger.forEach(r => {
    if (r.status === 'Void' || r.type === 'Closing' || r.type === 'Setup') return;
    const name = String(r.category || r.particulars || 'Product Item').trim();
    if (!name) return;
    
    const sku = name.toUpperCase().replace(/[^A-Z0-9]/g, '-').slice(0, 12);
    if (!ledgerCandidatesMap[sku]) {
      ledgerCandidatesMap[sku] = {
        sku,
        item: name,
        qty: 0,
        cost: r.type === 'Expense' ? r.gross : 0,
        price: r.type === 'Sales' ? r.gross : 0,
        reorder: 0
      };
    }
    const val = r2(parseNum(r.gross));
    if (r.type === 'Sales') {
      ledgerCandidatesMap[sku].qty -= 1; // Sold reduces physical stock
      if (val > ledgerCandidatesMap[sku].price) ledgerCandidatesMap[sku].price = val;
    } else if (r.type === 'Expense') {
      ledgerCandidatesMap[sku].qty += 1; // Purchases increases physical stock
      if (val > ledgerCandidatesMap[sku].cost) ledgerCandidatesMap[sku].cost = val;
    }
  });

  const ledgerCandidates = Object.values(ledgerCandidatesMap);
  const allItems = [
    ...manualInventory.map(x => ({ ...x, source: 'Manual' as const })),
    ...ledgerCandidates.map(x => ({ ...x, source: 'Ledger' as const }))
  ];

  // Deduplicate items on SKU
  const deduped: any[] = [];
  const seenSkus = new Set();
  allItems.forEach(item => {
    const skuKey = String(item.sku || '').trim().toLowerCase();
    if (!skuKey) return;
    if (seenSkus.has(skuKey)) {
      // Aggregate quantities if ledger
      const idx = deduped.findIndex(x => String(x.sku).toLowerCase() === skuKey);
      if (idx >= 0 && item.source === 'Ledger') {
        deduped[idx].qty = r2(parseNum(deduped[idx].qty) + parseNum(item.qty));
      }
      return;
    }
    seenSkus.add(skuKey);
    deduped.push({ ...item });
  });

  const handleSaveItem = () => {
    const itemDesc = invItem.trim();
    const sku = invSku.trim() || itemDesc.toUpperCase().replace(/[^A-Z0-9]/g, '-').slice(0, 12);
    // Services do not have physical stock qty or reorder thresholds
    const qty = invItemType === 'Services' ? 0 : parseNum(invQty);
    const cost = parseNum(invCost);
    const price = parseNum(invPrice);
    const reorder = invItemType === 'Services' ? 0 : parseNum(invReorder);

    if (!itemDesc) {
      showToast('Please enter the Item Description / Service Name.', 'error');
      return;
    }

    const newItem = {
      id: Date.now(),
      sku,
      item: itemDesc,
      category: invCategory.trim() || (invItemType === 'Services' ? 'Services' : INVENTORY_CATEGORIES[0]),
      qty,
      cost,
      price,
      reorder,
      cogsAccount: invCogs,
      itemType: invItemType,
      source: 'Manual'
    };

    const nextList = [newItem, ...manualInventory];
    setManualInventory(nextList);
    localStorage.setItem('stratify_inventory', JSON.stringify(nextList));
    showToast(`Catalog item "${itemDesc}" (${invItemType}) saved successfully.`, 'success');

    setInvSku('');
    setInvItem('');
    setInvCategory(INVENTORY_CATEGORIES[0]);
    setInvQty('');
    setInvCost('');
    setInvPrice('');
    setInvReorder('');
    setInvCogs('');
    setInvItemType('Goods');
  };

  const lowStockCount = deduped.filter(r => parseNum(r.qty) <= parseNum(r.reorder || 0)).length;
  const totalStockValue = deduped.reduce((sum, r) => sum + r2(parseNum(r.qty) * parseNum(r.cost)), 0);

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
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white font-sans">📦 Inventory</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Inventory and services catalog, item codes, base unit costs, selling prices, and restock levels.</p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto bg-zinc-100 dark:bg-zinc-800 px-3 py-1.5 rounded-xl text-xs font-bold text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
          <span>{deduped.length} items logged</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <motion.div variants={itemVariants} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl flex items-start justify-between shadow-sm">
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Inventory Items</span>
            <div className="text-lg font-extrabold text-zinc-800 dark:text-zinc-100">{deduped.length}</div>
            <div className="text-xs text-zinc-400 font-medium">Distinct SKUs and service products</div>
          </div>
          <div className="bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 p-2.5 rounded-xl">
            <Package className="w-5 h-5" />
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl flex items-start justify-between shadow-sm">
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Low Stock Warnings</span>
            <div className={`text-lg font-extrabold ${lowStockCount > 0 ? 'text-red-500 animate-pulse' : 'text-emerald-500'}`}>
              {lowStockCount}
            </div>
            <div className="text-xs text-zinc-400 font-medium">Items under minimum safety thresholds</div>
          </div>
          <div className={`p-2.5 rounded-xl transition-all ${lowStockCount > 0 ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-500 dark:text-rose-400 animate-pulse' : 'bg-emerald-50 text-emerald-500'}`}>
            <AlertTriangle className="w-5 h-5" />
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl flex items-start justify-between shadow-sm">
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Stock Valuation</span>
            <div className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">{displayMoney(totalStockValue)}</div>
            <div className="text-xs text-zinc-400 font-medium">Quantity multiplied by unit acquisition cost</div>
          </div>
          <div className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 p-2.5 rounded-xl">
            <CheckCircle className="w-5 h-5" />
          </div>
        </motion.div>
      </div>

      {lowStockCount > 0 && (
        <motion.div
          variants={itemVariants}
          className="bg-red-50/60 dark:bg-red-950/20 border border-red-200/50 dark:border-red-900/30 rounded-3xl p-6 text-left space-y-3 shadow-sm relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
            <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-950/60 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 animate-bounce" />
            </div>
            <div>
              <h3 className="font-bold text-sm uppercase tracking-wider">📦 Reorder Warning: Out of Stock Risk!</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-300 mt-0.5">
                Ang mga sumusunod na produkto ay mas mababa na sa iyong itinakdang **Safety Stock Level** (reorder threshold).
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-2">
            {deduped
              .filter(r => {
                const isService = r.itemType === 'Services' || r.category?.toLowerCase() === 'services' || r.item?.toLowerCase().includes('service');
                const qty = r2(parseNum(r.qty));
                const reorder = r2(parseNum(r.reorder || 0));
                return !isService && qty <= reorder;
              })
              .map(r => (
                <div key={r.sku} className="flex items-center justify-between p-3 bg-white dark:bg-zinc-900 rounded-2xl border border-red-100 dark:border-red-900/20 shadow-sm relative group hover:border-red-300 dark:hover:border-red-700/50 transition-all">
                  <div className="text-left">
                    <div className="font-bold text-xs text-zinc-800 dark:text-zinc-200">{r.item}</div>
                    <div className="text-[10px] text-zinc-400 font-mono mt-0.5">{r.sku}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="inline-flex items-center gap-1 font-mono font-black text-xs text-red-500 bg-red-50 dark:bg-red-950/40 px-2 py-0.5 rounded-lg border border-red-200/30">
                      {r.qty} left
                    </span>
                    <div className="text-[9px] text-zinc-400 mt-1">Safety Level: <span className="font-bold">{r.reorder}</span></div>
                  </div>
                </div>
              ))}
          </div>
        </motion.div>
      )}

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">Add Item / Service</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 text-left">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Item Type</label>
            <select
              value={invItemType}
              onChange={(e) => {
                const val = e.target.value as 'Goods' | 'Services';
                setInvItemType(val);
                if (val === 'Services') {
                  setInvQty('0');
                  setInvReorder('0');
                }
              }}
              className="w-full text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-blue-400 font-bold"
            >
              <option value="Goods">Goods (Stock / Inventory)</option>
              <option value="Services">Services (Non-Stock / Labor)</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">SKU Code</label>
            <input 
              type="text" 
              placeholder="e.g. POS-001" 
              value={invSku}
              onChange={(e) => setInvSku(e.target.value)}
              className="w-full text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-blue-400"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Item / Service Name</label>
            <input 
              type="text" 
              placeholder="Custom POS Software License" 
              value={invItem}
              onChange={(e) => setInvItem(e.target.value)}
              className="w-full text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-blue-400"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Category</label>
            <select 
              value={invCategory}
              onChange={(e) => setInvCategory(e.target.value)}
              className="w-full text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-blue-400 font-bold"
            >
              {INVENTORY_CATEGORIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Stock Qty</label>
            <input 
              type="text" 
              disabled={invItemType === 'Services'}
              placeholder={invItemType === 'Services' ? 'N/A' : '0'}
              value={invItemType === 'Services' ? 'N/A' : invQty}
              onChange={(e) => setInvQty(e.target.value)}
              className="w-full text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-800 dark:text-zinc-200 focus:outline-none disabled:opacity-50"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-left">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Unit Cost</label>
            <input 
              type="text" 
              placeholder="0.00" 
              value={invCost}
              onChange={(e) => setInvCost(e.target.value)}
              className="w-full text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-800 dark:text-zinc-200 focus:outline-none currency-input"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Selling Price</label>
            <input 
              type="text" 
              placeholder="0.00" 
              value={invPrice}
              onChange={(e) => setInvPrice(e.target.value)}
              className="w-full text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-800 dark:text-zinc-200 focus:outline-none currency-input"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Reorder Level (Min)</label>
            <input 
              type="text" 
              disabled={invItemType === 'Services'}
              placeholder={invItemType === 'Services' ? 'N/A' : '0'}
              value={invItemType === 'Services' ? 'N/A' : invReorder}
              onChange={(e) => setInvReorder(e.target.value)}
              className="w-full text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-800 dark:text-zinc-200 focus:outline-none disabled:opacity-50"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Cost of Goods Sold (COGS) Account</label>
            <select 
              value={invCogs}
              onChange={(e) => setInvCogs(e.target.value)}
              className="w-full text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-blue-400 font-bold"
            >
              <option value="">Select COGS Account</option>
              {coa.filter(c => c.type === 'Expense' || c.type === 'Asset').map(c => (
                <option key={c.code} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="pt-2">
          <button 
            onClick={handleSaveItem}
            className="flex items-center gap-2 text-xs bg-zinc-900 hover:bg-zinc-800 text-white font-bold px-5 py-2.5 rounded-xl transition-colors shadow-sm focus:outline-none"
          >
            <Plus className="w-4 h-4" />
            <span>Save Catalog Item</span>
          </button>
        </div>
      </div>

      <motion.div variants={itemVariants} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="border-b border-zinc-100 dark:border-zinc-800 p-5">
          <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">Item & Services Registry</h3>
          <p className="text-xs text-zinc-500 mt-1">Listing items. Quantities are subtracted dynamically by Sales and increased by Purchase ledgers.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-950/60 border-b border-zinc-100 dark:border-zinc-800 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                <th className="px-5 py-3">SKU Code</th>
                <th className="px-5 py-3">Item Name / Service</th>
                <th className="px-5 py-3">Type</th>
                <th className="px-5 py-3">Category</th>
                <th className="px-5 py-3 text-right">Unit Cost</th>
                <th className="px-5 py-3 text-right">Selling Price</th>
                <th className="px-5 py-3 text-right">Stock Qty</th>
                <th className="px-5 py-3 text-right">Stock Value</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-xs">
              {deduped.length ? deduped.map((r, idx) => {
                const qty = r2(parseNum(r.qty));
                const reorder = r2(parseNum(r.reorder || 0));
                const cost = r2(parseNum(r.cost));
                const price = r2(parseNum(r.price));
                const isService = r.itemType === 'Services' || r.category?.toLowerCase() === 'services' || r.item?.toLowerCase().includes('service');
                const isLow = !isService && qty <= reorder;

                return (
                  <tr key={idx} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/10 transition-colors">
                    <td className="px-5 py-3.5 font-bold font-mono text-zinc-800 dark:text-zinc-200">{r.sku}</td>
                    <td className="px-5 py-3.5 font-bold text-zinc-800 dark:text-zinc-200">{r.item}</td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${
                        isService
                          ? 'bg-purple-50 border-purple-100 text-purple-700 dark:bg-purple-950/30 dark:border-purple-900/30 dark:text-purple-400'
                          : 'bg-zinc-50 border-zinc-200 text-zinc-700 dark:bg-zinc-950/30 dark:border-zinc-850/30 dark:text-zinc-400'
                      }`}>
                        {isService ? 'Service' : 'Goods'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-zinc-500 font-semibold">{r.category}</td>
                    <td className="px-5 py-3.5 text-right font-mono font-medium text-zinc-500 dark:text-zinc-400">{displayMoney(cost)}</td>
                    <td className="px-5 py-3.5 text-right font-mono font-bold text-zinc-800 dark:text-zinc-200">{displayMoney(price)}</td>
                    <td className="px-5 py-3.5 text-right font-mono font-bold text-zinc-800 dark:text-zinc-200">
                      {isService ? <span className="text-zinc-400">N/A</span> : qty}
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {isService ? <span className="text-zinc-400">—</span> : displayMoney(r2(qty * cost))}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                        isService
                          ? 'bg-zinc-50 border-zinc-200 text-zinc-600 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-400'
                          : isLow 
                            ? 'bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-950/30 dark:border-rose-900/30 dark:text-rose-400 animate-pulse' 
                            : 'bg-emerald-50 border-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:border-emerald-900/30 dark:text-emerald-400'
                      }`}>
                        {isService ? 'Non-Stock' : isLow ? 'Low Stock' : 'Good'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5"><span className="badge-soft">{r.source || 'Manual'}</span></td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={10} className="px-5 py-8 text-center text-zinc-400 dark:text-zinc-500 italic">No inventory registered. Add standard service items above to populate the selection list.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </motion.div>
  );
};
