import React, { useEffect } from 'react';
import { BankConfig, ChequeTemplate, CalibrationProfile, ChequeRecord } from '../types';
import { getBoxedDateChars, formatNepaliCurrency } from '../utils/nepaliNumberWords';

export interface PrintData {
  bank: BankConfig;
  template: ChequeTemplate;
  calibration?: CalibrationProfile | null;
  cheque?: Partial<ChequeRecord>;
  mode: 'cheque' | 'test-alignment';
}

interface PhysicalPrintStageProps {
  printData: PrintData | null;
  onPrintComplete?: () => void;
}

export const PhysicalPrintStage: React.FC<PhysicalPrintStageProps> = ({ printData, onPrintComplete }) => {
  useEffect(() => {
    if (!printData) return;

    const isRotated = printData.calibration?.feedOrientation === 'portrait-rot90';
    const pageWidth = isRotated ? printData.bank.heightMm : printData.bank.widthMm;
    const pageHeight = isRotated ? printData.bank.widthMm : printData.bank.heightMm;

    // Inject dynamic exact page dimension stylesheet
    const styleId = 'dynamic-cheque-page-style';
    let styleEl = document.getElementById(styleId) as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }

    styleEl.innerHTML = `
      @media print {
        @page {
          size: ${pageWidth}mm ${pageHeight}mm;
          margin: 0mm;
        }
        html, body {
          width: ${pageWidth}mm !important;
          height: ${pageHeight}mm !important;
          margin: 0 !important;
          padding: 0 !important;
          background: transparent !important;
        }
      }
    `;

    const handleAfterPrint = () => {
      if (onPrintComplete) {
        onPrintComplete();
      }
    };

    window.addEventListener('afterprint', handleAfterPrint);

    return () => {
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, [printData, onPrintComplete]);

  if (!printData) return null;

  const { bank, template, calibration, cheque, mode } = printData;
  const isRotated = calibration?.feedOrientation === 'portrait-rot90';
  const offsetX = calibration?.offsetX || 0;
  const offsetY = calibration?.offsetY || 0;

  const fields = template.fields;

  // Amount formatted
  const formattedFigure = cheque?.amount !== undefined
    ? `${fields.amountInFigures.prefix || ''}${formatNepaliCurrency(cheque.amount)}${fields.amountInFigures.suffix || ''}`
    : '';

  // Boxed date characters
  const dateChars = getBoxedDateChars(cheque?.chequeDate || '');

  return (
    <div
      id="print-stage"
      style={{
        width: `${bank.widthMm}mm`,
        height: `${bank.heightMm}mm`,
        position: 'relative',
        boxSizing: 'border-box',
        overflow: 'hidden',
        background: 'transparent',
        ...(isRotated
          ? {
              transform: 'rotate(90deg)',
              transformOrigin: 'top left',
              left: `${bank.heightMm}mm`,
              top: '0mm',
            }
          : {}),
      }}
    >
      {mode === 'test-alignment' ? (
        /* ================= CALIBRATION TEST SHEET ================= */
        <div
          style={{
            width: `${bank.widthMm}mm`,
            height: `${bank.heightMm}mm`,
            border: '0.25mm solid #000',
            position: 'relative',
            fontFamily: 'monospace',
            color: '#000',
            boxSizing: 'border-box',
          }}
        >
          {/* Header watermark text */}
          <div
            style={{
              position: 'absolute',
              top: '4mm',
              left: '10mm',
              fontSize: '8pt',
              fontWeight: 'bold',
            }}
          >
            ALIGNMENT TEST SHEET: {bank.name.toUpperCase()} ({bank.widthMm}mm × {bank.heightMm}mm)
            {calibration ? ` | Offset: X=${calibration.offsetX}mm, Y=${calibration.offsetY}mm` : ''}
          </div>

          {/* Corner crosshairs */}
          {/* Top Left */}
          <div style={{ position: 'absolute', top: '5mm', left: '5mm', fontSize: '7pt' }}>+ (5,5)</div>
          {/* Top Right */}
          <div style={{ position: 'absolute', top: '5mm', right: '5mm', fontSize: '7pt', textAlign: 'right' }}>+ ({bank.widthMm - 5},5)</div>
          {/* Bottom Left */}
          <div style={{ position: 'absolute', bottom: '5mm', left: '5mm', fontSize: '7pt' }}>+ (5,{bank.heightMm - 5})</div>
          {/* Bottom Right */}
          <div style={{ position: 'absolute', bottom: '5mm', right: '5mm', fontSize: '7pt', textAlign: 'right' }}>+ ({bank.widthMm - 5},{bank.heightMm - 5})</div>

          {/* Center alignment marks */}
          <div
            style={{
              position: 'absolute',
              left: `${bank.widthMm / 2}mm`,
              top: '2mm',
              height: '3mm',
              borderLeft: '0.5mm solid #000',
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: '2mm',
              top: `${bank.heightMm / 2}mm`,
              width: '3mm',
              borderTop: '0.5mm solid #000',
            }}
          />

          {/* Horizontal Millimeter Ticks every 10mm */}
          {Array.from({ length: Math.floor(bank.widthMm / 10) }).map((_, i) => {
            const mm = (i + 1) * 10;
            return (
              <div
                key={`h-${mm}`}
                style={{
                  position: 'absolute',
                  left: `${mm}mm`,
                  top: '0',
                  height: mm % 50 === 0 ? '4mm' : '2.5mm',
                  borderLeft: '0.2mm solid #000',
                  fontSize: '5pt',
                  paddingLeft: '0.5mm',
                }}
              >
                {mm}
              </div>
            );
          })}

          {/* Vertical Millimeter Ticks every 10mm */}
          {Array.from({ length: Math.floor(bank.heightMm / 10) }).map((_, i) => {
            const mm = (i + 1) * 10;
            return (
              <div
                key={`v-${mm}`}
                style={{
                  position: 'absolute',
                  top: `${mm}mm`,
                  left: '0',
                  width: mm % 50 === 0 ? '4mm' : '2.5mm',
                  borderTop: '0.2mm solid #000',
                  fontSize: '5pt',
                  paddingTop: '0.5mm',
                }}
              >
                {mm}
              </div>
            );
          })}

          {/* Test fields simulating actual placement */}
          {/* Date */}
          <div
            style={{
              position: 'absolute',
              left: `${fields.date.x + offsetX}mm`,
              top: `${fields.date.y + offsetY}mm`,
              width: `${fields.date.width}mm`,
              border: '0.2mm dashed #000',
              padding: '1mm',
              fontSize: '8pt',
            }}
          >
            [DATE: 04 11 2026] (X:{fields.date.x} Y:{fields.date.y})
          </div>

          {/* Payee */}
          <div
            style={{
              position: 'absolute',
              left: `${fields.payee.x + offsetX}mm`,
              top: `${fields.payee.y + offsetY}mm`,
              width: `${fields.payee.width}mm`,
              border: '0.2mm dashed #000',
              padding: '1mm',
              fontSize: '8pt',
            }}
          >
            *** SAMPLE PAYEE NAME (X:{fields.payee.x} Y:{fields.payee.y}) ***
          </div>

          {/* Amount in Words */}
          <div
            style={{
              position: 'absolute',
              left: `${fields.amountInWords.x + offsetX}mm`,
              top: `${fields.amountInWords.y + offsetY}mm`,
              width: `${fields.amountInWords.width}mm`,
              border: '0.2mm dashed #000',
              padding: '1mm',
              fontSize: '8pt',
            }}
          >
            *** One Lakh Twenty Five Thousand Only (X:{fields.amountInWords.x} Y:{fields.amountInWords.y}) ***
          </div>

          {/* Amount in Figures */}
          <div
            style={{
              position: 'absolute',
              left: `${fields.amountInFigures.x + offsetX}mm`,
              top: `${fields.amountInFigures.y + offsetY}mm`,
              width: `${fields.amountInFigures.width}mm`,
              border: '0.2mm dashed #000',
              padding: '1mm',
              fontSize: '8pt',
              textAlign: 'center',
            }}
          >
            = 1,25,000.00 /-
          </div>

          {/* Test A/C Payee Crossing */}
          <div
            style={{
              position: 'absolute',
              left: `${fields.acPayeeCrossing.x + offsetX}mm`,
              top: `${fields.acPayeeCrossing.y + offsetY}mm`,
              width: `${fields.acPayeeCrossing.width}mm`,
            }}
          >
            <div
              style={{
                transform: fields.acPayeeCrossing.style === 'diagonal' ? 'rotate(-30deg)' : 'none',
                transformOrigin: 'top left',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                width: `${fields.acPayeeCrossing.width}mm`,
              }}
            >
              <div style={{ width: '100%', height: '0.45mm', backgroundColor: '#000' }} />
              <div
                style={{
                  padding: '1.2mm 0',
                  textAlign: 'center',
                  fontSize: `${fields.acPayeeCrossing.fontSize}pt`,
                  fontWeight: 'bold',
                  letterSpacing: '0.8px',
                  lineHeight: 1,
                  whiteSpace: 'nowrap',
                }}
              >
                {fields.acPayeeCrossing.label || 'A/C PAYEE'}
              </div>
              <div style={{ width: '100%', height: '0.45mm', backgroundColor: '#000' }} />
            </div>
          </div>

          {/* Instructions note on bottom left */}
          <div
            style={{
              position: 'absolute',
              left: '12mm',
              bottom: '5mm',
              width: '120mm',
              fontSize: '6.5pt',
              lineHeight: 1.3,
            }}
          >
            <strong>CALIBRATION INSTRUCTIONS:</strong><br />
            1. Overlay this sheet onto your physical blank cheque leaf.<br />
            2. Hold against light. Check if sample boxes align with the pre-printed lines.<br />
            3. If printed text is 2mm too far right, subtract 2mm from Offset X. If 1mm too low, subtract 1mm from Offset Y.
          </div>
        </div>
      ) : (
        /* ================= REAL PHYSICAL CHEQUE PRINT OVERLAY ================= */
        /* Only fields are rendered; zero background, zero borders, pure ink coordinates! */
        <div
          style={{
            width: `${bank.widthMm}mm`,
            height: `${bank.heightMm}mm`,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* A/C Payee Crossing: Text strictly in the middle between 2 parallel lines */}
          {fields.acPayeeCrossing.enabled && cheque?.isAcPayeeOnly && (
            <div
              style={{
                position: 'absolute',
                left: `${fields.acPayeeCrossing.x + offsetX}mm`,
                top: `${fields.acPayeeCrossing.y + offsetY}mm`,
                width: `${fields.acPayeeCrossing.width}mm`,
                pointerEvents: 'none',
              }}
            >
              <div
                style={{
                  transform: fields.acPayeeCrossing.style === 'diagonal' ? 'rotate(-30deg)' : 'none',
                  transformOrigin: 'top left',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  width: `${fields.acPayeeCrossing.width}mm`,
                }}
              >
                {/* Top Parallel Line */}
                <div
                  style={{
                    width: '100%',
                    height: '0.45mm',
                    backgroundColor: '#000',
                  }}
                />
                {/* AC PAYEE Text in the Middle */}
                <div
                  style={{
                    padding: '1.2mm 0',
                    textAlign: 'center',
                    fontFamily: fields.acPayeeCrossing.fontFamily,
                    fontSize: `${fields.acPayeeCrossing.fontSize}pt`,
                    fontWeight: 'bold',
                    letterSpacing: '0.8px',
                    color: '#000',
                    lineHeight: 1,
                    whiteSpace: 'nowrap',
                    textTransform: 'uppercase',
                  }}
                >
                  {fields.acPayeeCrossing.label || 'A/C PAYEE'}
                </div>
                {/* Bottom Parallel Line */}
                <div
                  style={{
                    width: '100%',
                    height: '0.45mm',
                    backgroundColor: '#000',
                  }}
                />
              </div>
            </div>
          )}

          {/* Date */}
          {fields.date.enabled && cheque?.chequeDate && (
            <div
              style={{
                position: 'absolute',
                left: `${fields.date.x + offsetX}mm`,
                top: `${fields.date.y + offsetY}mm`,
                width: `${fields.date.width}mm`,
                fontFamily: fields.date.fontFamily,
                fontSize: `${fields.date.fontSize}pt`,
                fontWeight: fields.date.fontWeight,
                color: '#000',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              {fields.date.isBoxed ? (
                <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between' }}>
                  {dateChars.map((char, index) => (
                    <span
                      key={index}
                      style={{
                        display: 'inline-block',
                        width: `${(fields.date.width / 8)}mm`,
                        textAlign: 'center',
                      }}
                    >
                      {char}
                    </span>
                  ))}
                </div>
              ) : (
                <span>{cheque.chequeDate}</span>
              )}
            </div>
          )}

          {/* Payee Name */}
          {fields.payee.enabled && cheque?.payeeName && (
            <div
              style={{
                position: 'absolute',
                left: `${fields.payee.x + offsetX}mm`,
                top: `${fields.payee.y + offsetY}mm`,
                width: `${fields.payee.width}mm`,
                fontFamily: fields.payee.fontFamily,
                fontSize: `${fields.payee.fontSize}pt`,
                fontWeight: fields.payee.fontWeight,
                textAlign: fields.payee.align,
                color: '#000',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
              }}
            >
              {fields.payee.prefix || ''}{cheque.payeeName}{fields.payee.suffix || ''}
            </div>
          )}

          {/* Amount in Words */}
          {fields.amountInWords.enabled && cheque?.amountInWords && (
            <div
              style={{
                position: 'absolute',
                left: `${fields.amountInWords.x + offsetX}mm`,
                top: `${fields.amountInWords.y + offsetY}mm`,
                width: `${fields.amountInWords.width}mm`,
                fontFamily: fields.amountInWords.fontFamily,
                fontSize: `${fields.amountInWords.fontSize}pt`,
                fontWeight: fields.amountInWords.fontWeight,
                textAlign: fields.amountInWords.align,
                lineHeight: fields.amountInWords.lineHeight || 1.45,
                color: '#000',
                wordBreak: 'break-word',
              }}
            >
              {fields.amountInWords.prefix || ''}{cheque.amountInWords}{fields.amountInWords.suffix || ''}
            </div>
          )}

          {/* Amount in Figures */}
          {fields.amountInFigures.enabled && cheque?.amount !== undefined && (
            <div
              style={{
                position: 'absolute',
                left: `${fields.amountInFigures.x + offsetX}mm`,
                top: `${fields.amountInFigures.y + offsetY}mm`,
                width: `${fields.amountInFigures.width}mm`,
                fontFamily: fields.amountInFigures.fontFamily,
                fontSize: `${fields.amountInFigures.fontSize}pt`,
                fontWeight: fields.amountInFigures.fontWeight,
                textAlign: fields.amountInFigures.align,
                color: '#000',
                whiteSpace: 'nowrap',
              }}
            >
              {formattedFigure}
            </div>
          )}

          {/* Bearer Strike-Through */}
          {fields.bearerStrike.enabled && cheque?.strikeBearer && (
            <div
              style={{
                position: 'absolute',
                left: `${fields.bearerStrike.x + offsetX}mm`,
                top: `${fields.bearerStrike.y + offsetY}mm`,
                width: `${fields.bearerStrike.width}mm`,
                height: '0.4mm',
                backgroundColor: '#000',
              }}
            />
          )}

          {/* Signatory Note */}
          {fields.signatory.enabled && (
            <div
              style={{
                position: 'absolute',
                left: `${fields.signatory.x + offsetX}mm`,
                top: `${fields.signatory.y + offsetY}mm`,
                width: `${fields.signatory.width}mm`,
                fontFamily: fields.signatory.fontFamily,
                fontSize: `${fields.signatory.fontSize}pt`,
                fontWeight: fields.signatory.fontWeight,
                textAlign: fields.signatory.align,
                color: '#000',
              }}
            >
              {fields.signatory.label || ''}
            </div>
          )}

          {/* Memo / Reference */}
          {fields.memo.enabled && cheque?.memo && (
            <div
              style={{
                position: 'absolute',
                left: `${fields.memo.x + offsetX}mm`,
                top: `${fields.memo.y + offsetY}mm`,
                width: `${fields.memo.width}mm`,
                fontFamily: fields.memo.fontFamily,
                fontSize: `${fields.memo.fontSize}pt`,
                fontWeight: fields.memo.fontWeight,
                textAlign: fields.memo.align,
                color: '#000',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
              }}
            >
              {fields.memo.prefix || ''}{cheque.memo}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
