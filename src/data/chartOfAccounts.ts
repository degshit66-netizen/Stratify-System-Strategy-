import { COAAccount } from '../types';

export const BUILTIN_CHART_OF_ACCOUNTS: Record<string, COAAccount> = {
  "1010": { name: "Cash in Bank / on Hand", type: "Asset", normal: "Debit", fs: "Balance Sheet", cashFlow: "Operating" },
  "1011": { name: "Cash on Hand", type: "Asset", normal: "Debit", fs: "Balance Sheet", cashFlow: "Operating" },
  "1012": { name: "Cash in Bank", type: "Asset", normal: "Debit", fs: "Balance Sheet", cashFlow: "Operating" },
  "1013": { name: "Petty Cash Fund", type: "Asset", normal: "Debit", fs: "Balance Sheet", cashFlow: "Operating" },
  "1020": { name: "Accounts Receivable", type: "Asset", normal: "Debit", fs: "Balance Sheet", cashFlow: "Operating" },
  "1021": { name: "Inventory, beginning", type: "Asset", normal: "Debit", fs: "Balance Sheet", cashFlow: "Operating" },
  "1022": { name: "Inventory, ending", type: "Asset", normal: "Debit", fs: "Balance Sheet", cashFlow: "Operating" },
  "1050": { name: "Inventory", type: "Asset", normal: "Debit", fs: "Balance Sheet", cashFlow: "Operating" },
  "1060": { name: "Prepaid Supplies", type: "Asset", normal: "Debit", fs: "Balance Sheet", cashFlow: "Operating" },
  "1070": { name: "Input VAT", type: "Asset", normal: "Debit", fs: "Balance Sheet", cashFlow: "Operating" },
  "1080": { name: "Creditable Withholding Tax (CWT)", type: "Asset", normal: "Debit", fs: "Balance Sheet", cashFlow: "Operating" },
  "1500": { name: "Property, Plant & Equipment", type: "Asset", normal: "Debit", fs: "Balance Sheet", cashFlow: "Investing" },
  "1501": { name: "PPE", type: "Asset", normal: "Debit", fs: "Balance Sheet", cashFlow: "Investing" },
  "1510": { name: "Furniture & Fixtures", type: "Asset", normal: "Debit", fs: "Balance Sheet", cashFlow: "Investing" },
  "1520": { name: "Accumulated Depreciation", type: "Asset", normal: "Credit", fs: "Balance Sheet", cashFlow: "Investing" },
  "1530": { name: "Security Deposits", type: "Asset", normal: "Debit", fs: "Balance Sheet", cashFlow: "Operating" },

  "2010": { name: "Accounts Payable", type: "Liability", normal: "Credit", fs: "Balance Sheet", cashFlow: "Operating" },
  "2011": { name: "AP", type: "Liability", normal: "Credit", fs: "Balance Sheet", cashFlow: "Operating" },
  "2012": { name: "Accounts Payable - Trade", type: "Liability", normal: "Credit", fs: "Balance Sheet", cashFlow: "Operating" },
  "2013": { name: "Accounts Payable - Non-Trade", type: "Liability", normal: "Credit", fs: "Balance Sheet", cashFlow: "Operating" },
  "2014": { name: "Accrued Expenses", type: "Liability", normal: "Credit", fs: "Balance Sheet", cashFlow: "Operating" },
  "2020": { name: "Loans Payable", type: "Liability", normal: "Credit", fs: "Balance Sheet", cashFlow: "Financing" },
  "2030": { name: "SSS Payable", type: "Liability", normal: "Credit", fs: "Balance Sheet", cashFlow: "Operating" },
  "2040": { name: "Philhealth Payable", type: "Liability", normal: "Credit", fs: "Balance Sheet", cashFlow: "Operating" },
  "2050": { name: "Pagibig Payable", type: "Liability", normal: "Credit", fs: "Balance Sheet", cashFlow: "Operating" },
  "2060": { name: "Income Tax Payable", type: "Liability", normal: "Credit", fs: "Balance Sheet", cashFlow: "Operating" },
  "2070": { name: "VAT Payable", type: "Liability", normal: "Credit", fs: "Balance Sheet", cashFlow: "Operating" },
  "2080": { name: "Accrued Expense", type: "Liability", normal: "Credit", fs: "Balance Sheet", cashFlow: "Operating" },
  "2090": { name: "Unearned Revenue", type: "Liability", normal: "Credit", fs: "Balance Sheet", cashFlow: "Operating" },
  "2100": { name: "Output VAT Payable", type: "Liability", normal: "Credit", fs: "Balance Sheet", cashFlow: "Operating" },
  "2110": { name: "EWT Payable", type: "Liability", normal: "Credit", fs: "Balance Sheet", cashFlow: "Operating" },

  "3010": { name: "Owner's Capital", type: "Equity", normal: "Credit", fs: "Balance Sheet", cashFlow: "Financing" },
  "3011": { name: "Owners Capital", type: "Equity", normal: "Credit", fs: "Balance Sheet", cashFlow: "Financing" },
  "3020": { name: "Owner's Drawings", type: "Equity", normal: "Debit", fs: "Balance Sheet", cashFlow: "Financing" },
  "3021": { name: "Drawings", type: "Equity", normal: "Debit", fs: "Balance Sheet", cashFlow: "Financing" },
  "3100": { name: "Retained Earnings", type: "Equity", normal: "Credit", fs: "Balance Sheet", cashFlow: "None" },
  "3101": { name: "RE", type: "Equity", normal: "Credit", fs: "Balance Sheet", cashFlow: "None" },
  "3110": { name: "Income Summary", type: "Equity", normal: "Credit", fs: "Balance Sheet", cashFlow: "None" },

  "4010": { name: "Sales Revenue - Goods", type: "Income", normal: "Credit", fs: "Income Statement", cashFlow: "Operating" },
  "4011": { name: "Service Revenue", type: "Income", normal: "Credit", fs: "Income Statement", cashFlow: "Operating" },
  "4012": { name: "Sales Return and Allowances", type: "Income", normal: "Debit", fs: "Income Statement", cashFlow: "Operating" },
  "4013": { name: "Other Income", type: "Income", normal: "Credit", fs: "Income Statement", cashFlow: "Operating" },

  "5010": { name: "Purchases", type: "Expense", normal: "Debit", fs: "Income Statement", cashFlow: "Operating" },
  "5011": { name: "Purchase Return and Allowances", type: "Expense", normal: "Credit", fs: "Income Statement", cashFlow: "Operating" },
  "5012": { name: "Freight In", type: "Expense", normal: "Debit", fs: "Income Statement", cashFlow: "Operating" },
  "5013": { name: "Cost of Goods Sold", type: "Expense", normal: "Debit", fs: "Income Statement", cashFlow: "Operating" },

  "6010": { name: "Salaries and Wages", type: "Expense", normal: "Debit", fs: "Income Statement", cashFlow: "Operating" },
  "6011": { name: "SSS Contribution Expense (ER share)", type: "Expense", normal: "Debit", fs: "Income Statement", cashFlow: "Operating" },
  "6012": { name: "Philhealth Contribution Expense (ER share)", type: "Expense", normal: "Debit", fs: "Income Statement", cashFlow: "Operating" },
  "6013": { name: "Pagibig Contribution Expense (ER share)", type: "Expense", normal: "Debit", fs: "Income Statement", cashFlow: "Operating" },
  "6014": { name: "Commission Expense", type: "Expense", normal: "Debit", fs: "Income Statement", cashFlow: "Operating" },
  "6015": { name: "Professional Fee", type: "Expense", normal: "Debit", fs: "Income Statement", cashFlow: "Operating" },
  "6016": { name: "Incentive Expense", type: "Expense", normal: "Debit", fs: "Income Statement", cashFlow: "Operating" },
  "6017": { name: "Benevolence Expense", type: "Expense", normal: "Debit", fs: "Income Statement", cashFlow: "Operating" },
  "6018": { name: "Charitable Contribution", type: "Expense", normal: "Debit", fs: "Income Statement", cashFlow: "Operating" },
  "6020": { name: "Rent Expense", type: "Expense", normal: "Debit", fs: "Income Statement", cashFlow: "Operating" },
  "6030": { name: "Utilities Expense", type: "Expense", normal: "Debit", fs: "Income Statement", cashFlow: "Operating" },
  "6040": { name: "Depreciation Expense", type: "Expense", normal: "Debit", fs: "Income Statement", cashFlow: "Operating" },
  "6050": { name: "Repairs and Maintenance", type: "Expense", normal: "Debit", fs: "Income Statement", cashFlow: "Operating" },
  "6060": { name: "Freight Out", type: "Expense", normal: "Debit", fs: "Income Statement", cashFlow: "Operating" },
  "6070": { name: "Fuel and Oil", type: "Expense", normal: "Debit", fs: "Income Statement", cashFlow: "Operating" },
  "6080": { name: "Toll and Parking", type: "Expense", normal: "Debit", fs: "Income Statement", cashFlow: "Operating" },
  "6090": { name: "Transportation Expense", type: "Expense", normal: "Debit", fs: "Income Statement", cashFlow: "Operating" },
  "6100": { name: "Supplies Expense", type: "Expense", normal: "Debit", fs: "Income Statement", cashFlow: "Operating" },
  "6110": { name: "Marketing Expense", type: "Expense", normal: "Debit", fs: "Income Statement", cashFlow: "Operating" },
  "6120": { name: "Meals Expense", type: "Expense", normal: "Debit", fs: "Income Statement", cashFlow: "Operating" },
  "6130": { name: "Business Permit and Licenses", type: "Expense", normal: "Debit", fs: "Income Statement", cashFlow: "Operating" },
  "6140": { name: "Bank Charges", type: "Expense", normal: "Debit", fs: "Income Statement", cashFlow: "Operating" },
  "6150": { name: "Insurance Expense", type: "Expense", normal: "Debit", fs: "Income Statement", cashFlow: "Operating" },
  "6160": { name: "Income Tax Expense", type: "Expense", normal: "Debit", fs: "Income Statement", cashFlow: "Operating" },
  "6170": { name: "Miscellaneous Expense", type: "Expense", normal: "Debit", fs: "Income Statement", cashFlow: "Operating" }
};

export const ACCOUNT_ALIASES: Record<string, string> = {
  'cash': 'Cash in Bank / on Hand',
  'cash on hand': 'Cash on Hand',
  'cash in bank': 'Cash in Bank',
  'petty cash': 'Petty Cash Fund',
  'ar': 'Accounts Receivable',
  'ap': 'AP',
  'ppe': 'PPE',
  'acc. depreciation': 'Accumulated Depreciation',
  'accumulated depreciation': 'Accumulated Depreciation',
  'vat payable': 'VAT Payable',
  'output vat payable': 'Output VAT Payable',
  'cwt': 'Creditable Withholding Tax (CWT)',
  're': 'RE',
  'retained earnings': 'Retained Earnings',
  'income summary': 'Income Summary',
  'owners capital': "Owners Capital",
  "owner's capital": "Owner's Capital",
  'drawings': 'Drawings',
  "owner's drawings": "Owner's Drawings",
  'sales return and allowances': 'Sales Return and Allowances',
  'purchase return and allowances': 'Purchase Return and Allowances',
  'purchases': 'Purchases',
  'freight in': 'Freight In',
  'freight out': 'Freight Out',
  'sales revenue': 'Sales Revenue - Goods',
  'sales': 'Sales Revenue - Goods',
  'sales revenue - goods': 'Sales Revenue - Goods',
  'service income': 'Service Revenue',
  'service revenue': 'Service Revenue'
};

const CUSTOM_COA_STORAGE_KEY = 'stratify_custom_coa_catalog';

export function getCompleteChartOfAccounts(): Record<string, COAAccount> {
  const catalog = { ...BUILTIN_CHART_OF_ACCOUNTS };
  try {
    const raw = localStorage.getItem(CUSTOM_COA_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        Object.keys(parsed).forEach(code => {
          const acc = parsed[code];
          if (acc && typeof acc === 'object') {
            catalog[code] = {
              name: String(acc.name || '').trim(),
              type: acc.type,
              normal: acc.normal,
              fs: acc.fs,
              cashFlow: acc.cashFlow,
              custom: true
            };
          }
        });
      }
    }
  } catch (e) {
    console.error("Error reading custom COA", e);
  }
  return catalog;
}

export function saveCustomCoaAccount(code: string, account: COAAccount) {
  try {
    const raw = localStorage.getItem(CUSTOM_COA_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    parsed[code] = {
      name: account.name,
      type: account.type,
      normal: account.normal,
      fs: account.fs,
      cashFlow: account.cashFlow
    };
    localStorage.setItem(CUSTOM_COA_STORAGE_KEY, JSON.stringify(parsed));
  } catch (e) {
    console.error("Error saving custom COA", e);
  }
}

export function deleteCustomCoaAccount(code: string) {
  try {
    const raw = localStorage.getItem(CUSTOM_COA_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      delete parsed[code];
      localStorage.setItem(CUSTOM_COA_STORAGE_KEY, JSON.stringify(parsed));
    }
  } catch (e) {
    console.error("Error deleting custom COA", e);
  }
}

export function resolveAccountName(rawName: string): string {
  const name = String(rawName || '').trim();
  if (!name) return '';
  const catalog = getCompleteChartOfAccounts();
  const exactMatch = Object.values(catalog).find(a => String(a.name || '').toLowerCase() === name.toLowerCase());
  if (exactMatch) return exactMatch.name;
  return ACCOUNT_ALIASES[name.toLowerCase()] || name;
}

export function getCoaDetails(catName: string, type: 'Sales' | 'Expense' | 'Setup' | 'Closing'): COAAccount {
  const resolved = resolveAccountName(catName);
  const catalog = getCompleteChartOfAccounts();
  const found = Object.values(catalog).find(a => String(a.name || '').toLowerCase() === resolved.toLowerCase());
  if (found) return found;

  if (type === 'Sales') {
    return { name: resolved || 'Sales Revenue', type: 'Income', normal: 'Credit', fs: 'Income Statement', cashFlow: 'Operating' };
  }
  if (type === 'Setup') {
    return { name: resolved || 'Owners Capital', type: 'Equity', normal: 'Credit', fs: 'Balance Sheet', cashFlow: 'Financing' };
  }
  return { name: resolved || 'Miscellaneous Expense', type: 'Expense', normal: 'Debit', fs: 'Income Statement', cashFlow: 'Operating' };
}
