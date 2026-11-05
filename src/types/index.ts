export type ChequeStatus = 'Draft' | 'Printed' | 'Cleared' | 'Cancelled';

export type FontChoice = 'Plus Jakarta Sans' | 'JetBrains Mono' | 'Times New Roman' | 'Arial' | 'Courier New';

export type TextAlign = 'left' | 'center' | 'right';

export interface FieldLayout {
  x: number; // millimetres from left
  y: number; // millimetres from top
  width: number; // millimetres
  height?: number; // millimetres (optional)
  fontSize: number; // in points (pt)
  fontFamily: FontChoice;
  fontWeight: 'normal' | '500' | '600' | 'bold';
  align: TextAlign;
  lineHeight?: number; // e.g. 1.2, 1.4
  letterSpacing?: number; // millimetres for split date boxes
  enabled: boolean;
  prefix?: string;
  suffix?: string;
}

export interface ChequeTemplate {
  id: string;
  bankId: string;
  name: string;
  isDefault: boolean;
  fields: {
    date: FieldLayout & { isBoxed?: boolean; boxCount?: number; boxSpacing?: number };
    payee: FieldLayout;
    amountInWords: FieldLayout & { maxLines?: number };
    amountInFigures: FieldLayout;
    acPayeeCrossing: FieldLayout & { style?: 'diagonal' | 'horizontal'; label?: string };
    bearerStrike: FieldLayout;
    signatory: FieldLayout & { label?: string };
    memo: FieldLayout;
  };
  createdAt: string;
  updatedAt: string;
}

export interface BankConfig {
  id: string;
  name: string;
  shortName: string;
  branch?: string;
  accountNumber?: string;
  accountHolderName?: string;
  widthMm: number; // default ~203mm
  heightMm: number; // default ~76mm
  defaultTemplateId?: string;
  isDefault?: boolean;
  primaryColor?: string;
  createdAt: string;
}

export interface ChequeRecord {
  id: string;
  bankId: string;
  templateId: string;
  chequeNumber: string;
  payeeName: string;
  payeeId?: string;
  amount: number;
  amountInWords: string;
  chequeDate: string; // YYYY-MM-DD
  memo?: string;
  isAcPayeeOnly: boolean;
  strikeBearer: boolean;
  status: ChequeStatus;
  printCount: number;
  lastPrintedAt?: string;
  calibrationProfileId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PayeeRecord {
  id: string;
  name: string;
  nickname?: string;
  category: 'Vendor' | 'Salary' | 'Tax / Government' | 'Rent' | 'Utilities' | 'Contractor' | 'Personal' | 'Other';
  contactNumber?: string;
  panNumber?: string;
  defaultMemo?: string;
  chequeCount: number;
  totalAmountIssued: number;
  createdAt: string;
  updatedAt: string;
}

export type FeedOrientation = 'landscape' | 'portrait-rot90';
export type TrayAlignment = 'left' | 'center' | 'right';

export interface CalibrationProfile {
  id: string;
  name: string;
  printerName: string;
  bankId: string; // or 'all'
  offsetX: number; // mm (+ moves right, - moves left)
  offsetY: number; // mm (+ moves down, - moves up)
  feedOrientation?: FeedOrientation; // 'landscape' (0°) or 'portrait-rot90' (90° vertical)
  trayAlignment?: TrayAlignment; // 'left' | 'center' | 'right'
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppSettings {
  currencySymbol: 'NPR' | 'Rs.' | 'रू';
  dateFormat: 'DD/MM/YYYY' | 'YYYY-MM-DD' | 'DD-MMM-YYYY';
  defaultBankId?: string;
  defaultPrinterProfileId?: string;
  previewZoom: number; // 50 to 150
  prefixSymbol: string; // e.g. '=' or '***'
  suffixSymbol: string; // e.g. '/-' or '***'
  defaultCrossingText: string; // 'A/C PAYEE ONLY'
  defaultStrikeBearer: boolean;
}

export interface FullBackupData {
  version: number;
  exportedAt: string;
  app: string;
  banks: BankConfig[];
  templates: ChequeTemplate[];
  cheques: ChequeRecord[];
  payees: PayeeRecord[];
  calibrations: CalibrationProfile[];
  settings: AppSettings;
}
