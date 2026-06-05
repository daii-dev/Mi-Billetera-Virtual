import type {
  StatisticsPeriodKey,
  StatisticsFilters,
} from './statistics.types';

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

export function formatDateValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function getDateLabel(dateValue: string): string {
  const [year, month, day] = dateValue.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const today = new Date();
  const startOfToday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );
  const yesterday = new Date(startOfToday);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.getTime() === startOfToday.getTime()) {
    return 'Hoy';
  }

  if (date.getTime() === yesterday.getTime()) {
    return 'Ayer';
  }

  return date.toLocaleDateString('es-BO', {
    day: '2-digit',
    month: 'short',
  });
}

export function getDailyRange(today = new Date()): StatisticsFilters['dateRange'] {
  const endDate = startOfDay(today);
  const startDate = endDate;

  return {
    startDate: formatDateValue(startDate),
    endDate: formatDateValue(endDate),
  };
}

export function getMonthlyRange(today = new Date()): StatisticsFilters['dateRange'] {
  const endDate = startOfDay(today);
  const startDate = new Date(endDate.getFullYear(), endDate.getMonth(), 1);

  return {
    startDate: formatDateValue(startDate),
    endDate: formatDateValue(endDate),
  };
}

export function getYearlyRange(today = new Date()): StatisticsFilters['dateRange'] {
  const endDate = startOfDay(today);
  const startDate = new Date(endDate.getFullYear(), 0, 1);

  return {
    startDate: formatDateValue(startDate),
    endDate: formatDateValue(endDate),
  };
}

export function getStatisticsDateRange(
  period: StatisticsPeriodKey
): StatisticsFilters['dateRange'] {
  const today = new Date();

  switch (period) {
    case 'daily':
      return getDailyRange(today);
    case 'monthly':
      return getMonthlyRange(today);
    case 'yearly':
      return getYearlyRange(today);
    default:
      return getMonthlyRange(today);
  }
}

export function getLast6DaysWithMovements(
  movementDates: string[]
): { startDate: string; endDate: string } {
  if (movementDates.length === 0) {
    const today = new Date();
    const startDate = addDays(startOfDay(today), -5);
    return {
      startDate: formatDateValue(startDate),
      endDate: formatDateValue(startOfDay(today)),
    };
  }

  const sortedDates = movementDates.sort().reverse();
  const last6Dates = sortedDates.slice(0, 6);
  const oldestDate = last6Dates[last6Dates.length - 1];
  const newestDate = last6Dates[0];

  return {
    startDate: oldestDate,
    endDate: newestDate,
  };
}

export function generateDailyTrendDates(
  startDate: string,
  endDate: string
): string[] {
  const dates: string[] = [];
  const [startYear, startMonth, startDay] = startDate.split('-').map(Number);
  const [endYear, endMonth, endDay] = endDate.split('-').map(Number);

  let current = new Date(startYear, startMonth - 1, startDay);
  const end = new Date(endYear, endMonth - 1, endDay);

  while (current <= end) {
    dates.push(formatDateValue(current));
    current = addDays(current, 1);
  }

  return dates;
}

export function generateMonthlyTrendDates(
  startDate: string,
  endDate: string
): string[] {
  const dates: string[] = [];
  const [startYear, startMonth, startDay] = startDate.split('-').map(Number);
  const [endYear, endMonth, endDay] = endDate.split('-').map(Number);

  let current = new Date(startYear, startMonth - 1, 1);
  const end = new Date(endYear, endMonth - 1, endDay);

  while (current <= end) {
    dates.push(
      `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-01`
    );
    current = addMonths(current, 1);
  }

  return dates;
}

export function generateYearlyTrendDates(
  startDate: string,
  endDate: string
): string[] {
  const dates: string[] = [];
  const [startYear] = startDate.split('-').map(Number);
  const [endYear] = endDate.split('-').map(Number);

  for (let year = startYear; year <= endYear; year++) {
    dates.push(`${year}-01-01`);
  }

  return dates;
}

export function getMonthLabel(dateValue: string): string {
  const [year, month] = dateValue.split('-').map(Number);
  const date = new Date(year, month - 1, 1);

  return date.toLocaleDateString('es-BO', {
    month: 'short',
    year: '2-digit',
  });
}

export function getYearLabel(dateValue: string): string {
  const [year] = dateValue.split('-').map(Number);
  return year.toString();
}
