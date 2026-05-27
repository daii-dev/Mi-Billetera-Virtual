import type {
  ReportDateRange,
  ReportFilters,
  ReportPeriodKey,
} from './report.types';

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

function parseDateValue(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function formatDateValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function getLast7DaysRange(today = new Date()): ReportDateRange {
  const endDate = startOfDay(today);
  const startDate = addDays(endDate, -6);

  return {
    startDate: formatDateValue(startDate),
    endDate: formatDateValue(endDate),
  };
}

export function getLast30DaysRange(today = new Date()): ReportDateRange {
  const endDate = startOfDay(today);
  const startDate = addDays(endDate, -29);

  return {
    startDate: formatDateValue(startDate),
    endDate: formatDateValue(endDate),
  };
}

export function getCurrentMonthRange(today = new Date()): ReportDateRange {
  const endDate = startOfDay(today);
  const startDate = new Date(endDate.getFullYear(), endDate.getMonth(), 1);

  return {
    startDate: formatDateValue(startDate),
    endDate: formatDateValue(endDate),
  };
}

export function getPreviousMonthRange(today = new Date()): ReportDateRange {
  const currentMonth = startOfDay(today);
  const startDate = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth() - 1,
    1
  );
  const endDate = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth(),
    0
  );

  return {
    startDate: formatDateValue(startDate),
    endDate: formatDateValue(endDate),
  };
}

export function getCustomRange(
  startDate: string,
  endDate: string
): ReportDateRange {
  return {
    startDate,
    endDate,
  };
}

export function getReportDateRange(
  period: ReportPeriodKey,
  customRange?: Partial<ReportDateRange>,
  today = new Date()
): ReportDateRange {
  if (period === 'last7days') {
    return getLast7DaysRange(today);
  }

  if (period === 'last30days') {
    return getLast30DaysRange(today);
  }

  if (period === 'currentMonth') {
    return getCurrentMonthRange(today);
  }

  if (period === 'previousMonth') {
    return getPreviousMonthRange(today);
  }

  return getCustomRange(customRange?.startDate ?? '', customRange?.endDate ?? '');
}

export function getPreviousEquivalentRange(
  range: ReportDateRange
): ReportDateRange {
  const startDate = parseDateValue(range.startDate);
  const endDate = parseDateValue(range.endDate);
  const daysInRange = Math.round(
    (endDate.getTime() - startDate.getTime()) / 86400000
  ) + 1;
  const previousEndDate = addDays(startDate, -1);
  const previousStartDate = addDays(previousEndDate, -(daysInRange - 1));

  return {
    startDate: formatDateValue(previousStartDate),
    endDate: formatDateValue(previousEndDate),
  };
}

export function getPreviousPeriodRange(filters: ReportFilters): ReportDateRange {
  if (filters.period === 'currentMonth' || filters.period === 'previousMonth') {
    const startDate = parseDateValue(filters.dateRange.startDate);
    const previousMonthDate = addMonths(startDate, -1);

    return {
      startDate: formatDateValue(
        new Date(previousMonthDate.getFullYear(), previousMonthDate.getMonth(), 1)
      ),
      endDate: formatDateValue(
        new Date(previousMonthDate.getFullYear(), previousMonthDate.getMonth() + 1, 0)
      ),
    };
  }

  return getPreviousEquivalentRange(filters.dateRange);
}

export function isValidDateRange(range: ReportDateRange): boolean {
  if (!range.startDate || !range.endDate) {
    return false;
  }

  return parseDateValue(range.startDate) <= parseDateValue(range.endDate);
}
