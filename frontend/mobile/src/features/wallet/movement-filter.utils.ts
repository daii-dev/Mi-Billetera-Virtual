import {
  ManualMovementType,
  Movement,
} from '@/features/wallet/wallet.types';

export function buildCategoryFilterKey(
  type: ManualMovementType,
  name: string
): string {
  return `${type}:${name}`;
}

export function parseCategoryFilterKey(
  key: string
): { type: ManualMovementType; name: string } | null {
  if (!key) return null;

  const [type, ...nameParts] = key.split(':');

  if (type !== 'income' && type !== 'expense') {
    return null;
  }

  const name = nameParts.join(':').trim();

  if (!name) {
    return null;
  }

  return {
    type,
    name,
  };
}

export function movementMatchesCategoryFilter(
  movement: Movement,
  categoryFilterKey: string
): boolean {
  const parsedCategory = parseCategoryFilterKey(categoryFilterKey);

  if (!parsedCategory) {
    return true;
  }

  return (
    movement.type === parsedCategory.type &&
    movement.category_name === parsedCategory.name
  );
}

export function getMovementFilterLabel(
  accountName?: string,
  categoryName?: string
): string {
  if (accountName && categoryName) {
    return '2 filtros';
  }

  if (accountName) {
    return accountName;
  }

  if (categoryName) {
    return categoryName;
  }

  return 'Filtrar';
}