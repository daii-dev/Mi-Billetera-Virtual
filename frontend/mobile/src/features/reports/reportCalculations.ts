import type {
  ReportMovement,
  ReportMovementGroup,
  ReportSummary,
} from './report.types';

function toAmount(value: number | string | null | undefined): number {
  return Number(value ?? 0);
}

function getDateLabel(dateValue: string): string {
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
    month: 'long',
    year: 'numeric',
  });
}

export function calculateTotalIncome(movements: ReportMovement[]): number {
  return movements.reduce((total, movement) => {
    if (movement.type !== 'income') {
      return total;
    }

    return total + toAmount(movement.amount);
  }, 0);
}

export function calculateTotalExpense(movements: ReportMovement[]): number {
  return movements.reduce((total, movement) => {
    if (movement.type !== 'expense') {
      return total;
    }

    return total + toAmount(movement.amount);
  }, 0);
}

export function calculateNetTotal(movements: ReportMovement[]): number {
  return calculateTotalIncome(movements) - calculateTotalExpense(movements);
}

export function countReportMovements(movements: ReportMovement[]): number {
  return movements.length;
}

export function groupMovementsByDate(
  movements: ReportMovement[]
): ReportMovementGroup[] {
  const groups = new Map<string, ReportMovement[]>();

  movements.forEach((movement) => {
    const currentMovements = groups.get(movement.movement_date) ?? [];
    groups.set(movement.movement_date, [...currentMovements, movement]);
  });

  return Array.from(groups.entries()).map(([date, groupedMovements]) => ({
    date,
    label: getDateLabel(date),
    movements: groupedMovements,
  }));
}

export function calculateComparisonPercentage(
  currentValue: number,
  previousValue: number
): number | null {
  if (previousValue === 0) {
    return currentValue === 0 ? 0 : null;
  }

  return ((currentValue - previousValue) / Math.abs(previousValue)) * 100;
}

export function calculateReportSummary(
  movements: ReportMovement[],
  previousMovements: ReportMovement[] = []
): ReportSummary {
  const totalIncome = calculateTotalIncome(movements);
  const totalExpense = calculateTotalExpense(movements);
  const netTotal = totalIncome - totalExpense;
  const previousIncome = calculateTotalIncome(previousMovements);
  const previousExpense = calculateTotalExpense(previousMovements);
  const previousNetTotal = previousIncome - previousExpense;

  return {
    totalIncome,
    totalExpense,
    netTotal,
    movementCount: countReportMovements(movements),
    incomeComparisonPercentage: calculateComparisonPercentage(
      totalIncome,
      previousIncome
    ),
    expenseComparisonPercentage: calculateComparisonPercentage(
      totalExpense,
      previousExpense
    ),
    netComparisonPercentage: calculateComparisonPercentage(
      netTotal,
      previousNetTotal
    ),
  };
}

export function formatBobCurrency(
  value: number | string | null | undefined
): string {
  const amount = toAmount(value);

  return `Bs. ${amount.toLocaleString('es-BO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
