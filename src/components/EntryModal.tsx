import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Sparkles, HelpCircle, FileSpreadsheet } from "lucide-react";
import * as XLSX from "xlsx";
import { LedgerEntry } from "../types";
import { getCompleteChartOfAccounts } from "../data/chartOfAccounts";
import { r2, parseNum, formatCurrency } from "../utils/helpers";
import html2pdf from "html2pdf.js";
import { Form2307Sheet } from "./Form2307Sheet";

interface EntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveEntry: (entry: LedgerEntry) => void;
  showToast: (msg: string, type: "success" | "error" | "info") => void;
  initialType?: "Sales" | "Expense";
  scanResult?: {
    payor: string;
    particulars: string;
    gross: string;
    accountCode: string;
    tin?: string;
  } | null;
  initialData?: LedgerEntry;
  ledger?: LedgerEntry[];
}

export const EntryModal: React.FC<EntryModalProps> = ({
  isOpen,
  onClose,
  onSaveEntry,
  showToast,
  initialType,
  scanResult,
  initialData,
  ledger = []
}) => {
  const coa = Object.entries(getCompleteChartOfAccounts()).map(
    ([code, value]) => ({ ...value, code }),
  );

  // Form Fields
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [type, setType] = useState<"Sales" | "Expense">("Sales");
  const [accountCode, setAccountCode] = useState("");
  const [payor, setPayor] = useState("");
  const [tin, setTin] = useState("");
  const [particulars, setParticulars] = useState("");
  const [grossInput, setGrossInput] = useState("");
  const [taxType, setTaxType] = useState<
    "Vatable" | "Non-VAT" | "Zero-Rated" | "Exempt"
  >("Vatable");
  const [vatMode, setVatMode] = useState<"Inclusive" | "Exclusive">(
    "Inclusive",
  );
  const [status, setStatus] = useState<
    "Cleared" | "Pending" | "Void" | "Posted"
  >("Cleared");
  const [terms, setTerms] = useState("COD (Cash Received)");
  const [cashInput, setCashInput] = useState("");
  const [arApInput, setArApInput] = useState("");
  const [itemType, setItemType] = useState<"Goods" | "Services">("Goods");
  const [ref, setRef] = useState("");
  const [ewtRateSelect, setEwtRateSelect] = useState<
    "Auto" | "0%" | "1%" | "2%" | "5%" | "10%"
  >("Auto");
  const [enableCwt, setEnableCwt] = useState(false);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen) {
      try {
        const stored = localStorage.getItem('stratify_inventory');
        let manualItems = [];
        if (stored) {
          manualItems = JSON.parse(stored);
        }

        const ledgerCandidatesMap: Record<string, { sku: string; item: string; qty: number; cost: number; price: number; reorder: number }> = {};
        ledger.forEach(r => {
          if (r.status === 'Void' || r.type === 'Closing' || r.type === 'Setup') return;
          const name = String(r.category || r.particulars || 'Product Item').trim();
          if (!name) return;
          const sku = name.toUpperCase().replace(/[^A-Z0-9]/g, '-').slice(0, 12);
          if (!ledgerCandidatesMap[sku]) {
            ledgerCandidatesMap[sku] = { sku, item: name, qty: 0, cost: r.type === 'Expense' ? r.gross : 0, price: r.type === 'Sales' ? r.gross : 0, reorder: 0 };
          }
          const val = r2(parseNum(r.gross));
          if (r.type === 'Sales') {
            ledgerCandidatesMap[sku].qty -= 1;
          } else if (r.type === 'Expense') {
            ledgerCandidatesMap[sku].qty += 1;
          }
        });

        const allItems = [ ...manualItems.map((x: any) => ({ ...x, source: 'Manual' })), ...Object.values(ledgerCandidatesMap).map(x => ({ ...x, source: 'Ledger' })) ];
        const deduped: any[] = [];
        const seenSkus = new Set();
        allItems.forEach(item => {
          const skuKey = String(item.sku || '').trim().toLowerCase();
          if (!skuKey) return;
          if (seenSkus.has(skuKey)) {
            const idx = deduped.findIndex(x => String(x.sku).toLowerCase() === skuKey);
            if (idx >= 0 && item.source === 'Ledger') {
              deduped[idx].qty = r2(parseNum(deduped[idx].qty) + parseNum(item.qty));
            }
            return;
          }
          seenSkus.add(skuKey);
          deduped.push({ ...item });
        });
        
        setInventoryItems(deduped);
      } catch (e) {
        // ignore
      }

      if (initialData) {
        setType(initialData.type as "Sales" | "Expense");
        setDate(initialData.date);
        setAccountCode(initialData.accountCode);
        setPayor(initialData.payor);
        setTin(initialData.tin || "");
        setParticulars(initialData.particulars);
        setGrossInput(initialData.gross);
        setTaxType(initialData.taxType as any);
        setVatMode("Inclusive"); // default to inclusive on load
        setStatus(initialData.status as any);
        setTerms(initialData.terms || "COD");
        setCashInput(initialData.amount_paid?.toString() || "");
        setArApInput(initialData.balance?.toString() || "");
        setItemType(initialData.itemType || "Goods");
        setRef(initialData.ref || "");
        setEnableCwt(
          initialData.type === "Sales" &&
            !!initialData.ewt &&
            initialData.ewt > 0,
        );
        if (initialData.ewt === 0) {
          setEwtRateSelect("0%");
        } else if (initialData.ewt) {
          const calcTaxable = initialData.taxable || initialData.gross || 1;
          const ratio = initialData.ewt / calcTaxable;
          if (Math.abs(ratio - 0.01) < 0.005) {
            setEwtRateSelect("1%");
          } else if (Math.abs(ratio - 0.02) < 0.005) {
            setEwtRateSelect("2%");
          } else if (Math.abs(ratio - 0.05) < 0.005) {
            setEwtRateSelect("5%");
          } else if (Math.abs(ratio - 0.1) < 0.005) {
            setEwtRateSelect("10%");
          } else {
            setEwtRateSelect("Auto");
          }
        } else {
          setEwtRateSelect("0%");
        }
      } else if (scanResult) {
        if (initialType) setType(initialType);
        setDate(new Date().toISOString().slice(0, 10));
        setAccountCode(scanResult.accountCode);
        setPayor(scanResult.payor);
        setTin(scanResult.tin || "");
        setParticulars(scanResult.particulars);
        setGrossInput(scanResult.gross);
        setCashInput(scanResult.gross);
        setArApInput("0");
        setItemType("Goods");
        setRef(scanResult.ref || "");
        setEwtRateSelect("Auto");
        setEnableCwt(false);
        setVatMode("Inclusive");
      } else {
        if (initialType) setType(initialType);
        setDate(new Date().toISOString().slice(0, 10));
        setAccountCode("");
        setPayor("");
        setTin("");
        setParticulars("");
        setGrossInput("");
        setCashInput("");
        setArApInput("");
        setTaxType("Vatable");
        setVatMode("Inclusive");
        setStatus("Cleared");
        setTerms(initialType === "Expense" || initialType === "Purchase" ? "COD (Cash Disbursed)" : "COD (Cash Received)");
        setItemType("Goods");
        setRef("");
        setEwtRateSelect("Auto");
        setEnableCwt(false);
      }
    }
  }, [isOpen, initialType, initialData, scanResult]);

  const [contacts, setContacts] = useState<any[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("stratify_contacts");
      if (stored) {
        setContacts(JSON.parse(stored));
      }
    } catch (e) {}
  }, []);

  // Auto computations based on Gross and Tax Type
  const getComputedTaxWithheld = (
    currentType: "Sales" | "Expense",
    currentGross: number,
    currentItemType: "Goods" | "Services",
    currentTaxType: string,
    currentEwtRateSelect: string,
    currentEnableCwt: boolean,
    currentVatMode: "Inclusive" | "Exclusive" = vatMode,
  ) => {
    let taxable = currentGross;
    if (currentTaxType === "Vatable") {
      if (currentVatMode === "Exclusive") {
        taxable = currentGross;
      } else {
        taxable = r2(currentGross / 1.12);
      }
    }
    if (currentType === "Expense") {
      let rate = 0;
      if (currentEwtRateSelect === "Auto") {
        rate = currentItemType === "Goods" ? 0.01 : 0.02;
      } else if (currentEwtRateSelect === "1%") {
        rate = 0.01;
      } else if (currentEwtRateSelect === "2%") {
        rate = 0.02;
      } else if (currentEwtRateSelect === "5%") {
        rate = 0.05;
      } else if (currentEwtRateSelect === "10%") {
        rate = 0.1;
      } else {
        rate = 0;
      }
      return r2(taxable * rate);
    } else {
      if (currentEnableCwt) {
        let rate = 0;
        if (currentEwtRateSelect === "Auto") {
          rate = currentItemType === "Goods" ? 0.01 : 0.02;
        } else if (currentEwtRateSelect === "1%") {
          rate = 0.01;
        } else if (currentEwtRateSelect === "2%") {
          rate = 0.02;
        } else if (currentEwtRateSelect === "5%") {
          rate = 0.05;
        } else if (currentEwtRateSelect === "10%") {
          rate = 0.1;
        } else {
          rate = currentItemType === "Goods" ? 0.01 : 0.02;
        }
        return r2(taxable * rate);
      }
    }
    return 0;
  };

  const updateCashAndArAp = (
    currentType: "Sales" | "Expense",
    currentGrossStr: string,
    currentTerms: string,
    currentItemType: "Goods" | "Services",
    currentTaxType: string,
    currentEwtRate: string,
    currentEnableCwt: boolean,
    currentVatMode: "Inclusive" | "Exclusive" = vatMode,
  ) => {
    const grossVal = parseNum(currentGrossStr);
    if (!grossVal) {
      setCashInput("");
      setArApInput("");
      return;
    }

    let taxableVal = grossVal;
    let vatVal = 0;
    let finalGross = grossVal;

    if (currentTaxType === "Vatable") {
      if (currentVatMode === "Exclusive") {
        taxableVal = grossVal;
        vatVal = r2(grossVal * 0.12);
        finalGross = r2(grossVal + vatVal);
      } else {
        taxableVal = r2(grossVal / 1.12);
        vatVal = r2(grossVal - taxableVal);
        finalGross = grossVal;
      }
    }

    const withheld = getComputedTaxWithheld(
      currentType,
      grossVal,
      currentItemType,
      currentTaxType,
      currentEwtRate,
      currentEnableCwt,
      currentVatMode,
    );
    const netCollectibleOrPayable = r2(finalGross - withheld);

    const isCash = currentTerms.includes("COD") || currentTerms.includes("Cash Paid") || currentTerms === "Cash";
    if (isCash) {
      setCashInput(String(netCollectibleOrPayable));
      setArApInput("0");
    } else {
      setCashInput("0");
      setArApInput(String(netCollectibleOrPayable));
    }
  };

  const handleGrossChange = (val: string) => {
    setGrossInput(val);
    updateCashAndArAp(
      type,
      val,
      terms,
      itemType,
      taxType,
      ewtRateSelect,
      enableCwt,
      vatMode,
    );
  };

  const handleTermsChange = (val: string) => {
    setTerms(val);
    updateCashAndArAp(
      type,
      grossInput,
      val,
      itemType,
      taxType,
      ewtRateSelect,
      enableCwt,
      vatMode,
    );
  };

  const handleEnableCwtChange = (val: boolean) => {
    setEnableCwt(val);
    updateCashAndArAp(
      type,
      grossInput,
      terms,
      itemType,
      taxType,
      ewtRateSelect,
      val,
      vatMode,
    );
  };

  const handleDirect2307Generate = () => {
    let payeeName = "My Company";
    let payeeTin = "000-000-000-000";
    let payeeAddress = "";
    let payeeZip = "";

    try {
      const stored = localStorage.getItem("stratify_company_config");
      if (stored) {
        const parsed = JSON.parse(stored);
        payeeName = parsed.companyName || payeeName;
        payeeTin = parsed.tin || payeeTin;
        payeeAddress = parsed.address || payeeAddress;
      }
    } catch (e) {}

    const payorName = payor.trim() || "General Customer";
    const payorTin = tin.trim() || "000-000-000-000";

    const d = new Date(date);
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    const periodFromStr = `${mm}/01/${yyyy}`;

    const lastDay = new Date(yyyy, d.getMonth() + 1, 0).getDate();
    const periodToStr = `${mm}/${lastDay}/${yyyy}`;

    const atc = itemType === "Goods" ? "WI157" : "WI158";
    let rate = itemType === "Goods" ? 1 : 2;
    if (ewtRateSelect === "0%") rate = 0;
    if (ewtRateSelect === "1%") rate = 1;
    if (ewtRateSelect === "2%") rate = 2;
    if (ewtRateSelect === "5%") rate = 5;
    if (ewtRateSelect === "10%") rate = 10;

    const grossVal = parseNum(grossInput);
    let taxable = grossVal;
    if (taxType === "Vatable") {
      if (vatMode === "Exclusive") {
        taxable = grossVal;
      } else {
        taxable = r2(grossVal / 1.12);
      }
    }

    const monthIdx = d.getMonth();
    const qMonth = (monthIdx % 3) + 1;
    const m1 = qMonth === 1 ? taxable : 0;
    const m2 = qMonth === 2 ? taxable : 0;
    const m3 = qMonth === 3 ? taxable : 0;

    const totalAmount = taxable;
    const taxWithheld = r2(totalAmount * (rate / 100));

    const payeeObj = {
      tin: payeeTin,
      name: payeeName,
      address: payeeAddress,
      zip: payeeZip,
    };

    const payorObj = {
      tin: payorTin,
      name: payorName,
      address: "",
      zip: "",
    };

    const tx = {
      atc,
      m1: m1.toString(),
      m2: m2.toString(),
      m3: m3.toString(),
      rate: rate.toString(),
    };

    const grandTotals = {
      m1Tot: m1,
      m2Tot: m2,
      m3Tot: m3,
      netTot: totalAmount,
      taxTot: taxWithheld,
    };

    // Render Form2307Sheet to a hidden div for PDF generation
    const container = document.createElement("div");
    container.style.position = "absolute";
    container.style.left = "-9999px";
    container.style.top = "-9999px";
    document.body.appendChild(container);

    import("react-dom/client").then(({ createRoot }) => {
      const root = createRoot(container);
      root.render(
        <Form2307Sheet
          periodFrom={periodFromStr}
          periodTo={periodToStr}
          payee={payeeObj}
          payor={payorObj}
          transactions={[tx]}
          grandTotals={grandTotals}
        />,
      );

      showToast("Generating BIR Form 2307 PDF...", "info");

      // Wait a moment for rendering to complete
      setTimeout(() => {
        const element = container.firstChild as HTMLElement;
        const opt = {
          margin: 0,
          filename: `BIR_2307_${payorName.replace(/\s+/g, "_")}_${date}.pdf`,
          image: { type: "jpeg" as const, quality: 1.0 },
          html2canvas: { scale: 2, useCORS: true, logging: false },
          jsPDF: { unit: "in" as const, format: "letter", orientation: "portrait" as const },
        };

        html2pdf()
          .set(opt)
          .from(element)
          .save()
          .then(() => {
            root.unmount();
            document.body.removeChild(container);
            showToast("BIR Form 2307 PDF downloaded!", "success");
          });
      }, 800);
    });
  };

  const handleSave = () => {
    const gross = parseNum(grossInput);
    if (!gross || !accountCode || !particulars.trim()) {
      showToast(
        "Please complete Particulars, Account Code, and Gross Amount.",
        "error",
      );
      return;
    }

    if (type === 'Sales' && itemType === 'Goods') {
      const matchedItem = inventoryItems.find((item: any) => 
        item.itemType === 'Goods' && 
        item.item.toLowerCase() === particulars.trim().toLowerCase()
      );
      
      if (!matchedItem) {
         showToast("Cannot proceed with sale. Item not found in inventory catalog.", "error");
         return;
      }
      
      let qty = parseNum(matchedItem.qty);
      if (initialData && initialData.type === 'Sales' && initialData.itemType === 'Goods' && initialData.particulars.toLowerCase() === particulars.trim().toLowerCase()) {
         qty += 1;
      }
      
      if (qty <= 0) {
        showToast("Cannot proceed with sale. Insufficient stock available for this item.", "error");
        return;
      }
    }

    const matchedCoa = coa.find((c) => c.code === accountCode);
    const category = matchedCoa ? matchedCoa.name : "Unassigned";

    // Compute VAT and Taxable Base
    let taxable = gross;
    let vat = 0;
    if (taxType === "Vatable") {
      taxable = r2(gross / 1.12);
      vat = r2(gross - taxable);
    }

    const computedEwt = getComputedTaxWithheld(
      type,
      gross,
      itemType,
      taxType,
      ewtRateSelect,
      enableCwt,
    );

    const months = [
      "JANUARY",
      "FEBRUARY",
      "MARCH",
      "APRIL",
      "MAY",
      "JUNE",
      "JULY",
      "AUGUST",
      "SEPTEMBER",
      "OCTOBER",
      "NOVEMBER",
      "DECEMBER",
    ];
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
      payor: payor.trim() || "General Customer",
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
      address: "",
      createdAt: new Date().toISOString(),
      ewt: computedEwt,
      itemType,
      ref: ref.trim(),
    };

    onSaveEntry(newEntry);
    showToast(
      `Transaction posted successfully. ${itemType} tax applied.`,
      "success",
    );

    // Reset Form
    setDate(new Date().toISOString().slice(0, 10));
    setAccountCode("");
    setPayor("");
    setTin("");
    setParticulars("");
    setGrossInput("");
    setTaxType("Vatable");
    setStatus("Cleared");
    setTerms(type === "Expense" ? "COD (Cash Disbursed)" : "COD (Cash Received)");
    setCashInput("");
    setArApInput("");
    setItemType("Goods");
    setRef("");
    setEwtRateSelect("Auto");
    onClose();
  };

  const filteredCoa = coa.filter((c) => {
    if (type === "Sales") {
      return (
        c.type === "Revenue" ||
        c.type === "Income" ||
        c.type === "Equity" ||
        c.type === "Asset"
      );
    } else {
      return (
        c.type === "Expense" || c.type === "Asset" || c.type === "Liability"
      );
    }
  });

  const grossVal = parseNum(grossInput);
  let taxableVal = grossVal;
  if (taxType === "Vatable") {
    taxableVal = r2(grossVal / 1.12);
  }
  const computedCwt = enableCwt
    ? r2(taxableVal * (itemType === "Goods" ? 0.01 : 0.02))
    : 0;

  const previewLines = React.useMemo(() => {
    const lines: {
      code: string;
      name: string;
      debit: number;
      credit: number;
    }[] = [];
    const gross = parseNum(grossInput) || 0;
    if (gross <= 0 || !accountCode) return lines;

    const matched = coa.find((c) => c.code === accountCode);
    const accName = matched ? matched.name : "Target Account";

    let vat = 0;
    let net = gross;
    if (taxType === "Vatable") {
      net = r2(gross / 1.12);
      vat = r2(gross - net);
    }

    const withheld = getComputedTaxWithheld(
      type,
      gross,
      itemType,
      taxType,
      ewtRateSelect,
      enableCwt,
    );
    const isCashTerm = terms.includes("COD") || terms.includes("Cash Paid") || terms === "Cash";
    const cash = isCashTerm ? r2(gross - withheld) : 0;
    const arAp = !isCashTerm ? r2(gross - withheld) : 0;

    if (type === "Sales") {
      if (cash > 0) {
        lines.push({
          code: "1010",
          name: "Cash in Bank / on Hand",
          debit: cash,
          credit: 0,
        });
      }
      if (arAp > 0) {
        lines.push({
          code: "1020",
          name: "Accounts Receivable",
          debit: arAp,
          credit: 0,
        });
      }
      if (withheld > 0) {
        lines.push({
          code: "1080",
          name: "Creditable Withholding Tax (CWT)",
          debit: withheld,
          credit: 0,
        });
      }
      lines.push({ code: accountCode, name: accName, debit: 0, credit: net });
      if (vat > 0) {
        lines.push({
          code: "2110",
          name: "Output VAT Payable",
          debit: 0,
          credit: vat,
        });
      }
    } else {
      lines.push({ code: accountCode, name: accName, debit: net, credit: 0 });
      if (vat > 0) {
        lines.push({ code: "1070", name: "Input VAT", debit: vat, credit: 0 });
      }
      if (cash > 0) {
        lines.push({
          code: "1010",
          name: "Cash in Bank / on Hand",
          debit: 0,
          credit: cash,
        });
      }
      if (arAp > 0) {
        lines.push({
          code: "2010",
          name: "Accounts Payable",
          debit: 0,
          credit: arAp,
        });
      }
      if (withheld > 0) {
        lines.push({
          code: "2111",
          name: "EWT Payable",
          debit: 0,
          credit: withheld,
        });
      }
    }
    return lines;
  }, [
    type,
    grossInput,
    taxType,
    terms,
    itemType,
    ewtRateSelect,
    enableCwt,
    accountCode,
    coa,
  ]);

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
            transition={{ type: "spring", duration: 0.3 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl z-[201] overflow-hidden flex flex-col justify-between"
          >
            <div>
              <div className="bg-zinc-900 text-white p-5 flex items-center justify-between border-b border-zinc-800">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-blue-400" />
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider">
                      Post Journal Entry
                    </h3>
                    <p className="text-[10px] text-zinc-400 mt-0.5">
                      Post an official double-entry ledger row with complete tax
                      structures.
                    </p>
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
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                      Transaction Type
                    </label>
                    <select
                      value={type}
                      onChange={(e) => {
                        const val = e.target.value as "Sales" | "Expense";
                        setType(val);
                        setAccountCode("");
                        const newTerms = val === "Expense" ? "COD (Cash Disbursed)" : "COD (Cash Received)";
                        setTerms(newTerms);
                        if (val === "Sales") {
                          setEnableCwt(false);
                          updateCashAndArAp(
                            val,
                            grossInput,
                            newTerms,
                            itemType,
                            taxType,
                            ewtRateSelect,
                            false,
                          );
                        } else {
                          updateCashAndArAp(
                            val,
                            grossInput,
                            newTerms,
                            itemType,
                            taxType,
                            ewtRateSelect,
                            enableCwt,
                          );
                        }
                      }}
                      className="w-full text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-blue-400"
                    >
                      <option value="Sales">Sales (Revenue Inward)</option>
                      <option value="Expense">Purchase (Outward)</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                      Posting Date
                    </label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2.5 text-zinc-800 dark:text-zinc-200 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                      {type === "Sales" ? "Invoice Number" : "Reference Number"}
                    </label>
                    <input
                      type="text"
                      placeholder={type === "Sales" ? "SI-0001" : "REF-0001"}
                      value={ref}
                      onChange={(e) => setRef(e.target.value)}
                      className="w-full text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-blue-400 font-bold font-mono"
                    />
                  </div>
                  {type === "Expense" ? (
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                        Withholding Tax (EWT)
                      </label>
                      <select
                        value={ewtRateSelect}
                        onChange={(e) => {
                          const val = e.target.value as any;
                          setEwtRateSelect(val);
                          updateCashAndArAp(
                            type,
                            grossInput,
                            terms,
                            itemType,
                            taxType,
                            val,
                            enableCwt,
                          );
                        }}
                        className="w-full text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-blue-400 font-semibold"
                      >
                        <option value="Auto">
                          Auto (
                          {itemType === "Goods" ? "1% Goods" : "2% Services"})
                        </option>
                        <option value="0%">No Withholding (0% / Exempt)</option>
                        <option value="1%">1% Rate (Goods)</option>
                        <option value="2%">2% Rate (Services)</option>
                      </select>
                    </div>
                  ) : (
                    <div className="space-y-1.5 opacity-60">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                        Withholding Tax (EWT)
                      </label>
                      <div className="w-full text-xs bg-zinc-100 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-400 dark:text-zinc-500 font-semibold select-none">
                        Not Applicable (Sales)
                      </div>
                    </div>
                  )}
                </div>

                <div className="bg-zinc-50 dark:bg-zinc-950/40 p-3.5 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/60 grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                      Item Nature (Goods vs. Services)
                    </label>
                    <select
                      value={itemType}
                      onChange={(e) => {
                        const val = e.target.value as "Goods" | "Services";
                        setItemType(val);
                        updateCashAndArAp(
                          type,
                          grossInput,
                          terms,
                          val,
                          taxType,
                          ewtRateSelect,
                          enableCwt,
                        );
                      }}
                      className="w-full text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-zinc-800 dark:text-zinc-200 focus:outline-none font-bold"
                    >
                      <option value="Goods">Goods (12% VAT)</option>
                      <option value="Services">Services (12% VAT)</option>
                    </select>
                  </div>
                  <div className="space-y-1 flex flex-col justify-center text-left">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                      Tax Treatment
                    </span>
                    <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400">
                      {type === "Sales"
                        ? `Output VAT - ${itemType} (12%)`
                        : `Input VAT (12%) + EWT (${ewtRateSelect === "Auto" ? (itemType === "Goods" ? "1%" : "2%") : ewtRateSelect})`}
                    </span>
                    <span className="text-[9px] text-zinc-400 leading-none">
                      {type === "Sales"
                        ? `Subject to 12% Output VAT only. No withholding tax applies on outward sales.`
                        : ewtRateSelect === "0%"
                          ? "Subject to Input VAT only. Exempt from withholding tax."
                          : `Withholding agent deducts ${ewtRateSelect === "Auto" ? (itemType === "Goods" ? "1%" : "2%") : ewtRateSelect} EWT.`}
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                    Chart of Accounts Target
                  </label>
                  <select
                    value={accountCode}
                    onChange={(e) => setAccountCode(e.target.value)}
                    className="w-full text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-800 dark:text-zinc-200 focus:outline-none"
                  >
                    <option value="">-- Choose Target Account --</option>
                    {filteredCoa.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.code} - {c.name} ({c.type})
                      </option>
                    ))}
                  </select>
                </div>

                {type === "Sales" && (
                  <div className="bg-zinc-50 dark:bg-zinc-950/40 p-4 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/60 space-y-3 mt-1 text-left">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="enableCwt"
                          checked={enableCwt}
                          onChange={(e) =>
                            handleEnableCwtChange(e.target.checked)
                          }
                          className="rounded border-zinc-300 dark:border-zinc-700 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                        />
                        <label
                          htmlFor="enableCwt"
                          className="text-xs font-bold text-zinc-800 dark:text-zinc-200 cursor-pointer flex items-center gap-1.5 select-none"
                        >
                          <span>
                            Creditable Withholding Tax (CWT) - BIR Form 2307
                          </span>
                        </label>
                      </div>
                    </div>

                    {enableCwt && (
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                          CWT Amount
                        </label>
                        <div className="relative flex items-center">
                          <div className="w-full text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-3.5 pr-24 py-3 text-zinc-800 dark:text-zinc-200 font-bold font-mono flex items-center justify-between">
                            <span className="flex items-center gap-1.5">
                              <span>💰</span>
                              <span>
                                Amount Expected (₱{" "}
                                {computedCwt.toLocaleString("en-US", {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                                )
                              </span>
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={handleDirect2307Generate}
                            className="absolute right-2 top-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-lg transition-colors flex items-center gap-1 font-bold text-[10px] border border-blue-100 dark:border-blue-900/40"
                          >
                            <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                            <span>2307</span>
                          </button>
                        </div>
                        <p className="text-[9px] text-zinc-400">
                          Tracked for reconciliation upon collection and Form
                          2307 receipt.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                      Client / Supplier Name
                    </label>
                    <input
                      type="text"
                      list="contacts-list"
                      placeholder="e.g. Acme MegaCorp PH"
                      value={payor}
                      onChange={(e) => {
                        const val = e.target.value;
                        setPayor(val);
                        const found = contacts.find(
                          (c) => c.registeredName === val,
                        );
                        if (found) {
                          setTin(found.tin || "");
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
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                      Registered TIN No
                    </label>
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
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                    {itemType === 'Goods' ? 'Select Inventory Item' : 'Transaction Particulars'}
                  </label>
                  {itemType === 'Goods' ? (
                    <select
                      value={particulars}
                      onChange={(e) => setParticulars(e.target.value)}
                      className="w-full text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-blue-400 font-bold"
                    >
                      <option value="">-- Select Item from Catalog --</option>
                      {inventoryItems.filter(i => i.itemType === 'Goods').map((i, idx) => (
                        <option key={idx} value={i.item}>{i.sku} - {i.item} (Qty: {i.qty})</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      placeholder="Provide full bookkeeping particulars details..."
                      value={particulars}
                      onChange={(e) => setParticulars(e.target.value)}
                      className="w-full text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-blue-400"
                    />
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                      Gross Amount (PHP)
                    </label>
                    <input
                      type="text"
                      placeholder="0.00"
                      value={grossInput}
                      onChange={(e) => handleGrossChange(e.target.value)}
                      className="w-full text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-800 dark:text-zinc-200 focus:outline-none currency-input font-bold"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                      Tax Category
                    </label>
                    <select
                      value={taxType}
                      onChange={(e: any) => {
                        const val = e.target.value;
                        setTaxType(val);
                        updateCashAndArAp(
                          type,
                          grossInput,
                          terms,
                          itemType,
                          val,
                          ewtRateSelect,
                          enableCwt,
                        );
                      }}
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
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                      Terms
                    </label>
                    <select
                      value={terms}
                      onChange={(e) => handleTermsChange(e.target.value)}
                      className="w-full text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-2.5 py-2.5 text-zinc-800 dark:text-zinc-200 focus:outline-none"
                    >
                      {type === "Expense" ? (
                        <>
                          <option value="Accounts Payable - Trade">Accounts Payable - Trade</option>
                          <option value="Accounts Payable - Non-Trade">Accounts Payable - Non-Trade</option>
                          <option value="Accrued Expenses">Accrued Expenses</option>
                          <option value="COD (Cash Disbursed)">COD (Cash Disbursed)</option>
                          <option value="30 Days (On Credit)">30 Days (On Credit)</option>
                          <option value="60 Days (On Credit)">60 Days (On Credit)</option>
                        </>
                      ) : (
                        <>
                          <option value="COD (Cash Received)">COD (Cash Received)</option>
                          <option value="On Account (Accounts Receivable / AR)">On Account (Accounts Receivable / AR)</option>
                          <option value="30 Days (On Credit)">30 Days (On Credit)</option>
                          <option value="60 Days (On Credit)">60 Days (On Credit)</option>
                        </>
                      )}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                      {type === "Sales" ? "Amount Received" : "Amount Paid"}
                    </label>
                    <input
                      type="text"
                      disabled
                      value={cashInput}
                      className="w-full text-xs bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2.5 text-zinc-500 font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                      {type === "Sales"
                        ? "Accounts Receivable"
                        : "Accounts Payable"}
                    </label>
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
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                      Journal Status
                    </label>
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

                {/* REAL-TIME JOURNAL DOUBLE-ENTRY PREVIEW */}
                {previewLines.length > 0 && (
                  <div className="mt-4 bg-zinc-50 dark:bg-zinc-950/60 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 p-4 space-y-2 text-left">
                    <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-1.5">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-500">
                        Live Double-Entry Audit Log
                      </span>
                      <span className="text-[9px] font-mono text-emerald-600 font-bold">
                        BALANCED ✓
                      </span>
                    </div>
                    <div className="space-y-1.5 text-[11px] font-mono leading-none">
                      <div className="grid grid-cols-12 gap-1 text-[9px] text-zinc-400 font-bold border-b border-zinc-105 dark:border-zinc-800 pb-1 uppercase">
                        <span className="col-span-8">ACCOUNT CODE & TITLE</span>
                        <span className="col-span-2 text-right">DEBIT</span>
                        <span className="col-span-2 text-right">CREDIT</span>
                      </div>
                      {previewLines.map((line, idx) => (
                        <div
                          key={idx}
                          className="grid grid-cols-12 gap-1 items-center py-0.5"
                        >
                          <span
                            className={`col-span-8 truncate ${line.debit > 0 ? "text-zinc-800 dark:text-zinc-200 font-semibold" : "text-zinc-500 dark:text-zinc-400 pl-3"}`}
                          >
                            {line.code} - {line.name}
                          </span>
                          <span className="col-span-2 text-right font-bold text-zinc-950 dark:text-white">
                            {line.debit > 0
                              ? `₱${formatCurrency(line.debit)}`
                              : ""}
                          </span>
                          <span className="col-span-2 text-right font-bold text-zinc-950 dark:text-white">
                            {line.credit > 0
                              ? `₱${formatCurrency(line.credit)}`
                              : ""}
                          </span>
                        </div>
                      ))}
                      <div className="grid grid-cols-12 gap-1 font-bold text-[10px] border-t border-dashed border-zinc-300 dark:border-zinc-700 pt-1.5 mt-1">
                        <span className="col-span-8 text-zinc-500 uppercase">
                          Total Balance
                        </span>
                        <span className="col-span-2 text-right text-emerald-600 dark:text-emerald-400">
                          ₱
                          {formatCurrency(
                            previewLines.reduce((s, l) => s + l.debit, 0),
                          )}
                        </span>
                        <span className="col-span-2 text-right text-emerald-600 dark:text-emerald-400">
                          ₱
                          {formatCurrency(
                            previewLines.reduce((s, l) => s + l.credit, 0),
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
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
