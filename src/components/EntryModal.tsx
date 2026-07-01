import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles, HelpCircle } from 'lucide-react';
import { LedgerEntry } from '../types';
import { getCompleteChartOfAccounts } from '../data/chartOfAccounts';
import { r2, parseNum } from '../utils/helpers';

interface EntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveEntry: (entry: LedgerEntry) => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  initialType?: 'Sales' | 'Expense';
  scanResult?: { payor: string, particulars: string, gross: string, accountCode: string, tin?: string } | null;
  initialData?: LedgerEntry;
}

export const EntryModal: React.FC<EntryModalProps> = ({
  isOpen,
  onClose,
  onSaveEntry,
  showToast,
  initialType,
  scanResult,
  initialData
}) => {
  const coa = Object.entries(getCompleteChartOfAccounts()).map(([code, value]) => ({ ...value, code }));

  // Form Fields
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [type, setType] = useState<'Sales' | 'Expense'>('Sales');
  const [accountCode, setAccountCode] = useState('');
  const [payor, setPayor] = useState('');
  const [tin, setTin] = useState('');
  const [particulars, setParticulars] = useState('');
  const [grossInput, setGrossInput] = useState('');
  const [taxType, setTaxType] = useState<'Vatable' | 'Non-VAT' | 'Zero-Rated' | 'Exempt'>('Vatable');
  const [status, setStatus] = useState<'Cleared' | 'Pending' | 'Void' | 'Posted'>('Cleared');
  const [terms, setTerms] = useState('COD');
  const [cashInput, setCashInput] = useState('');
  const [arApInput, setArApInput] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setType(initialData.type as 'Sales' | 'Expense');
        setDate(initialData.date);
        setAccountCode(initialData.accountCode);
        setPayor(initialData.payor);
        setTin(initialData.tin || '');
        setParticulars(initialData.particulars);
        setGrossInput(initialData.gross);
        setTaxType(initialData.taxType as any);
        setStatus(initialData.status as any);
        setTerms(initialData.terms || 'COD');
        setCashInput(initialData.amount_paid?.toString() || '');
        setArApInput(initialData.balance?.toString() || '');
      } else if (scanResult) {
        if (initialType) setType(initialType);
        setDate(new Date().toISOString().slice(0, 10));
        setAccountCode(scanResult.accountCode);
        setPayor(scanResult.payor);
        setTin(scanResult.tin || '');
        setParticulars(scanResult.particulars);
        setGrossInput(scanResult.gross);
        setCashInput(scanResult.gross);
        setArApInput('0');
      } else {
        if (initialType) setType(initialType);
        setDate(new Date().toISOString().slice(0, 10));
        setAccountCode('');
        setPayor('');
        setTin('');
        setParticulars('');
        setGrossInput('');
        setCashInput('');
        setArApInput('');
        setTaxType('Vatable');
        setStatus('Cleared');
        setTerms('COD');
      }
    }
  }, [isOpen, initialType, initialData, scanResult]);

  const [contacts, setContacts] = useState<any[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('stratify_contacts');
      if (stored) {
        setContacts(JSON.parse(stored));
      }
    } catch(e) {}
  }, []);

  // Auto computations based on Gross and Tax Type
  const handleGrossChange = (val: string) => {
    setGrossInput(val);
    const grossVal = parseNum(val);
    if (!grossVal) {
      setCashInput('');
      setArApInput('');
      return;
    }

    if (terms === 'COD' || terms === 'Cash') {
      setCashInput(String(grossVal));
      setArApInput('0');
    } else {
      setCashInput('0');
      setArApInput(String(grossVal));
    }
  };

  const handleTermsChange = (val: string) => {
    setTerms(val);
    const grossVal = parseNum(grossInput);
    if (!grossVal) return;

    if (val === 'COD' || val === 'Cash') {
      setCashInput(String(grossVal));
      setArApInput('0');
    } else {
      setCashInput('0');
      setArApInput(String(grossVal));
    }
  };

  const handleSave = () => {
    const gross = parseNum(grossInput);
    if (!gross || !accountCode || !particulars.trim()) {
      showToast('Please complete Particulars, Account Code, and Gross Amount.', 'error');
      return;
    }

    const matchedCoa = coa.find(c => c.code === accountCode);
    const category = matchedCoa ? matchedCoa.name : 'Unassigned';

    // Compute VAT and Taxable Base
    let taxable = gross;
    let vat = 0;
    if (taxType === 'Vatable') {
      taxable = r2(gross / 1.12);
      vat = r2(gross - taxable);
    }

    const months = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
    const d = new Date(date);
    const monthName = months[d.getMonth()];
    const yearStr = String(d.getFullYear());

    const newEntry: LedgerEntry = {
      id: initialData ? initialData.id : Date.now(),
      date,
      month: monthName,
      year: yearStr,
      type,
      category,
      accountCode,
      payor: payor.trim() || 'General Customer',
      tin: tin.trim(),
      particulars: particulars.trim(),
      taxable,
      vat,
      gross,
      cash: parseNum(cashInput) || 0,
      arAp: parseNum(arApInput) || 0,
      taxType,
      status,
      terms,
      address: '',
      createdAt: new Date().toISOString()
    };

    onSaveEntry(newEntry);
    showToast('Transaction successfully posted to Ledger journal.', 'success');
    
    // Reset Form
    setDate(new Date().toISOString().slice(0, 10));
    setAccountCode('');
    setPayor('');
    setTin('');
    setParticulars('');
    setGrossInput('');
    setTaxType('Vatable');
    setStatus('Cleared');
    setTerms('COD');
    setCashInput('');
    setArApInput('');
    onClose();
  };

  const filteredCoa = coa.filter(c => {
    if (type === 'Sales') {
      return c.type === 'Revenue' || c.type === 'Equity' || c.type === 'Asset';
    } else {
      return c.type === 'Expense' || c.type === 'Asset' || c.type === 'Liability';
    }
  });

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-zinc-950/80 z-[200] backdrop-blur-sm"
          />
          {/* Modal Container */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', duration: 0.3 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl z-[201] overflow-hidden flex flex-col justify-between"
          >
            <div>
              <div className="bg-zinc-900 text-white p-5 flex items-center justify-between border-b border-zinc-800">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-blue-400" />
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider">Post Journal Entry</h3>
                    <p className="text-[10px] text-zinc-400 mt-0.5">Post an official double-entry ledger row with complete tax structures.</p>
                  </div>
                </div>
                <button 
                  onClick={onClose}
                  className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4 text-left max-h-[450px] overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Transaction Type</label>
                    <select 
                      value={type}
                      onChange={(e) => {
                        setType(e.target.value as any);
                        setAccountCode('');
                      }}
                      className="w-full text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-blue-400"
                    >
                      <option value="Sales">Sales (Revenue Inward)</option>
                      <option value="Expense">Expense (Purchase Outward)</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Posting Date</label>
                    <input 
                      type="date" 
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2.5 text-zinc-800 dark:text-zinc-200 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Chart of Accounts Target</label>
                  <select 
                    value={accountCode}
                    onChange={(e) => setAccountCode(e.target.value)}
                    className="w-full text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-800 dark:text-zinc-200 focus:outline-none"
                  >
                    <option value="">-- Choose Target Account --</option>
                    {filteredCoa.map(c => (
                      <option key={c.code} value={c.code}>{c.code} - {c.name} ({c.type})</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Client / Supplier Name</label>
                    <input 
                      type="text" 
                      list="contacts-list"
                      placeholder="e.g. Acme MegaCorp PH"
                      value={payor}
                      onChange={(e) => {
                        const val = e.target.value;
                        setPayor(val);
                        const found = contacts.find(c => c.registeredName === val);
                        if (found) {
                          setTin(found.tin || '');
                        }
                      }}
                      className="w-full text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-blue-400"
                    />
                    <datalist id="contacts-list">
                      {contacts.map((c, idx) => (
                        <option key={idx} value={c.registeredName} />
                      ))}
                    </datalist>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Registered TIN No</label>
                    <input 
                      type="text" 
                      placeholder="000-000-000-000"
                      value={tin}
                      onChange={(e) => setTin(e.target.value)}
                      className="w-full text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-800 dark:text-zinc-200 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Transaction Particulars</label>
                  <input 
                    type="text" 
                    placeholder="Provide full bookkeeping particulars details..."
                    value={particulars}
                    onChange={(e) => setParticulars(e.target.value)}
                    className="w-full text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-blue-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Gross Amount (PHP)</label>
                    <input 
                      type="text" 
                      placeholder="0.00"
                      value={grossInput}
                      onChange={(e) => handleGrossChange(e.target.value)}
                      className="w-full text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-800 dark:text-zinc-200 focus:outline-none currency-input font-bold"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Tax Category</label>
                    <select 
                      value={taxType}
                      onChange={(e: any) => setTaxType(e.target.value)}
                      className="w-full text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-800 dark:text-zinc-200 focus:outline-none"
                    >
                      <option value="Vatable">VAT Registered (12%)</option>
                      <option value="Non-VAT">Non-VAT Registered</option>
                      <option value="Exempt">VAT Exempt</option>
                      <option value="Zero-Rated">Zero-Rated (0%)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Terms</label>
                    <select 
                      value={terms}
                      onChange={(e) => handleTermsChange(e.target.value)}
                      className="w-full text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-2.5 py-2.5 text-zinc-800 dark:text-zinc-200 focus:outline-none"
                    >
                      <option value="COD">COD (Immediate Cash)</option>
                      <option value="30 Days">30 Days (On Credit)</option>
                      <option value="60 Days">60 Days (On Credit)</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Cash Received</label>
                    <input 
                      type="text" 
                      disabled
                      value={cashInput}
                      className="w-full text-xs bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2.5 text-zinc-500 font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">AR / AP Ledger</label>
                    <input 
                      type="text" 
                      disabled
                      value={arApInput}
                      className="w-full text-xs bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2.5 text-zinc-500 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-1">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Journal Status</label>
                    <select 
                      value={status}
                      onChange={(e: any) => setStatus(e.target.value)}
                      className="w-full text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-800 dark:text-zinc-200 focus:outline-none"
                    >
                      <option value="Cleared">Cleared (Posted)</option>
                      <option value="Pending">Pending Audit</option>
                      <option value="Void">Void (Cancelled)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-zinc-50 dark:bg-zinc-950/40 p-5 border-t border-zinc-100 dark:border-zinc-800 flex items-center gap-3">
              <button 
                onClick={handleSave}
                className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-white font-bold py-3 text-xs rounded-xl transition-all shadow-sm"
              >
                Post Entry Row
              </button>
              <button 
                onClick={onClose}
                className="flex-1 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 font-bold py-3 text-xs border border-zinc-200 dark:border-zinc-800 rounded-xl transition-all shadow-sm"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
