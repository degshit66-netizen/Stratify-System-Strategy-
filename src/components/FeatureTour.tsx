import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  ArrowRight, 
  X, 
  ChevronRight, 
  BookOpen, 
  HelpCircle, 
  MessageSquare, 
  Send, 
  Info, 
  Compass, 
  Layers, 
  Laptop, 
  Fingerprint, 
  Terminal,
  FileSpreadsheet,
  Printer
} from 'lucide-react';
import type { ActiveTab } from '../App';

interface FeatureTourProps {
  onComplete: () => void;
  onTabChange: (tab: ActiveTab) => void;
}

// Fixed Onboarding steps
const steps: { title: string; description: string; tab: ActiveTab; highlightText: string }[] = [
  {
    title: 'Welcome to STRATIFY AI Onboarding!',
    description: 'I am your interactive AI System Teacher. I will guide you step-by-step through the layout, compliance features, and active buttons. Let\'s make accounting simple!',
    tab: 'Dashboard',
    highlightText: 'This is your overall financial performance dashboard.'
  },
  {
    title: 'BIR-Compliant Ledger & Journal',
    description: 'Manage double-entry transactions. Use the "Print Registry" button to generate actual physical BIR-compliant journals, or use "Lock Status Manager" to secure periods.',
    tab: 'Ledger',
    highlightText: 'Look at the "Print Registry" and "Lock Status Manager" buttons.'
  },
  {
    title: 'Sales & VAT Invoicing',
    description: 'Capture sales transactions and compute Output VAT. Click "Print Report" to extract print-ready accounts receivable records and tax receipts.',
    tab: 'Sales',
    highlightText: 'Look at the green "Add Sales Invoice" and dark "Print Report" buttons.'
  },
  {
    title: 'Purchases & Expense OCR',
    description: 'Log supplier disbursements and Input VAT. Try "Scan Receipt" to upload supplier receipts; our built-in AI scanner extracts values automatically!',
    tab: 'Purchases',
    highlightText: 'Look at the "Scan Receipt" OCR and "Add Purchase" buttons.'
  },
  {
    title: 'POS Terminal & Retail Shop',
    description: 'Launch the offline-ready Point of Sale (POS) terminal to scan items, handle checkout, and generate cash receipts instantly.',
    tab: 'Ecommerce',
    highlightText: 'Look at the "Launch POS Terminal" and "Digital Catalog" controls.'
  },
  {
    title: 'Automated Payroll & SSS/Tax',
    description: 'Automate complex salary computations, withholdings, and PhilHealth/SSS contributions, then print clean payslips instantly.',
    tab: 'Payroll',
    highlightText: 'Look at the "Run Automated Payroll" and "Salary Matrix" buttons.'
  },
  {
    title: 'HR Employee Files & Leaves',
    description: 'Keep secure employee logs, position details, and track leaves, sick times, and digital onboarding workflows.',
    tab: 'HR',
    highlightText: 'Look at the "Add Employee" and "Leave Tracker" modules.'
  }
];

// Screen button explainer dictionary
interface ButtonGuide {
  name: string;
  actionDesc: string;
  tip: string;
}

const screenButtonGuides: Record<ActiveTab, ButtonGuide[]> = {
  Dashboard: [
    { name: 'Post Entry Button', actionDesc: 'Launches the journal ledger entry sheet.', tip: 'Use this to record new sales, operating expenses, capital injections, or manual journals.' },
    { name: 'FY Filter Select', actionDesc: 'Switches the fiscal year of all visual charts.', tip: 'This recalculates your comparative charts and BIR books dynamically.' },
    { name: 'System Settings (Gear)', actionDesc: 'Opens company configuration, PWA installer, and team seats.', tip: 'Go here to configure your SEC permit, TIN number, and install the native PWA app.' },
    { name: 'Notifications (Bell)', actionDesc: 'Shows automatic compliance warnings and task deadlocks.', tip: 'Keeps you updated on trial status, upcoming BIR filing dates, and payroll runs.' }
  ],
  Ledger: [
    { name: 'Print Registry', actionDesc: 'Generates beautifully-spaced physical print layouts for books of accounts.', tip: 'In compliance with BIR regulations, use this button to print your General Ledger journals.' },
    { name: 'Lock Status Manager', actionDesc: 'Secures and freezes specific fiscal periods against modifications.', tip: 'Once audited, lock the month! Retrospective edits require the secure 4-digit PIN.' },
    { name: 'Void / Edit / Delete', actionDesc: 'Manages ledger entry items in the data table row.', tip: 'You cannot edit or void transactions in locked months without administrative PIN clearance.' }
  ],
  Sales: [
    { name: 'Add Sales Invoice', actionDesc: 'Opens invoice recorder for clients and products.', tip: 'Calculates the 12% Output VAT automatically to keep tax declarations BIR-compliant.' },
    { name: 'Print Report', actionDesc: 'Generates a clean PDF summary of filtered client invoices.', tip: 'Perfect for sharing accounts receivable reviews with your directors.' }
  ],
  Purchases: [
    { name: 'Scan Receipt (OCR)', actionDesc: 'Launches receipt image processing model.', tip: 'Upload a picture of any receipt; the AI automatically extracts date, gross, and VAT!' },
    { name: 'Add Purchase', actionDesc: 'Records cash disbursements and Input VAT credits.', tip: 'This feeds your general ledger cash flow and reduces your net payable VAT.' }
  ],
  Ecommerce: [
    { name: 'Launch POS Terminal', actionDesc: 'Opens full-screen cash register workspace.', tip: 'The POS operates with offline sync! Cache holds sales if internet drops.' },
    { name: 'Add Product Item', actionDesc: 'Registers new stock, bar codes, and VAT attributes.', tip: 'This connects your inventory tracker with POS checkouts automatically.' }
  ],
  Payroll: [
    { name: 'Run Automated Payroll', actionDesc: 'Batch computes SSS, PhilHealth, Pag-IBIG, and withholding taxes.', tip: 'Saves hours of manual Excel work; generates individual printable payslips.' },
    { name: 'Salary Matrix Settings', actionDesc: 'Defines hourly, monthly, and tax status settings.', tip: 'Sets up the base rate per position for single-click computation.' }
  ],
  HR: [
    { name: 'Add Employee File', actionDesc: 'Creates unified profiles with job status and files.', tip: 'Keep digital contracts, tax classifications, and IDs on a secure cloud database.' },
    { name: 'Leave Management Tracker', actionDesc: 'Processes vacation, sick, and maternity approvals.', tip: 'Balances are computed automatically per employee contract.' }
  ],
  Reconciliation: [
    { name: 'Match Transactions', actionDesc: 'Reconciles bank statement lines with General Ledger records.', tip: 'Crucial for auditing. Ensures cash-in-bank matches book values.' }
  ],
  FixedAssets: [
    { name: 'Add Asset', actionDesc: 'Records physical property, plant, or equipment.', tip: 'Automatically computes monthly straight-line depreciation for books of accounts.' }
  ],
  Inventory: [
    { name: 'Track Quantity', actionDesc: 'Monitors minimum reorder points and asset valuations.', tip: 'Alerts you if items drop below safe threshold quantities.' }
  ],
  Contacts: [
    { name: 'Add Contact', actionDesc: 'Registers suppliers, clients, or third-party contractors.', tip: 'Pre-populates fields during sales invoicing or purchase receipt logging.' }
  ],
  Scheduler: [
    { name: 'Create Task', actionDesc: 'Schedules BIR filings, tax deadlines, or internal payroll alerts.', tip: 'Fires notification alarms when tasks are near due status.' }
  ],
  Quotation: [
    { name: 'Generate Proposal', actionDesc: 'Builds formal customer price proposals.', tip: 'One-click convert proposals directly into sales invoices!' }
  ],
  Reports: [
    { name: 'Download PDF Reports', actionDesc: 'Generates balance sheets, income statements, and trial balances.', tip: 'Formats financial statements according to GAAP standard compliance.' }
  ],
  Books: [
    { name: 'BIR Books Binder', actionDesc: 'Binds loose-leaf accounting sheets for registration.', tip: 'Exports journals in correct legal sequence for direct BIR submission.' }
  ],
  FS: [
    { name: 'Print FS Documents', actionDesc: 'Prepares official audit-ready financial statements.', tip: 'Ensures optimal typography contrast on landscape and portrait paper layouts.' }
  ],
  COA: [
    { name: 'Customize Chart of Accounts', actionDesc: 'Edits the corporate accounting code framework.', tip: 'Add assets, liabilities, equities, revenues, or expenses according to business type.' }
  ],
  AuditTrail: [
    { name: 'View Audit logs', actionDesc: 'Displays complete database history, showing who created, edited, or deleted records.', tip: 'Maintains airtight security logs to prevent fraudulent internal bookkeeping.' }
  ]
};

// Conversational AI Answers for common topics
const aiKnowledgeBase: { keywords: string[]; answer: string; title: string }[] = [
  {
    keywords: ['print', 'bir', 'books', 'pdf', 'registry', 'accounts'],
    title: 'How to Print BIR-Compliant Books of Accounts',
    answer: 'To print BIR-compliant journals: 1. Navigate to the **Ledger** or **Books** tab. 2. Filter the dates to your desired period. 3. Click **"Print Registry"** or **"BIR Books Binder"**. 4. The system triggers a clean black-and-white layout, hiding all buttons and navbars to fit perfectly on legal loose-leaf sheets.'
  },
  {
    keywords: ['offline', 'internet', 'lost', 'sync', 'wifi'],
    title: 'How STRATIFY Offline Sync Works',
    answer: 'STRATIFY is built with **Firestore Local Caching**. If internet fails, you can continue posting ledger journals, processing POS checkouts, and updating records. The system stores everything locally in a persistent sandbox and automatically uploads and merges all entries to Google Cloud as soon as internet connection is restored.'
  },
  {
    keywords: ['pwa', 'install', 'macbook', 'pc', 'android', 'iphone', 'tablet'],
    title: 'How to Install on Desktop & Mobile',
    answer: 'Go to **Settings** (Gear icon) -> **Install App & Offline**. You can click the **"Install App Now"** button directly. On iOS Safari, tap the **Share** button and select **"Add to Home Screen"**. On Android Chrome, tap the 3-dots menu and choose **"Install App"**.'
  },
  {
    keywords: ['void', 'edit', 'delete', 'pin', 'lock'],
    title: 'How to Void or Edit Transactions',
    answer: 'Go to the **Ledger** tab. Click the **Void** or **Edit** button on the transaction row. **Crucial:** If the transaction is from a past month that is locked, you must click **Lock Status Manager**, input your secure 4-digit organizational PIN, and temporarily unlock the period.'
  },
  {
    keywords: ['pos', 'terminal', 'checkout', 'receipt'],
    title: 'How to Run the POS & Cash Register',
    answer: 'Go to the **E-Commerce** tab, then click **"Launch POS Terminal"**. Select product cards to add items to your cart, apply discounts, select client profiles, and press **Checkout**. It prints real cash receipts and syncs Output VAT instantly.'
  },
  {
    keywords: ['payroll', 'salary', 'payslip', 'sss', 'philhealth'],
    title: 'How to Process Automated Payroll',
    answer: '1. Open the **Payroll** tab. 2. Ensure base rates are set in the **Salary Matrix**. 3. Click **"Run Automated Payroll"**. 4. The system computes base salary, overtime, and withholds SSS/PhilHealth/Pag-IBIG. 5. Click the print icon on any row to print standard payslips.'
  }
];

export const FeatureTour: React.FC<FeatureTourProps> = ({ onComplete, onTabChange }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isOpen, setIsOpen] = useState(true);
  const [activeAITab, setActiveAITab] = useState<'steps' | 'buttons' | 'chat'>('steps');
  
  // Chat state
  const [chatQuery, setChatQuery] = useState('');
  const [chatMessages, setChatMessages] = useState<{ sender: 'ai' | 'user'; text: string; title?: string }[]>([
    { sender: 'ai', text: 'Hello! I am your professional AI Teacher. Ask me anything about the buttons, BIR compliance, offline sync, or PWA guides!' }
  ]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const isDone = localStorage.getItem('feature_tour_completed');
    if (isDone) {
      setIsCompleted(true);
      setIsOpen(false);
    }
  }, []);

  useEffect(() => {
    if (activeAITab === 'chat') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, activeAITab]);

  const handleNextStep = () => {
    if (currentStep < steps.length - 1) {
      const next = currentStep + 1;
      setCurrentStep(next);
      onTabChange(steps[next].tab);
    } else {
      handleComplete();
    }
  };

  const handleComplete = () => {
    localStorage.setItem('feature_tour_completed', 'true');
    setIsCompleted(true);
    setIsOpen(false);
    onComplete();
  };

  const handleRestartTour = () => {
    localStorage.removeItem('feature_tour_completed');
    setIsCompleted(false);
    setCurrentStep(0);
    setIsOpen(true);
    setActiveAITab('steps');
    onTabChange(steps[0].tab);
  };

  const handleSendChat = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = chatQuery.trim().toLowerCase();
    if (!query) return;

    const userMsg = chatQuery;
    setChatMessages(prev => [...prev, { sender: 'user', text: userMsg }]);
    setChatQuery('');

    // Simulate AI thinking and reply
    setTimeout(() => {
      // Search keywords in AI knowledge base
      const match = aiKnowledgeBase.find(item => 
        item.keywords.some(keyword => query.includes(keyword))
      );

      if (match) {
        setChatMessages(prev => [...prev, { 
          sender: 'ai', 
          text: match.answer,
          title: match.title
        }]);
      } else {
        // Fallback generic smart compliance helper
        setChatMessages(prev => [...prev, { 
          sender: 'ai', 
          text: `Regarding "${userMsg}": To execute this process, select the corresponding module on the left navigation sidebar. Standard system buttons are equipped with tooltips. You can review manual settings in Settings (Gear icon) or ask me about specific topics like "BIR books", "offline sync", "install PWA", or "POS cash register"!` 
        }]);
      }
    }, 450);
  };

  const getCurrentActiveTabName = (): ActiveTab => {
    if (activeAITab === 'steps') {
      return steps[currentStep].tab;
    }
    // Try to inspect the sidebar active tab if stored (default to Dashboard)
    return steps[currentStep]?.tab || 'Dashboard';
  };

  const activeTabName = getCurrentActiveTabName();
  const currentTabButtons = screenButtonGuides[activeTabName] || [];

  return (
    <>
      {/* 1. FLOATING GLOWING AI ORB (Shown when minimized or tour is completed) */}
      {(!isOpen || isCompleted) && (
        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          whileHover={{ scale: 1.1, y: -4 }}
          onClick={() => {
            setIsOpen(true);
            setIsCompleted(false);
          }}
          className="fixed bottom-6 right-6 z-[250] w-14 h-14 bg-gradient-to-tr from-blue-950 via-indigo-600 to-indigo-500 hover:from-indigo-600 hover:to-blue-500 text-white rounded-full flex items-center justify-center shadow-2xl border border-indigo-400/30 animate-pulse no-print cursor-pointer"
          title="Open AI Interactive Tutor"
        >
          <Sparkles className="w-6 h-6 text-yellow-300" />
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-yellow-500"></span>
          </span>
        </motion.button>
      )}

      {/* 2. FULL INTERACTIVE AI TUTOR PANEL */}
      <AnimatePresence>
        {isOpen && !isCompleted && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-[250] w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col no-print"
            style={{ maxHeight: 'calc(100vh - 100px)' }}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-950 via-indigo-950 to-blue-950 text-white p-4.5 flex items-center justify-between border-b border-indigo-900">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-yellow-300">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-white flex items-center gap-1">
                    STRATIFY AI Tutor
                  </h3>
                  <p className="text-[10px] text-indigo-300">Professional Interactive System Guide</p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
                title="Minimize AI Tutor"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* AI Assistant Tabs */}
            <div className="flex bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 text-xs font-bold">
              <button
                onClick={() => setActiveAITab('steps')}
                className={`flex-1 py-3 px-1 border-b-2 transition-all flex items-center justify-center gap-1.5 ${
                  activeAITab === 'steps' 
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-zinc-900/50' 
                    : 'border-transparent text-zinc-400 hover:text-zinc-600'
                }`}
              >
                <Compass className="w-4 h-4" />
                <span>Onboarding Tour</span>
              </button>
              <button
                onClick={() => setActiveAITab('buttons')}
                className={`flex-1 py-3 px-1 border-b-2 transition-all flex items-center justify-center gap-1.5 ${
                  activeAITab === 'buttons' 
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-zinc-900/50' 
                    : 'border-transparent text-zinc-400 hover:text-zinc-600'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>Button explainer</span>
              </button>
              <button
                onClick={() => setActiveAITab('chat')}
                className={`flex-1 py-3 px-1 border-b-2 transition-all flex items-center justify-center gap-1.5 ${
                  activeAITab === 'chat' 
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-zinc-900/50' 
                    : 'border-transparent text-zinc-400 hover:text-zinc-600'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                <span>Ask AI Assistant</span>
              </button>
            </div>

            {/* Content Panes */}
            <div className="p-5 overflow-y-auto flex-1 min-h-[220px] max-h-[380px] bg-zinc-50/30 dark:bg-zinc-950/20 text-left">
              {/* Tab 1: Onboarding Tour steps */}
              {activeAITab === 'steps' && (
                <div className="space-y-4">
                  <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 rounded-2xl flex gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                      <Terminal className="w-4 h-4" />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[9px] uppercase tracking-wider font-extrabold text-indigo-600 dark:text-indigo-400">Step {currentStep + 1} of {steps.length} • {steps[currentStep].tab} Screen</span>
                      <h4 className="text-xs font-black text-zinc-800 dark:text-zinc-200">{steps[currentStep].title}</h4>
                    </div>
                  </div>

                  <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed min-h-[64px]">
                    {steps[currentStep].description}
                  </p>

                  <div className="bg-yellow-500/10 dark:bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-3 text-[11px] text-zinc-600 dark:text-zinc-300 flex gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 shrink-0 mt-1.5 animate-ping"></div>
                    <p>
                      <strong className="text-zinc-800 dark:text-zinc-100">Live Spotlight Highlight:</strong> {steps[currentStep].highlightText}
                    </p>
                  </div>

                  {/* Navigation dots */}
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex gap-1">
                      {steps.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            setCurrentStep(idx);
                            onTabChange(steps[idx].tab);
                          }}
                          className={`h-1.5 rounded-full transition-all ${idx === currentStep ? 'w-5 bg-indigo-600' : 'w-1.5 bg-zinc-300 dark:bg-zinc-800'}`}
                        />
                      ))}
                    </div>
                    <button
                      onClick={handleNextStep}
                      className="flex items-center gap-1 px-4.5 py-2.5 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
                    >
                      <span>{currentStep === steps.length - 1 ? 'Finish Tour' : 'Next Screen'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Tab 2: Button Explainer */}
              {activeAITab === 'buttons' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Buttons on "{activeTabName}" screen</span>
                    <span className="text-[9px] bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 px-2 py-0.5 rounded-full font-bold">Auto-Detected</span>
                  </div>

                  {currentTabButtons.length > 0 ? (
                    <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                      {currentTabButtons.map((btn, idx) => (
                        <div 
                          key={idx} 
                          className="p-3 bg-white dark:bg-zinc-900/60 border border-zinc-200/60 dark:border-zinc-800/60 rounded-2xl space-y-1 shadow-sm hover:border-indigo-400/50 transition-all"
                        >
                          <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                            <span className="text-xs font-extrabold text-zinc-900 dark:text-zinc-100">{btn.name}</span>
                          </div>
                          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed pl-3">
                            {btn.actionDesc}
                          </p>
                          <div className="pl-3 text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold flex items-start gap-1">
                            <Info className="w-3 h-3 shrink-0 mt-0.5" />
                            <span>Pro-Tip: {btn.tip}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-8 text-center text-zinc-400 italic">
                      <HelpCircle className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
                      <p className="text-xs">No special buttons defined for this module.</p>
                      <p className="text-[10px] text-zinc-500 mt-1">Navigate to Ledger, Sales, Purchases, or E-Commerce tabs to inspect their core active buttons!</p>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 3: Ask AI compliance assistant chat */}
              {activeAITab === 'chat' && (
                <div className="flex flex-col h-full min-h-[220px]">
                  <div className="space-y-3 flex-1 overflow-y-auto max-h-[240px] pr-1 pb-2">
                    {chatMessages.map((msg, idx) => (
                      <div 
                        key={idx} 
                        className={`flex flex-col max-w-[85%] ${msg.sender === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'}`}
                      >
                        {msg.title && (
                          <span className="text-[9px] font-bold uppercase tracking-wider text-indigo-500 mb-0.5 block">{msg.title}</span>
                        )}
                        <div className={`p-3 rounded-2xl text-[11px] leading-relaxed shadow-sm ${
                          msg.sender === 'user' 
                            ? 'bg-zinc-900 text-white rounded-br-none' 
                            : 'bg-white dark:bg-zinc-900 border border-zinc-200/75 dark:border-zinc-800/75 text-zinc-800 dark:text-zinc-200 rounded-bl-none'
                        }`}>
                          {msg.text}
                        </div>
                      </div>
                    ))}
                    <div ref={chatEndRef} />
                  </div>

                  {/* Suggestion tags */}
                  <div className="flex flex-wrap gap-1.5 py-2.5 border-t border-zinc-100 dark:border-zinc-800 mt-2 shrink-0">
                    <button 
                      onClick={() => { setChatQuery('How to print BIR books?'); setTimeout(() => handleSendChat(), 50); }}
                      className="text-[9px] bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 px-2 py-1 rounded-lg font-bold"
                    >
                      How to print BIR books?
                    </button>
                    <button 
                      onClick={() => { setChatQuery('How offline sync works?'); setTimeout(() => handleSendChat(), 50); }}
                      className="text-[9px] bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 px-2 py-1 rounded-lg font-bold"
                    >
                      How offline sync works?
                    </button>
                    <button 
                      onClick={() => { setChatQuery('How to install PWA on device?'); setTimeout(() => handleSendChat(), 50); }}
                      className="text-[9px] bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 px-2 py-1 rounded-lg font-bold"
                    >
                      PWA install guide
                    </button>
                  </div>

                  {/* Chat Input */}
                  <form onSubmit={handleSendChat} className="flex gap-2 shrink-0">
                    <input
                      type="text"
                      placeholder="Ask me a question..."
                      value={chatQuery}
                      onChange={(e) => setChatQuery(e.target.value)}
                      className="flex-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 dark:text-zinc-100"
                    />
                    <button
                      type="submit"
                      className="w-9 h-9 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl flex items-center justify-center shrink-0 shadow-md cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </form>
                </div>
              )}
            </div>

            {/* Footer / Reset Action */}
            <div className="bg-zinc-50 dark:bg-zinc-950 px-5 py-3 border-t border-zinc-200 dark:border-zinc-800 flex justify-between items-center shrink-0">
              <button
                onClick={handleRestartTour}
                className="text-[10px] font-bold text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 uppercase tracking-wider flex items-center gap-1 cursor-pointer"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Restart Tour</span>
              </button>
              <button
                onClick={handleComplete}
                className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 uppercase tracking-wider cursor-pointer"
              >
                Dismiss Tutor
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
