import React from "react";
import { formatCurrency } from "../utils/helpers";

export const renderTinSquares = (tinString: string) => {
  const cleanTin = (tinString || "").replace(/[^0-9]/g, "").padEnd(12, " ");
  const parts = [
    cleanTin.slice(0, 3),
    cleanTin.slice(3, 6),
    cleanTin.slice(6, 9),
    cleanTin.slice(9, 12),
  ];
  return (
    <div className="flex items-center gap-1">
      {parts.map((part, partIdx) => (
        <div
          key={partIdx}
          className="flex border border-zinc-950 bg-white divide-x divide-zinc-950 h-5"
        >
          {part.split("").map((char, idx) => (
            <div
              key={idx}
              className="w-3.5 h-full flex items-center justify-center font-mono text-[10px] font-extrabold text-zinc-950"
            >
              {char}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

export const Form2307Sheet = ({
  periodFrom,
  periodTo,
  payee,
  payor,
  transactions,
  grandTotals,
}: any) => {
  return (
    <div
      id="bir-2307-sheet"
      className="w-[820px] bg-[#fffdef] text-zinc-950 border-[3px] border-zinc-950 p-6 shadow-md flex flex-col space-y-3 shrink-0 print:border-none print:shadow-none print:p-0 print:w-full print:bg-white"
    >
      {/* SHEET HEADER */}
      <div className="border-b-[2px] border-zinc-950 pb-2.5 grid grid-cols-12 gap-3 items-center">
        <div className="col-span-3 border-[1.5px] border-zinc-950 p-1 bg-white h-full flex flex-col justify-between text-[8px] font-mono leading-none">
          <span className="font-bold border-b border-zinc-950 pb-1 text-[7px] uppercase block">
            BIR Form No.
          </span>
          <span className="font-extrabold text-[15px] text-center tracking-tighter block pt-1">
            2307
          </span>
          <span className="text-[7px] text-center uppercase block pt-0.5">
            January 2018 (ENCS)
          </span>
        </div>

        <div className="col-span-6 text-center space-y-0.5 leading-tight">
          <div className="text-[8px] font-mono uppercase font-bold text-zinc-700">
            Republic of the Philippines
          </div>
          <div className="text-[9px] font-serif font-extrabold uppercase tracking-tight text-zinc-900">
            Department of Finance
          </div>
          <div className="text-[10px] font-serif font-black uppercase text-zinc-900">
            Bureau of Internal Revenue
          </div>
          <h1 className="text-[12px] font-black uppercase tracking-tight text-zinc-950 border-t border-zinc-950 pt-1.5 mt-1 leading-none">
            Certificate of Creditable Tax Withheld at Source
          </h1>
        </div>

        <div className="col-span-3 h-full flex flex-col justify-center items-end text-right">
          <div className="border-[1.5px] border-zinc-950 px-2 py-2.5 bg-white font-mono text-[8px] leading-tight text-center w-full">
            <div className="font-black text-[9px] uppercase tracking-wide">
              For BIR Use Only
            </div>
            <div className="text-[7px] text-zinc-500 mt-1">
              DLN / Audit Barcode
            </div>
          </div>
        </div>
      </div>

      {/* ROW 1: PERIOD COVERED */}
      <div className="grid grid-cols-12 gap-2 border-b border-zinc-950 pb-1.5 text-[10px] font-serif leading-tight">
        <div className="col-span-1 text-[11px] font-bold text-center border-r border-zinc-950 pr-2">
          1
        </div>
        <div className="col-span-11 flex items-center justify-between pl-1">
          <span className="font-extrabold uppercase">
            For the Period Covered:
          </span>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-mono uppercase text-zinc-600">
                From
              </span>
              <span className="font-mono font-bold border-b border-zinc-950 px-3 py-0.5 min-w-[70px] text-center">
                {periodFrom || "MM/DD/YYYY"}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-mono uppercase text-zinc-600">
                To
              </span>
              <span className="font-mono font-bold border-b border-zinc-950 px-3 py-0.5 min-w-[70px] text-center">
                {periodTo || "MM/DD/YYYY"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* PART I: PAYEE */}
      <div className="border border-zinc-950 leading-tight">
        <div className="bg-zinc-950 text-white text-[9px] font-extrabold uppercase px-2.5 py-0.5 flex justify-between">
          <span>Part I - PAYEE INFORMATION</span>
          <span className="text-[7px]">Income Recipient</span>
        </div>

        {/* TIN & Branch */}
        <div className="grid grid-cols-12 border-b border-zinc-950 divide-x divide-zinc-950 items-center">
          <div className="col-span-4 p-1.5 space-y-1">
            <div className="text-[8px] font-serif font-extrabold uppercase">
              <span className="font-bold font-mono mr-1">2</span> Taxpayer
              Identification Number (TIN)
            </div>
            {renderTinSquares(payee.tin)}
          </div>
          <div className="col-span-8 p-1.5 space-y-1">
            <div className="text-[8px] font-serif font-extrabold uppercase">
              <span className="font-bold font-mono mr-1">3</span> Payee's Name
              (Registered Corporate / Last, First, Middle Name)
            </div>
            <div className="font-mono text-xs font-black uppercase text-zinc-950 px-1 truncate">
              {payee.name || "ENTERPRISE PAYEE / REGISTERED INC."}
            </div>
          </div>
        </div>

        {/* Address */}
        <div className="grid grid-cols-12 divide-x divide-zinc-950 items-center">
          <div className="col-span-9 p-1.5 space-y-1">
            <div className="text-[8px] font-serif font-extrabold uppercase">
              <span className="font-bold font-mono mr-1">4</span> Registered
              Address
            </div>
            <div className="font-mono text-[10px] font-bold text-zinc-900 px-1 truncate">
              {payee.address || "Payee Registered Address, City, Philippines"}
            </div>
          </div>
          <div className="col-span-3 p-1.5 space-y-1">
            <div className="text-[8px] font-serif font-extrabold uppercase">
              <span className="font-bold font-mono mr-1">4A</span> ZIP Code
            </div>
            <div className="font-mono text-[11px] font-extrabold text-zinc-950 px-1">
              {payee.zip || "1000"}
            </div>
          </div>
        </div>
      </div>

      {/* PART II: PAYOR */}
      <div className="border border-zinc-950 leading-tight">
        <div className="bg-zinc-950 text-white text-[9px] font-extrabold uppercase px-2.5 py-0.5 flex justify-between">
          <span>Part II - PAYOR INFORMATION</span>
          <span className="text-[7px]">Withholding Agent / Customer</span>
        </div>

        {/* TIN */}
        <div className="grid grid-cols-12 border-b border-zinc-950 divide-x divide-zinc-950 items-center">
          <div className="col-span-4 p-1.5 space-y-1">
            <div className="text-[8px] font-serif font-extrabold uppercase">
              <span className="font-bold font-mono mr-1">5</span> Taxpayer
              Identification Number (TIN)
            </div>
            {renderTinSquares(payor.tin)}
          </div>
          <div className="col-span-8 p-1.5 space-y-1">
            <div className="text-[8px] font-serif font-extrabold uppercase">
              <span className="font-bold font-mono mr-1">6</span> Payor's Name
              (Registered Corporate Name)
            </div>
            <div className="font-mono text-xs font-black uppercase text-zinc-950 px-1 truncate">
              {payor.name || "CUSTOMER CORPORATE WITHHOLDING AGENT"}
            </div>
          </div>
        </div>

        {/* Address */}
        <div className="grid grid-cols-12 divide-x divide-zinc-950 items-center">
          <div className="col-span-9 p-1.5 space-y-1">
            <div className="text-[8px] font-serif font-extrabold uppercase">
              <span className="font-bold font-mono mr-1">7</span> Registered
              Address
            </div>
            <div className="font-mono text-[10px] font-bold text-zinc-900 px-1 truncate">
              {payor.address ||
                "Customer Registered Office, Metro Manila, Philippines"}
            </div>
          </div>
          <div className="col-span-3 p-1.5 space-y-1">
            <div className="text-[8px] font-serif font-extrabold uppercase">
              <span className="font-bold font-mono mr-1">7A</span> ZIP Code
            </div>
            <div className="font-mono text-[11px] font-extrabold text-zinc-950 px-1">
              {payor.zip || "1000"}
            </div>
          </div>
        </div>
      </div>

      {/* PART III: GRID OF INCOMES */}
      <div className="border border-zinc-950 overflow-hidden leading-none">
        <div className="bg-zinc-950 text-white text-[9px] font-extrabold uppercase px-2.5 py-1 text-center">
          Part III - DETAILS OF MONTHLY INCOME PAYMENTS AND TAXES WITHHELD
        </div>

        <div className="grid grid-cols-12 bg-zinc-200 border-b border-zinc-950 divide-x divide-zinc-950 text-[8px] font-extrabold text-center items-stretch font-serif">
          <div className="col-span-4 p-1.5 flex items-center justify-center uppercase">
            Income Payments Subject to Expanded Withholding Tax
          </div>
          <div className="col-span-1 p-1.5 flex items-center justify-center">
            ATC
          </div>
          <div className="col-span-5 grid grid-cols-4 divide-x divide-zinc-950 items-stretch">
            <div className="col-span-3 grid grid-cols-3 divide-x divide-zinc-950">
              <div className="p-1 flex items-center justify-center uppercase">
                1st Month
              </div>
              <div className="p-1 flex items-center justify-center uppercase">
                2nd Month
              </div>
              <div className="p-1 flex items-center justify-center uppercase">
                3rd Month
              </div>
            </div>
            <div className="p-1 flex items-center justify-center uppercase">
              Total
            </div>
          </div>
          <div className="col-span-2 p-1.5 flex items-center justify-center uppercase">
            Tax Withheld
          </div>
        </div>

        {/* Transactions Map */}
        <div className="divide-y divide-zinc-400 font-mono text-[10px] font-bold">
          {/* Render active lines */}
          {transactions.map((t: any, idx: number) => {
            const m1 = parseFloat(t.m1) || 0;
            const m2 = parseFloat(t.m2) || 0;
            const m3 = parseFloat(t.m3) || 0;
            const rowTot = m1 + m2 + m3;
            const taxTot = rowTot * ((parseFloat(t.rate) || 0) / 100);
            return (
              <div
                key={idx}
                className="grid grid-cols-12 divide-x divide-zinc-400 text-right items-center"
              >
                <div className="col-span-4 px-2 py-2.5 text-left text-[9px] font-sans truncate font-medium text-zinc-700">
                  {t.atc === "WI158"
                    ? "Professional/Technical Services"
                    : t.atc === "WI157"
                      ? "Goods Purchase"
                      : "Creditable Income Payment"}
                </div>
                <div className="col-span-1 px-1 py-2.5 text-center font-extrabold text-zinc-950">
                  {t.atc || "WI158"}
                </div>
                <div className="col-span-5 grid grid-cols-4 divide-x divide-zinc-400 items-center">
                  <div className="col-span-3 grid grid-cols-3 divide-x divide-zinc-400">
                    <div className="px-1.5 py-2">
                      {m1 > 0 ? formatCurrency(m1) : "-"}
                    </div>
                    <div className="px-1.5 py-2">
                      {m2 > 0 ? formatCurrency(m2) : "-"}
                    </div>
                    <div className="px-1.5 py-2">
                      {m3 > 0 ? formatCurrency(m3) : "-"}
                    </div>
                  </div>
                  <div className="px-1.5 py-2 text-zinc-950 font-black">
                    {rowTot > 0 ? formatCurrency(rowTot) : "-"}
                  </div>
                </div>
                <div className="col-span-2 px-1.5 py-2 text-zinc-950 font-black text-right pr-2">
                  {taxTot > 0 ? formatCurrency(taxTot) : "-"}
                </div>
              </div>
            );
          })}

          {/* Pad empty lines to match look of real form */}
          {Array.from({ length: Math.max(0, 5 - transactions.length) }).map(
            (_, idx) => (
              <div
                key={`empty-${idx}`}
                className="grid grid-cols-12 divide-x divide-zinc-400 text-right items-center text-zinc-300"
              >
                <div className="col-span-4 px-2 py-2 text-left text-[9px]">
                  &nbsp;
                </div>
                <div className="col-span-1 px-1 py-2 text-center">&nbsp;</div>
                <div className="col-span-5 grid grid-cols-4 divide-x divide-zinc-400 items-center">
                  <div className="col-span-3 grid grid-cols-3 divide-x divide-zinc-400">
                    <div className="px-1.5 py-2">-</div>
                    <div className="px-1.5 py-2">-</div>
                    <div className="px-1.5 py-2">-</div>
                  </div>
                  <div className="px-1.5 py-2">-</div>
                </div>
                <div className="col-span-2 px-1.5 py-2">-</div>
              </div>
            ),
          )}

          {/* Total Line */}
          <div className="grid grid-cols-12 divide-x divide-zinc-950 border-t border-zinc-950 text-right items-center bg-zinc-100 font-serif text-[9px] font-extrabold py-1">
            <div className="col-span-5 px-3 py-1.5 text-left uppercase">
              Total Taxes Withheld
            </div>
            <div className="col-span-5 grid grid-cols-4 divide-x divide-zinc-950 items-center font-mono text-[10px]">
              <div className="col-span-3 grid grid-cols-3 divide-x divide-zinc-950">
                <div className="px-1.5">
                  {grandTotals.m1Tot > 0
                    ? formatCurrency(grandTotals.m1Tot)
                    : "-"}
                </div>
                <div className="px-1.5">
                  {grandTotals.m2Tot > 0
                    ? formatCurrency(grandTotals.m2Tot)
                    : "-"}
                </div>
                <div className="px-1.5">
                  {grandTotals.m3Tot > 0
                    ? formatCurrency(grandTotals.m3Tot)
                    : "-"}
                </div>
              </div>
              <div className="px-1.5 text-zinc-950 font-black">
                {grandTotals.netTot > 0
                  ? formatCurrency(grandTotals.netTot)
                  : "-"}
              </div>
            </div>
            <div className="col-span-2 px-1.5 text-right font-black text-zinc-950 text-[10px] pr-2">
              ₱{formatCurrency(grandTotals.taxTot)}
            </div>
          </div>
        </div>
      </div>

      {/* PART IV: SIGNATURES & CONFORME */}
      <div className="border border-zinc-950 p-3 bg-white space-y-4">
        <p className="text-[7.5px] font-sans text-zinc-600 leading-normal text-justify">
          We declare under the penalties of perjury that this certificate has
          been made in good faith, verified by us, and to the best of our
          knowledge and belief, is a true and correct certificate, pursuant to
          the provisions of the National Internal Revenue Code, as amended, and
          the regulations issued under authority thereof.
        </p>

        <div className="grid grid-cols-12 gap-4 pt-2">
          <div className="col-span-6 flex flex-col items-center justify-between space-y-5">
            <div className="border-b border-zinc-900 w-full h-8 flex items-end justify-center">
              <span className="text-[10px] font-mono text-zinc-300 font-medium">
                Digital Signature / Authorized Representative
              </span>
            </div>
            <div className="text-[7.5px] font-bold uppercase tracking-wider text-center text-zinc-800">
              Signature over Printed Name of Payor/Payor's Authorized
              Representative
            </div>
          </div>

          <div className="col-span-6 flex flex-col items-center justify-between space-y-5">
            <div className="border-b border-zinc-900 w-full h-8 flex items-end justify-center">
              <span className="text-[10px] font-mono text-zinc-300 font-medium">
                Conforme / Authorized Recipient Signature
              </span>
            </div>
            <div className="text-[7.5px] font-bold uppercase tracking-wider text-center text-zinc-800">
              CONFORME: Signature over Printed Name of Payee/Payee's Authorized
              Representative
            </div>
          </div>
        </div>
      </div>

      {/* METADATA FOOTER OF BIR */}
      <div className="flex justify-between items-center text-[7px] font-mono text-zinc-400">
        <span>
          BIR Form 2307 - Certificate of Creditable Tax Withheld at Source
        </span>
        <span>Electronic Receipt Verification Compliant</span>
      </div>
    </div>
  );
};
