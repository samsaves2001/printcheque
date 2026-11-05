import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Printer,
  RotateCcw,
  Save,
  AlertTriangle,
  Eye,
  CheckCircle2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Plus,
  Calendar,
  Grid,
  Ruler,
  HelpCircle,
} from 'lucide-react';
import {
  BankConfig,
  ChequeTemplate,
  PayeeRecord,
  CalibrationProfile,
  ChequeRecord,
  AppSettings,
} from '../types';
import { ChequePreview } from '../components/ChequePreview';
import { amountToNepaliWords, formatNepaliCurrency } from '../utils/nepaliNumberWords';

interface PrintChequeViewProps {
  banks: BankConfig[];
  templates: ChequeTemplate[];
  payees: PayeeRecord[];
  calibrations: CalibrationProfile[];
  settings: AppSettings;
  initialBankId?: string;
  reprintCheque?: ChequeRecord | null;
  onPrintCheque: (
    bank: BankConfig,
    template: ChequeTemplate,
    cheque: ChequeRecord,
    calibration: CalibrationProfile | null
  ) => void;
  onSaveCheque: (cheque: ChequeRecord) => Promise<void>;
  onCheckDuplicate: (bankId: string, chequeNumber: string, excludeId?: string) => Promise<ChequeRecord | null>;
  onSaveNewPayee: (payee: PayeeRecord) => Promise<void>;
}

export const PrintChequeView: React.FC<PrintChequeViewProps> = ({
  banks,
  templates,
  payees,
  calibrations,
  settings,
  initialBankId,
  reprintCheque,
  onPrintCheque,
  onSaveCheque,
  onCheckDuplicate,
  onSaveNewPayee,
}) => {
  // Form State
  const [selectedBankId, setSelectedBankId] = useState<string>(
    initialBankId || settings.defaultBankId || (banks[0]?.id || '')
  );
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [chequeNumber, setChequeNumber] = useState<string>('');
  const [payeeName, setPayeeName] = useState<string>('');
  const [selectedPayeeId, setSelectedPayeeId] = useState<string>('');
  const [rawAmount, setRawAmount] = useState<string>('');
  const [amountInWords, setAmountInWords] = useState<string>('');
  const [isManualWordsEdited, setIsManualWordsEdited] = useState<boolean>(false);
  const [chequeDate, setChequeDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [memo, setMemo] = useState<string>('');
  const [isAcPayeeOnly, setIsAcPayeeOnly] = useState<boolean>(true);
  const [strikeBearer, setStrikeBearer] = useState<boolean>(settings.defaultStrikeBearer ?? true);
  const [selectedCalibrationId, setSelectedCalibrationId] = useState<string>(
    settings.defaultPrinterProfileId || ''
  );

  // Preview options
  const [zoom, setZoom] = useState<number>(settings.previewZoom || 100);
  const [isAutoFit, setIsAutoFit] = useState<boolean>(true); // Default true: entire cheque fits without scrolling
  const [containerWidth, setContainerWidth] = useState<number>(640);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const [showBackground, setShowBackground] = useState<boolean>(true);
  const [showRulers, setShowRulers] = useState<boolean>(false);
  const [showGrid, setShowGrid] = useState<boolean>(false);

  useEffect(() => {
    if (!previewContainerRef.current) return;
    const updateSize = () => {
      if (previewContainerRef.current) {
        setContainerWidth(previewContainerRef.current.clientWidth);
      }
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(previewContainerRef.current);
    return () => observer.disconnect();
  }, []);

  // Status & Validation
  const [duplicateWarning, setDuplicateWarning] = useState<ChequeRecord | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showNewPayeeModal, setShowNewPayeeModal] = useState<boolean>(false);
  const [showPrinterGuideModal, setShowPrinterGuideModal] = useState<boolean>(false);
  const [newPayeeInput, setNewPayeeInput] = useState<{
    name: string;
    category: PayeeRecord['category'];
    panNumber: string;
    contactNumber: string;
    defaultMemo: string;
  }>({
    name: '',
    category: 'Vendor',
    panNumber: '',
    contactNumber: '',
    defaultMemo: '',
  });

  // Current Bank & Templates
  const currentBank = useMemo(() => {
    return banks.find((b) => b.id === selectedBankId) || banks[0];
  }, [banks, selectedBankId]);

  const bankTemplates = useMemo(() => {
    if (!currentBank) return [];
    return templates.filter((t) => t.bankId === currentBank.id);
  }, [templates, currentBank]);

  const currentTemplate = useMemo(() => {
    if (!bankTemplates.length) return null;
    return bankTemplates.find((t) => t.id === selectedTemplateId) || bankTemplates[0];
  }, [bankTemplates, selectedTemplateId]);

  // Adjustable AC Payee Crossing placement options (Top Middle by default)
  const [acPayeePosition, setAcPayeePosition] = useState<'top-middle' | 'top-left' | 'custom'>('top-middle');
  const [acPayeeCustomX, setAcPayeeCustomX] = useState<number>(80.5);
  const [acPayeeCustomY, setAcPayeeCustomY] = useState<number>(4.5);
  const [acPayeeCustomWidth, setAcPayeeCustomWidth] = useState<number>(42.0);
  const [acPayeeCustomStyle, setAcPayeeCustomStyle] = useState<'horizontal' | 'diagonal'>('horizontal');
  const [acPayeeCustomLabel, setAcPayeeCustomLabel] = useState<string>('A/C PAYEE');

  // Sync AC Payee controls whenever bank or template changes
  useEffect(() => {
    if (currentTemplate?.fields?.acPayeeCrossing) {
      const c = currentTemplate.fields.acPayeeCrossing;
      setAcPayeeCustomX(c.x);
      setAcPayeeCustomY(c.y);
      setAcPayeeCustomWidth(c.width || 42.0);
      setAcPayeeCustomStyle(c.style || 'horizontal');
      setAcPayeeCustomLabel(c.label || 'A/C PAYEE');

      const bankWidth = currentBank?.widthMm || 203;
      const midExpectedX = (bankWidth - (c.width || 42.0)) / 2;
      if (c.style === 'diagonal' || c.x < 35) {
        setAcPayeePosition('top-left');
      } else if (Math.abs(c.x - midExpectedX) < 6) {
        setAcPayeePosition('top-middle');
      } else {
        setAcPayeePosition('custom');
      }
    }
  }, [currentTemplate?.id, currentBank?.widthMm]);

  // Compute effective template with real-time AC Payee coordinates
  const effectiveTemplate = useMemo(() => {
    if (!currentTemplate) return null;
    const cloned = JSON.parse(JSON.stringify(currentTemplate)) as ChequeTemplate;
    if (cloned.fields?.acPayeeCrossing) {
      const bankWidth = currentBank?.widthMm || 203;
      if (acPayeePosition === 'top-middle') {
        const midX = Math.max(0, parseFloat(((bankWidth - 42.0) / 2).toFixed(1)));
        cloned.fields.acPayeeCrossing.x = midX;
        cloned.fields.acPayeeCrossing.y = 4.5;
        cloned.fields.acPayeeCrossing.width = 42.0;
        cloned.fields.acPayeeCrossing.style = 'horizontal';
      } else if (acPayeePosition === 'top-left') {
        cloned.fields.acPayeeCrossing.x = 12.0;
        cloned.fields.acPayeeCrossing.y = 7.0;
        cloned.fields.acPayeeCrossing.width = 38.0;
        cloned.fields.acPayeeCrossing.style = 'diagonal';
      } else {
        cloned.fields.acPayeeCrossing.x = acPayeeCustomX;
        cloned.fields.acPayeeCrossing.y = acPayeeCustomY;
        cloned.fields.acPayeeCrossing.width = acPayeeCustomWidth;
        cloned.fields.acPayeeCrossing.style = acPayeeCustomStyle;
      }
      cloned.fields.acPayeeCrossing.label = acPayeeCustomLabel;
    }
    return cloned;
  }, [
    currentTemplate,
    currentBank?.widthMm,
    acPayeePosition,
    acPayeeCustomX,
    acPayeeCustomY,
    acPayeeCustomWidth,
    acPayeeCustomStyle,
    acPayeeCustomLabel,
  ]);

  const currentCalibration = useMemo(() => {
    if (!selectedCalibrationId) return null;
    return calibrations.find((c) => c.id === selectedCalibrationId) || null;
  }, [calibrations, selectedCalibrationId]);

  // Sync templates on bank change
  useEffect(() => {
    if (bankTemplates.length > 0) {
      if (!selectedTemplateId || !bankTemplates.some((t) => t.id === selectedTemplateId)) {
        setSelectedTemplateId(bankTemplates[0].id);
      }
    }
  }, [bankTemplates, selectedTemplateId]);

  // Handle reprint loading
  useEffect(() => {
    if (reprintCheque) {
      setSelectedBankId(reprintCheque.bankId);
      setSelectedTemplateId(reprintCheque.templateId);
      setChequeNumber(reprintCheque.chequeNumber || '');
      setPayeeName(reprintCheque.payeeName);
      setSelectedPayeeId(reprintCheque.payeeId || '');
      setRawAmount(reprintCheque.amount.toString());
      setAmountInWords(reprintCheque.amountInWords);
      setIsManualWordsEdited(true);
      setChequeDate(reprintCheque.chequeDate);
      setMemo(reprintCheque.memo || '');
      setIsAcPayeeOnly(reprintCheque.isAcPayeeOnly);
      setStrikeBearer(reprintCheque.strikeBearer);
    }
  }, [reprintCheque]);

  // Auto amount-to-words conversion
  useEffect(() => {
    if (!isManualWordsEdited) {
      const num = parseFloat(rawAmount);
      if (!isNaN(num) && num > 0) {
        setAmountInWords(amountToNepaliWords(num));
      } else {
        setAmountInWords('');
      }
    }
  }, [rawAmount, isManualWordsEdited]);

  // Check duplicate cheque number when bank or cheque number changes (only if chequeNumber provided)
  useEffect(() => {
    if (!chequeNumber.trim() || !selectedBankId) {
      setDuplicateWarning(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const found = await onCheckDuplicate(
          selectedBankId,
          chequeNumber.trim(),
          reprintCheque?.id
        );
        setDuplicateWarning(found);
      } catch (e) {
        console.error('Duplicate check error:', e);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [selectedBankId, chequeNumber, reprintCheque, onCheckDuplicate]);

  // Handle Payee selection from dropdown
  const handleSelectPayee = (pId: string) => {
    setSelectedPayeeId(pId);
    if (!pId) return;

    const p = payees.find((item) => item.id === pId);
    if (p) {
      setPayeeName(p.name);
      if (p.defaultMemo && !memo) {
        setMemo(p.defaultMemo);
      }
    }
  };

  // Reset to auto amount in words
  const handleResetWords = () => {
    setIsManualWordsEdited(false);
    const num = parseFloat(rawAmount);
    if (!isNaN(num) && num > 0) {
      setAmountInWords(amountToNepaliWords(num));
    }
  };

  // Clear Form
  const handleClearForm = () => {
    setChequeNumber('');
    setPayeeName('');
    setSelectedPayeeId('');
    setRawAmount('');
    setAmountInWords('');
    setIsManualWordsEdited(false);
    setMemo('');
    setValidationError(null);
    setDuplicateWarning(null);
  };

  // Build cheque object for preview and execution: NO fake demo defaults
  const currentChequeData: Partial<ChequeRecord> = useMemo(() => {
    const num = parseFloat(rawAmount) || 0;
    return {
      bankId: selectedBankId,
      templateId: effectiveTemplate?.id || '',
      chequeNumber: chequeNumber.trim(),
      payeeName: payeeName.trim(),
      payeeId: selectedPayeeId || undefined,
      amount: num,
      amountInWords: amountInWords.trim() || (num > 0 ? amountToNepaliWords(num) : ''),
      chequeDate: chequeDate,
      memo: memo.trim(),
      isAcPayeeOnly: isAcPayeeOnly,
      strikeBearer: strikeBearer,
      status: 'Draft',
      printCount: 0,
    };
  }, [
    selectedBankId,
    effectiveTemplate,
    chequeNumber,
    payeeName,
    selectedPayeeId,
    rawAmount,
    amountInWords,
    chequeDate,
    memo,
    isAcPayeeOnly,
    strikeBearer,
  ]);

  // Validate form - Cheque number is deliberately NOT mandatory
  const validate = (): boolean => {
    if (!selectedBankId || !currentBank) {
      setValidationError('Please select a bank.');
      return false;
    }
    if (!effectiveTemplate) {
      setValidationError('Please select a cheque template for this bank.');
      return false;
    }
    // Cheque number is optional!
    if (!payeeName.trim()) {
      setValidationError('Payee name is required.');
      return false;
    }
    const num = parseFloat(rawAmount);
    if (isNaN(num) || num <= 0) {
      setValidationError('Please enter a valid amount greater than NPR 0.');
      return false;
    }
    if (!amountInWords.trim()) {
      setValidationError('Amount in words is required.');
      return false;
    }
    if (!chequeDate) {
      setValidationError('Cheque date is required.');
      return false;
    }

    setValidationError(null);
    return true;
  };

  // Execute Print
  const handlePrint = async () => {
    if (!validate()) return;
    if (!currentBank || !effectiveTemplate) return;

    const num = parseFloat(rawAmount);
    const now = new Date().toISOString();

    const record: ChequeRecord = {
      id: reprintCheque?.id || `chk-${Date.now()}`,
      bankId: currentBank.id,
      templateId: effectiveTemplate.id,
      chequeNumber: chequeNumber.trim(),
      payeeName: payeeName.trim(),
      payeeId: selectedPayeeId || undefined,
      amount: num,
      amountInWords: amountInWords.trim(),
      chequeDate: chequeDate,
      memo: memo.trim(),
      isAcPayeeOnly: isAcPayeeOnly,
      strikeBearer: strikeBearer,
      status: 'Printed',
      printCount: (reprintCheque?.printCount || 0) + 1,
      lastPrintedAt: now,
      calibrationProfileId: currentCalibration?.id,
      createdAt: reprintCheque?.createdAt || now,
      updatedAt: now,
    };

    onPrintCheque(currentBank, effectiveTemplate, record, currentCalibration);
  };

  // Save as Draft
  const handleSaveDraft = async () => {
    if (!validate()) return;
    if (!currentBank || !effectiveTemplate) return;

    const num = parseFloat(rawAmount);
    const now = new Date().toISOString();

    const record: ChequeRecord = {
      id: reprintCheque?.id || `chk-${Date.now()}`,
      bankId: currentBank.id,
      templateId: effectiveTemplate.id,
      chequeNumber: chequeNumber.trim(),
      payeeName: payeeName.trim(),
      payeeId: selectedPayeeId || undefined,
      amount: num,
      amountInWords: amountInWords.trim(),
      chequeDate: chequeDate,
      memo: memo.trim(),
      isAcPayeeOnly: isAcPayeeOnly,
      strikeBearer: strikeBearer,
      status: reprintCheque?.status || 'Draft',
      printCount: reprintCheque?.printCount || 0,
      createdAt: reprintCheque?.createdAt || now,
      updatedAt: now,
    };

    await onSaveCheque(record);
  };

  // Quick Post-Dating helper
  const handlePostDate = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    setChequeDate(d.toISOString().split('T')[0]);
  };

  // Save Quick New Payee
  const handleCreatePayee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPayeeInput.name.trim()) return;

    const newPayee: PayeeRecord = {
      id: `payee-${Date.now()}`,
      name: newPayeeInput.name.trim(),
      nickname: newPayeeInput.name.trim(),
      category: newPayeeInput.category,
      panNumber: newPayeeInput.panNumber.trim() || undefined,
      contactNumber: newPayeeInput.contactNumber.trim() || undefined,
      defaultMemo: newPayeeInput.defaultMemo.trim() || undefined,
      chequeCount: 0,
      totalAmountIssued: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await onSaveNewPayee(newPayee);
    setSelectedPayeeId(newPayee.id);
    setPayeeName(newPayee.name);
    if (newPayee.defaultMemo) setMemo(newPayee.defaultMemo);
    setShowNewPayeeModal(false);
    setNewPayeeInput({
      name: '',
      category: 'Vendor',
      panNumber: '',
      contactNumber: '',
      defaultMemo: '',
    });
  };

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              {reprintCheque ? 'Reprint Existing Cheque Leaf' : 'Print Cheque'}
            </h1>
            {reprintCheque && (
              <span className="bg-amber-100 text-amber-800 text-xs px-2 py-0.5 rounded font-semibold border border-amber-300">
                Reprint Mode (Printed {reprintCheque.printCount}x)
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Complete the fields below to preview and print directly onto physical bank cheque stationery.
          </p>
        </div>

        {/* Quick action bar */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowPrinterGuideModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded-lg shadow-xs cursor-pointer"
            title="How to feed cheques in a normal desktop printer"
          >
            <HelpCircle className="w-3.5 h-3.5 text-blue-600" />
            <span>Normal Printer Guide</span>
          </button>
          <button
            type="button"
            onClick={handleClearForm}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-xs cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>
          <button
            type="button"
            onClick={handleSaveDraft}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-xs cursor-pointer"
          >
            <Save className="w-3.5 h-3.5 text-slate-600" />
            <span>Save Draft</span>
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print Cheque Leaf</span>
          </button>
        </div>
      </div>

      {/* Physical Printer Zero-Darkening & No-Headers Checklist Reminder */}
      <div className="p-3.5 bg-blue-50/70 border border-blue-200/80 rounded-xl flex items-start justify-between gap-3 text-xs text-blue-950">
        <div className="flex items-start gap-2.5">
          <Printer className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-bold text-blue-900">Physical Printer Checklist:</span> In Chrome's print popup, set <strong className="underline">Margins: None</strong>, and uncheck <strong className="underline">Headers and footers</strong> (removes URL, page 1/1, and date) and <strong className="underline">Background graphics</strong> (ensures pure black ink text with zero background darkening).
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowPrinterGuideModal(true)}
          className="text-blue-700 underline font-bold whitespace-nowrap hover:text-blue-900 cursor-pointer text-[11px] shrink-0"
        >
          Printer Guide
        </button>
      </div>

      {/* Validation or Duplicate Alerts */}
      {validationError && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2.5 text-xs text-rose-800">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{validationError}</span>
        </div>
      )}

      {duplicateWarning && (
        <div className="p-4 bg-amber-50 border border-amber-300 rounded-lg flex items-start gap-3 text-xs text-amber-900">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold text-amber-900">
              Potential Duplicate Cheque Number Detected!
            </div>
            <div className="mt-1 text-amber-800 leading-relaxed">
              Cheque #<strong className="font-mono">{duplicateWarning.chequeNumber}</strong> was already registered on{' '}
              <strong>{duplicateWarning.chequeDate}</strong> for <strong>{duplicateWarning.payeeName}</strong> (NPR{' '}
              {formatNepaliCurrency(duplicateWarning.amount)}) with status: <em>{duplicateWarning.status}</em>.
              Please verify your physical cheque leaf before printing to prevent double issuance!
            </div>
          </div>
        </div>
      )}

      {/* Two Column Layout: Form on Left (5 cols) & Live Preview on Right (7 cols) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left Column: Cheque Entry Form */}
        <div className="xl:col-span-5 bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100 flex items-center justify-between">
            <span>Cheque Details</span>
            <span className="text-[11px] font-normal text-slate-400">Nepali Bank Format</span>
          </h2>

          {/* Bank Selection & Template Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Bank <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedBankId}
                onChange={(e) => setSelectedBankId(e.target.value)}
                className="w-full text-xs font-medium border border-slate-300 rounded-lg px-2.5 py-2 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
              >
                {banks.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.widthMm}×{b.heightMm}mm)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Cheque Template <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                className="w-full text-xs font-medium border border-slate-300 rounded-lg px-2.5 py-2 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
              >
                {bankTemplates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Cheque Number & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Cheque Number <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. 00481925 (optional)"
                value={chequeNumber}
                onChange={(e) => setChequeNumber(e.target.value)}
                className={`w-full text-xs font-mono font-bold border rounded-lg px-2.5 py-2 text-slate-900 focus:outline-none focus:ring-2 ${
                  duplicateWarning ? 'border-amber-400 bg-amber-50/30 focus:ring-amber-500' : 'border-slate-300 focus:ring-slate-900'
                }`}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700">
                  Cheque Date <span className="text-rose-500">*</span>
                </label>
                <div className="flex items-center gap-1 text-[10px]">
                  <button
                    type="button"
                    onClick={() => handlePostDate(0)}
                    className="text-slate-500 hover:text-slate-800 underline cursor-pointer"
                  >
                    Today
                  </button>
                  <span className="text-slate-300">·</span>
                  <button
                    type="button"
                    onClick={() => handlePostDate(7)}
                    className="text-slate-500 hover:text-slate-800 underline cursor-pointer"
                  >
                    +7d
                  </button>
                  <span className="text-slate-300">·</span>
                  <button
                    type="button"
                    onClick={() => handlePostDate(30)}
                    className="text-slate-500 hover:text-slate-800 underline cursor-pointer"
                  >
                    +30d
                  </button>
                </div>
              </div>
              <input
                type="date"
                value={chequeDate}
                onChange={(e) => setChequeDate(e.target.value)}
                className="w-full text-xs font-medium border border-slate-300 rounded-lg px-2.5 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
          </div>

          {/* Payee Selection & Manual Entry */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700">
                Payee (भुक्तानी पाउने व्यक्ति/संस्था) <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => setShowNewPayeeModal(true)}
                className="text-[11px] font-semibold text-slate-800 hover:text-slate-950 flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>Save New Payee</span>
              </button>
            </div>

            {/* Quick dropdown for saved payees */}
            <div className="flex gap-2">
              <select
                value={selectedPayeeId}
                onChange={(e) => handleSelectPayee(e.target.value)}
                className="w-1/3 text-xs font-medium border border-slate-300 rounded-lg px-2 py-2 bg-slate-50 text-slate-700"
              >
                <option value="">-- Choose Saved Payee --</option>
                {payees.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>

              <input
                type="text"
                placeholder="Full Legal Payee Name (e.g. Nepal Electricity Authority)"
                value={payeeName}
                onChange={(e) => {
                  setPayeeName(e.target.value);
                  setSelectedPayeeId('');
                }}
                className="flex-1 text-xs font-semibold border border-slate-300 rounded-lg px-2.5 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
          </div>

          {/* Amount in NPR (Figures) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Amount in Figures (NPR) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">
                रू
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="e.g. 125450.50"
                value={rawAmount}
                onChange={(e) => setRawAmount(e.target.value)}
                className="w-full text-sm font-mono font-bold border border-slate-300 rounded-lg pl-8 pr-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 font-tabular"
              />
            </div>
            {rawAmount && !isNaN(parseFloat(rawAmount)) && (
              <div className="mt-1 text-[11px] text-slate-500 font-mono">
                Formatted: NPR {formatNepaliCurrency(rawAmount)}
              </div>
            )}
          </div>

          {/* Amount in Words */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700">
                Amount in Words (Nepali / Indian System) <span className="text-rose-500">*</span>
              </label>
              {isManualWordsEdited && (
                <button
                  type="button"
                  onClick={handleResetWords}
                  className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 underline cursor-pointer"
                >
                  Reset to Auto-calculated
                </button>
              )}
            </div>
            <textarea
              rows={2}
              value={amountInWords}
              onChange={(e) => {
                setAmountInWords(e.target.value);
                setIsManualWordsEdited(true);
              }}
              placeholder="Will generate automatically from amount (Rupees, Paisa, Lakh, Crore)..."
              className="w-full text-xs font-semibold border border-slate-300 rounded-lg px-2.5 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 leading-relaxed"
            />
            <div className="mt-1 text-[10px] text-slate-400 italic">
              Editable if custom wording or capitalization is required by your accounting policy.
            </div>
          </div>

          {/* Memo / Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Memo / Purpose (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Tax invoice #9201 settlement, Office rent for Kartik"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          {/* Cheque Protections (A/C Payee Only & Strike Bearer) */}
          <div className="pt-2 border-t border-slate-100 space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isAcPayeeOnly}
                    onChange={(e) => setIsAcPayeeOnly(e.target.checked)}
                    className="w-4 h-4 rounded text-slate-900 border-slate-300 focus:ring-slate-900"
                  />
                  <span className="text-xs font-bold text-slate-800">
                    Mark "A/C PAYEE" (Between 2 Parallel Lines)
                  </span>
                </label>
                <span className="text-[10px] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded font-semibold border border-emerald-200">
                  {acPayeePosition === 'top-middle'
                    ? 'Top Middle (Centered)'
                    : acPayeePosition === 'top-left'
                    ? 'Top Left (Corner)'
                    : 'Custom mm Offset'}
                </span>
              </div>

              {/* Position & Style Controls when AC Payee is enabled */}
              {isAcPayeeOnly && (
                <div className="mt-2.5 ml-6 p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2.5 text-xs">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="font-semibold text-slate-700 text-[11px]">Position on Cheque:</span>
                    <div className="inline-flex rounded-md shadow-2xs bg-white p-0.5 border border-slate-200">
                      <button
                        type="button"
                        onClick={() => {
                          setAcPayeePosition('top-middle');
                          setAcPayeeCustomStyle('horizontal');
                        }}
                        className={`px-2.5 py-1 text-[11px] font-semibold rounded cursor-pointer transition-colors ${
                          acPayeePosition === 'top-middle'
                            ? 'bg-slate-900 text-white'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Top Middle (Standard)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAcPayeePosition('top-left');
                          setAcPayeeCustomStyle('diagonal');
                        }}
                        className={`px-2.5 py-1 text-[11px] font-semibold rounded cursor-pointer transition-colors ${
                          acPayeePosition === 'top-left'
                            ? 'bg-slate-900 text-white'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Top Left (Corner)
                      </button>
                      <button
                        type="button"
                        onClick={() => setAcPayeePosition('custom')}
                        className={`px-2.5 py-1 text-[11px] font-semibold rounded cursor-pointer transition-colors ${
                          acPayeePosition === 'custom'
                            ? 'bg-slate-900 text-white'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Fine-tune (mm)
                      </button>
                    </div>
                  </div>

                  {/* If custom or fine-tuning, show numeric adjusters */}
                  {acPayeePosition === 'custom' && (
                    <div className="grid grid-cols-4 gap-2 pt-1 border-t border-slate-200">
                      <div>
                        <label className="block text-[10px] font-medium text-slate-500 mb-0.5">X (mm)</label>
                        <input
                          type="number"
                          step="0.5"
                          value={acPayeeCustomX}
                          onChange={(e) => setAcPayeeCustomX(parseFloat(e.target.value) || 0)}
                          className="w-full text-xs font-mono font-semibold bg-white border border-slate-300 rounded px-1.5 py-1 text-slate-800"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-medium text-slate-500 mb-0.5">Y (mm)</label>
                        <input
                          type="number"
                          step="0.5"
                          value={acPayeeCustomY}
                          onChange={(e) => setAcPayeeCustomY(parseFloat(e.target.value) || 0)}
                          className="w-full text-xs font-mono font-semibold bg-white border border-slate-300 rounded px-1.5 py-1 text-slate-800"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-medium text-slate-500 mb-0.5">Width (mm)</label>
                        <input
                          type="number"
                          step="1"
                          value={acPayeeCustomWidth}
                          onChange={(e) => setAcPayeeCustomWidth(parseFloat(e.target.value) || 20)}
                          className="w-full text-xs font-mono font-semibold bg-white border border-slate-300 rounded px-1.5 py-1 text-slate-800"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-medium text-slate-500 mb-0.5">Style</label>
                        <select
                          value={acPayeeCustomStyle}
                          onChange={(e) => setAcPayeeCustomStyle(e.target.value as any)}
                          className="w-full text-xs bg-white border border-slate-300 rounded px-1 py-1 text-slate-800"
                        >
                          <option value="horizontal">Horizontal</option>
                          <option value="diagonal">Diagonal (-30°)</option>
                        </select>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[11px] text-slate-600 pt-1 border-t border-slate-200/80">
                    <span className="font-medium">Crossing Text:</span>
                    <input
                      type="text"
                      value={acPayeeCustomLabel}
                      onChange={(e) => setAcPayeeCustomLabel(e.target.value)}
                      placeholder="A/C PAYEE"
                      className="w-44 text-xs font-bold text-slate-800 uppercase bg-white border border-slate-300 rounded px-2 py-0.5 font-mono text-center tracking-wider"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={strikeBearer}
                  onChange={(e) => setStrikeBearer(e.target.checked)}
                  className="w-4 h-4 rounded text-slate-900 border-slate-300 focus:ring-slate-900"
                />
                <span className="text-xs font-semibold text-slate-700">
                  Strike through "Or Bearer"
                </span>
              </label>
              <span className="text-[10px] text-slate-500 font-mono">Restricts to named payee</span>
            </div>
          </div>

          {/* Printer Calibration Profile Selector */}
          <div className="pt-2 border-t border-slate-100">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Printer Calibration Profile
            </label>
            <select
              value={selectedCalibrationId}
              onChange={(e) => setSelectedCalibrationId(e.target.value)}
              className="w-full text-xs font-medium border border-slate-300 rounded-lg px-2.5 py-2 bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              <option value="">No Offset (0mm, 0mm)</option>
              {calibrations.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} (X: {c.offsetX >= 0 ? `+${c.offsetX}` : c.offsetX}mm, Y:{' '}
                  {c.offsetY >= 0 ? `+${c.offsetY}` : c.offsetY}mm)
                </option>
              ))}
            </select>
            {currentCalibration && (
              <div className="mt-2 flex items-center justify-between text-[11px] text-slate-600 bg-slate-50 p-2 rounded border border-slate-200">
                <span className="text-slate-500">Feed Orientation:</span>
                <span className="font-semibold text-slate-800">
                  {currentCalibration.feedOrientation === 'portrait-rot90'
                    ? 'Vertical Envelope Feed (90° Rotated)'
                    : 'Landscape Feed (203mm Long-Edge First)'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Live Cheque Preview Canvas */}
        <div className="xl:col-span-7 bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col xl:sticky xl:top-4">
          {/* Preview Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 pb-3.5 mb-3.5 border-b border-slate-100 text-xs">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-slate-600" />
              <span className="font-bold text-slate-900">Physical Cheque Live Preview</span>
              <span className="text-slate-400 font-mono text-[11px]">
                ({currentBank.widthMm}mm × {currentBank.heightMm}mm)
              </span>
            </div>

            {/* Controls: Fit to View, 100% Zoom, Realistic vs Ink, Rulers, Grid */}
            <div className="flex items-center flex-wrap gap-1.5 bg-slate-100 p-1 rounded-lg">
              {/* Auto-Fit Entire Cheque Button */}
              <button
                type="button"
                onClick={() => {
                  setIsAutoFit(true);
                }}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                  isAutoFit
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Fit entire cheque in view without scrolling"
              >
                Fit Entire Cheque
              </button>

              {/* 100% Actual Physical Size Button */}
              <button
                type="button"
                onClick={() => {
                  setIsAutoFit(false);
                  setZoom(100);
                }}
                className={`px-2 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                  !isAutoFit && zoom === 100
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="View in 100% 1:1 physical millimeter scale"
              >
                100% (1:1)
              </button>

              {/* Toggle Realistic Cheque Leaf Background */}
              <button
                type="button"
                onClick={() => setShowBackground(!showBackground)}
                className={`px-2 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                  showBackground ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Toggle Cheque Background vs Print-Only View"
              >
                {showBackground ? 'Realistic Leaf' : 'Ink Only'}
              </button>

              {/* Toggle Rulers */}
              <button
                type="button"
                onClick={() => setShowRulers(!showRulers)}
                className={`p-1.5 rounded transition-colors cursor-pointer ${
                  showRulers ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Toggle Millimetre Rulers"
              >
                <Ruler className="w-3.5 h-3.5" />
              </button>

              {/* Toggle Grid */}
              <button
                type="button"
                onClick={() => setShowGrid(!showGrid)}
                className={`p-1.5 rounded transition-colors cursor-pointer ${
                  showGrid ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Toggle 5mm Grid"
              >
                <Grid className="w-3.5 h-3.5" />
              </button>

              {/* Zoom Out / In */}
              <div className="flex items-center border-l border-slate-200 pl-1 ml-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsAutoFit(false);
                    setZoom((z) => Math.max(40, z - 10));
                  }}
                  className="p-1 text-slate-600 hover:text-slate-900 cursor-pointer"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="font-mono text-[10px] px-1 text-slate-600">
                  {isAutoFit ? 'Auto' : `${zoom}%`}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setIsAutoFit(false);
                    setZoom((z) => Math.min(150, z + 10));
                  }}
                  className="p-1 text-slate-600 hover:text-slate-900 cursor-pointer"
                  title="Zoom In"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Interactive Cheque Canvas with Ref for Auto-Fit */}
          <div
            ref={previewContainerRef}
            className="flex-1 bg-slate-100/70 rounded-xl p-3 sm:p-5 flex items-center justify-center overflow-x-auto min-h-[250px] border border-slate-200/70 shadow-inner"
          >
            {currentBank && effectiveTemplate ? (
              <ChequePreview
                bank={currentBank}
                template={effectiveTemplate}
                cheque={currentChequeData}
                calibration={currentCalibration}
                zoom={zoom}
                autoFit={isAutoFit}
                containerWidth={containerWidth}
                showBackground={showBackground}
                showRulers={showRulers}
                showGrid={showGrid}
              />
            ) : (
              <div className="text-slate-400 text-xs">No bank or template selected.</div>
            )}
          </div>

          {/* Physical Printing Tips Footer */}
          <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-start justify-between gap-3 text-xs text-slate-600">
            <div className="flex items-start gap-2.5">
              <HelpCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <strong>Normal Office Printer:</strong> Feed your cheque leaf via <em>Tray 1 / Manual Feed Slot</em> with paper guide sliders adjusted snugly. In Chrome's print dialog, ensure <strong>Scale: 100% (Actual Size)</strong> and <strong>Margins: None</strong>.
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowPrinterGuideModal(true)}
              className="text-blue-700 font-bold underline whitespace-nowrap hover:text-blue-900 cursor-pointer text-[11px]"
            >
              View Feed Guide
            </button>
          </div>
        </div>
      </div>

      {/* Normal Office Printer Feeding Guide Modal */}
      {showPrinterGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6 border border-slate-200 overflow-y-auto max-h-[90vh]">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Normal Office Desk Printer Guide (HP, Epson, Canon, Brother)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPrinterGuideModal(false)}
                className="text-slate-400 hover:text-slate-700 text-lg leading-none"
              >
                ×
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs text-slate-700 leading-relaxed">
              <p className="bg-blue-50 text-blue-900 p-3 rounded-lg border border-blue-200 font-medium">
                You do <strong>not</strong> need a specialized banking cheque printer. Standard desktop laser or inkjet printers can print directly onto physical cheque leaves with perfect accuracy by following these four steps.
              </p>

              {/* Step 1 */}
              <div className="space-y-1.5 border-l-2 border-slate-900 pl-3">
                <div className="font-bold text-slate-900 text-sm">
                  1. Paper Tray Feeding & Slider Clamps
                </div>
                <p>
                  Always use your printer's <strong>Manual Feed Slot (Tray 1)</strong> or the rear multipurpose tray. Never drop loose cheques into the bottom bulk paper cassette.
                </p>
                <p>
                  Slide the manual tray paper width guides (usually blue or black plastic tabs) until they clamp the cheque leaf securely. This prevents the leaf from rotating or skewing as feed rollers pull it in.
                </p>
              </div>

              {/* Step 2 */}
              <div className="space-y-1.5 border-l-2 border-slate-900 pl-3">
                <div className="font-bold text-slate-900 text-sm">
                  2. Choose Your Feeding Orientation
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <span className="font-bold text-slate-900 block mb-1">
                      Option A: Horizontal (Landscape Feed)
                    </span>
                    <span className="text-slate-600">
                      Cheque inserted with the <strong>203mm long-edge</strong> entering first. Use this if your printer manual tray expands to at least 210mm width. Select the standard calibration profile.
                    </span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <span className="font-bold text-slate-900 block mb-1">
                      Option B: Vertical (Envelope Feed / 90° Rotated)
                    </span>
                    <span className="text-slate-600">
                      Cheque inserted like a standard DL envelope with the <strong>76mm short-edge</strong> entering first. Select the <em>"Normal Printer (Vertical / Envelope Feed 90°)"</em> profile in the dropdown!
                    </span>
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div className="space-y-1.5 border-l-2 border-slate-900 pl-3">
                <div className="font-bold text-slate-900 text-sm">
                  3. Browser Native Print Settings (Chrome / Edge)
                </div>
                <ul className="list-disc pl-4 space-y-1 text-slate-600">
                  <li>
                    <strong>Scale: 100% (Actual Size)</strong> — <span className="text-rose-600 font-semibold">Do not use "Fit to Printable Area" or "Fit to Page"</span>, as browsers will shrink the coordinates by 5%.
                  </li>
                  <li>
                    <strong>Margins: None</strong> — Prevents the browser from shifting the print coordinates downwards.
                  </li>
                  <li>
                    <strong>Paper Size:</strong> Choose <em>Custom (203mm × 76mm)</em>, or <em>Envelope DL / #10</em>, or standard feed.
                  </li>
                  <li>
                    <strong>Headers & Footers:</strong> Unchecked.
                  </li>
                </ul>
              </div>

              {/* Step 4 */}
              <div className="space-y-1.5 border-l-2 border-emerald-600 pl-3">
                <div className="font-bold text-emerald-900 text-sm">
                  4. Office Golden Rule: Test on Blank Paper First!
                </div>
                <p className="text-slate-600">
                  Cut an ordinary scrap piece of A4 paper with a paper cutter to <strong>203mm × 76mm</strong> (or selected bank size). Print your first test cheque onto this paper, hold it over an actual cheque leaf against a light source, and adjust any fine offset (X/Y mm) in the <strong>Printing Calibration</strong> tab.
                </p>
              </div>
            </div>

            <div className="mt-6 pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                Prabhu Bank and all Nepal banks supported
              </span>
              <button
                type="button"
                onClick={() => setShowPrinterGuideModal(false)}
                className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm"
              >
                Got It, Ready to Print
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save New Payee Quick Modal */}
      {showNewPayeeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
            <h3 className="text-base font-bold text-slate-900">Add Frequently Used Payee</h3>
            <p className="text-xs text-slate-500 mt-1">
              Save this recipient in local IndexedDB for auto-completion in future cheques.
            </p>

            <form onSubmit={handleCreatePayee} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Payee Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kantipur Paper Supplies"
                  value={newPayeeInput.name}
                  onChange={(e) =>
                    setNewPayeeInput((prev) => ({ ...prev, name: e.target.value }))
                  }
                  className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Category
                  </label>
                  <select
                    value={newPayeeInput.category}
                    onChange={(e) =>
                      setNewPayeeInput((prev) => ({
                        ...prev,
                        category: e.target.value as PayeeRecord['category'],
                      }))
                    }
                    className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-2 bg-white text-slate-800"
                  >
                    <option value="Vendor">Vendor</option>
                    <option value="Salary">Salary</option>
                    <option value="Tax / Government">Tax / Government</option>
                    <option value="Rent">Rent</option>
                    <option value="Utilities">Utilities</option>
                    <option value="Contractor">Contractor</option>
                    <option value="Personal">Personal</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    PAN Number (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="9-digit PAN"
                    value={newPayeeInput.panNumber}
                    onChange={(e) =>
                      setNewPayeeInput((prev) => ({ ...prev, panNumber: e.target.value }))
                    }
                    className="w-full text-xs font-mono border border-slate-300 rounded-lg px-2.5 py-2 text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Default Memo (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Monthly Stationery & Supplies"
                  value={newPayeeInput.defaultMemo}
                  onChange={(e) =>
                    setNewPayeeInput((prev) => ({ ...prev, defaultMemo: e.target.value }))
                  }
                  className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-2 text-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowNewPayeeModal(false)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg"
                >
                  Save Payee
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
