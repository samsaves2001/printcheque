/**
 * Nepali / South Asian numbering and Amount-in-Words converter.
 * Converts figures into proper English representation using:
 * Rupee, Paisa, Thousand, Lakh, Crore, Arba.
 */

const ONES: string[] = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen'
];

const TENS: string[] = [
  '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
];

/**
 * Converts a number less than 1,000 into English words.
 */
function convertBelowThousand(n: number): string {
  let word = '';
  const hundreds = Math.floor(n / 100);
  const remainder = n % 100;

  if (hundreds > 0) {
    word += `${ONES[hundreds]} Hundred`;
    if (remainder > 0) {
      word += ' ';
    }
  }

  if (remainder > 0) {
    if (remainder < 20) {
      word += ONES[remainder];
    } else {
      const ten = Math.floor(remainder / 10);
      const one = remainder % 10;
      word += TENS[ten];
      if (one > 0) {
        word += ` ${ONES[one]}`;
      }
    }
  }

  return word.trim();
}

/**
 * Converts an integer amount into words according to the South Asian / Nepali system:
 * Units, Hundreds, Thousands, Lakhs (1,00,000), Crores (1,00,00,000), Arba (100 Crores).
 */
export function convertIntegerToWords(amount: number): string {
  if (amount === 0) return 'Zero';
  if (amount < 0) return `Minus ${convertIntegerToWords(Math.abs(amount))}`;

  let n = Math.floor(amount);
  const parts: string[] = [];

  // Arba: 10^9 (100 Crores = 1 Arba)
  const arba = Math.floor(n / 1000000000);
  if (arba > 0) {
    parts.push(`${convertIntegerToWords(arba)} Arba`);
    n %= 1000000000;
  }

  // Crore: 10^7 (1 Crore = 100 Lakhs = 10 Million)
  const crore = Math.floor(n / 10000000);
  if (crore > 0) {
    parts.push(`${convertBelowThousand(crore)} Crore`);
    n %= 10000000;
  }

  // Lakh: 10^5 (1 Lakh = 100 Thousands = 100,000)
  const lakh = Math.floor(n / 100000);
  if (lakh > 0) {
    parts.push(`${convertBelowThousand(lakh)} Lakh`);
    n %= 100000;
  }

  // Thousand: 10^3 (1 Thousand = 1,000)
  const thousand = Math.floor(n / 1000);
  if (thousand > 0) {
    parts.push(`${convertBelowThousand(thousand)} Thousand`);
    n %= 1000;
  }

  // Remainder: Below 1,000 (Hundreds and Units)
  if (n > 0) {
    parts.push(convertBelowThousand(n));
  }

  return parts.join(' ').trim();
}

/**
 * Converts a floating point amount in NPR to words.
 * Example: 125450.50 -> "One Lakh Twenty Five Thousand Four Hundred Fifty Rupees and Fifty Paisa Only"
 * Example: 50000 -> "Fifty Thousand Rupees Only"
 * Example: 0.75 -> "Seventy Five Paisa Only"
 */
export function amountToNepaliWords(rawAmount: number | string): string {
  const numeric = typeof rawAmount === 'string' ? parseFloat(rawAmount) : rawAmount;

  if (isNaN(numeric) || numeric === null || numeric === undefined) {
    return '';
  }

  if (numeric < 0) {
    return 'Negative amounts cannot be converted';
  }

  // Round to 2 decimal places to avoid IEEE 754 precision issues
  const rounded = Math.round(numeric * 100) / 100;
  const rupees = Math.floor(rounded);
  const paisa = Math.round((rounded - rupees) * 100);

  if (rupees === 0 && paisa === 0) {
    return 'Zero Rupees Only';
  }

  let words = '';

  if (rupees > 0) {
    const rupeeWords = convertIntegerToWords(rupees);
    words += `${rupeeWords} ${rupees === 1 ? 'Rupee' : 'Rupees'}`;
  }

  if (paisa > 0) {
    const paisaWords = convertBelowThousand(paisa);
    if (rupees > 0) {
      words += ` and ${paisaWords} Paisa`;
    } else {
      words += `${paisaWords} Paisa`;
    }
  }

  return `${words} Only`;
}

/**
 * Formats a number with Nepali / South Asian comma separation.
 * Example: 1234567.89 -> "12,34,567.89"
 * Example: 50000 -> "50,000.00"
 */
export function formatNepaliCurrency(
  amount: number | string,
  options: { includeDecimals?: boolean; symbol?: string } = {}
): string {
  const { includeDecimals = true, symbol } = options;
  const numeric = typeof amount === 'string' ? parseFloat(amount) : amount;

  if (isNaN(numeric) || numeric === null || numeric === undefined) {
    return includeDecimals ? '0.00' : '0';
  }

  const rounded = Math.round(numeric * 100) / 100;
  const isNegative = rounded < 0;
  const absVal = Math.abs(rounded);

  const parts = absVal.toFixed(2).split('.');
  const integerPart = parts[0];
  const decimalPart = parts[1];

  let formattedInt = '';

  if (integerPart.length <= 3) {
    formattedInt = integerPart;
  } else {
    // Last 3 digits
    const last3 = integerPart.substring(integerPart.length - 3);
    const otherDigits = integerPart.substring(0, integerPart.length - 3);

    // Group remaining digits by 2s from right to left
    const grouped = otherDigits.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
    formattedInt = `${grouped},${last3}`;
  }

  let result = formattedInt;
  if (includeDecimals) {
    result += `.${decimalPart}`;
  }

  if (isNegative) {
    result = `-${result}`;
  }

  if (symbol) {
    return `${symbol} ${result}`;
  }

  return result;
}

/**
 * Splits a date into characters for boxed cheque printing.
 * Given "2026-11-04", returns ["0", "4", "1", "1", "2", "0", "2", "6"] (DDMMYYYY)
 */
export function getBoxedDateChars(dateStr: string): string[] {
  if (!dateStr) return Array(8).fill('');
  try {
    const [year, month, day] = dateStr.split('-');
    if (!year || !month || !day) return Array(8).fill('');

    const formatted = `${day.padStart(2, '0')}${month.padStart(2, '0')}${year}`;
    return formatted.split('');
  } catch {
    return Array(8).fill('');
  }
}

/**
 * Formats a date string for display.
 */
export function formatDisplayDate(dateStr: string, format: string = 'DD/MM/YYYY'): string {
  if (!dateStr) return '';
  try {
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const [year, month, day] = parts;

    if (format === 'DD/MM/YYYY') {
      return `${day}/${month}/${year}`;
    }
    if (format === 'YYYY-MM-DD') {
      return `${year}-${month}-${day}`;
    }
    if (format === 'DD-MMM-YYYY') {
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const mIdx = parseInt(month, 10) - 1;
      return `${day}-${monthNames[mIdx] || month}-${year}`;
    }
    return `${day}/${month}/${year}`;
  } catch {
    return dateStr;
  }
}
