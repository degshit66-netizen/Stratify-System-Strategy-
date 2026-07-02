import React from 'react';

export const Form2307Module: React.FC = () => {
  return (
    <div className="space-y-6 max-w-full overflow-x-auto pb-10">
      <div className="flex justify-between items-center no-print">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">BIR Form 2307 Builder</h2>
          <p className="text-sm text-zinc-500">Certificate of Creditable Tax Withheld at Source</p>
        </div>
        <div className="flex gap-3">
          <label className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold text-xs rounded-xl shadow-sm hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer border border-zinc-200 dark:border-zinc-700">
            Upload PDF Template
            <input type="file" accept="application/pdf" className="hidden" onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                alert('Ang PDF upload feature ay handa na. Kasalukuyang inaayos ang integration para sa pag-fill up nito.');
              }
            }} />
          </label>
          <button className="px-4 py-2 bg-blue-600 text-white font-bold text-xs rounded-xl shadow-sm hover:bg-blue-700 transition-colors" onClick={() => window.print()}>
            Print 2307
          </button>
        </div>
      </div>
      
      {/* 2307 TEMPLATE - A4 Size Container */}
      <div className="bg-white text-black border border-gray-300 mx-auto shadow-md print:shadow-none" style={{ width: '210mm', minHeight: '297mm', fontFamily: 'Arial, sans-serif' }}>
        
        {/* Header section */}
        <div className="flex border-b-[3px] border-black p-2 items-center">
          <div className="w-[15%] text-[9px] leading-tight">
            For BIR<br/>
            Use Only
          </div>
          <div className="w-[15%]">
            <img src="https://www.bir.gov.ph/images/bir_logo.png" alt="BIR Logo" className="w-20 h-20 object-contain mx-auto" />
          </div>
          <div className="w-[45%] text-center leading-tight">
            <p className="font-bold text-[11px]">Republic of the Philippines</p>
            <p className="font-bold text-[11px]">Department of Finance</p>
            <p className="font-bold text-[11px]">Bureau of Internal Revenue</p>
          </div>
          <div className="w-[25%] text-right pr-2">
            {/* Barcode SVG representation */}
            <div className="flex justify-end items-center mb-1">
              <svg width="120" height="30" viewBox="0 0 120 30" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <rect x="0" y="0" width="2" height="30"/>
                <rect x="4" y="0" width="4" height="30"/>
                <rect x="10" y="0" width="2" height="30"/>
                <rect x="14" y="0" width="6" height="30"/>
                <rect x="22" y="0" width="2" height="30"/>
                <rect x="28" y="0" width="4" height="30"/>
                <rect x="34" y="0" width="2" height="30"/>
                <rect x="38" y="0" width="8" height="30"/>
                <rect x="48" y="0" width="2" height="30"/>
                <rect x="52" y="0" width="4" height="30"/>
                <rect x="58" y="0" width="2" height="30"/>
                <rect x="62" y="0" width="6" height="30"/>
                <rect x="70" y="0" width="2" height="30"/>
                <rect x="74" y="0" width="4" height="30"/>
                <rect x="80" y="0" width="2" height="30"/>
                <rect x="84" y="0" width="8" height="30"/>
                <rect x="94" y="0" width="2" height="30"/>
                <rect x="98" y="0" width="4" height="30"/>
                <rect x="104" y="0" width="2" height="30"/>
                <rect x="108" y="0" width="6" height="30"/>
                <rect x="116" y="0" width="4" height="30"/>
              </svg>
            </div>
            <p className="text-[8px]">2307 01/18ENCS</p>
          </div>
        </div>

        {/* Title section */}
        <div className="flex border-b-[3px] border-black">
          <div className="w-[25%] p-2 border-r-[3px] border-black text-center">
            <p className="font-bold text-xs">BIR Form No.</p>
            <p className="font-bold text-4xl">2307</p>
            <p className="text-[10px] font-bold">January 2018 (ENCS)</p>
          </div>
          <div className="w-[75%] flex items-center justify-center p-4">
            <h1 className="font-bold text-2xl uppercase text-center leading-tight">
              Certificate of Creditable Tax<br/>Withheld at Source
            </h1>
          </div>
        </div>

        {/* Period section */}
        <div className="text-[9px] bg-gray-100 border-b border-black px-2 py-0.5 font-bold">
          Fill in all applicable spaces. Mark all appropriate boxes with an "X".
        </div>
        
        <div className="flex border-b-2 border-black text-xs font-bold items-center">
          <div className="w-[5%] text-center border-r border-black p-1">1</div>
          <div className="w-[15%] p-1">For the Period</div>
          <div className="w-[80%] flex items-center p-1 gap-2">
            <span>From</span>
            <input type="text" className="border border-black w-32 px-1 py-0.5 text-center text-xs" placeholder="MM/DD/YYYY" />
            <span>To</span>
            <input type="text" className="border border-black w-32 px-1 py-0.5 text-center text-xs" placeholder="MM/DD/YYYY" />
          </div>
        </div>

        {/* Part I - Payee Information */}
        <div className="border-b-[3px] border-black p-1 text-center text-xs font-bold bg-gray-200 uppercase tracking-wider">
          Part I – Payee Information
        </div>
        
        <div className="flex border-b border-black text-[10px] items-stretch">
          <div className="w-[5%] text-center border-r border-black p-1 font-bold">2</div>
          <div className="w-[30%] p-1 font-bold flex items-center">Taxpayer Identification Number (TIN)</div>
          <div className="w-[65%] p-1 flex items-center gap-1">
            <input type="text" className="border border-black w-12 text-center" maxLength={3}/> - 
            <input type="text" className="border border-black w-12 text-center" maxLength={3}/> - 
            <input type="text" className="border border-black w-12 text-center" maxLength={3}/> - 
            <input type="text" className="border border-black w-16 text-center" maxLength={5}/>
          </div>
        </div>

        <div className="flex border-b border-black text-[10px] flex-col">
          <div className="flex bg-gray-100">
            <div className="w-[5%] text-center border-r border-black p-1 font-bold">3</div>
            <div className="w-[95%] p-1">Payee's Name (Last Name, First Name, Middle Name for Individual OR Registered Name for Non-Individual)</div>
          </div>
          <div className="px-6 py-1">
            <input type="text" className="w-full border-b border-black focus:outline-none" />
          </div>
        </div>

        <div className="flex border-b border-black text-[10px] flex-col">
          <div className="flex bg-gray-100">
            <div className="w-[5%] text-center border-r border-black p-1 font-bold">4</div>
            <div className="w-[85%] p-1">Registered Address</div>
            <div className="w-[10%] p-1 border-l border-black text-center font-bold">4A ZIP Code</div>
          </div>
          <div className="flex px-6 py-1">
            <input type="text" className="w-[85%] border-b border-black focus:outline-none mr-2" />
            <input type="text" className="w-[15%] border-b border-black focus:outline-none text-center" />
          </div>
        </div>

        <div className="flex border-b-[3px] border-black text-[10px] flex-col">
          <div className="flex bg-gray-100">
            <div className="w-[5%] text-center border-r border-black p-1 font-bold">5</div>
            <div className="w-[95%] p-1">Foreign Address, if applicable</div>
          </div>
          <div className="px-6 py-1">
            <input type="text" className="w-full border-b border-black focus:outline-none" />
          </div>
        </div>

        {/* Part II - Payor Information */}
        <div className="border-b-[3px] border-black p-1 text-center text-xs font-bold bg-gray-200 uppercase tracking-wider">
          Part II – Payor Information
        </div>

        <div className="flex border-b border-black text-[10px] items-stretch">
          <div className="w-[5%] text-center border-r border-black p-1 font-bold">6</div>
          <div className="w-[30%] p-1 font-bold flex items-center">Taxpayer Identification Number (TIN)</div>
          <div className="w-[65%] p-1 flex items-center gap-1">
            <input type="text" className="border border-black w-12 text-center" maxLength={3}/> - 
            <input type="text" className="border border-black w-12 text-center" maxLength={3}/> - 
            <input type="text" className="border border-black w-12 text-center" maxLength={3}/> - 
            <input type="text" className="border border-black w-16 text-center" maxLength={5}/>
          </div>
        </div>

        <div className="flex border-b border-black text-[10px] flex-col">
          <div className="flex bg-gray-100">
            <div className="w-[5%] text-center border-r border-black p-1 font-bold">7</div>
            <div className="w-[95%] p-1">Payor's Name (Last Name, First Name, Middle Name for Individual OR Registered Name for Non-Individual)</div>
          </div>
          <div className="px-6 py-1">
            <input type="text" className="w-full border-b border-black focus:outline-none" />
          </div>
        </div>

        <div className="flex border-b-[3px] border-black text-[10px] flex-col">
          <div className="flex bg-gray-100">
            <div className="w-[5%] text-center border-r border-black p-1 font-bold">8</div>
            <div className="w-[85%] p-1">Registered Address</div>
            <div className="w-[10%] p-1 border-l border-black text-center font-bold">8A ZIP Code</div>
          </div>
          <div className="flex px-6 py-1">
            <input type="text" className="w-[85%] border-b border-black focus:outline-none mr-2" />
            <input type="text" className="w-[15%] border-b border-black focus:outline-none text-center" />
          </div>
        </div>

        {/* Part III - Details of Monthly Income Payments and Taxes Withheld */}
        <div className="border-b border-black p-1 text-center text-[10px] font-bold bg-[#A8D08D] uppercase tracking-wider">
          Part III – Details of Monthly Income Payments and Taxes Withheld
        </div>

        <table className="w-full text-[9px] border-b-2 border-black border-collapse">
          <thead>
            <tr className="text-center font-bold bg-[#A8D08D]">
              <th className="border-r border-b border-black p-1 w-[35%] align-middle" rowSpan={2}>Income Payments Subject to Expanded<br/>Withholding Tax</th>
              <th className="border-r border-b border-black p-1 w-[10%] align-middle" rowSpan={2}>ATC</th>
              <th className="border-r border-b border-black p-1 w-[40%]" colSpan={4}>AMOUNT OF INCOME PAYMENTS</th>
              <th className="border-b border-black p-1 w-[15%] align-middle" rowSpan={2}>Tax Withheld for the<br/>Quarter</th>
            </tr>
            <tr className="text-center font-bold bg-[#A8D08D]">
              <th className="border-r border-b border-black p-1">1st Month of the<br/>Quarter</th>
              <th className="border-r border-b border-black p-1">2nd Month of the<br/>Quarter</th>
              <th className="border-r border-b border-black p-1">3rd Month of the<br/>Quarter</th>
              <th className="border-r border-b border-black p-1">Total</th>
            </tr>
          </thead>
          <tbody>
            {[...Array(12)].map((_, i) => (
              <tr key={i}>
                <td className="border-r border-b border-black p-1 h-5"><input type="text" className="w-full bg-transparent focus:outline-none" /></td>
                <td className="border-r border-b border-black p-1 h-5"><input type="text" className="w-full bg-transparent text-center focus:outline-none" /></td>
                <td className="border-r border-b border-black p-1 h-5"><input type="text" className="w-full bg-transparent text-right focus:outline-none" /></td>
                <td className="border-r border-b border-black p-1 h-5"><input type="text" className="w-full bg-transparent text-right focus:outline-none" /></td>
                <td className="border-r border-b border-black p-1 h-5"><input type="text" className="w-full bg-transparent text-right focus:outline-none" /></td>
                <td className="border-r border-b border-black p-1 h-5"><input type="text" className="w-full bg-transparent text-right focus:outline-none" /></td>
                <td className="border-b border-black p-1 h-5"><input type="text" className="w-full bg-transparent text-right focus:outline-none" /></td>
              </tr>
            ))}
            <tr className="font-bold bg-gray-100">
              <td colSpan={2} className="border-r border-b border-black p-1 text-right">Total</td>
              <td className="border-r border-b border-black p-1 h-5"></td>
              <td className="border-r border-b border-black p-1 h-5"></td>
              <td className="border-r border-b border-black p-1 h-5"></td>
              <td className="border-r border-b border-black p-1 h-5 text-right"><input type="text" className="w-full bg-transparent text-right focus:outline-none font-bold" /></td>
              <td className="border-b border-black p-1 h-5 text-right"><input type="text" className="w-full bg-transparent text-right focus:outline-none font-bold" /></td>
            </tr>
            <tr className="font-bold bg-gray-200">
              <td colSpan={7} className="border-b border-black p-1">Money Payments Subject to Withholding of Business Tax (Government & Private)</td>
            </tr>
            {[...Array(5)].map((_, i) => (
              <tr key={'bus'+i}>
                <td className="border-r border-b border-black p-1 h-5"><input type="text" className="w-full bg-transparent focus:outline-none" /></td>
                <td className="border-r border-b border-black p-1 h-5"><input type="text" className="w-full bg-transparent text-center focus:outline-none" /></td>
                <td className="border-r border-b border-black p-1 h-5"><input type="text" className="w-full bg-transparent text-right focus:outline-none" /></td>
                <td className="border-r border-b border-black p-1 h-5"><input type="text" className="w-full bg-transparent text-right focus:outline-none" /></td>
                <td className="border-r border-b border-black p-1 h-5"><input type="text" className="w-full bg-transparent text-right focus:outline-none" /></td>
                <td className="border-r border-b border-black p-1 h-5"><input type="text" className="w-full bg-transparent text-right focus:outline-none" /></td>
                <td className="border-b border-black p-1 h-5"><input type="text" className="w-full bg-transparent text-right focus:outline-none" /></td>
              </tr>
            ))}
            <tr className="font-bold bg-gray-100">
              <td colSpan={2} className="border-r border-b border-black p-1 text-right">Total</td>
              <td className="border-r border-b border-black p-1 h-5"></td>
              <td className="border-r border-b border-black p-1 h-5"></td>
              <td className="border-r border-b border-black p-1 h-5"></td>
              <td className="border-r border-b border-black p-1 h-5 text-right"><input type="text" className="w-full bg-transparent text-right focus:outline-none font-bold" /></td>
              <td className="border-b border-black p-1 h-5 text-right"><input type="text" className="w-full bg-transparent text-right focus:outline-none font-bold" /></td>
            </tr>
          </tbody>
        </table>

        {/* Declaration Section */}
        <div className="p-2 text-[9px] text-justify">
          <p className="indent-8">
            We declare under the penalties of perjury that this certificate has been made in good faith, verified by us, and to the best of our knowledge and belief, is true and correct, pursuant to the provisions of the National Internal Revenue Code, as amended, and the regulations issued under authority thereof. Further, we give our consent to the processing of our information as contemplated under the *Data Privacy Act of 2012 (R.A. No. 10173) for legitimate and lawful purposes.
          </p>
        </div>

        {/* Signatures Payor */}
        <div className="border-t-[3px] border-b-2 border-black bg-gray-200 p-1 text-center font-bold text-[9px]">
          Signature over Printed Name of Payor/Payor's Authorized Representative/Tax Agent<br/>
          <span className="font-normal italic">(Indicate Title/Designation and TIN)</span>
        </div>
        <div className="flex border-b-[3px] border-black text-[9px]">
          <div className="w-[40%] border-r border-black p-1">
            <span className="block mb-1">Tax Agent Accreditation No./</span>
            <span className="block">Attorney's Roll No. (if applicable)</span>
            <input type="text" className="w-full border-b border-black mt-1 bg-transparent" />
          </div>
          <div className="w-[30%] border-r border-black p-1">
            <span className="block mb-1">Date of Issue</span>
            <span className="block italic">(MM/DD/YYYY)</span>
            <input type="text" className="w-full border-b border-black mt-1 bg-transparent" />
          </div>
          <div className="w-[30%] p-1">
            <span className="block mb-1">Date of Expiry</span>
            <span className="block italic">(MM/DD/YYYY)</span>
            <input type="text" className="w-full border-b border-black mt-1 bg-transparent" />
          </div>
        </div>

        {/* Signatures Payee CONFORME */}
        <div className="border-b-[3px] border-black bg-gray-200 p-1 text-center font-bold text-[10px]">
          CONFORME:
        </div>
        <div className="border-b-[3px] border-black bg-gray-100 p-1 text-center font-bold text-[9px] h-12 flex flex-col justify-end">
          Signature over Printed Name of Payee/Payee's Authorized Representative/Tax Agent<br/>
          <span className="font-normal italic">(Indicate Title/Designation and TIN)</span>
        </div>
        <div className="flex border-b border-black text-[9px]">
          <div className="w-[40%] border-r border-black p-1">
            <span className="block mb-1">Tax Agent Accreditation No./</span>
            <span className="block">Attorney's Roll No. (if applicable)</span>
            <input type="text" className="w-full border-b border-black mt-1 bg-transparent" />
          </div>
          <div className="w-[30%] border-r border-black p-1">
            <span className="block mb-1">Date of Issue</span>
            <span className="block italic">(MM/DD/YYYY)</span>
            <input type="text" className="w-full border-b border-black mt-1 bg-transparent" />
          </div>
          <div className="w-[30%] p-1">
            <span className="block mb-1">Date of Expiry</span>
            <span className="block italic">(MM/DD/YYYY)</span>
            <input type="text" className="w-full border-b border-black mt-1 bg-transparent" />
          </div>
        </div>
        <div className="p-1 text-[8px]">
          *NOTE: The BIR Data Privacy is in the BIR website (www.bir.gov.ph)
        </div>

      </div>
    </div>
  );
};

