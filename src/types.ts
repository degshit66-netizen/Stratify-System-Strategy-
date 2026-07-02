export interface Tenant {
  id: string;
  name: string;
  tin?: string;
  address?: string;
  logo: string | null;
  subscriptionStatus: 'trial' | 'active' | 'paused' | 'terminated' | 'expired';
  trialEndsAt: string;
  expiresAt?: string;
  createdAt: string;
  isOnline: boolean;
  userLimit?: number;
  pricePaid?: number;
  subscriptionType?: 'monthly' | 'annual';
  subscriptionRequestStatus?: 'none' | 'pending' | 'approved' | 'rejected';
  subscriptionRequestPlan?: 'monthly' | 'annual';
  subscriptionRequestUserLimit?: number;
}

export interface User {
  id: string;
  email: string;
  role: 'superadmin' | 'tenant_owner' | 'tenant_user';
  tenantId?: string;
  name: string;
  authProvider?: 'google' | 'email';
}

export interface LedgerEntry {
  id: number;
  date: string; // YYYY-MM-DD
  month: string; // e.g., "JANUARY"
  year?: string; // YYYY
  type: 'Sales' | 'Expense' | 'Setup' | 'Closing';
  postingNature?: 'Cash Transaction' | 'Noncash' | 'Accrual' | 'Reversal' | 'Adjusting';
  payor: string;
  address?: string;
  particulars: string;
  tin?: string;
  ref?: string;
  paymentMode?: string;
  payRef?: string;
  taxType: 'Vatable' | 'Exempt' | 'Zero-Rated' | 'ZeroRated' | 'Non-VAT';
  category: string;
  accountCode?: string;
  attachment?: string;
  gross: number;
  taxable?: number;
  net?: number;
  vat: number;
  ewt?: number;
  cash: number;
  arAp?: number;
  terms?: string;
  status: 'Active' | 'Void' | 'Cleared' | 'Pending';
  createdBy?: string;
  createdAt: string;
  modifiedBy?: string;
  modifiedAt?: string;
  itemType?: 'Goods' | 'Services';
}

export interface ContactMaster {
  id: number | string;
  name: string;
  type: 'Client' | 'Payor' | 'Supplier' | 'Client & Supplier';
  contactPerson: string;
  email: string;
  phone: string;
  tin: string;
  address: string;
  terms: string;
  creditLimit: number;
  vatType: 'VAT Registered' | 'Non-VAT' | 'Zero-Rated' | 'Exempt';
  status: 'Active' | 'Inactive' | 'Blocked';
  notes: string;
  sales?: number;
  purchases?: number;
  lastTxn?: string;
  createdAt?: string;
  updatedAt?: string;
  source?: 'Manual' | 'Ledger';
}

export interface FixedAsset {
  id: number;
  name: string;
  acquired: string; // YYYY-MM-DD
  cost: number;
  lifeYears: number;
  source: 'Manual' | 'Ledger';
  assetAccountName?: string;
  accDepAccountName?: string;
  depreciationMethod?: 'Straight-Line' | 'Declining Balance' | 'Sum-of-Years-Digits';
  salvageValue?: number;
}

export enum TaxpayerType {
  VAT_REGISTERED = 'VAT_REGISTERED',
  NON_VAT_REGISTERED = 'NON_VAT_REGISTERED',
}

export interface TaxFormCard {
  id: string;
  formCode: string;
  title: string;
  description: string;
}

export interface SchedulerTask {
  id: number;
  title: string;
  dueDate: string; // YYYY-MM-DD
  module: string;
  status: 'Open' | 'In Progress' | 'Done';
}

export interface QuotationLine {
  id: number | string;
  sku: string;
  item: string;
  description: string;
  qty: number;
  unitPrice: number;
  stock?: number | string;
}

export interface QuotationState {
  id: number | string;
  quoteNumber: string;
  quoteDate: string; // YYYY-MM-DD
  validUntil: string; // YYYY-MM-DD
  preparedBy: string;
  clientName: string;
  companyName: string;
  email: string;
  phone: string;
  address: string;
  currency: 'PHP' | 'USD';
  vatMode: 'No VAT' | 'Vatable' | 'Zero-rated';
  discountType: 'Percent' | 'Amount';
  discountValue: number;
  taxRate: number;
  notes: string;
  terms: string;
  items: QuotationLine[];
  updatedAt?: string;
}

export interface ECommerceOrderItem {
  lineId: string;
  sku: string;
  name: string;
  qty: number;
  unitPrice: number;
  cost: number;
}

export interface ECommerceOrder {
  orderId: string;
  orderRef: string;
  platform: string; // 'TikTok Shop' | 'Lazada' | 'Shopee' | 'Custom Store'
  status: 'PENDING' | 'PAID' | 'SHIPPED' | 'FULFILLED' | 'DELIVERED' | 'COMPLETED';
  createdAt: string;
  customerName: string;
  taxInclusive: boolean;
  vatRate: number;
  gross: number;
  net: number;
  vat: number;
  shipping?: number;
  discount?: number;
  items: ECommerceOrderItem[];
  posted?: boolean;
  postedLedgerId?: number;
  postedAt?: string;
  updatedAt?: string;
}

export interface ECommerceStockMovement {
  id: number;
  orderRef: string;
  orderId: string;
  platform: string;
  sku: string;
  item: string;
  qtyDelta: number;
  unitPrice: number;
  unitCost: number;
  createdAt: string;
  source: string;
}

export interface SellerStore {
  id: string | number;
  name: string;
  platform: string;
  storeId: string;
  webhookUrl?: string;
  accessToken?: string;
  source?: string;
  status: string;
  products?: number;
  lastSync: string;
}

export interface SellerProfile {
  loggedIn: boolean;
  seller: {
    name: string;
    email: string;
    company: string;
  };
  stores: SellerStore[];
  lastSync: string;
  lastAction: string;
  lastSource: string;
}

export interface AuditLog {
  logId: number;
  timestamp: string;
  user: string;
  action: 'CREATE' | 'UPDATE' | 'VOID' | 'SYSTEM' | 'IMPORT';
  recordId: string | number;
  details: string;
  changes?: string;
}

export interface COAAccount {
  code?: string;
  name: string;
  type: 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Income' | 'Expense';
  normal: 'Debit' | 'Credit';
  fs: 'Balance Sheet' | 'Income Statement';
  cashFlow: 'Operating' | 'Investing' | 'Financing' | 'None';
  custom?: boolean;
}

export interface CompanyConfig {
  companyName: string;
  tin: string;
  address: string;
  registeredVat: boolean;
  secPermitNo: string;
  ptuNo: string;
  authorizedPIN: string;
  logoUrl?: string;
}

export interface FinancialReportContext {
  yearFilter: string;
  monthFilter: string;
  quarterFilter: string;
  periodLabel: string;
  gs: number;
  vs: number;
  ovat: number;
  cwt: number;
  ge: number;
  ve: number;
  ivat: number;
  ewt: number;
  ex_s: number;
  zr_s: number;
  ex_p: number;
  zr_p: number;
  netSales: number;
  netExp: number;
  netInc: number;
  netVat: number;
  totalCount: number;
  salesCount: number;
  purchaseCount: number;
  profileOK: boolean;
  dataOK: boolean;
  vatOK: boolean;
  score: number;
  gl: Record<string, any>;
  fsData: {
    Asset: Record<string, number>;
    Liability: Record<string, number>;
    Equity: Record<string, number>;
    Income: Record<string, number>;
    Expense: Record<string, number>;
  };
  priorCapital: number;
  priorRetainedEarnings: number;
  priorDrawings: number;
  currentAddlInvestment: number;
  currentDrawings: number;
  begCashBalance: number;
  opIn: number;
  opOut: number;
  invOut: number;
  finIn: number;
  currentNetIncome: number;
  totAsset: number;
  totLiab: number;
  totEq: number;
  totLiabEq: number;
  reportRows: any[];
  asOfDate: Date;
}
