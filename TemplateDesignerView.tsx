import React, { useState, useEffect } from 'react';
import {
  Save,
  Copy,
  RotateCcw,
  Download,
  Upload,
  Ruler,
  Grid,
  ZoomIn,
  ZoomOut,
  Maximize2,
  CheckCircle2,
  Sliders,
  Type,
  Move,
  CornerDownRight,
  Eye,
} from 'lucide-react';
import { BankConfig, ChequeTemplate, FieldLayout } from '../types';
import { ChequePreview } from '../components/ChequePreview';

interface TemplateDesignerViewProps {
  banks: BankConfig[];
  templates: ChequeTemplate[];
  onSaveTemplate: (template: ChequeTemplate) => Promise<void>;
  onDuplicateTemplate: (template: ChequeTemplate) => Promise<void>;
  onResetTemplate: (templateId: string) => Promise<void>;
}

type FieldKey =
  | 'date'
  | 'payee'
  | 'amountInWords'
  | 'amountInFigures'
  | 'acPayeeCrossing'
  | 'bearerStrike'
  | 'signatory'
  | 'memo';

const FIELD_LABELS: Record<FieldKey, string> = {
  date: 'Date (मिति)',
  payee: 'Payee Name (पाउनेको नाम)',
  amountInWords: 'Amount in Words (अक्षरमा)',
  amountInFigures: 'Amount in Figures (अङ्कमा)',
  acPayeeCrossing: 'A/C Payee Only Crossing',
  bearerStrike: 'Strike "Or Bearer"',
  signatory: 'Authorized Signatory Label',
  memo: 'Memo / Reference',
};

export const TemplateDesignerView: React.FC<TemplateDesignerViewProps> = ({
  banks,
  templates,
  onSaveTemplate,
  onDuplicateTemplate,
  onResetTemplate,
}) => {
  const [selectedBankId, setSelectedBankId] = useState<string>(banks[0]?.id || '');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [currentTemplate, setCurrentTemplate] = useState<ChequeTemplate | null>(null);
  const [selectedFieldKey, setSelectedFieldKey] = useState<FieldKey>('payee');
  const [zoom, setZoom] = useState<number>(115);
  const [showBackground, setShowBackground] = useState<boolean>(true);
  const [showRulers, setShowRulers] = useState<boolean>(true);
  const [showGrid, setShowGrid] = useState<boolean>(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Bank selection
  const currentBank = banks.find((b) => b.id === selectedBankId) || banks[0];
  const bankTemplates = templates.filter((t) => t.bankId === selectedBankId);

  // Select initial template
  useEffect(() => {
    if (bankTemplates.length > 0) {
      const match = bankTemplates.find((t) => t.id === selectedTemplateId) || bankTemplates[0];
      setSelectedTemplateId(match.id);
      setCurrentTemplate(JSON.parse(JSON.stringify(match)));
    } else {
      setSelectedTemplateId('');
      setCurrentTemplate(null);
    }
  }, [selectedBankId, bankTemplates.length]);

  // Handle template selection change
  const handleSelectTemplate = (tId: string) => {
    setSelectedTemplateId(tId);
    const tmpl = templates.find((t) => t.id === tId);
    if (tmpl) {
      setCurrentTemplate(JSON.parse(JSON.stringify(tmpl)));
    }
  };

  // Keyboard arrow keys for micro-nudging
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Do not nudge if an input or textarea is actively focused
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') {
        return;
      }

      if (!currentTemplate || !selectedFieldKey) return;

      const step = e.altKey ? 0.1 : e.shiftKey ? 2.0 : 0.5;

      let deltaX = 0;
      let deltaY = 0;

      if (e.key === 'ArrowLeft') {
        deltaX = -step;
      } else if (e.key === 'ArrowRight') {
        deltaX = step;
      } else if (e.key === 'ArrowUp') {
        deltaY = -step;
      } else if (e.key === 'ArrowDown') {
        deltaY = step;
      } else {
        return;
      }

      e.preventDefault();

      setCurrentTemplate((prev) => {
        if (!prev) return prev;
        const copy = JSON.parse(JSON.stringify(prev)) as ChequeTemplate;
        const f = copy.fields[selectedFieldKey];
        if (f) {
          f.x = Math.max(0, parseFloat((f.x + deltaX).toFixed(1)));
          f.y = Math.max(0, parseFloat((f.y + deltaY).toFixed(1)));
        }
        return copy;
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentTemplate, selectedFieldKey]);

  // Update field coordinates from dragging on canvas
  const handleUpdateFieldCoordinates = (fieldKey: string, xMm: number, yMm: number) => {
    if (!currentTemplate) return;
    const key = fieldKey as FieldKey;
    setCurrentTemplate((prev) => {
      if (!prev) return prev;
      const copy = JSON.parse(JSON.stringify(prev)) as ChequeTemplate;
      if (copy.fields[key]) {
        copy.fields[key].x = xMm;
        copy.fields[key].y = yMm;
      }
      return copy;
    });
  };

  // Generic field update
  const handleFieldChange = (key: FieldKey, prop: keyof FieldLayout, value: any) => {
    if (!currentTemplate) return;
    setCurrentTemplate((prev) => {
      if (!prev) return prev;
      const copy = JSON.parse(JSON.stringify(prev)) as ChequeTemplate;
      if (copy.fields[key]) {
        (copy.fields[key] as any)[prop] = value;
      }
      return copy;
    });
  };

  // Save template
  const handleSave = async () => {
    if (!currentTemplate) return;
    currentTemplate.updatedAt = new Date().toISOString();
    await onSaveTemplate(currentTemplate);
    setSaveSuccessMsg('Template coordinates and styling saved successfully.');
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  // Duplicate template
  const handleDuplicate = async () => {
    if (!currentTemplate) return;
    await onDuplicateTemplate(currentTemplate);
    setSaveSuccessMsg('Template duplicated.');
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  // Reset template
  const handleReset = async () => {
    if (!currentTemplate) return;
    if (confirm('Reset this template to factory standard coordinates for this bank?')) {
      await onResetTemplate(currentTemplate.id);
      setSaveSuccessMsg('Template reset to bank defaults.');
      setTimeout(() => setSaveSuccessMsg(null), 3000);
    }
  };

  // Export JSON
  const handleExportJSON = () => {
    if (!currentTemplate) return;
    const blob = new Blob([JSON.stringify(currentTemplate, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cheque-template-${currentTemplate.name.toLowerCase().replace(/\s+/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import JSON
  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.fields && parsed.bankId) {
          parsed.id = currentTemplate?.id || `tmpl-${Date.now()}`;
          parsed.bankId = selectedBankId;
          setCurrentTemplate(parsed);
          await onSaveTemplate(parsed);
          alert('Template JSON imported and applied successfully.');
        } else {
          alert('Invalid template JSON format.');
        }
      } catch (err) {
        alert('Could not parse template JSON.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const activeField = currentTemplate?.fields[selectedFieldKey];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Cheque Template Designer
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Visual WYSIWYG editor. Drag fields or fine-tune exact millimetre coordinates and fonts for each bank.
          </p>
        </div>

        {/* Global Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-xs cursor-pointer">
            <Upload className="w-3.5 h-3.5 text-slate-500" />
            <span>Import JSON</span>
            <input
              type="file"
              accept=".json"
              onChange={handleImportJSON}
              className="hidden"
            />
          </label>
          <button
            type="button"
            onClick={handleExportJSON}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export JSON</span>
          </button>
          <button
            type="button"
            onClick={handleDuplicate}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-xs cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5 text-slate-500" />
            <span>Duplicate</span>
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-xs cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span>Reset</span>
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Save Template</span>
          </button>
        </div>
      </div>

      {saveSuccessMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg flex items-center gap-2 text-xs font-medium">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* Main Designer Layout: Canvas (8 cols) + Inspector (4 cols) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left Column: Interactive Canvas */}
        <div className="xl:col-span-8 bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col">
          {/* Bank & Template Selector Strip */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase">
                  Target Bank
                </label>
                <select
                  value={selectedBankId}
                  onChange={(e) => setSelectedBankId(e.target.value)}
                  className="text-xs font-bold border border-slate-300 rounded px-2 py-1.5 bg-white text-slate-900"
                >
                  {banks.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.widthMm}×{b.heightMm}mm)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase">
                  Template Version
                </label>
                <select
                  value={selectedTemplateId}
                  onChange={(e) => handleSelectTemplate(e.target.value)}
                  className="text-xs font-bold border border-slate-300 rounded px-2 py-1.5 bg-white text-slate-900"
                >
                  {bankTemplates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Canvas Display Controls */}
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg text-xs">
              <button
                type="button"
                onClick={() => setShowBackground(!showBackground)}
                className={`px-2.5 py-1 rounded text-xs font-medium cursor-pointer ${
                  showBackground ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {showBackground ? 'Realistic Cheque' : 'Blank Canvas'}
              </button>

              <button
                type="button"
                onClick={() => setShowRulers(!showRulers)}
                className={`p-1.5 rounded cursor-pointer ${
                  showRulers ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Toggle Millimeter Rulers"
              >
                <Ruler className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => setShowGrid(!showGrid)}
                className={`p-1.5 rounded cursor-pointer ${
                  showGrid ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Toggle 5mm Grid"
              >
                <Grid className="w-3.5 h-3.5" />
              </button>

              <div className="flex items-center border-l border-slate-200 pl-1 ml-1">
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.max(50, z - 15))}
                  className="p-1 text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="font-mono text-[11px] px-1 text-slate-600">{zoom}%</span>
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.min(160, z + 15))}
                  className="p-1 text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Interactive Workspace Area */}
          <div className="flex-1 bg-slate-50/70 rounded-lg p-6 flex items-center justify-center overflow-auto min-h-[460px] border border-slate-200/60">
            {currentBank && currentTemplate ? (
              <ChequePreview
                bank={currentBank}
                template={currentTemplate}
                zoom={zoom}
                showBackground={showBackground}
                showRulers={showRulers}
                showGrid={showGrid}
                interactiveMode={true}
                selectedFieldKey={selectedFieldKey}
                onSelectField={(key) => setSelectedFieldKey(key as FieldKey)}
                onUpdateFieldCoordinates={handleUpdateFieldCoordinates}
              />
            ) : (
              <div className="text-slate-400 text-xs">No template selected.</div>
            )}
          </div>

          {/* Keyboard Nudge Guide */}
          <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-[11px] text-slate-600">
            <div className="flex items-center gap-1.5">
              <Move className="w-3.5 h-3.5 text-slate-500" />
              <span>
                <strong>Arrow Keys:</strong> Move selected field by <strong>0.5mm</strong>
              </span>
              <span className="text-slate-300">·</span>
              <span>
                <strong>Shift + Arrow:</strong> <strong>2.0mm</strong>
              </span>
              <span className="text-slate-300">·</span>
              <span>
                <strong>Alt + Arrow:</strong> <strong>0.1mm (micro-nudge)</strong>
              </span>
            </div>
            <div className="text-slate-400">Selected: {FIELD_LABELS[selectedFieldKey]}</div>
          </div>
        </div>

        {/* Right Column: Field Inspector & Property Editor */}
        <div className="xl:col-span-4 bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-slate-600" />
              <h2 className="text-sm font-bold text-slate-900">Field Inspector</h2>
            </div>
            <span className="text-[11px] font-mono text-slate-500">Physical Units: mm & pt</span>
          </div>

          {/* Field Selection Tabs */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Select Field to Configure:
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {(Object.keys(FIELD_LABELS) as FieldKey[]).map((fKey) => (
                <button
                  key={fKey}
                  type="button"
                  onClick={() => setSelectedFieldKey(fKey)}
                  className={`text-left px-2.5 py-1.5 rounded text-xs font-medium truncate transition-colors cursor-pointer ${
                    selectedFieldKey === fKey
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200/60'
                  }`}
                >
                  {FIELD_LABELS[fKey]}
                </button>
              ))}
            </div>
          </div>

          {/* Active Field Properties Editor */}
          {activeField ? (
            <div className="space-y-4 pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  {FIELD_LABELS[selectedFieldKey]}
                </span>
                <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={activeField.enabled}
                    onChange={(e) =>
                      handleFieldChange(selectedFieldKey, 'enabled', e.target.checked)
                    }
                    className="w-3.5 h-3.5 text-slate-900 rounded"
                  />
                  <span>Enabled</span>
                </label>
              </div>

              {/* Coordinates: X and Y in Millimetres */}
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    X (from Left edge, mm)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max={currentBank.widthMm}
                    value={activeField.x}
                    onChange={(e) =>
                      handleFieldChange(selectedFieldKey, 'x', parseFloat(e.target.value) || 0)
                    }
                    className="w-full text-xs font-mono font-bold bg-white border border-slate-300 rounded px-2.5 py-1.5 text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Y (from Top edge, mm)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max={currentBank.heightMm}
                    value={activeField.y}
                    onChange={(e) =>
                      handleFieldChange(selectedFieldKey, 'y', parseFloat(e.target.value) || 0)
                    }
                    className="w-full text-xs font-mono font-bold bg-white border border-slate-300 rounded px-2.5 py-1.5 text-slate-900"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Maximum Field Width (mm)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="5"
                    max={currentBank.widthMm}
                    value={activeField.width}
                    onChange={(e) =>
                      handleFieldChange(
                        selectedFieldKey,
                        'width',
                        parseFloat(e.target.value) || 10
                      )
                    }
                    className="w-full text-xs font-mono font-bold bg-white border border-slate-300 rounded px-2.5 py-1.5 text-slate-900"
                  />
                </div>
              </div>

              {/* Typography Settings */}
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Font Family
                    </label>
                    <select
                      value={activeField.fontFamily}
                      onChange={(e) =>
                        handleFieldChange(selectedFieldKey, 'fontFamily', e.target.value)
                      }
                      className="w-full text-xs bg-white border border-slate-300 rounded px-2 py-1.5 text-slate-800"
                    >
                      <option value="Plus Jakarta Sans">Plus Jakarta Sans</option>
                      <option value="JetBrains Mono">JetBrains Mono</option>
                      <option value="Times New Roman">Times New Roman</option>
                      <option value="Arial">Arial</option>
                      <option value="Courier New">Courier New</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Font Size (pt)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="6"
                      max="24"
                      value={activeField.fontSize}
                      onChange={(e) =>
                        handleFieldChange(
                          selectedFieldKey,
                          'fontSize',
                          parseFloat(e.target.value) || 10
                        )
                      }
                      className="w-full text-xs font-mono bg-white border border-slate-300 rounded px-2.5 py-1.5 text-slate-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Font Weight
                    </label>
                    <select
                      value={activeField.fontWeight}
                      onChange={(e) =>
                        handleFieldChange(selectedFieldKey, 'fontWeight', e.target.value)
                      }
                      className="w-full text-xs bg-white border border-slate-300 rounded px-2 py-1.5 text-slate-800"
                    >
                      <option value="normal">Normal (400)</option>
                      <option value="500">Medium (500)</option>
                      <option value="600">SemiBold (600)</option>
                      <option value="bold">Bold (700)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Text Alignment
                    </label>
                    <select
                      value={activeField.align}
                      onChange={(e) =>
                        handleFieldChange(selectedFieldKey, 'align', e.target.value)
                      }
                      className="w-full text-xs bg-white border border-slate-300 rounded px-2 py-1.5 text-slate-800"
                    >
                      <option value="left">Left</option>
                      <option value="center">Center</option>
                      <option value="right">Right</option>
                    </select>
                  </div>
                </div>

                {/* Specific field overrides: Prefix, Suffix, Boxed, Line Height */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Prefix Symbol
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. *** or ="
                      value={activeField.prefix || ''}
                      onChange={(e) =>
                        handleFieldChange(selectedFieldKey, 'prefix', e.target.value)
                      }
                      className="w-full text-xs font-mono bg-white border border-slate-300 rounded px-2.5 py-1.5 text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Suffix Symbol
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. /- or ***"
                      value={activeField.suffix || ''}
                      onChange={(e) =>
                        handleFieldChange(selectedFieldKey, 'suffix', e.target.value)
                      }
                      className="w-full text-xs font-mono bg-white border border-slate-300 rounded px-2.5 py-1.5 text-slate-900"
                    />
                  </div>
                </div>

                {selectedFieldKey === 'amountInWords' && (
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Line Spacing (Multiplier)
                    </label>
                    <input
                      type="number"
                      step="0.05"
                      min="1.0"
                      max="2.5"
                      value={activeField.lineHeight || 1.45}
                      onChange={(e) =>
                        handleFieldChange(
                          selectedFieldKey,
                          'lineHeight',
                          parseFloat(e.target.value) || 1.45
                        )
                      }
                      className="w-full text-xs font-mono bg-white border border-slate-300 rounded px-2.5 py-1.5 text-slate-900"
                    />
                  </div>
                )}

                {selectedFieldKey === 'date' && (
                  <div className="flex items-center gap-2 pt-1">
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={(activeField as any).isBoxed ?? true}
                        onChange={(e) =>
                          handleFieldChange(selectedFieldKey, 'isBoxed' as any, e.target.checked)
                        }
                        className="w-4 h-4 rounded text-slate-900"
                      />
                      <span>Print in 8 Date Boxes (D D M M Y Y Y Y)</span>
                    </label>
                  </div>
                )}

                {selectedFieldKey === 'acPayeeCrossing' && (
                  <div className="space-y-3 pt-2 border-t border-slate-100">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Text Between Parallel Lines
                      </label>
                      <input
                        type="text"
                        value={(activeField as any).label || 'A/C PAYEE'}
                        onChange={(e) =>
                          handleFieldChange(selectedFieldKey, 'label' as any, e.target.value)
                        }
                        placeholder="A/C PAYEE"
                        className="w-full text-xs font-bold bg-white border border-slate-300 rounded px-2.5 py-1.5 text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Parallel Lines Angle / Style
                      </label>
                      <select
                        value={(activeField as any).style || 'diagonal'}
                        onChange={(e) =>
                          handleFieldChange(selectedFieldKey, 'style' as any, e.target.value)
                        }
                        className="w-full text-xs bg-white border border-slate-300 rounded px-2 py-1.5 text-slate-800"
                      >
                        <option value="diagonal">Diagonal Parallel Lines (-30° angle)</option>
                        <option value="horizontal">Horizontal Parallel Lines (0° angle)</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-slate-400 text-xs">Select a field above to inspect.</div>
          )}
        </div>
      </div>
    </div>
  );
};
