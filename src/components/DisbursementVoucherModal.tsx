import React from 'react';
import { X, Printer } from 'lucide-react';
import { LedgerEntry, CompanyConfig } from '../types';
import { displayMoney, formatCurrency, cleanDate } from '../utils/helpers';

interface DisbursementVoucherModalProps {
  isOpen: boolean;
  onClose: () => void;
  entry: LedgerEntry | null;
  companyConfig: CompanyConfig;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const DisbursementVoucherModal: React.FC<DisbursementVoucherModalProps> = ({
  isOpen,
  onClose,
  entry,
  companyConfig,
  showToast
}) => {
  if (!isOpen || !entry) return null;

  const handlePrint = () => {
    showToast('Opening Print Dialog... If your browser blocks it inside this iframe preview, please click the "Open in new tab" icon on the top right of the screen to print successfully!', 'info');
    window.print();
  };

  const dvNumber = `DV-${entry.year}-${String(entry.id).slice(-6)}`;
  
  // Double-entry representation for expense
  // Debit: Expense Account (category)
  // Credit: Cash / Bank Account (if COD/Cash) OR Accounts Payable (if Terms/ARAP)
  const debitAccountName = entry.category || 'Disbursement Expense';
  const debitAccountCode = entry.accountCode || '5000';
  
  const isCash = ['COD', 'Cash', 'COD (Cash Disbursed)', 'COD (Cash Received)'].includes(entry.terms || '');
  let apTerm = 'Accounts Payable';
  let apCode = '2010';
  if (entry.terms === 'Accounts Payable - Trade') { apTerm = entry.terms; apCode = '2012'; }
  else if (entry.terms === 'Accounts Payable - Non-Trade') { apTerm = entry.terms; apCode = '2013'; }
  else if (entry.terms === 'Accrued Expenses') { apTerm = entry.terms; apCode = '2014'; }

  const creditAccountName = isCash 
    ? 'Cash and Cash Equivalents' 
    : apTerm;
  const creditAccountCode = isCash 
    ? '1010' 
    : apCode;

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center overflow-y-auto bg-zinc-950/80 p-4 backdrop-blur-sm">
      {/* Screen Container */}
      <div className="relative w-full max-w-4xl bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl overflow-hidden flex flex-col no-print border border-zinc-200 dark:border-zinc-800">
        
        {/* Header toolbar */}
        <div className="bg-zinc-950 text-white px-6 py-4 flex items-center justify-between border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-blue-400" />
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider">BIR Compliance Voucher Preview</h3>
              <p className="text-[10px] text-zinc-400">Review and print this system-generated disbursement voucher.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="bg-blue-400 hover:bg-blue-300 text-zinc-950 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md"
            >
              <Printer className="w-4 h-4" />
              <span>Print Voucher</span>
            </button>
            <button 
              onClick={onClose}
              className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Voucher Preview Area */}
        <div className="p-8 overflow-y-auto bg-zinc-50 dark:bg-zinc-950/40 max-h-[70vh]">
          
          <div className="bg-white text-zinc-900 p-8 border border-zinc-300 rounded-2xl shadow-sm max-w-3xl mx-auto font-sans text-left">
            
            {/* Printable Document Sheet */}
            <div className="border-2 border-zinc-950 p-6 space-y-6">
              
              {/* Header */}
              <div className="flex justify-between items-start border-b-2 border-zinc-950 pb-4">
                <div>
                  <h4 className="text-sm font-extrabold tracking-wider uppercase">{companyConfig.companyName}</h4>
                  <p className="text-[10px] text-zinc-600 font-medium">{companyConfig.address}</p>
                  <p className="text-[10px] text-zinc-600 font-medium">TIN: {companyConfig.tin} {companyConfig.registeredVat ? '(VAT Registered)' : '(Non-VAT)'}</p>
                  <p className="text-[10px] text-zinc-500 italic mt-1">BIR Permit to Use: {companyConfig.ptuNo}</p>
                </div>
                <div className="text-right">
                  <h1 className="text-md font-black tracking-tight text-zinc-950 border-b border-zinc-950 pb-1 uppercase">Disbursement Voucher</h1>
                  <p className="text-[10px] font-bold text-zinc-800 mt-2">DV NO: <span className="font-mono text-xs">{dvNumber}</span></p>
                  <p className="text-[10px] font-bold text-zinc-800">DATE: <span className="font-mono text-xs">{cleanDate(entry.date)}</span></p>
                </div>
              </div>

              {/* Payee Info */}
              <div className="grid grid-cols-3 gap-2 text-xs border-b border-zinc-950 pb-4">
                <div className="col-span-2">
                  <span className="font-bold uppercase text-[9px] text-zinc-500 block">PAYEE NAME / SUPPLIER:</span>
                  <span className="font-bold text-zinc-900 text-sm">{entry.payor}</span>
                </div>
                <div>
                  <span className="font-bold uppercase text-[9px] text-zinc-500 block">TIN:</span>
                  <span className="font-mono font-bold text-zinc-800">{entry.tin || 'N/A'}</span>
                </div>
                <div className="col-span-3 mt-2">
                  <span className="font-bold uppercase text-[9px] text-zinc-500 block">ADDRESS:</span>
                  <span className="text-zinc-800 font-medium">{entry.address || 'Not Provided'}</span>
                </div>
              </div>

              {/* Explanation / Particulars */}
              <div className="space-y-2">
                <span className="font-bold uppercase text-[9px] text-zinc-500 block">PARTICULARS / EXPLANATION:</span>
                <div className="border border-zinc-950 min-h-[80px] p-3 text-xs text-zinc-800 bg-zinc-50/50">
                  <p className="font-bold text-zinc-950">{entry.particulars}</p>
                  <p className="text-[10px] text-zinc-500 mt-2 font-medium">Payment Terms: {entry.terms || 'COD'} | Status: {entry.status || 'Cleared'}</p>
                </div>
              </div>

              {/* Accounting Double-Entry Table */}
              <div className="space-y-1">
                <span className="font-bold uppercase text-[9px] text-zinc-500 block">ACCOUNTING DOUBLE ENTRY JOURNAL:</span>
                <table className="w-full border-collapse border border-zinc-950 text-xs">
                  <thead>
                    <tr className="bg-zinc-100 border-b border-zinc-950 font-bold uppercase text-[10px]">
                      <th className="border-r border-zinc-950 p-2 text-left w-1/2">Account Title & Code</th>
                      <th className="border-r border-zinc-950 p-2 text-right">Debit (₱)</th>
                      <th className="p-2 text-right">Credit (₱)</th>
                    </tr>
                  </thead>
                  <tbody className="font-mono">
                    <tr className="border-b border-zinc-300">
                      <td className="border-r border-zinc-950 p-2">
                        <span className="font-sans font-bold block">{debitAccountName}</span>
                        <span className="text-[10px] text-zinc-500">Account Code: {debitAccountCode} (Debit Account)</span>
                      </td>
                      <td className="border-r border-zinc-950 p-2 text-right font-bold">{formatCurrency(entry.taxable)}</td>
                      <td className="p-2 text-right text-zinc-400">-</td>
                    </tr>
                    {entry.vat > 0 && (
                      <tr className="border-b border-zinc-300">
                        <td className="border-r border-zinc-950 p-2">
                          <span className="font-sans font-bold block">Input Tax (12% VAT)</span>
                          <span className="text-[10px] text-zinc-500">Account Code: 1150 (Asset Account)</span>
                        </td>
                        <td className="border-r border-zinc-950 p-2 text-right font-bold">{formatCurrency(entry.vat)}</td>
                        <td className="p-2 text-right text-zinc-400">-</td>
                      </tr>
                    )}
                    <tr className="border-b border-zinc-950">
                      <td className="border-r border-zinc-950 p-2 pl-6">
                        <span className="font-sans font-bold block">{creditAccountName}</span>
                        <span className="text-[10px] text-zinc-500">Account Code: {creditAccountCode} (Credit Account)</span>
                      </td>
                      <td className="border-r border-zinc-950 p-2 text-right text-zinc-400">-</td>
                      <td className="p-2 text-right font-bold">{formatCurrency(entry.gross)}</td>
                    </tr>
                    <tr className="bg-zinc-50 font-bold text-[13px]">
                      <td className="border-r border-zinc-950 p-2 text-right font-sans uppercase">Total Double Entry:</td>
                      <td className="border-r border-zinc-950 p-2 text-right font-bold">{formatCurrency(entry.gross)}</td>
                      <td className="p-2 text-right font-bold">{formatCurrency(entry.gross)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Signatures Section */}
              <div className="grid grid-cols-3 border border-zinc-950 text-[10px] divide-x divide-zinc-950">
                <div className="p-3 space-y-8">
                  <span className="font-bold uppercase text-[8px] text-zinc-500 block">PREPARED BY:</span>
                  <div className="text-center">
                    <div className="border-b border-zinc-950 mx-auto w-3/4 h-5"></div>
                    <span className="text-[9px] font-bold text-zinc-700 block mt-1">Bookkeeper / Accountant</span>
                  </div>
                </div>
                <div className="p-3 space-y-8">
                  <span className="font-bold uppercase text-[8px] text-zinc-500 block">APPROVED FOR PAYMENT:</span>
                  <div className="text-center">
                    <div className="border-b border-zinc-950 mx-auto w-3/4 h-5"></div>
                    <span className="text-[9px] font-bold text-zinc-700 block mt-1">Authorized Officer / Manager</span>
                  </div>
                </div>
                <div className="p-3 space-y-8">
                  <span className="font-bold uppercase text-[8px] text-zinc-500 block">RECEIVED PAYMENT SIGNATURE:</span>
                  <div className="text-center">
                    <div className="border-b border-zinc-950 mx-auto w-3/4 h-5"></div>
                    <span className="text-[9px] font-bold text-zinc-700 block mt-1">Supplier / Representative</span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* Printable Sheet (EXCLUSIVELY RENDERED IN PRINT MODE) */}
      <div className="absolute inset-0 bg-white text-black p-8 font-sans text-left hidden print:block z-[999] m-0">
        <div className="border-2 border-black p-6 space-y-6 bg-white">
          
          {/* Header */}
          <div className="flex justify-between items-start border-b-2 border-black pb-4">
            <div>
              <h4 className="text-sm font-extrabold tracking-wider uppercase text-black">{companyConfig.companyName}</h4>
              <p className="text-[10px] text-zinc-700 font-medium">{companyConfig.address}</p>
              <p className="text-[10px] text-zinc-700 font-medium">TIN: {companyConfig.tin} {companyConfig.registeredVat ? '(VAT Registered)' : '(Non-VAT)'}</p>
              <p className="text-[10px] text-zinc-600 italic mt-1">BIR Permit to Use: {companyConfig.ptuNo}</p>
            </div>
            <div className="text-right">
              <h1 className="text-md font-black tracking-tight text-black border-b border-black pb-1 uppercase">Disbursement Voucher</h1>
              <p className="text-[10px] font-bold text-black mt-2">DV NO: <span className="font-mono text-xs">{dvNumber}</span></p>
              <p className="text-[10px] font-bold text-black">DATE: <span className="font-mono text-xs">{cleanDate(entry.date)}</span></p>
            </div>
          </div>

          {/* Payee Info */}
          <div className="grid grid-cols-3 gap-2 text-xs border-b border-black pb-4">
            <div className="col-span-2">
              <span className="font-bold uppercase text-[9px] text-zinc-600 block">PAYEE NAME / SUPPLIER:</span>
              <span className="font-bold text-black text-sm">{entry.payor}</span>
            </div>
            <div>
              <span className="font-bold uppercase text-[9px] text-zinc-600 block">TIN:</span>
              <span className="font-mono font-bold text-black">{entry.tin || 'N/A'}</span>
            </div>
            <div className="col-span-3 mt-2">
              <span className="font-bold uppercase text-[9px] text-zinc-600 block">ADDRESS:</span>
              <span className="text-black font-medium">{entry.address || 'Not Provided'}</span>
            </div>
          </div>

          {/* Explanation / Particulars */}
          <div className="space-y-2">
            <span className="font-bold uppercase text-[9px] text-zinc-600 block">PARTICULARS / EXPLANATION:</span>
            <div className="border border-black min-h-[100px] p-3 text-xs text-black bg-white">
              <p className="font-bold text-black">{entry.particulars}</p>
              <p className="text-[10px] text-zinc-500 mt-2 font-medium">Payment Terms: {entry.terms || 'COD'} | Status: {entry.status || 'Cleared'}</p>
            </div>
          </div>

          {/* Accounting Double-Entry Table */}
          <div className="space-y-1">
            <span className="font-bold uppercase text-[9px] text-zinc-600 block">ACCOUNTING DOUBLE ENTRY JOURNAL:</span>
            <table className="w-full border-collapse border border-black text-xs">
              <thead>
                <tr className="bg-zinc-100 border-b border-black font-bold uppercase text-[10px]">
                  <th className="border-r border-black p-2 text-left w-1/2">Account Title & Code</th>
                  <th className="border-r border-black p-2 text-right">Debit (₱)</th>
                  <th className="p-2 text-right">Credit (₱)</th>
                </tr>
              </thead>
              <tbody className="font-mono text-black">
                <tr className="border-b border-zinc-300">
                  <td className="border-r border-black p-2">
                    <span className="font-sans font-bold block">{debitAccountName}</span>
                    <span className="text-[10px] text-zinc-500">Account Code: {debitAccountCode}</span>
                  </td>
                  <td className="border-r border-black p-2 text-right font-bold">{formatCurrency(entry.taxable)}</td>
                  <td className="p-2 text-right text-zinc-400">-</td>
                </tr>
                {entry.vat > 0 && (
                  <tr className="border-b border-zinc-300">
                    <td className="border-r border-black p-2">
                      <span className="font-sans font-bold block">Input Tax (12% VAT)</span>
                      <span className="text-[10px] text-zinc-500">Account Code: 1150</span>
                    </td>
                    <td className="border-r border-black p-2 text-right font-bold">{formatCurrency(entry.vat)}</td>
                    <td className="p-2 text-right text-zinc-400">-</td>
                  </tr>
                )}
                <tr className="border-b border-black">
                  <td className="border-r border-black p-2 pl-6">
                    <span className="font-sans font-bold block">{creditAccountName}</span>
                    <span className="text-[10px] text-zinc-500">Account Code: {creditAccountCode}</span>
                  </td>
                  <td className="border-r border-black p-2 text-right text-zinc-400">-</td>
                  <td className="p-2 text-right font-bold">{formatCurrency(entry.gross)}</td>
                </tr>
                <tr className="bg-zinc-50 font-bold text-[13px]">
                  <td className="border-r border-black p-2 text-right font-sans uppercase">Total Double Entry:</td>
                  <td className="border-r border-black p-2 text-right font-bold">{formatCurrency(entry.gross)}</td>
                  <td className="p-2 text-right font-bold">{formatCurrency(entry.gross)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Signatures Section */}
          <div className="grid grid-cols-3 border border-black text-[10px] divide-x divide-black bg-white">
            <div className="p-3 space-y-12">
              <span className="font-bold uppercase text-[8px] text-zinc-600 block">PREPARED BY:</span>
              <div className="text-center">
                <div className="border-b border-black mx-auto w-3/4 h-5"></div>
                <span className="text-[9px] font-bold text-zinc-700 block mt-1">Bookkeeper / Accountant</span>
              </div>
            </div>
            <div className="p-3 space-y-12">
              <span className="font-bold uppercase text-[8px] text-zinc-600 block">APPROVED FOR PAYMENT:</span>
              <div className="text-center">
                <div className="border-b border-black mx-auto w-3/4 h-5"></div>
                <span className="text-[9px] font-bold text-zinc-700 block mt-1">Authorized Officer / Manager</span>
              </div>
            </div>
            <div className="p-3 space-y-12">
              <span className="font-bold uppercase text-[8px] text-zinc-600 block">RECEIVED PAYMENT SIGNATURE:</span>
              <div className="text-center">
                <div className="border-b border-black mx-auto w-3/4 h-5"></div>
                <span className="text-[9px] font-bold text-zinc-700 block mt-1">Supplier / Representative</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
