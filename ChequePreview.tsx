import React, { useRef, useState, useEffect } from 'react';
import { BankConfig, ChequeTemplate, ChequeRecord, CalibrationProfile } from '../types';
import { getBoxedDateChars, formatNepaliCurrency } from '../utils/nepaliNumberWords';

const PX_PER_MM = 3.779528; // Standard 96 DPI screen (96 / 25.4)

export interface ChequePreviewProps {
  bank: BankConfig;
  template: ChequeTemplate;
  cheque?: Partial<ChequeRecord>;
  calibration?: CalibrationProfile | null;
  zoom?: number; // percentage (e.g. 100)
  showBackground?: boolean; // toggle realistic cheque leaf vs print-only overlay
  showRulers?: boolean;
  showGrid?: boolean;
  interactiveMode?: boolean; // in template designer: allows selecting and dragging
  selectedFieldKey?: string | null;
  onSelectField?: (fieldKey: string) => void;
  onUpdateFieldCoordinates?: (fieldKey: string, xMm: number, yMm: number) => void;
}

export const ChequePreview: React.FC<ChequePreviewProps> = ({
  bank,
  template,
  cheque,
  calibration,
  zoom = 100,
  showBackground = true,
  showRulers = false,
  showGrid = false,
  interactiveMode = false,
  selectedFieldKey = null,
  onSelectField,
  onUpdateFieldCoordinates,
}) => {
  const scale = (zoom / 100) * PX_PER_MM;
  const canvasWidthPx = bank.widthMm * scale;
  const canvasHeightPx = bank.heightMm * scale;

  const containerRef = useRef<HTMLDivElement>(null);
  const [draggingKey, setDraggingKey] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState<{ mouseX: number; mouseY: number; startX: number; startY: number } | null>(null);

  const fields = template.fields;
  const offsetX = calibration?.offsetX || 0;
  const offsetY = calibration?.offsetY || 0;

  // Amount formatted
  const formattedFigure = cheque?.amount !== undefined
    ? `${fields.amountInFigures.prefix || ''}${formatNepaliCurrency(cheque.amount)}${fields.amountInFigures.suffix || ''}`
    : `${fields.amountInFigures.prefix || '= '}1,25,450.50${fields.amountInFigures.suffix || ' /-'}`;

  // Amount in words
  const wordsText = cheque?.amountInWords
    ? `${fields.amountInWords.prefix || ''}${cheque.amountInWords}${fields.amountInWords.suffix || ''}`
    : `${fields.amountInWords.prefix || '*** '}One Lakh Twenty Five Thousand Four Hundred Fifty Rupees and Fifty Paisa Only${fields.amountInWords.suffix || ' ***'}`;

  // Date
  const dateStr = cheque?.chequeDate || '2026-11-04';
  const dateChars = getBoxedDateChars(dateStr);

  // Payee
  const payeeText = cheque?.payeeName
    ? `${fields.payee.prefix || ''}${cheque.payeeName}${fields.payee.suffix || ''}`
    : `${fields.payee.prefix || '*** '}Nepal Electricity Authority${fields.payee.suffix || ' ***'}`;

  // Drag handling
  const handleMouseDown = (e: React.MouseEvent, fieldKey: string, currentX: number, currentY: number) => {
    if (!interactiveMode) return;
    e.stopPropagation();
    if (onSelectField) onSelectField(fieldKey);

    setDraggingKey(fieldKey);
    setDragStart({
      mouseX: e.clientX,
      mouseY: e.clientY,
      startX: currentX,
      startY: currentY,
    });
  };

  useEffect(() => {
    if (!draggingKey || !dragStart || !onUpdateFieldCoordinates) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = (e.clientX - dragStart.mouseX) / scale;
      const deltaY = (e.clientY - dragStart.mouseY) / scale;

      const newX = Math.max(0, Math.min(bank.widthMm - 10, parseFloat((dragStart.startX + deltaX).toFixed(1))));
      const newY = Math.max(0, Math.min(bank.heightMm - 5, parseFloat((dragStart.startY + deltaY).toFixed(1))));

      onUpdateFieldCoordinates(draggingKey, newX, newY);
    };

    const handleMouseUp = () => {
      setDraggingKey(null);
      setDragStart(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingKey, dragStart, onUpdateFieldCoordinates, scale, bank.widthMm, bank.heightMm]);

  return (
    <div className="relative inline-block select-none overflow-visible">
      {/* Horizontal Ruler */}
      {showRulers && (
        <div
          className="absolute left-6 top-0 h-5 bg-slate-200 border-b border-slate-300 flex overflow-hidden text-[9px] text-slate-600 font-mono"
          style={{ width: `${canvasWidthPx}px` }}
        >
          {Array.from({ length: Math.floor(bank.widthMm / 10) + 1 }).map((_, i) => (
            <div
              key={`ruler-h-${i}`}
              className="border-l border-slate-400 pl-0.5"
              style={{
                width: `${10 * scale}px`,
                flexShrink: 0,
              }}
            >
              {i * 10}
            </div>
          ))}
        </div>
      )}

      {/* Vertical Ruler */}
      {showRulers && (
        <div
          className="absolute left-0 top-6 w-6 bg-slate-200 border-r border-slate-300 flex flex-col overflow-hidden text-[9px] text-slate-600 font-mono"
          style={{ height: `${canvasHeightPx}px` }}
        >
          {Array.from({ length: Math.floor(bank.heightMm / 10) + 1 }).map((_, i) => (
            <div
              key={`ruler-v-${i}`}
              className="border-t border-slate-400 pt-0.5"
              style={{
                height: `${10 * scale}px`,
                flexShrink: 0,
              }}
            >
              {i * 10}
            </div>
          ))}
        </div>
      )}

      {/* Canvas Wrap */}
      <div
        className={showRulers ? 'ml-6 mt-6' : ''}
        style={{
          width: `${canvasWidthPx}px`,
          height: `${canvasHeightPx}px`,
          position: 'relative',
        }}
      >
        <div
          ref={containerRef}
          className={`relative rounded-md transition-shadow overflow-hidden ${
            showBackground
              ? 'cheque-pattern border-2 border-slate-300 shadow-md text-slate-900'
              : 'bg-white border-2 border-dashed border-slate-300 shadow-sm text-slate-900'
          }`}
          style={{
            width: `${canvasWidthPx}px`,
            height: `${canvasHeightPx}px`,
          }}
          onClick={() => {
            if (interactiveMode && onSelectField) onSelectField('');
          }}
        >
          {/* Background Realistic Nepali Cheque Details */}
          {showBackground && (
            <div className="absolute inset-0 pointer-events-none">
              {/* Security Border Guilloche line */}
              <div
                className="absolute border border-slate-300 rounded"
                style={{
                  top: `${2.5 * scale}px`,
                  left: `${2.5 * scale}px`,
                  right: `${2.5 * scale}px`,
                  bottom: `${2.5 * scale}px`,
                }}
              />

              {/* Bank Header Lockup */}
              <div
                className="absolute flex items-start justify-between"
                style={{
                  top: `${4 * scale}px`,
                  left: `${6 * scale}px`,
                  right: `${60 * scale}px`,
                }}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full flex items-center justify-center text-[7px] text-white font-bold"
                      style={{ backgroundColor: bank.primaryColor || '#0f172a' }}
                    >
                      ✓
                    </div>
                    <span className="text-[11px] font-bold tracking-tight text-slate-800 uppercase">
                      {bank.name}
                    </span>
                  </div>
                  <div className="text-[8px] text-slate-600 pl-5">
                    {bank.branch || 'Corporate Branch, Kathmandu'}
                  </div>
                  {bank.accountNumber && (
                    <div className="text-[8px] text-slate-600 pl-5 font-mono">
                      A/C: {bank.accountNumber} ({bank.accountHolderName || 'Office Account'})
                    </div>
                  )}
                </div>
              </div>

              {/* Preprinted "Date" Box Graphic */}
              <div
                className="absolute flex items-center gap-1"
                style={{
                  top: `${fields.date.y * scale - 12}px`,
                  left: `${fields.date.x * scale}px`,
                }}
              >
                <span className="text-[7.5px] uppercase font-semibold text-slate-600 tracking-wider">
                  Date / मिति:
                </span>
                <span className="text-[6.5px] text-slate-600 font-mono">D D M M Y Y Y Y</span>
              </div>

              {/* Realistic Box Outlines for Date if boxed */}
              {fields.date.isBoxed && (
                <div
                  className="absolute flex border border-slate-400 bg-white/70"
                  style={{
                    left: `${(fields.date.x + offsetX) * scale}px`,
                    top: `${(fields.date.y + offsetY) * scale}px`,
                    width: `${fields.date.width * scale}px`,
                    height: `${(fields.date.height || 6.5) * scale}px`,
                  }}
                >
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div
                      key={`box-${i}`}
                      className="flex-1 border-r border-slate-300 last:border-r-0"
                    />
                  ))}
                </div>
              )}

              {/* Preprinted "Pay" Label */}
              <div
                className="absolute font-semibold text-slate-700 uppercase"
                style={{
                  left: `${8 * scale}px`,
                  top: `${fields.payee.y * scale}px`,
                  fontSize: `${9 * (zoom / 100)}px`,
                }}
              >
                PAY / भुक्तानी दिनुहोस्
              </div>

              {/* Preprinted Payee line underline */}
              <div
                className="absolute border-b border-slate-300 border-dotted"
                style={{
                  left: `${26 * scale}px`,
                  top: `${(fields.payee.y + 4.5) * scale}px`,
                  width: `${145 * scale}px`,
                }}
              />

              {/* Preprinted "Or Bearer" text on right */}
              <div
                className="absolute text-slate-500 italic"
                style={{
                  left: `${174 * scale}px`,
                  top: `${(fields.bearerStrike.y - 1) * scale}px`,
                  fontSize: `${8 * (zoom / 100)}px`,
                }}
              >
                or Bearer
              </div>

              {/* Preprinted "Rupees" Label */}
              <div
                className="absolute font-semibold text-slate-700 uppercase"
                style={{
                  left: `${8 * scale}px`,
                  top: `${fields.amountInWords.y * scale}px`,
                  fontSize: `${8.5 * (zoom / 100)}px`,
                }}
              >
                RUPEES / रुपैयाँ
              </div>

              {/* Preprinted amount in words underline lines */}
              <div
                className="absolute border-b border-slate-300 border-dotted"
                style={{
                  left: `${30 * scale}px`,
                  top: `${(fields.amountInWords.y + 4) * scale}px`,
                  width: `${140 * scale}px`,
                }}
              />
              <div
                className="absolute border-b border-slate-300 border-dotted"
                style={{
                  left: `${10 * scale}px`,
                  top: `${(fields.amountInWords.y + 9.5) * scale}px`,
                  width: `${135 * scale}px`,
                }}
              />

              {/* Preprinted Amount in Figures Box */}
              <div
                className="absolute border border-slate-400 bg-white/70 rounded flex items-center px-1"
                style={{
                  left: `${(fields.amountInFigures.x + offsetX) * scale - 2}px`,
                  top: `${(fields.amountInFigures.y + offsetY) * scale - 2}px`,
                  width: `${fields.amountInFigures.width * scale + 4}px`,
                  height: `${7 * scale}px`,
                }}
              >
                <span className="text-[9px] font-bold text-slate-400">रू / NPR</span>
              </div>

              {/* Preprinted Signature Area */}
              <div
                className="absolute text-right"
                style={{
                  right: `${12 * scale}px`,
                  bottom: `${8 * scale}px`,
                }}
              >
                <div
                  className="border-b border-slate-400"
                  style={{ width: `${45 * scale}px`, marginBottom: '2px' }}
                />
                <div className="text-[7.5px] text-slate-500 uppercase tracking-wider">
                  Authorized Signatory
                </div>
              </div>

              {/* MICR Band at Bottom */}
              <div
                className="absolute bottom-0 inset-x-0 h-4 bg-slate-100/90 border-t border-slate-300 flex items-center justify-center gap-6 font-mono text-[9px] text-slate-600 tracking-widest"
              >
                <span>⑈{cheque?.chequeNumber || '00481922'}⑈</span>
                <span>446002010⑆</span>
                <span>01100175029481⑈ 10</span>
              </div>
            </div>
          )}

          {/* Grid lines overlay */}
          {showGrid && (
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage: `
                  linear-gradient(to right, rgba(148, 163, 184, 0.25) 1px, transparent 1px),
                  linear-gradient(to bottom, rgba(148, 163, 184, 0.25) 1px, transparent 1px)
                `,
                backgroundSize: `${5 * scale}px ${5 * scale}px`,
              }}
            />
          )}

          {/* ================= DYNAMIC FIELD OVERLAYS ================= */}

          {/* A/C PAYEE ONLY CROSSING */}
          {fields.acPayeeCrossing.enabled && (cheque?.isAcPayeeOnly ?? true) && (
            <div
              className={`absolute cursor-move ${
                interactiveMode && selectedFieldKey === 'acPayeeCrossing'
                  ? 'ring-2 ring-blue-500 ring-offset-1 z-30'
                  : ''
              }`}
              style={{
                left: `${(fields.acPayeeCrossing.x + offsetX) * scale}px`,
                top: `${(fields.acPayeeCrossing.y + offsetY) * scale}px`,
                width: `${fields.acPayeeCrossing.width * scale}px`,
              }}
              onMouseDown={(e) => handleMouseDown(e, 'acPayeeCrossing', fields.acPayeeCrossing.x, fields.acPayeeCrossing.y)}
              onClick={(e) => {
                if (interactiveMode && onSelectField) {
                  e.stopPropagation();
                  onSelectField('acPayeeCrossing');
                }
              }}
            >
              <div
                style={{
                  transform: fields.acPayeeCrossing.style === 'diagonal' ? 'rotate(-30deg)' : 'none',
                  transformOrigin: 'top left',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  width: '100%',
                }}
              >
                {/* Top Parallel Line */}
                <div
                  className="w-full bg-slate-900"
                  style={{ height: `${Math.max(1.5, 0.45 * scale)}px` }}
                />
                {/* AC PAYEE Text in the Middle */}
                <div
                  className="w-full text-center font-bold tracking-wider text-slate-900 uppercase"
                  style={{
                    padding: `${1.2 * scale}px 0`,
                    fontFamily: fields.acPayeeCrossing.fontFamily,
                    fontSize: `${fields.acPayeeCrossing.fontSize * (zoom / 100) * 1.15}px`,
                    lineHeight: 1,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {fields.acPayeeCrossing.label || 'A/C PAYEE'}
                </div>
                {/* Bottom Parallel Line */}
                <div
                  className="w-full bg-slate-900"
                  style={{ height: `${Math.max(1.5, 0.45 * scale)}px` }}
                />
              </div>
            </div>
          )}

          {/* DATE FIELD */}
          {fields.date.enabled && (
            <div
              className={`absolute cursor-move ${
                interactiveMode && selectedFieldKey === 'date'
                  ? 'ring-2 ring-blue-500 ring-offset-1 z-30'
                  : ''
              }`}
              style={{
                left: `${(fields.date.x + offsetX) * scale}px`,
                top: `${(fields.date.y + offsetY) * scale}px`,
                width: `${fields.date.width * scale}px`,
                height: `${(fields.date.height || 6.5) * scale}px`,
                fontFamily: fields.date.fontFamily,
                fontSize: `${fields.date.fontSize * (zoom / 100) * 1.25}px`,
                fontWeight: fields.date.fontWeight,
                color: '#0f172a',
                display: 'flex',
                alignItems: 'center',
              }}
              onMouseDown={(e) => handleMouseDown(e, 'date', fields.date.x, fields.date.y)}
              onClick={(e) => {
                if (interactiveMode && onSelectField) {
                  e.stopPropagation();
                  onSelectField('date');
                }
              }}
            >
              {fields.date.isBoxed ? (
                <div className="flex w-full justify-between items-center h-full">
                  {dateChars.map((char, index) => (
                    <span
                      key={index}
                      className="inline-block text-center font-bold"
                      style={{
                        width: `${(fields.date.width / 8) * scale}px`,
                      }}
                    >
                      {char}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="font-bold">{dateStr}</span>
              )}
            </div>
          )}

          {/* PAYEE NAME */}
          {fields.payee.enabled && (
            <div
              className={`absolute cursor-move truncate ${
                interactiveMode && selectedFieldKey === 'payee'
                  ? 'ring-2 ring-blue-500 ring-offset-1 z-30'
                  : ''
              }`}
              style={{
                left: `${(fields.payee.x + offsetX) * scale}px`,
                top: `${(fields.payee.y + offsetY) * scale}px`,
                width: `${fields.payee.width * scale}px`,
                fontFamily: fields.payee.fontFamily,
                fontSize: `${fields.payee.fontSize * (zoom / 100) * 1.3}px`,
                fontWeight: fields.payee.fontWeight,
                textAlign: fields.payee.align,
                color: '#0f172a',
              }}
              onMouseDown={(e) => handleMouseDown(e, 'payee', fields.payee.x, fields.payee.y)}
              onClick={(e) => {
                if (interactiveMode && onSelectField) {
                  e.stopPropagation();
                  onSelectField('payee');
                }
              }}
            >
              {payeeText}
            </div>
          )}

          {/* AMOUNT IN WORDS */}
          {fields.amountInWords.enabled && (
            <div
              className={`absolute cursor-move ${
                interactiveMode && selectedFieldKey === 'amountInWords'
                  ? 'ring-2 ring-blue-500 ring-offset-1 z-30'
                  : ''
              }`}
              style={{
                left: `${(fields.amountInWords.x + offsetX) * scale}px`,
                top: `${(fields.amountInWords.y + offsetY) * scale}px`,
                width: `${fields.amountInWords.width * scale}px`,
                fontFamily: fields.amountInWords.fontFamily,
                fontSize: `${fields.amountInWords.fontSize * (zoom / 100) * 1.25}px`,
                fontWeight: fields.amountInWords.fontWeight,
                textAlign: fields.amountInWords.align,
                lineHeight: fields.amountInWords.lineHeight || 1.45,
                color: '#0f172a',
                wordBreak: 'break-word',
              }}
              onMouseDown={(e) => handleMouseDown(e, 'amountInWords', fields.amountInWords.x, fields.amountInWords.y)}
              onClick={(e) => {
                if (interactiveMode && onSelectField) {
                  e.stopPropagation();
                  onSelectField('amountInWords');
                }
              }}
            >
              {wordsText}
            </div>
          )}

          {/* AMOUNT IN FIGURES */}
          {fields.amountInFigures.enabled && (
            <div
              className={`absolute cursor-move ${
                interactiveMode && selectedFieldKey === 'amountInFigures'
                  ? 'ring-2 ring-blue-500 ring-offset-1 z-30'
                  : ''
              }`}
              style={{
                left: `${(fields.amountInFigures.x + offsetX) * scale}px`,
                top: `${(fields.amountInFigures.y + offsetY) * scale}px`,
                width: `${fields.amountInFigures.width * scale}px`,
                fontFamily: fields.amountInFigures.fontFamily,
                fontSize: `${fields.amountInFigures.fontSize * (zoom / 100) * 1.35}px`,
                fontWeight: fields.amountInFigures.fontWeight,
                textAlign: fields.amountInFigures.align,
                color: '#0f172a',
              }}
              onMouseDown={(e) => handleMouseDown(e, 'amountInFigures', fields.amountInFigures.x, fields.amountInFigures.y)}
              onClick={(e) => {
                if (interactiveMode && onSelectField) {
                  e.stopPropagation();
                  onSelectField('amountInFigures');
                }
              }}
            >
              {formattedFigure}
            </div>
          )}

          {/* BEARER STRIKE */}
          {fields.bearerStrike.enabled && (cheque?.strikeBearer ?? true) && (
            <div
              className={`absolute cursor-move ${
                interactiveMode && selectedFieldKey === 'bearerStrike'
                  ? 'ring-2 ring-blue-500 ring-offset-1 z-30'
                  : ''
              }`}
              style={{
                left: `${(fields.bearerStrike.x + offsetX) * scale}px`,
                top: `${(fields.bearerStrike.y + offsetY) * scale}px`,
                width: `${fields.bearerStrike.width * scale}px`,
                height: '2px',
                backgroundColor: '#0f172a',
              }}
              onMouseDown={(e) => handleMouseDown(e, 'bearerStrike', fields.bearerStrike.x, fields.bearerStrike.y)}
              onClick={(e) => {
                if (interactiveMode && onSelectField) {
                  e.stopPropagation();
                  onSelectField('bearerStrike');
                }
              }}
            />
          )}

          {/* SIGNATORY LABEL */}
          {fields.signatory.enabled && (
            <div
              className={`absolute cursor-move ${
                interactiveMode && selectedFieldKey === 'signatory'
                  ? 'ring-2 ring-blue-500 ring-offset-1 z-30'
                  : ''
              }`}
              style={{
                left: `${(fields.signatory.x + offsetX) * scale}px`,
                top: `${(fields.signatory.y + offsetY) * scale}px`,
                width: `${fields.signatory.width * scale}px`,
                fontFamily: fields.signatory.fontFamily,
                fontSize: `${fields.signatory.fontSize * (zoom / 100) * 1.15}px`,
                fontWeight: fields.signatory.fontWeight,
                textAlign: fields.signatory.align,
                color: '#0f172a',
              }}
              onMouseDown={(e) => handleMouseDown(e, 'signatory', fields.signatory.x, fields.signatory.y)}
              onClick={(e) => {
                if (interactiveMode && onSelectField) {
                  e.stopPropagation();
                  onSelectField('signatory');
                }
              }}
            >
              {fields.signatory.label || 'For Apex Accounting'}
            </div>
          )}

          {/* MEMO / REFERENCE */}
          {fields.memo.enabled && (cheque?.memo || interactiveMode) && (
            <div
              className={`absolute cursor-move truncate ${
                interactiveMode && selectedFieldKey === 'memo'
                  ? 'ring-2 ring-blue-500 ring-offset-1 z-30'
                  : ''
              }`}
              style={{
                left: `${(fields.memo.x + offsetX) * scale}px`,
                top: `${(fields.memo.y + offsetY) * scale}px`,
                width: `${fields.memo.width * scale}px`,
                fontFamily: fields.memo.fontFamily,
                fontSize: `${fields.memo.fontSize * (zoom / 100) * 1.1}px`,
                fontWeight: fields.memo.fontWeight,
                textAlign: fields.memo.align,
                color: '#334155',
              }}
              onMouseDown={(e) => handleMouseDown(e, 'memo', fields.memo.x, fields.memo.y)}
              onClick={(e) => {
                if (interactiveMode && onSelectField) {
                  e.stopPropagation();
                  onSelectField('memo');
                }
              }}
            >
              {fields.memo.prefix || 'Ref: '}{cheque?.memo || 'Sample Memo Description'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
