export function sanitizeMoneyInput(
  value: string,
  previousValue = ''
): string {
  if (value.includes('.')) {
    return previousValue;
  }

  const cleanValue = value.replace(/[^0-9,]/g, '');

  const commaIndex = cleanValue.indexOf(',');

  if (commaIndex === -1) {
    return cleanValue;
  }

  const integerPart = cleanValue.slice(0, commaIndex) || '0';

  const decimalPart = cleanValue
    .slice(commaIndex + 1)
    .replace(/,/g, '')
    .slice(0, 2);

  return `${integerPart},${decimalPart}`;
}

export function isValidMoneyInput(value: string): boolean {
  const cleanValue = value.trim();

  if (!cleanValue) {
    return false;
  }

  return /^\d+(,\d{1,2})?$/.test(cleanValue);
}

export function parseMoneyInput(value: string): number {
  return Number(value.replace(',', '.'));
}

export function formatMoneyInput(
  value: number | string | null | undefined
): string {
  const amount = Number(String(value ?? 0).replace(',', '.'));

  if (Number.isNaN(amount)) {
    return '';
  }

  return amount.toFixed(2).replace('.', ',');
}