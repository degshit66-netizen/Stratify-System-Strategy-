import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Search, Edit2, Trash2, X, Users, Tag, Building, TrendingUp, TrendingDown } from 'lucide-react';
import { ContactMaster, LedgerEntry } from '../types';
import { r2, displayMoney, parseNum, formatCurrency } from '../utils/helpers';

interface ContactsModuleProps {
  ledger: LedgerEntry[];
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const ContactsModule: React.FC<ContactsModuleProps> = ({
  ledger,
  showToast
}) => {
  const [activeTab, setActiveTab] = useState<'Client' | 'Payor' | 'Supplier'>('Client');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Inactive' | 'Blocked'>('All');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Form Fields
  const [editId, setEditId] = useState<number | string | null>(null);
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<'Client' | 'Payor' | 'Supplier' | 'Client & Supplier'>('Client');
  const [formPerson, setFormPerson] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formTin, setFormTin] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formTerms, setFormTerms] = useState('');
  const [formCreditLimit, setFormCreditLimit] = useState('');
  const [formVatType, setFormVatType] = useState<'VAT Registered' | 'Non-VAT' | 'Zero-Rated' | 'Exempt'>('VAT Registered');
  const [formStatus, setFormStatus] = useState<'Active' | 'Inactive' | 'Blocked'>('Active');
  const [formNotes, setFormNotes] = useState('');

  const [manualContacts, setManualInventory] = useState<ContactMaster[]>([]);

  React.useEffect(() => {
    try {
      const stored = localStorage.getItem('stratify_contacts');
      if (stored) setManualInventory(JSON.parse(stored));
    } catch (e) {}
  }, []);

  // Aggregate with ledger records for absolute master list
  const ledgerContactsMap: Record<string, ContactMaster> = {};
  ledger.forEach(r => {
    if (r.status === 'Void') return;
    const name = String(r.payor || '').trim();
    if (!name) return;
    const key = name.toLowerCase();
    
    if (!ledgerContactsMap[key]) {
      ledgerContactsMap[key] = {
        id: `ledger-${key}`,
        name,
        type: r.type === 'Expense' ? 'Supplier' : 'Client',
        contactPerson: '',
        email: '',
        phone: '',
        tin: r.tin || '',
        address: r.address || '',
        terms: '',
        creditLimit: 0,
        vatType: r.taxType === 'Vatable' ? 'VAT Registered' : 'Exempt',
        status: 'Active',
        notes: '',
        sales: 0,
        purchases: 0,
        lastTxn: cleanDate(r.date),
        createdAt: r.createdAt
      };
    }
    const item = ledgerContactsMap[key];
    const gross = r2(parseNum(r.gross));
    if (r.type === 'Sales') item.sales = r2((item.sales || 0) + gross);
    if (r.type === 'Expense') item.purchases = r2((item.purchases || 0) + gross);
    if (rowLaterThan(r.date, item.lastTxn)) item.lastTxn = cleanDate(r.date);
    if (!item.address && r.address) item.address = r.address;
    if (!item.tin && r.tin) item.tin = r.tin;
  });

  const allMerged: ContactMaster[] = [
    ...manualContacts.map(x => ({ ...x, source: 'Manual' as const })),
    ...Object.values(ledgerContactsMap).map(x => ({ ...x, source: 'Ledger' as const }))
  ];

  // De-duplicate
  const finalContacts: ContactMaster[] = [];
  const seenNames = new Set();
  allMerged.forEach(item => {
    const key = String(item.name || '').trim().toLowerCase();
    if (!key) return;
    if (seenNames.has(key)) {
      const existing = finalContacts.find(x => String(x.name).trim().toLowerCase() === key);
      if (existing) {
        existing.sales = r2(parseNum(existing.sales) + parseNum(item.sales));
        existing.purchases = r2(parseNum(existing.purchases) + parseNum(item.purchases));
        if (rowLaterThan(item.lastTxn, existing.lastTxn)) existing.lastTxn = item.lastTxn;
        existing.tin = existing.tin || item.tin || '';
        existing.address = existing.address || item.address || '';
        existing.contactPerson = existing.contactPerson || item.contactPerson || '';
        existing.email = existing.email || item.email || '';
        existing.phone = existing.phone || item.phone || '';
        existing.terms = existing.terms || item.terms || '';
        existing.vatType = existing.vatType || item.vatType || 'VAT Registered';
        existing.status = existing.status || item.status || 'Active';
      }
      return;
    }
    seenNames.add(key);
    finalContacts.push({ ...item });
  });

  function rowLaterThan(dateA: any, dateB: any): boolean {
    if (!dateA) return false;
    if (!dateB) return true;
    return new Date(dateA).getTime() > new Date(dateB).getTime();
  }

  function cleanDate(d: any): string {
    const s = String(d || '');
    return s.includes('T') ? s.split('T')[0] : s;
  }

  const handleSaveContact = () => {
    const name = formName.trim();
    if (!name) {
      showToast('Please enter at least Name / Company.', 'error');
      return;
    }

    const newItem: ContactMaster = {
      id: editId || Date.now(),
      name,
      type: formType,
      contactPerson: formPerson.trim(),
      email: formEmail.trim(),
      phone: formPhone.trim(),
      tin: formTin.trim(),
      address: formAddress.trim(),
      terms: formTerms.trim(),
      creditLimit: parseNum(formCreditLimit),
      vatType: formVatType,
      status: formStatus,
      notes: formNotes.trim(),
      createdAt: new Date().toISOString()
    };

    let nextList = [...manualContacts];
    if (editId) {
      nextList = nextList.map(c => String(c.id) === String(editId) ? newItem : c);
      showToast('Contact information updated.', 'success');
    } else {
      nextList = [newItem, ...nextList];
      showToast('Master contact successfully registered.', 'success');
    }

    setManualInventory(nextList);
    localStorage.setItem('stratify_contacts', JSON.stringify(nextList));
    closeDrawer();
  };

  const handleEdit = (item: ContactMaster) => {
    setEditId(item.id);
    setFormName(item.name || '');
    setFormType(item.type || 'Client');
    setFormPerson(item.contactPerson || '');
    setFormEmail(item.email || '');
    setFormPhone(item.phone || '');
    setFormTin(item.tin || '');
    setFormAddress(item.address || '');
    setFormTerms(item.terms || '');
    setFormCreditLimit(String(item.creditLimit || 0));
    setFormVatType(item.vatType || 'VAT Registered');
    setFormStatus(item.status || 'Active');
    setFormNotes(item.notes || '');
    
    setIsDrawerOpen(true);
  };

  const handleDelete = (id: number | string) => {
    const nextList = manualContacts.filter(c => String(c.id) !== String(id));
    setManualInventory(nextList);
    localStorage.setItem('stratify_contacts', JSON.stringify(nextList));
    showToast('Contact removed from manual registry.', 'success');
  };

  const closeDrawer = () => {
    setIsDrawerOpen(false);
    setEditId(null);
    setFormName('');
    setFormType('Client');
    setFormPerson('');
    setFormEmail('');
    setFormPhone('');
    setFormTin('');
    setFormAddress('');
    setFormTerms('');
    setFormCreditLimit('');
    setFormVatType('VAT Registered');
    setFormStatus('Active');
    setFormNotes('');
  };

  // Filter
  const filtered = finalContacts.filter(row => {
    // Type tab match
    const typeMatch = row.type === activeTab || (row.type === 'Client & Supplier' && (activeTab === 'Client' || activeTab === 'Supplier'));
    if (!typeMatch) return false;

    // Status filter
    if (statusFilter !== 'All' && row.status !== statusFilter) return false;

    // Query match
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const fields = [
        row.name,
        row.contactPerson,
        row.email,
        row.phone,
        row.tin,
        row.address,
        row.notes
      ].join(' ').toLowerCase();
      return fields.includes(q);
    }
    return true;
  });

  const clientsCount = finalContacts.filter(r => r.type === 'Client' || r.type === 'Client & Supplier').length;
  const payorsCount = finalContacts.filter(r => r.type === 'Payor').length;
  const suppliersCount = finalContacts.filter(r => r.type === 'Supplier' || r.type === 'Client & Supplier').length;
  
  const totalAR = finalContacts.reduce((sum, r) => sum + r2(parseNum(r.sales)), 0);
  const totalAP = finalContacts.reduce((sum, r) => sum + r2(parseNum(r.purchases)), 0);

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
      className="space-y-6 relative"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white font-sans">👥 Master Client & Supplier CRM</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Master database of business contacts, credit lines, default tax classes, and trade histories.</p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button 
            onClick={() => {
              setFormType(activeTab === 'Client' ? 'Client' : activeTab === 'Supplier' ? 'Supplier' : 'Payor');
              setIsDrawerOpen(true);
            }}
            className="flex items-center gap-2 text-xs bg-zinc-900 hover:bg-zinc-800 text-white font-bold px-4 py-2.5 rounded-xl transition-colors shadow-sm focus:outline-none"
          >
            <Plus className="w-4 h-4" />
            <span>Add Master Contact</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div variants={itemVariants} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl flex items-start justify-between shadow-sm">
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Active Clients</span>
            <div className="text-lg font-extrabold text-zinc-800 dark:text-zinc-100">{clientsCount}</div>
            <div className="text-xs text-zinc-400 font-medium">Customer accounts logged</div>
          </div>
          <div className="bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 p-2.5 rounded-xl">
            <Users className="w-5 h-5" />
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl flex items-start justify-between shadow-sm">
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Master Customers / Payors</span>
            <div className="text-lg font-extrabold text-zinc-800 dark:text-zinc-100">{payorsCount}</div>
            <div className="text-xs text-zinc-400 font-medium">Other customers and cash references</div>
          </div>
          <div className="bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 p-2.5 rounded-xl">
            <Tag className="w-5 h-5" />
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl flex items-start justify-between shadow-sm">
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Master Suppliers</span>
            <div className="text-lg font-extrabold text-zinc-800 dark:text-zinc-100">{suppliersCount}</div>
            <div className="text-xs text-zinc-400 font-medium">Vendor and resource lines</div>
          </div>
          <div className="bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 p-2.5 rounded-xl">
            <Building className="w-5 h-5" />
          </div>
        </motion.div>

        {activeTab === 'Supplier' ? (
          <motion.div variants={itemVariants} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl flex items-start justify-between shadow-sm">
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Total Accounts Payable (AP)</span>
              <div className="text-lg font-extrabold text-rose-600 dark:text-rose-400">{displayMoney(totalAP)}</div>
              <div className="text-xs text-zinc-400 font-medium">Kabuuang utang sa lahat ng suppliers</div>
            </div>
            <div className="bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 p-2.5 rounded-xl">
              <TrendingDown className="w-5 h-5" />
            </div>
          </motion.div>
        ) : (
          <motion.div variants={itemVariants} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl flex items-start justify-between shadow-sm">
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Total Accounts Receivable (AR)</span>
              <div className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">{displayMoney(totalAR)}</div>
              <div className="text-xs text-zinc-400 font-medium">Kabuuang utang ng lahat ng customer</div>
            </div>
            <div className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 p-2.5 rounded-xl">
              <TrendingUp className="w-5 h-5" />
            </div>
          </motion.div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-2">
        <div className="flex border-b border-zinc-100 dark:border-zinc-800 w-full sm:w-auto">
          {(['Client', 'Payor', 'Supplier'] as const).map(tab => {
            const tabLabel = tab === 'Payor' ? 'Customers / Payors' : tab === 'Supplier' ? 'Vendors / Suppliers' : 'Clients';
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-5 py-3 text-xs font-bold border-b-2 uppercase tracking-wider transition-colors ${
                  activeTab === tab
                    ? 'border-blue-400 text-blue-500'
                    : 'border-transparent text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200'
                }`}
              >
                {tabLabel}
              </button>
            );
          })}
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input 
              type="text" 
              placeholder="Search CRM register..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-10 pr-4 py-2 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-blue-400"
            />
          </div>
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-zinc-800 dark:text-zinc-200 focus:outline-none"
          >
            <option value="All">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
            <option value="Blocked">Blocked</option>
          </select>
        </div>
      </div>

      <motion.div variants={itemVariants} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1200px]">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-950/60 border-b border-zinc-100 dark:border-zinc-800 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                <th className="px-5 py-3 w-32 text-center">Actions</th>
                <th className="px-5 py-3">Company Name / Contact</th>
                <th className="px-5 py-3">Authorized Person</th>
                <th className="px-5 py-3">Email Address</th>
                <th className="px-5 py-3">Phone</th>
                <th className="px-5 py-3">TIN No</th>
                <th className="px-5 py-3 max-w-[200px]">Address</th>
                <th className="px-5 py-3 text-center">Terms</th>
                <th className="px-5 py-3">Tax Class</th>
                <th className="px-5 py-3 text-right">Ledger Sales</th>
                <th className="px-5 py-3 text-right">Ledger Purchases</th>
                <th className="px-5 py-3">Last Transaction</th>
                <th className="px-5 py-3">Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-xs">
              {filtered.length ? filtered.map(c => (
                <tr key={c.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/10 transition-colors">
                  <td className="px-5 py-3.5 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button 
                        onClick={() => handleEdit(c)}
                        disabled={c.source === 'Ledger'}
                        className={`p-1.5 rounded-lg border shadow-sm transition-all ${
                          c.source === 'Ledger'
                            ? 'opacity-40 text-zinc-300 border-zinc-100 dark:border-zinc-800 cursor-not-allowed'
                            : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 border-transparent hover:border-zinc-200 dark:hover:border-zinc-700'
                        }`}
                        title={c.source === 'Ledger' ? 'Ledger-generated entries cannot be edited manually' : 'Edit profile'}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => handleDelete(c.id)}
                        disabled={c.source === 'Ledger'}
                        className={`p-1.5 rounded-lg border shadow-sm transition-all ${
                          c.source === 'Ledger'
                            ? 'opacity-40 text-zinc-300 border-zinc-100 dark:border-zinc-800 cursor-not-allowed'
                            : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 border-transparent hover:border-zinc-200 dark:hover:border-zinc-700'
                        }`}
                        title={c.source === 'Ledger' ? 'Ledger-generated entries cannot be deleted' : 'Delete profile'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 font-bold text-zinc-800 dark:text-zinc-200">
                    <div className="flex flex-col">
                      <span>{c.name}</span>
                      <span className="text-[10px] text-zinc-400 font-medium">Type: {c.type}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 font-semibold text-zinc-700 dark:text-zinc-300">{c.contactPerson || '—'}</td>
                  <td className="px-5 py-3.5 font-medium text-zinc-600 dark:text-zinc-400">{c.email || '—'}</td>
                  <td className="px-5 py-3.5 text-zinc-500 font-medium">{c.phone || '—'}</td>
                  <td className="px-5 py-3.5 font-mono font-medium text-zinc-400">{c.tin || '—'}</td>
                  <td className="px-5 py-3.5 text-zinc-500 max-w-[200px] truncate" title={c.address}>{c.address || '—'}</td>
                  <td className="px-5 py-3.5 text-center font-bold text-zinc-500">{c.terms || '—'}</td>
                  <td className="px-5 py-3.5 text-zinc-400">{c.vatType || '—'}</td>
                  <td className="px-5 py-3.5 text-right font-bold font-mono text-emerald-600 dark:text-emerald-400">{displayMoney(c.sales || 0)}</td>
                  <td className="px-5 py-3.5 text-right font-bold font-mono text-red-500">{displayMoney(c.purchases || 0)}</td>
                  <td className="px-5 py-3.5 font-semibold text-zinc-600">{c.lastTxn || '—'}</td>
                  <td className="px-5 py-3.5"><span className="badge-soft">{c.source || 'Manual'}</span></td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={13} className="px-5 py-8 text-center text-zinc-400 dark:text-zinc-500 italic">No master {activeTab.toLowerCase()} records match your current criteria.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* CRM SLIDE-OVER DRAWER */}
      <AnimatePresence>
        {isDrawerOpen && (
          <>
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={closeDrawer}
              className="fixed inset-0 bg-zinc-950/80 z-[100] backdrop-blur-sm"
            />
            {/* Content Drawer */}
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.22 }}
              className="fixed right-0 top-0 bottom-0 w-full sm:max-w-md bg-white dark:bg-zinc-900 shadow-2xl border-l border-zinc-200 dark:border-zinc-800 z-[101] overflow-y-auto flex flex-col justify-between"
            >
              <div>
                <div className="bg-zinc-900 text-white p-5 flex items-center justify-between border-b border-zinc-800">
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider">{editId ? 'Edit Master Record' : `Add Master ${activeTab}`}</h3>
                    <p className="text-[10px] text-zinc-400 mt-1">Configure default billing codes and address fields for rapid ledger entries.</p>
                  </div>
                  <button 
                    onClick={closeDrawer}
                    className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-5 space-y-4 text-left">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Name / Company</label>
                    <input 
                      type="text" 
                      placeholder="ABC Enterprise Inc."
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      className="w-full text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2.5 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-blue-400"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Record Type</label>
                      <select 
                        value={formType}
                        onChange={(e: any) => setFormType(e.target.value)}
                        className="w-full text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2.5 text-zinc-800 dark:text-zinc-200 focus:outline-none"
                      >
                        <option value="Client">Client</option>
                        <option value="Payor">Customer / Payor</option>
                        <option value="Supplier">Supplier</option>
                        <option value="Client & Supplier">Client & Supplier</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Contact Person</label>
                      <input 
                        type="text" 
                        placeholder="Juana Dela Cruz"
                        value={formPerson}
                        onChange={(e) => setFormPerson(e.target.value)}
                        className="w-full text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2.5 text-zinc-800 dark:text-zinc-200 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Email Address</label>
                      <input 
                        type="email" 
                        placeholder="billing@company.com"
                        value={formEmail}
                        onChange={(e) => setFormEmail(e.target.value)}
                        className="w-full text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2.5 text-zinc-800 dark:text-zinc-200 focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Phone Number</label>
                      <input 
                        type="text" 
                        placeholder="0917XXXXXXX"
                        value={formPhone}
                        onChange={(e) => setFormPhone(e.target.value)}
                        className="w-full text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2.5 text-zinc-800 dark:text-zinc-200 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Owner TIN No</label>
                      <input 
                        type="text" 
                        placeholder="000-000-000-000"
                        value={formTin}
                        onChange={(e) => setFormTin(e.target.value)}
                        className="w-full text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2.5 text-zinc-800 dark:text-zinc-200 focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Payment Terms</label>
                      <input 
                        type="text" 
                        placeholder="COD / 30 Days"
                        value={formTerms}
                        onChange={(e) => setFormTerms(e.target.value)}
                        className="w-full text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2.5 text-zinc-800 dark:text-zinc-200 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Registered Address</label>
                    <input 
                      type="text" 
                      placeholder="123 Corporate Ave, Makati City"
                      value={formAddress}
                      onChange={(e) => setFormAddress(e.target.value)}
                      className="w-full text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2.5 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-blue-400"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Credit Limit (PHP)</label>
                      <input 
                        type="text" 
                        placeholder="0.00"
                        value={formCreditLimit}
                        onChange={(e) => setFormCreditLimit(e.target.value)}
                        className="w-full text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2.5 text-zinc-800 dark:text-zinc-200 focus:outline-none currency-input"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Default VAT Category</label>
                      <select 
                        value={formVatType}
                        onChange={(e: any) => setFormVatType(e.target.value)}
                        className="w-full text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2.5 text-zinc-800 dark:text-zinc-200 focus:outline-none"
                      >
                        <option value="VAT Registered">VAT Registered</option>
                        <option value="Non-VAT">Non-VAT</option>
                        <option value="Zero-Rated">Zero-Rated</option>
                        <option value="Exempt">Exempt</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Status</label>
                    <select 
                      value={formStatus}
                      onChange={(e: any) => setFormStatus(e.target.value)}
                      className="w-full text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2.5 text-zinc-800 dark:text-zinc-200 focus:outline-none"
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                      <option value="Blocked">Blocked</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Internal Notes</label>
                    <textarea 
                      placeholder="Special billing conditions or delivery limits..."
                      value={formNotes}
                      onChange={(e) => setFormNotes(e.target.value)}
                      rows={3}
                      className="w-full text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2.5 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-blue-400 resize-none"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-zinc-50 dark:bg-zinc-950/40 p-5 border-t border-zinc-100 dark:border-zinc-800 flex items-center gap-3">
                <button 
                  onClick={handleSaveContact}
                  className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-white font-bold py-3 text-xs rounded-xl transition-all shadow-sm"
                >
                  {editId ? 'Update Record' : 'Save Record'}
                </button>
                <button 
                  onClick={closeDrawer}
                  className="flex-1 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 font-bold py-3 text-xs border border-zinc-200 dark:border-zinc-800 rounded-xl transition-all shadow-sm"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
