import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bot, 
  Send, 
  X, 
  Sparkles, 
  TrendingUp, 
  TrendingDown, 
  FileText, 
  HelpCircle, 
  ArrowRight,
  RefreshCw,
  Zap
} from 'lucide-react';
import { LedgerEntry } from '../types';
import { r2, parseNum, inPeriod } from '../utils/helpers';

interface AICopilotProps {
  isOpen: boolean;
  onClose: () => void;
  ledger: LedgerEntry[];
  companyName: string;
  yearFilter: string;
  monthFilter: string;
  quarterFilter: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const renderMessageContent = (content: string) => {
  const lines = content.split('\n');
  return (
    <div className="space-y-1">
      {lines.map((line, idx) => {
        // Check if line is empty
        if (!line.trim()) {
          return <div key={idx} className="h-1.5" />;
        }

        // Check for bullet list item
        const isBullet = line.trim().startsWith('-') || line.trim().startsWith('*');
        const isNumbered = /^\d+\.\s/.test(line.trim());
        
        let cleanLine = line;
        if (isBullet) {
          cleanLine = line.trim().replace(/^[-*]\s+/, '');
        } else if (isNumbered) {
          cleanLine = line.trim().replace(/^\d+\.\s+/, '');
        }

        // Parse bold text: **text**
        const parts: React.ReactNode[] = [];
        let currentText = cleanLine;
        let keyCounter = 0;
        
        while (currentText.includes('**')) {
          const startIndex = currentText.indexOf('**');
          const endIndex = currentText.indexOf('**', startIndex + 2);
          
          if (endIndex === -1) break; // unmatched asterisks
          
          // text before bold
          if (startIndex > 0) {
            parts.push(<span key={`text-${keyCounter++}`}>{currentText.slice(0, startIndex)}</span>);
          }
          
          // bold text
          const boldText = currentText.slice(startIndex + 2, endIndex);
          parts.push(
            <strong key={`bold-${keyCounter++}`} className="font-extrabold text-zinc-950 dark:text-white">
              {boldText}
            </strong>
          );
          
          currentText = currentText.slice(endIndex + 2);
        }
        
        if (currentText.length > 0) {
          parts.push(<span key={`text-${keyCounter++}`}>{currentText}</span>);
        }

        if (isBullet) {
          return (
            <div key={idx} className="flex items-start gap-1.5 pl-2 my-0.5">
              <span className="text-indigo-500 shrink-0 mt-1">•</span>
              <span className="text-zinc-800 dark:text-zinc-200">{parts}</span>
            </div>
          );
        }
        
        if (isNumbered) {
          const match = line.trim().match(/^(\d+)\.\s/);
          const num = match ? match[1] : '1';
          return (
            <div key={idx} className="flex items-start gap-1.5 pl-2 my-0.5">
              <span className="text-indigo-500 font-mono font-bold shrink-0 text-[10px] mt-0.5">{num}.</span>
              <span className="text-zinc-800 dark:text-zinc-200">{parts}</span>
            </div>
          );
        }

        // Check if header line (starts with #)
        if (line.trim().startsWith('###')) {
          return (
            <h4 key={idx} className="font-bold text-zinc-950 dark:text-white text-xs mt-3 mb-1 uppercase tracking-wider">
              {parts}
            </h4>
          );
        }
        if (line.trim().startsWith('##')) {
          return (
            <h3 key={idx} className="font-extrabold text-zinc-950 dark:text-white text-sm mt-4 mb-1.5 uppercase tracking-wide border-b border-zinc-100 dark:border-zinc-800 pb-1">
              {parts}
            </h3>
          );
        }

        return (
          <p key={idx} className="my-0.5 text-zinc-800 dark:text-zinc-200">
            {parts}
          </p>
        );
      })}
    </div>
  );
};

export const AICopilot: React.FC<AICopilotProps> = ({
  isOpen,
  onClose,
  ledger,
  companyName,
  yearFilter,
  monthFilter,
  quarterFilter
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `Mabuhay! I am your **Stratify AI Copilot**, your professional CPA and strategic financial analyst. 

I've automatically synchronized with your current Ledger and filters. What can I help you analyze today?`,
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Compute live ledger summary to feed to server
  const ledgerSummary = React.useMemo(() => {
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

    return {
      totalSalesGross,
      totalSalesNet,
      totalPurchGross,
      totalPurchNet,
      costOfSales,
      operatingExpenses,
      grossProfit,
      netIncome,
      outputVat,
      inputVat,
      netVat,
      totalCash,
      activeTransactionsCount: filteredRows.length
    };
  }, [ledger, yearFilter, monthFilter, quarterFilter]);

  const handleSend = async (textToSend?: string) => {
    const msgText = (textToSend || input).trim();
    if (!msgText || isLoading) return;

    if (!textToSend) setInput('');

    const userMsg: Message = {
      id: Math.random().toString(),
      role: 'user',
      content: msgText,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const apiMessages = [...messages, userMsg].map(m => ({
        role: m.role,
        content: m.content
      }));

      const res = await fetch('/api/ai-copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: apiMessages,
          ledgerSummary,
          companyName
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Server error');
      }

      const data = await res.json();

      setMessages(prev => [...prev, {
        id: Math.random().toString(),
        role: 'assistant',
        content: data.content,
        timestamp: new Date()
      }]);
    } catch (error: any) {
      setMessages(prev => [...prev, {
        id: Math.random().toString(),
        role: 'assistant',
        content: `⚠️ **System Error**: ${error.message || 'Failed to connect to the AI service. Please make sure the Gemini API key is configured.'}`,
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: `Mabuhay! I've cleared our chat history. How can I help you analyze **${companyName}** today?`,
        timestamp: new Date()
      }
    ]);
  };

  const quickPrompts = [
    { label: '📊 Analyze Financial Health', text: 'Please analyze our current financial health based on our net income, profit margins, and transaction volumes.' },
    { label: '💡 Tax Optimization Tips', text: 'What legal strategies can we implement in the Philippines to minimize taxes and optimize Form 2307 / withholding taxes?' },
    { label: '📈 Cash Flow Trends', text: 'Give me a summary projection or cash flow trend assessment based on our recorded cash collections.' },
    { label: '🔍 Explain Form 2307 ATCs', text: 'Explain BIR Form 2307, the most common Alphanumeric Tax Codes (ATCs) like WI158 or WI160, and their tax rates.' }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-zinc-950 z-[190] no-print"
          />

          {/* AI Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 z-[200] shadow-2xl flex flex-col no-print"
          >
            {/* Header */}
            <div className="p-4 border-b border-zinc-100 dark:border-zinc-800/80 bg-zinc-50 dark:bg-zinc-950/60 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-zinc-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                    Stratify AI Copilot
                    <span className="text-[8px] bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 px-1.5 py-0.5 rounded-full font-mono">CPA v3.5</span>
                  </h3>
                  <p className="text-[10px] text-zinc-400 font-mono uppercase tracking-tight">{companyName}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button 
                  onClick={clearChat}
                  title="Clear Chat History"
                  className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
                <button 
                  onClick={onClose}
                  className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Live Synchronized Indicator */}
            <div className="bg-emerald-500/5 dark:bg-emerald-500/10 border-b border-emerald-500/10 dark:border-emerald-500/20 py-1.5 px-4 flex items-center justify-between text-[10px] font-mono text-emerald-600 dark:text-emerald-400">
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                LIVE LEDGER FEED ONLINE
              </span>
              <span>FILTER: {monthFilter}/{yearFilter}</span>
            </div>

            {/* Conversation Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-zinc-50/50 dark:bg-zinc-950/20">
              {messages.map((msg) => (
                <div 
                  key={msg.id} 
                  className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}
                >
                  {/* Avatar */}
                  {msg.role === 'assistant' && (
                    <div className="w-6 h-6 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0 border border-indigo-500/20 mt-1">
                      <Sparkles className="w-3 h-3" />
                    </div>
                  )}

                  {/* Bubble */}
                  <div className={`p-3 rounded-2xl text-xs leading-relaxed border ${
                    msg.role === 'user' 
                      ? 'bg-indigo-600 text-white border-indigo-600 rounded-tr-none font-medium' 
                      : 'bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 border-zinc-100 dark:border-zinc-800/80 rounded-tl-none shadow-sm'
                  }`}>
                    {/* Render helper-styled markdown */}
                    <div className="whitespace-pre-wrap select-text font-normal">
                      {renderMessageContent(msg.content)}
                    </div>
                    <span className={`block text-[8px] mt-1.5 font-mono text-right ${msg.role === 'user' ? 'text-indigo-200' : 'text-zinc-400'}`}>
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex gap-3 max-w-[80%]">
                  <div className="w-6 h-6 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0 border border-indigo-500/20 mt-1 animate-spin">
                    <RefreshCw className="w-3 h-3" />
                  </div>
                  <div className="bg-white dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 border border-zinc-100 dark:border-zinc-800/80 p-3 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2">
                    <span className="flex gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="h-1.5 w-1.5 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="h-1.5 w-1.5 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </span>
                    <span className="text-[10px] font-mono uppercase tracking-wider">AI_CALCULATING...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Bottom Controls / Quick Prompts */}
            <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/60 space-y-3">
              {messages.length === 1 && (
                <div className="space-y-1.5">
                  <p className="text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest flex items-center gap-1">
                    <Zap className="w-3 h-3 text-indigo-500" />
                    Quick Strategic Analyses
                  </p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {quickPrompts.map((p, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSend(p.text)}
                        className="p-2 text-left bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/60 rounded-xl hover:border-indigo-500 hover:shadow-sm text-[10px] font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition-all duration-200 leading-tight"
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Chat Input */}
              <form 
                onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask Stratify AI anything..."
                  disabled={isLoading}
                  className="flex-1 px-4 py-2.5 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-sm"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="p-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-200 dark:disabled:bg-zinc-800 text-white disabled:text-zinc-400 dark:disabled:text-zinc-600 rounded-xl transition-all shadow-md shadow-indigo-500/10 hover:shadow-indigo-500/20 shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
