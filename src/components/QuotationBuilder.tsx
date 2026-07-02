import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Plus, Trash2, Printer, Sparkles, FileText, Settings } from 'lucide-react';
import { r2, displayMoney, parseNum, cleanDate, formatCurrency } from '../utils/helpers';

interface QuotationBuilderProps {
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const QuotationBuilder: React.FC<QuotationBuilderProps> = ({
  showToast
}) => {
  const [clientName, setClientName] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [clientTin, setClientTin] = useState('');
  const [quoteDate, setQuoteDate] = useState(new Date().toISOString().slice(0, 10));
  const [quoteExpiry, setQuoteExpiry] = useState('');
  const [discountPercent, setDiscountPercent] = useState('0');
  const [vatMode, setVatMode] = useState<'Tax Inclusive' | 'Tax Exclusive' | 'Exempt'>('Tax Inclusive');

  const [companyConfig, setCompanyConfig] = useState<any>({
    companyName: 'STRATIFY (System+Strategy) SALES ERP PLATFORM',
    tin: '009-887-112-000',
    address: 'Ortigas Center, Pasig City, Metro Manila',
    registeredVat: true,
    logoUrl: 'https://i.postimg.cc/5yGwSWWR/1782659487700.png'
  });

  // Quotation line item form fields
  const [lineDesc, setLineDesc] = useState('');
  const [lineQty, setLineQty] = useState('1');
  const [linePrice, setLinePrice] = useState('');
  const [lineTaxClass, setLineTaxClass] = useState<'Vatable' | 'Exempt' | 'Zero-Rated'>('Vatable');
  const [lineItemType, setLineItemType] = useState<'Goods' | 'Services'>('Goods');

  const [lines, setLines] = useState<any[]>([
    { id: 1, desc: 'Enterprise Accounting Portal License', qty: 1, price: 45000, taxClass: 'Vatable', itemType: 'Services' },
    { id: 2, desc: 'Premium Cloud Storage (1TB, 12 Months)', qty: 1, price: 12000, taxClass: 'Vatable', itemType: 'Goods' }
  ]);

  const [draftQuotes, setDraftQuotes] = useState<any[]>([]);

  React.useEffect(() => {
    try {
      const stored = localStorage.getItem('stratify_draft_quotations');
      if (stored) {
        setDraftQuotes(JSON.parse(stored));
      } else {
        const defaults = [
          { id: 1, client: 'Acme MegaCorp PH', date: `${new Date().getFullYear()}-06-20`, expiry: `${new Date().getFullYear()}-07-20`, gross: 57000, status: 'Draft' }
        ];
        setDraftQuotes(defaults);
        localStorage.setItem('stratify_draft_quotations', JSON.stringify(defaults));
      }
    } catch (e) {}

    try {
      const companyStored = localStorage.getItem('stratify_company_config');
      if (companyStored) {
        const parsed = JSON.parse(companyStored);
        if (parsed.logoUrl === '/logo.png' || !parsed.logoUrl) {
          parsed.logoUrl = 'https://i.postimg.cc/5yGwSWWR/1782659487700.png';
        }
        setCompanyConfig(parsed);
      }
    } catch (e) {}
  }, []);

  const handleAddLine = () => {
    const desc = lineDesc.trim();
    const qty = parseNum(lineQty) || 1;
    const price = parseNum(linePrice);

    if (!desc || !price) {
      showToast('Please fill in Item Description and Price first.', 'error');
      return;
    }

    const newLine = {
      id: Date.now(),
      desc,
      qty,
      price,
      taxClass: lineTaxClass,
      itemType: lineItemType
    };

    setLines([...lines, newLine]);
    setLineDesc('');
    setLineQty('1');
    setLinePrice('');
    setLineTaxClass('Vatable');
    setLineItemType('Goods');
    showToast('Item row added to quote sheet.', 'success');
  };

  const handleDeleteLine = (id: number) => {
    setLines(lines.filter(l => l.id !== id));
  };

  // Calculate Subtotals, Discounts, VAT
  const rawSubtotal = lines.reduce((sum, l) => sum + r2(parseNum(l.qty) * parseNum(l.price)), 0);
  const discountRate = parseNum(discountPercent) / 100;
  const discountVal = r2(rawSubtotal * discountRate);
  const subtotalAfterDiscount = r2(rawSubtotal - discountVal);

  // VAT calculations
  let vatOutput = 0;
  let vatBase = 0;
  let grandTotal = 0;

  if (vatMode === 'Tax Inclusive') {
    vatBase = r2(subtotalAfterDiscount / 1.12);
    vatOutput = r2(subtotalAfterDiscount - vatBase);
    grandTotal = subtotalAfterDiscount;
  } else if (vatMode === 'Tax Exclusive') {
    vatBase = subtotalAfterDiscount;
    vatOutput = r2(subtotalAfterDiscount * 0.12);
    grandTotal = r2(subtotalAfterDiscount + vatOutput);
  } else {
    vatBase = subtotalAfterDiscount;
    vatOutput = 0;
    grandTotal = subtotalAfterDiscount;
  }

  const handleSaveDraft = () => {
    const name = clientName.trim() || 'General Customer';
    const newQuote = {
      id: Date.now(),
      client: name,
      date: quoteDate,
      expiry: quoteExpiry || `${new Date().getFullYear()}-12-31`,
      gross: grandTotal,
      status: 'Draft',
      lines
    };

    const nextList = [newQuote, ...draftQuotes];
    setDraftQuotes(nextList);
    localStorage.setItem('stratify_draft_quotations', JSON.stringify(nextList));
    showToast(`Quotation draft for "${name}" successfully saved.`, 'success');
  };

  const handlePrint = () => {
    window.print();
  };

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
      className="space-y-6 print-quote-container"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5 no-print">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white font-sans">📄 Quotation Builder</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">Draft corporate quotes, apply multi-tiered discount options, configure tax bases, and output PDF invoices.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          <button 
            onClick={handlePrint}
            className="flex items-center gap-2 text-xs bg-zinc-900 hover:bg-zinc-800 text-white font-bold px-4 py-2.5 rounded-xl transition-all shadow-sm focus:outline-none"
          >
            <Printer className="w-4 h-4" />
            <span>Print / PDF Output</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 no-print">
        <div className="lg:col-span-2 space-y-6">
          <motion.div variants={itemVariants} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl shadow-sm space-y-4 text-left">
            <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">Client Billing Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Client Company Name</label>
                <input 
                  type="text" 
                  placeholder="Acme Corporates Ltd" 
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-blue-400"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Corporate TIN No</label>
                <input 
                  type="text" 
                  placeholder="000-000-000-000" 
                  value={clientTin}
                  onChange={(e) => setClientTin(e.target.value)}
                  className="w-full text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-blue-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Proposal Date</label>
                <input 
                  type="date" 
                  value={quoteDate}
                  onChange={(e) => setQuoteDate(e.target.value)}
                  className="w-full text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2.5 text-zinc-800 dark:text-zinc-200 focus:outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Validity Expiry</label>
                <input 
                  type="date" 
                  value={quoteExpiry}
                  onChange={(e) => setQuoteExpiry(e.target.value)}
                  className="w-full text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2.5 text-zinc-800 dark:text-zinc-200 focus:outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Trade Discount (%)</label>
                <input 
                  type="number" 
                  min={0}
                  max={100}
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(e.target.value)}
                  className="w-full text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2.5 text-zinc-800 dark:text-zinc-200 focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Registered Address</label>
              <input 
                type="text" 
                placeholder="456 Corporate Towers, Ortigas Center" 
                value={clientAddress}
                onChange={(e) => setClientAddress(e.target.value)}
                className="w-full text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-blue-400"
              />
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl shadow-sm space-y-4 text-left">
            <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">Add Line Item</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Description / Service</label>
                <input 
                  type="text" 
                  placeholder="e.g. Enterprise License Setup" 
                  value={lineDesc}
                  onChange={(e) => setLineDesc(e.target.value)}
                  className="w-full text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-blue-400"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Quantity</label>
                <input 
                  type="number" 
                  min={1} 
                  value={lineQty}
                  onChange={(e) => setLineQty(e.target.value)}
                  className="w-full text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-800 dark:text-zinc-200 focus:outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Unit Price (PHP)</label>
                <input 
                  type="text" 
                  placeholder="0.00" 
                  value={linePrice}
                  onChange={(e) => setLinePrice(e.target.value)}
                  className="w-full text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-800 dark:text-zinc-200 focus:outline-none currency-input"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Tax Category</label>
                <select 
                  value={lineTaxClass}
                  onChange={(e: any) => setLineTaxClass(e.target.value)}
                  className="w-full text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-800 dark:text-zinc-200 focus:outline-none font-medium"
                >
                  <option value="Vatable">VAT (12%)</option>
                  <option value="Exempt">VAT Exempt</option>
                  <option value="Zero-Rated">Zero-Rated (0%)</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Item Nature</label>
                <select 
                  value={lineItemType}
                  onChange={(e: any) => setLineItemType(e.target.value)}
                  className="w-full text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-800 dark:text-zinc-200 focus:outline-none font-medium"
                >
                  <option value="Goods">Goods / Physical Inventory</option>
                  <option value="Services">Services / Labor / Professional</option>
                </select>
              </div>
            </div>

            <div className="pt-2">
              <button 
                onClick={handleAddLine}
                className="flex items-center gap-2 text-xs bg-zinc-900 hover:bg-zinc-800 text-white font-bold px-5 py-2.5 rounded-xl transition-colors shadow-sm focus:outline-none"
              >
                <Plus className="w-4 h-4" />
                <span>Add Item to Quotation</span>
              </button>
            </div>
          </motion.div>
        </div>

        <motion.div variants={itemVariants} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-4 text-left">
            <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">Quote Settings</h3>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Value-Added Tax Mode</label>
              <select 
                value={vatMode}
                onChange={(e: any) => setVatMode(e.target.value)}
                className="w-full text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-800 dark:text-zinc-200 focus:outline-none"
              >
                <option value="Tax Inclusive">Tax Inclusive (Included 12% VAT)</option>
                <option value="Tax Exclusive">Tax Exclusive (Plus 12% VAT)</option>
                <option value="Exempt">Non-VAT / Exempt</option>
              </select>
            </div>

            <div className="space-y-3 pt-4 border-t border-zinc-100 dark:border-zinc-800 font-medium text-xs text-zinc-500">
              <div className="flex justify-between">
                <span>Raw Total:</span>
                <span className="font-mono text-zinc-800 dark:text-zinc-300">₱ {formatCurrency(rawSubtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Discount ({discountPercent}%):</span>
                <span className="font-mono text-red-500">- ₱ {formatCurrency(discountVal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Taxable Base:</span>
                <span className="font-mono text-zinc-800 dark:text-zinc-300">₱ {formatCurrency(vatBase)}</span>
              </div>
              <div className="flex justify-between">
                <span>VAT (12%):</span>
                <span className="font-mono text-zinc-800 dark:text-zinc-300">₱ {formatCurrency(vatOutput)}</span>
              </div>
              <div className="flex justify-between text-base font-extrabold text-zinc-900 dark:text-white pt-2 border-t border-dashed border-zinc-200 dark:border-zinc-800">
                <span>Grand Total:</span>
                <span className="font-mono">₱ {formatCurrency(grandTotal)}</span>
              </div>
            </div>
          </div>

          <div className="pt-4 flex gap-2">
            <button 
              onClick={handleSaveDraft}
              className="flex-1 text-center text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-xl transition-all shadow-sm"
            >
              <span>Save Proposal Draft</span>
            </button>
            <button 
              onClick={() => window.print()}
              className="flex-1 flex items-center justify-center gap-2 text-xs bg-zinc-900 hover:bg-zinc-800 text-white font-bold py-2.5 rounded-xl transition-all shadow-sm focus:outline-none"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Save PDF</span>
            </button>
          </div>
        </motion.div>
      </div>

      {/* PRINT-OPTIMIZED SHEETS AREA */}
      <motion.div variants={itemVariants} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-xl overflow-hidden fs-sheet-print p-8 sm:p-12 text-left text-zinc-800 dark:text-zinc-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 border-b border-zinc-200 dark:border-zinc-800 pb-8">
          <div className="flex items-center gap-4">
            {companyConfig.logoUrl && (
              <img 
                src={companyConfig.logoUrl} 
                alt="Company Logo" 
                className="w-16 h-16 rounded-2xl object-cover bg-white p-1 border border-zinc-200 dark:border-zinc-800 shadow-sm"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  // Fallback if logo fails to load
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            )}
            <div className="space-y-1">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white uppercase">BUSINESS PROPOSAL</h1>
              <p className="text-xs text-zinc-500 uppercase tracking-wider font-bold">Official Price Quotation</p>
            </div>
          </div>
          <div className="text-left sm:text-right space-y-1 text-xs">
            <div className="font-bold text-zinc-900 dark:text-white uppercase">{companyConfig.companyName || 'STRATIFY (System+Strategy) SALES ERP PLATFORM'}</div>
            <div className="text-zinc-500">{companyConfig.address || 'Ortigas Center, Pasig City, Metro Manila'}</div>
            <div className="text-zinc-500">TIN: {companyConfig.tin || '009-887-112-000'} {companyConfig.registeredVat ? '• VAT Registered' : ''}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 py-8 text-xs">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">PREPARED FOR:</span>
            <div className="text-sm font-extrabold text-zinc-900 dark:text-white uppercase">{clientName || 'CUSTOMER CORPORATION LTD'}</div>
            {clientAddress && <div className="text-zinc-500">{clientAddress}</div>}
            {clientTin && <div className="text-zinc-500">TIN: {clientTin}</div>}
          </div>
          <div className="text-right space-y-1.5">
            <div>
              <span className="text-[10px] font-bold text-zinc-400 uppercase block">QUOTATION NO:</span>
              <span className="font-mono font-bold text-zinc-900 dark:text-white">QT-{new Date().getFullYear()}-{Math.floor(Math.random() * 9000 + 1000)}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-zinc-400 uppercase block">PROPOSAL DATE:</span>
              <span className="font-semibold text-zinc-800 dark:text-zinc-300">{cleanDate(quoteDate)}</span>
            </div>
            {quoteExpiry && (
              <div>
                <span className="text-[10px] font-bold text-zinc-400 uppercase block">VALIDITY UNTIL:</span>
                <span className="font-semibold text-rose-500">{cleanDate(quoteExpiry)}</span>
              </div>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs min-w-[600px]">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 text-[10px] font-bold uppercase text-zinc-400">
                <th className="px-4 py-3">Line Details</th>
                <th className="px-4 py-3 text-center">Qty</th>
                <th className="px-4 py-3 text-right">Unit Cost</th>
                <th className="px-4 py-3 text-right">Line Total</th>
                <th className="px-4 py-3 text-center no-print w-20">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {lines.length ? lines.map(l => (
                <tr key={l.id} className="hover:bg-zinc-50/20">
                  <td className="px-4 py-3.5 font-bold text-zinc-800 dark:text-zinc-200">
                    <div className="flex flex-col">
                      <span>{l.desc}</span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[9px] text-zinc-400 font-medium uppercase tracking-wider">{l.taxClass} classification</span>
                        <span className="text-[9px] text-zinc-300">•</span>
                        <span className={`inline-flex px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${
                          l.itemType === 'Services'
                            ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/20 dark:text-purple-400 border border-purple-100 dark:border-purple-900/20 font-bold'
                            : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700 font-bold'
                        }`}>
                          {l.itemType || 'Goods'}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-center font-bold">{l.qty}</td>
                  <td className="px-4 py-3.5 text-right font-mono font-medium text-zinc-600 dark:text-zinc-400">₱ {formatCurrency(parseNum(l.price))}</td>
                  <td className="px-4 py-3.5 text-right font-mono font-bold text-zinc-800 dark:text-zinc-200">₱ {formatCurrency(r2(parseNum(l.qty) * parseNum(l.price)))}</td>
                  <td className="px-4 py-3.5 text-center no-print">
                    <button 
                      onClick={() => handleDeleteLine(l.id)}
                      className="p-1 hover:bg-rose-50 hover:text-rose-600 rounded text-zinc-400 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-zinc-400 italic">No line items added. Use the form above to insert services.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-8 mt-4 border-t border-zinc-200 dark:border-zinc-800 text-xs">
          <div className="space-y-4">
            <div>
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">PROPOSAL TERMS:</span>
              <p className="text-zinc-500 mt-1 leading-relaxed">
                Prices quoted are valid for 30 days from date of issue. System setup requires 50% deposit downpayment upon acceptance and remaining balance upon server handover.
              </p>
            </div>
            <div className="pt-4 flex items-center gap-12 text-center sm:text-left">
              <div className="border-t border-zinc-300 dark:border-zinc-700 pt-3 w-40">
                <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Authorized Signature</span>
              </div>
              <div className="border-t border-zinc-300 dark:border-zinc-700 pt-3 w-40">
                <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Client Acceptance</span>
              </div>
            </div>
          </div>

          <div className="space-y-2.5 text-right font-medium text-zinc-500">
            <div className="flex justify-between">
              <span>Gross Proposal Subtotal:</span>
              <span className="font-mono text-zinc-800 dark:text-zinc-300">₱ {formatCurrency(rawSubtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>Trade Discount ({discountPercent}%):</span>
              <span className="font-mono text-red-500">- ₱ {formatCurrency(discountVal)}</span>
            </div>
            <div className="flex justify-between">
              <span>Value-Added Tax Base:</span>
              <span className="font-mono text-zinc-800 dark:text-zinc-300">₱ {formatCurrency(vatBase)}</span>
            </div>
            <div className="flex justify-between">
              <span>VAT ({vatMode === 'Exempt' ? '0' : '12'}%):</span>
              <span className="font-mono text-zinc-800 dark:text-zinc-300">₱ {formatCurrency(vatOutput)}</span>
            </div>
            <div className="flex justify-between text-lg font-extrabold text-zinc-950 dark:text-white pt-2 border-t border-dashed border-zinc-300 dark:border-zinc-700">
              <span>Proposal Total:</span>
              <span className="font-mono">₱ {formatCurrency(grandTotal)}</span>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
