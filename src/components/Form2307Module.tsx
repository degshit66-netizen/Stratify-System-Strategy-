import React, { useState, useEffect, useMemo } from "react";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import {
  Download,
  Plus,
  Trash2,
  Database,
  FileText,
  Search,
  Eye,
  X,
  FileCheck2,
  Calendar,
  Building,
  CreditCard,
  Printer,
  ChevronRight,
  Settings,
  MoreVertical,
} from "lucide-react";
import { 
  collection, 
  query, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  doc, 
  updateDoc 
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { r2, parseNum, formatCurrency } from "../utils/helpers";
import { format } from "date-fns";
import { Form2307Record, Tenant } from "../types";
import { syncConfigToFirebase, loadConfigFromFirebase } from "../lib/db";
import { Form2307Sheet } from "./Form2307Sheet";

interface Form2307ModuleProps {
  isAdmin?: boolean;
  showToast: (msg: string, type: "success" | "error" | "info" | "warning") => void;
  currentTenant: Tenant | null;
  initialData?: any;
}

const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
};

const base64ToArrayBuffer = (base64: string) => {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
};

export const Form2307Module: React.FC<Form2307ModuleProps> = ({
  isAdmin = false,
  showToast,
  currentTenant,
  initialData
}) => {
  const [forms, setForms] = useState<Form2307Record[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeForm, setActiveForm] = useState<Form2307Record | null>(null);

  // Builder States (Manual entry)
  const [periodFrom, setPeriodFrom] = useState("");
  const [periodTo, setPeriodTo] = useState("");
  const [payee, setPayee] = useState({ tin: "", name: "", address: "", zip: "" });
  const [payor, setPayor] = useState({ tin: "", name: "", address: "", zip: "" });
  const [transactions, setTransactions] = useState<any[]>([{ atc: "WI158", m1: "", m2: "", m3: "", rate: "2" }]);
  const [signature, setSignature] = useState<string | null>(null);

  // Custom confirmation modal state
  const [confirmDialog, setConfirmDialog] = useState<{
    title?: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    type?: 'rose' | 'indigo' | 'emerald';
    onConfirm: () => void;
  } | null>(null);

  useEffect(() => {
    if (initialData) {
      if (initialData.payee) setPayee(prev => ({ ...prev, ...initialData.payee }));
      if (initialData.periodFrom) setPeriodFrom(initialData.periodFrom);
      if (initialData.periodTo) setPeriodTo(initialData.periodTo);
      if (initialData.transactions) setTransactions(initialData.transactions);
      setShowModal(true);
    }
  }, [initialData]);

  const [masterTemplate, setMasterTemplate] = useState<ArrayBuffer | null>(null);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [showMapping, setShowMapping] = useState(false);
  const [pdfMapping, setPdfMapping] = useState({
    payeeTin: { x: 100, y: 700 },
    payeeName: { x: 100, y: 680 },
    payeeAddress: { x: 100, y: 660 },
    payorTin: { x: 100, y: 640 },
    payorName: { x: 100, y: 620 },
    payorAddress: { x: 100, y: 600 },
    periodFrom: { x: 450, y: 710 },
    periodTo: { x: 500, y: 710 },
    transStartRow: 500,
    transRowHeight: 20
  });

  useEffect(() => {
    const loadMappingAndTemplate = async () => {
      const mapping = await loadConfigFromFirebase("bir_2307_pdf_mapping");
      if (mapping) setPdfMapping(mapping);
      
      const templateBase64 = await loadConfigFromFirebase("bir_2307_master_pdf_template");
      if (templateBase64) setMasterTemplate(base64ToArrayBuffer(templateBase64));

      const savedSig = await loadConfigFromFirebase("authorized_signature");
      if (savedSig) setSignature(savedSig);
    };
    loadMappingAndTemplate();
  }, []);

  const handleSaveSignature = async (sigBase64: string) => {
    setSignature(sigBase64);
    await syncConfigToFirebase("authorized_signature", sigBase64);
    showToast("Master signature updated and synced.", "success");
  };

  const handleClearAllRecords = async () => {
    if (!currentTenant?.id) return;
    setConfirmDialog({
      title: 'Clear All 2307 Records',
      message: 'CRITICAL: This will permanently delete ALL 2307 records for this tenant. This action is IRREVERSIBLE. Do you wish to proceed?',
      confirmLabel: 'Delete All',
      cancelLabel: 'Keep Records',
      type: 'rose',
      onConfirm: async () => {
        try {
          const batchDelete = forms.map(f => deleteDoc(doc(db, `tenants/${currentTenant.id}/forms2307/${f.id}`)));
          await Promise.all(batchDelete);
          showToast("All records cleared successfully.", "info");
        } catch (e) {
          showToast("Error clearing records.", "error");
        }
      }
    });
  };

  useEffect(() => {
    if (!currentTenant?.id) return;
    const q = query(collection(db, `tenants/${currentTenant.id}/forms2307`));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Form2307Record));
      setForms(docs.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")));
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [currentTenant?.id]);

  const resetBuilder = () => {
    setActiveForm(null);
    setPayee({ tin: "", name: "", address: "", zip: "" });
    setPayor({ 
      tin: currentTenant?.tin || "", 
      name: currentTenant?.name || "", 
      address: currentTenant?.address || "", 
      zip: "" 
    });
    setPeriodFrom("");
    setPeriodTo("");
    setTransactions([{ atc: "WI158", m1: "", m2: "", m3: "", rate: "2" }]);
    setPdfPreviewUrl(null);
  };

  const handleEdit = (form: Form2307Record) => {
    setActiveForm(form);
    setPayee({ tin: form.payeeTin, name: form.payeeName, address: form.payeeAddress, zip: form.payeeZip || "" });
    setPayor({ tin: form.payorTin, name: form.payorName, address: form.payorAddress, zip: form.payorZip || "" });
    setPeriodFrom(form.periodFrom);
    setPeriodTo(form.periodTo);
    try {
      setTransactions(JSON.parse(form.transactions));
    } catch (e) {
      setTransactions([{ atc: "WI158", m1: "", m2: "", m3: "", rate: "2" }]);
    }
    setShowModal(true);
  };

  const handleSaveForm = async () => {
    if (!currentTenant?.id) return;
    if (!payee.tin || !payee.name) {
      showToast("Payee TIN and Name are required.", "warning");
      return;
    }

    try {
      const formData: any = {
        payeeTin: payee.tin,
        payeeName: payee.name,
        payeeAddress: payee.address,
        payeeZip: payee.zip,
        payorTin: payor.tin,
        payorName: payor.name,
        payorAddress: payor.address,
        payorZip: payor.zip,
        periodFrom,
        periodTo,
        transactions: JSON.stringify(transactions),
        status: activeForm?.status || 'Draft',
        tenantId: currentTenant.id,
        createdAt: activeForm?.createdAt || new Date().toISOString(),
      };

      if (activeForm?.id) {
        await updateDoc(doc(db, `tenants/${currentTenant.id}/forms2307/${activeForm.id}`), formData);
        showToast("Form updated.", "success");
      } else {
        await addDoc(collection(db, `tenants/${currentTenant.id}/forms2307`), formData);
        showToast("Form saved.", "success");
      }
      setShowModal(false);
      resetBuilder();
    } catch (e) {
      showToast("Error saving form.", "error");
    }
  };

  const handleDelete = async (id: string) => {
    if (!currentTenant?.id) return;
    setConfirmDialog({
      title: 'Delete 2307 Form',
      message: 'Are you sure you want to delete this BIR Form 2307 record?',
      confirmLabel: 'Delete Form',
      cancelLabel: 'Cancel',
      type: 'rose',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, `tenants/${currentTenant.id}/forms2307/${id}`));
          showToast("Deleted.", "info");
        } catch (e) {
          showToast("Error.", "error");
        }
      }
    });
  };

  const handleTemplateUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const buffer = event.target?.result as ArrayBuffer;
        setMasterTemplate(buffer);
        const base64 = arrayBufferToBase64(buffer);
        await syncConfigToFirebase("bir_2307_master_pdf_template", base64);
        showToast("Master PDF uploaded.", "success");
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const handleMappingChange = async (newMapping: any) => {
    setPdfMapping(newMapping);
    await syncConfigToFirebase("bir_2307_pdf_mapping", newMapping);
    showToast("Mapping saved.", "success");
  };

  const generatePdf = async (form: Form2307Record, download = false) => {
    if (!masterTemplate) {
      showToast("No master template uploaded.", "error");
      return;
    }

    try {
      const pdfDoc = await PDFDocument.load(masterTemplate);
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const fontSize = 8;
      const pages = pdfDoc.getPages();
      const page = pages[0];

      const draw = (text: string | undefined, coord: { x: number, y: number }) => {
        if (!text) return;
        page.drawText(text, { x: coord.x, y: coord.y, size: fontSize, font, color: rgb(0, 0, 0) });
      };

      draw(form.payeeTin, pdfMapping.payeeTin);
      draw(form.payeeName, pdfMapping.payeeName);
      draw(form.payeeAddress, pdfMapping.payeeAddress);
      draw(form.payorTin, pdfMapping.payorTin);
      draw(form.payorName, pdfMapping.payorName);
      draw(form.payorAddress, pdfMapping.payorAddress);
      draw(form.periodFrom, pdfMapping.periodFrom);
      draw(form.periodTo, pdfMapping.periodTo);

      const txs = JSON.parse(form.transactions);
      txs.forEach((tx: any, i: number) => {
        const y = pdfMapping.transStartRow - (i * pdfMapping.transRowHeight);
        draw(tx.atc, { x: 50, y });
        draw(formatCurrency(parseNum(tx.m1)), { x: 400, y });
        draw(`${tx.rate}%`, { x: 480, y });
        const tax = parseNum(tx.m1) * (parseNum(tx.rate) / 100);
        draw(formatCurrency(tax), { x: 550, y });
      });

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);

      if (download) {
        const link = document.createElement("a");
        link.href = url;
        link.download = `2307_${form.payeeName}.pdf`;
        link.click();
      } else {
        setPdfPreviewUrl(url);
      }
    } catch (e) {
      showToast("Error generating PDF.", "error");
    }
  };

  const filteredForms = useMemo(() => {
    return forms.filter(f => 
      (f.payeeName || "").toLowerCase().includes(searchTerm.toLowerCase()) || 
      (f.payeeTin || "").includes(searchTerm)
    );
  }, [forms, searchTerm]);

  const handlePrint = (form: Form2307Record) => {
    // Set active form temporarily to render the sheet
    setActiveForm(form);
    setPayee({ tin: form.payeeTin, name: form.payeeName, address: form.payeeAddress, zip: form.payeeZip || "" });
    setPayor({ tin: form.payorTin, name: form.payorName, address: form.payorAddress, zip: form.payorZip || "" });
    setPeriodFrom(form.periodFrom);
    setPeriodTo(form.periodTo);
    try {
      setTransactions(JSON.parse(form.transactions));
    } catch (e) {
      setTransactions([]);
    }

    // Wait for state to update and render
    setTimeout(() => {
      window.print();
    }, 500);
  };

  const grandTotals = useMemo(() => {
    const m1 = transactions.reduce((acc, tx) => acc + parseNum(tx.m1), 0);
    const tax = transactions.reduce((acc, tx) => acc + (parseNum(tx.m1) * (parseNum(tx.rate) / 100)), 0);
    return { m1Tot: m1, m2Tot: 0, m3Tot: 0, netTot: m1, taxTot: tax };
  }, [transactions]);

  return (
    <div className="space-y-6">
      {/* Header View: Dashboard Look */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center">
            <FileText className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-zinc-900 dark:text-white tracking-tight">Form 2307 File Dashboard</h1>
            <p className="text-xs text-zinc-500 font-medium">Official Certificate of Creditable Tax Withheld</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => { resetBuilder(); setShowModal(true); }}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-bold text-xs rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20"
          >
            <Plus className="w-4 h-4" />
            New 2307 Entry
          </button>
        </div>
      </div>

      {/* Main Records List */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between gap-4">
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input 
              type="text" 
              placeholder="Search by payee name or tin..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-4">
            Total Records: {filteredForms.length}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-950/50">
                <th className="px-6 py-4 text-[10px] font-extrabold text-zinc-500 uppercase tracking-widest">Payee / Recipient</th>
                <th className="px-6 py-4 text-[10px] font-extrabold text-zinc-500 uppercase tracking-widest">Reporting Period</th>
                <th className="px-6 py-4 text-[10px] font-extrabold text-zinc-500 uppercase tracking-widest text-right">Tax Base</th>
                <th className="px-6 py-4 text-[10px] font-extrabold text-zinc-500 uppercase tracking-widest text-center">Status</th>
                <th className="px-6 py-4 text-[10px] font-extrabold text-zinc-500 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {isLoading ? (
                <tr><td colSpan={5} className="p-12 text-center text-zinc-500 italic text-xs">Loading records from cloud...</td></tr>
              ) : filteredForms.length === 0 ? (
                <tr><td colSpan={5} className="p-12 text-center text-zinc-500 italic text-xs">No records found. Click 'New 2307 Entry' to start.</td></tr>
              ) : (
                filteredForms.map((f) => {
                  const txList = JSON.parse(f.transactions || "[]");
                  const total = txList.reduce((acc: any, cur: any) => acc + parseNum(cur.m1), 0);
                  return (
                    <tr key={f.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-950/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-zinc-100 dark:bg-zinc-800 rounded-lg flex items-center justify-center">
                            <Building className="w-4 h-4 text-zinc-500" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-zinc-900 dark:text-white leading-none mb-1">{f.payeeName}</div>
                            <div className="text-[10px] text-zinc-500 font-mono tracking-tighter">{f.payeeTin}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs text-zinc-600 dark:text-zinc-400">
                        {f.periodFrom ? format(new Date(f.periodFrom), 'MMM d, yyyy') : 'N/A'} - {f.periodTo ? format(new Date(f.periodTo), 'MMM d, yyyy') : 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-xs font-bold text-right text-zinc-900 dark:text-white">
                        {formatCurrency(total)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                          f.status === 'Imported' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {f.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => handleEdit(f)} title="View/Edit" className="p-2 text-zinc-400 hover:text-blue-500 transition-colors hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-lg">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button onClick={() => handlePrint(f)} title="Print 2307" className="p-2 text-zinc-400 hover:text-indigo-600 transition-colors hover:bg-indigo-50 dark:hover:bg-indigo-950/30 rounded-lg">
                            <Printer className="w-4 h-4" />
                          </button>
                          <button onClick={() => generatePdf(f, true)} title="Download PDF" className="p-2 text-zinc-400 hover:text-emerald-600 transition-colors hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-lg">
                            <Download className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(f.id!)} title="Delete" className="p-2 text-zinc-400 hover:text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Admin Advanced View */}
      {isAdmin && (
        <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
          <button 
            onClick={() => setShowMapping(!showMapping)}
            className="w-full px-6 py-4 flex items-center justify-between text-xs font-bold text-zinc-500 uppercase tracking-widest bg-zinc-50 dark:bg-zinc-950/50 hover:bg-zinc-100 dark:hover:bg-zinc-950 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Developer & Mapping Settings
            </div>
            <ChevronRight className={`w-4 h-4 transition-transform ${showMapping ? 'rotate-90' : ''}`} />
          </button>
          {showMapping && (
            <div className="p-6 border-t border-zinc-100 dark:border-zinc-800 space-y-8 animate-in slide-in-from-top-2 duration-300">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                      <CreditCard className="w-3.5 h-3.5" /> 1. Master Authorized Signature
                    </h3>
                    <div className={`border-2 border-dashed rounded-3xl p-6 text-center transition-all ${signature ? 'border-indigo-500/50 bg-indigo-500/5' : 'border-zinc-200 dark:border-zinc-800 hover:border-indigo-500/50'}`}>
                      <input 
                        type="file" 
                        id="master-sig-upload" 
                        className="hidden" 
                        accept="image/*" 
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.readAsDataURL(file);
                            reader.onload = () => handleSaveSignature(reader.result as string);
                          }
                        }} 
                      />
                      <div className="flex flex-col items-center gap-3">
                        {signature ? (
                          <img src={signature} alt="Master Signature" className="h-12 object-contain mb-1" />
                        ) : (
                          <div className="w-12 h-12 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center">
                            <Plus className="w-6 h-6 text-zinc-300" />
                          </div>
                        )}
                        <button onClick={() => document.getElementById('master-sig-upload')?.click()} className="text-xs font-bold text-indigo-600 hover:underline">
                          {signature ? 'Replace Master Signature' : 'Upload Admin Signature'}
                        </button>
                        <p className="text-[9px] text-zinc-400 font-medium px-4">This signature will be applied to ALL generated tax forms and sales proposals.</p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800">
                    <button 
                      onClick={handleClearAllRecords}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-50 hover:bg-red-100 text-red-600 font-bold text-[10px] uppercase tracking-widest rounded-2xl transition-all border border-red-100"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Clear All Database Records
                    </button>
                  </div>
                </div>

                <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-3xl p-6 border border-zinc-100 dark:border-zinc-800 flex flex-col justify-center">
                  <h4 className="text-[10px] font-black uppercase text-zinc-400 mb-4 tracking-widest">System Engine Status</h4>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[10px] font-bold text-zinc-600 dark:text-zinc-400 uppercase">Native Printing: Active</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                      <span className="text-[10px] font-bold text-zinc-600 dark:text-zinc-400 uppercase">Cloud Sync: Connected</span>
                    </div>
                    <p className="text-[9px] text-zinc-400 font-medium leading-relaxed">
                      The system is currently using native HTML-to-PDF rendering. This ensures that the printed document matches the digital preview perfectly.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal: Center Focused Builder */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-zinc-200 dark:border-zinc-800 scale-in-center animate-in zoom-in-95 duration-300">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-950/50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-500 rounded-xl flex items-center justify-center">
                  <FileCheck2 className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-widest">
                    {activeForm ? 'Record Details & Export' : 'Generate New 2307 Certificate'}
                  </h2>
                  <p className="text-[10px] text-zinc-500 font-medium">Certification of Creditable Tax Withheld</p>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full transition-colors">
                <X className="w-5 h-5 text-zinc-400" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-8">
                {/* 1. Payee */}
                <div className="space-y-4">
                  <h3 className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                    <Building className="w-3.5 h-3.5" /> 1. Payee / Income Recipient
                  </h3>
                  <div className="space-y-3">
                    <div className="group">
                      <label className="text-[9px] font-bold text-zinc-500 uppercase px-1 mb-1 block">TIN (Taxpayer ID)</label>
                      <input type="text" placeholder="000-000-000-000" value={payee.tin} onChange={e => setPayee({...payee, tin: e.target.value})} className="w-full text-xs p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20" />
                    </div>
                    <div className="group">
                      <label className="text-[9px] font-bold text-zinc-500 uppercase px-1 mb-1 block">Registered Name</label>
                      <input type="text" placeholder="Full legal name" value={payee.name} onChange={e => setPayee({...payee, name: e.target.value})} className="w-full text-xs p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20" />
                    </div>
                    <div className="group">
                      <label className="text-[9px] font-bold text-zinc-500 uppercase px-1 mb-1 block">Registered Address</label>
                      <input type="text" placeholder="Business address" value={payee.address} onChange={e => setPayee({...payee, address: e.target.value})} className="w-full text-xs p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20" />
                    </div>
                  </div>
                </div>

                {/* 2. Period */}
                <div className="space-y-4">
                  <h3 className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5" /> 2. Inclusive Dates
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="group">
                      <label className="text-[9px] font-bold text-zinc-500 uppercase px-1 mb-1 block">From</label>
                      <input type="date" value={periodFrom} onChange={e => setPeriodFrom(e.target.value)} className="w-full text-xs p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20" />
                    </div>
                    <div className="group">
                      <label className="text-[9px] font-bold text-zinc-500 uppercase px-1 mb-1 block">To</label>
                      <input type="date" value={periodTo} onChange={e => setPeriodTo(e.target.value)} className="w-full text-xs p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20" />
                    </div>
                  </div>
                </div>

                {/* 3. Transactions */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                      <CreditCard className="w-3.5 h-3.5" /> 3. Income & Tax Details
                    </h3>
                    <button onClick={() => setTransactions([...transactions, { atc: "", m1: "", m2: "", m3: "", rate: "" }])} className="text-[10px] font-bold text-blue-600 hover:underline">Add ATC Row</button>
                  </div>
                  <div className="space-y-3">
                    {transactions.map((tx, i) => (
                      <div key={i} className="flex gap-3 p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl items-center relative group">
                        <div className="flex-1">
                          <label className="text-[8px] font-bold text-zinc-400 uppercase">ATC</label>
                          <input type="text" placeholder="WI158" value={tx.atc} onChange={e => {const n=[...transactions]; n[i].atc=e.target.value; setTransactions(n)}} className="w-full text-[10px] bg-transparent outline-none font-bold" />
                        </div>
                        <div className="flex-[2]">
                          <label className="text-[8px] font-bold text-zinc-400 uppercase">Taxable Income</label>
                          <input type="text" placeholder="0.00" value={tx.m1} onChange={e => {const n=[...transactions]; n[i].m1=e.target.value; setTransactions(n)}} className="w-full text-[10px] bg-transparent outline-none text-right font-bold" />
                        </div>
                        <div className="flex-1">
                          <label className="text-[8px] font-bold text-zinc-400 uppercase">Rate %</label>
                          <input type="text" placeholder="2" value={tx.rate} onChange={e => {const n=[...transactions]; n[i].rate=e.target.value; setTransactions(n)}} className="w-full text-[10px] bg-transparent outline-none text-center font-bold" />
                        </div>
                        <button onClick={() => setTransactions(transactions.filter((_, idx) => idx !== i))} className="p-1.5 text-zinc-300 hover:text-red-500 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* PDF Preview Sidebar */}
              <div className="flex flex-col gap-6">
                <div className="flex-1 bg-zinc-100 dark:bg-zinc-950 rounded-[32px] border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-inner flex flex-col relative min-h-[500px]">
                  {pdfPreviewUrl ? (
                    <iframe src={pdfPreviewUrl} className="w-full h-full" title="PDF Preview" />
                  ) : (
                    <div className="flex-1 overflow-auto p-4 scale-[0.6] origin-top bg-zinc-100 dark:bg-zinc-950 scrollbar-hide">
                      <Form2307Sheet 
                        payee={payee} 
                        payor={payor} 
                        periodFrom={periodFrom} 
                        periodTo={periodTo} 
                        transactions={transactions} 
                        grandTotals={grandTotals}
                        signature={signature}
                      />
                    </div>
                  )}
                  {!pdfPreviewUrl && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/5 backdrop-blur-[1px] pointer-events-none">
                      <div className="bg-zinc-900/90 text-white text-[10px] font-bold px-5 py-2 rounded-full shadow-2xl flex items-center gap-2">
                        <Eye className="w-3.5 h-3.5" />
                        Live Sheet Rendering
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={async () => {
                      await handleSaveForm();
                      handlePrint({
                        payeeTin: payee.tin, payeeName: payee.name, payeeAddress: payee.address, payeeZip: payee.zip,
                        payorTin: payor.tin, payorName: payor.name, payorAddress: payor.address, payorZip: payor.zip,
                        periodFrom, periodTo, transactions: JSON.stringify(transactions),
                        status: 'Draft', tenantId: currentTenant?.id || "", createdAt: ""
                      });
                    }} 
                    className="py-4 bg-zinc-900 text-white text-xs font-bold rounded-2xl hover:bg-zinc-800 transition-all flex items-center justify-center gap-2 shadow-xl shadow-zinc-900/20"
                  >
                    <Printer className="w-4 h-4" />
                    Save & Print
                  </button>
                  <button 
                    onClick={() => generatePdf({
                      payeeTin: payee.tin, payeeName: payee.name, payeeAddress: payee.address, payeeZip: payee.zip,
                      payorTin: payor.tin, payorName: payor.name, payorAddress: payor.address, payorZip: payor.zip,
                      periodFrom, periodTo, transactions: JSON.stringify(transactions),
                      status: 'Draft', tenantId: currentTenant?.id || "", createdAt: ""
                    }, true)} 
                    className="py-4 bg-blue-600 text-white text-xs font-bold rounded-2xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download PDF
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hidden Print Container */}
      <div className="hidden print:block fixed inset-0 z-[9999] bg-white w-full h-full p-0 m-0 overflow-visible">
        <Form2307Sheet 
          payee={payee} 
          payor={payor} 
          periodFrom={periodFrom} 
          periodTo={periodTo} 
          transactions={transactions} 
          grandTotals={grandTotals}
          signature={signature}
        />
      </div>

      {confirmDialog && (
        <div className="fixed inset-0 bg-zinc-950/80 z-[250] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl w-full max-w-md p-6 shadow-2xl relative overflow-hidden text-left">
            <div className={`absolute top-0 left-0 w-full h-1.5 ${
              confirmDialog.type === 'rose' 
                ? 'bg-rose-500' 
                : confirmDialog.type === 'emerald' 
                  ? 'bg-emerald-500' 
                  : 'bg-indigo-500'
            }`} />
            
            <h3 className="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-wider mb-2">
              {confirmDialog.title || 'System Confirmation'}
            </h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed mb-6 whitespace-pre-line">
              {confirmDialog.message}
            </p>
            
            <div className="flex justify-end gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setConfirmDialog(null)}
                className="px-4 py-2 text-[10px] font-bold text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 uppercase tracking-widest transition-colors"
              >
                {confirmDialog.cancelLabel || 'Cancel'}
              </button>
              <button
                type="button"
                onClick={() => {
                  confirmDialog.onConfirm();
                  setConfirmDialog(null);
                }}
                className={`px-4 py-2 text-[10px] font-bold text-white rounded-xl uppercase tracking-widest transition-all ${
                  confirmDialog.type === 'rose'
                    ? 'bg-rose-600 hover:bg-rose-500 shadow-sm hover:shadow-rose-500/20'
                    : confirmDialog.type === 'emerald'
                      ? 'bg-emerald-600 hover:bg-emerald-500 shadow-sm hover:shadow-emerald-500/20'
                      : 'bg-indigo-600 hover:bg-indigo-500 shadow-sm hover:shadow-indigo-500/20'
                }`}
              >
                {confirmDialog.confirmLabel || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
