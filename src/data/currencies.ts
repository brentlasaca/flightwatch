
export interface Currency { code: string; name: string; }

/** All 72 Google Travel-supported currencies (PRD §5.3). */
export const ALL_CURRENCIES: Currency[] = [
  { code: 'ALL', name: 'Albanian Lek' },
  { code: 'DZD', name: 'Algerian Dinar' },
  { code: 'ARS', name: 'Argentine Peso' },
  { code: 'AMD', name: 'Armenian Dram' },
  { code: 'AWG', name: 'Aruban Florin' },
  { code: 'AUD', name: 'Australian Dollar' },
  { code: 'AZN', name: 'Azerbaijani Manat' },
  { code: 'BSD', name: 'Bahamian Dollar' },
  { code: 'BHD', name: 'Bahraini Dinar' },
  { code: 'BYN', name: 'Belarusian Ruble' },
  { code: 'BMD', name: 'Bermudan Dollar' },
  { code: 'BAM', name: 'Bosnia-Herzegovina Convertible Mark' },
  { code: 'BRL', name: 'Brazilian Real' },
  { code: 'GBP', name: 'British Pound' },
  { code: 'BGN', name: 'Bulgarian Lev' },
  { code: 'XPF', name: 'CFP Franc' },
  { code: 'CAD', name: 'Canadian Dollar' },
  { code: 'CLP', name: 'Chilean Peso' },
  { code: 'CNY', name: 'Chinese Yuan' },
  { code: 'COP', name: 'Colombian Peso' },
  { code: 'CRC', name: 'Costa Rican Colón' },
  { code: 'CUP', name: 'Cuban Peso' },
  { code: 'CZK', name: 'Czech Koruna' },
  { code: 'DKK', name: 'Danish Krone' },
  { code: 'DOP', name: 'Dominican Peso' },
  { code: 'EGP', name: 'Egyptian Pound' },
  { code: 'EUR', name: 'Euro' },
  { code: 'GEL', name: 'Georgian Lari' },
  { code: 'HKD', name: 'Hong Kong Dollar' },
  { code: 'HUF', name: 'Hungarian Forint' },
  { code: 'ISK', name: 'Icelandic Króna' },
  { code: 'INR', name: 'Indian Rupee' },
  { code: 'IDR', name: 'Indonesian Rupiah' },
  { code: 'IRR', name: 'Iranian Rial' },
  { code: 'ILS', name: 'Israeli New Shekel' },
  { code: 'JMD', name: 'Jamaican Dollar' },
  { code: 'JPY', name: 'Japanese Yen' },
  { code: 'JOD', name: 'Jordanian Dinar' },
  { code: 'KZT', name: 'Kazakhstani Tenge' },
  { code: 'KWD', name: 'Kuwaiti Dinar' },
  { code: 'LBP', name: 'Lebanese Pound' },
  { code: 'MKD', name: 'Macedonian Denar' },
  { code: 'MYR', name: 'Malaysian Ringgit' },
  { code: 'MXN', name: 'Mexican Peso' },
  { code: 'MDL', name: 'Moldovan Leu' },
  { code: 'MAD', name: 'Moroccan Dirham' },
  { code: 'TWD', name: 'New Taiwan Dollar' },
  { code: 'NZD', name: 'New Zealand Dollar' },
  { code: 'NOK', name: 'Norwegian Krone' },
  { code: 'OMR', name: 'Omani Rial' },
  { code: 'PKR', name: 'Pakistani Rupee' },
  { code: 'PAB', name: 'Panamanian Balboa' },
  { code: 'PEN', name: 'Peruvian Sol' },
  { code: 'PHP', name: 'Philippine Peso' },
  { code: 'PLN', name: 'Polish Zloty' },
  { code: 'QAR', name: 'Qatari Riyal' },
  { code: 'RON', name: 'Romanian Leu' },
  { code: 'RUB', name: 'Russian Ruble' },
  { code: 'SAR', name: 'Saudi Riyal' },
  { code: 'RSD', name: 'Serbian Dinar' },
  { code: 'SGD', name: 'Singapore Dollar' },
  { code: 'ZAR', name: 'South African Rand' },
  { code: 'KRW', name: 'South Korean Won' },
  { code: 'SEK', name: 'Swedish Krona' },
  { code: 'CHF', name: 'Swiss Franc' },
  { code: 'THB', name: 'Thai Baht' },
  { code: 'TRY', name: 'Turkish Lira' },
  { code: 'USD', name: 'US Dollar' },
  { code: 'UAH', name: 'Ukrainian Hryvnia' },
  { code: 'AED', name: 'United Arab Emirates Dirham' },
  { code: 'VND', name: 'Vietnamese Dong' },
];

export const DEFAULT_CURRENCY = 'USD';

/** USD pinned first; remaining 71 sorted A-Z by code. */
export const CURRENCY_OPTIONS: Currency[] = [
  { code: 'USD', name: 'US Dollar' },
  ...ALL_CURRENCIES
    .filter(c => c.code !== 'USD')
    .sort((a, b) => a.code.localeCompare(b.code)),
];

/** Get the display symbol for an amount input prefix. Uses Intl so every
 *  currency is covered without a manual mapping table. */
export function getCurrencySymbol(code: string): string {
  try {
    const parts = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: code,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).formatToParts(0);
    return parts.find(p => p.type === 'currency')?.value ?? code;
  } catch {
    return code;
  }
}
