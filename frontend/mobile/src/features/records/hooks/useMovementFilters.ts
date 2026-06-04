import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  buildCategoryFilterKey,
  getMovementFilterLabel,
  movementMatchesCategoryFilter,
} from '@/features/wallet/movement-filter.utils';
import {
  Account,
  Category,
  Movement,
} from '@/features/wallet/wallet.types';

type UseMovementFiltersParams = {
  accounts: Account[];
  categories: Category[];
  movements: Movement[];
};

export function useMovementFilters({
  accounts,
  categories,
  movements,
}: UseMovementFiltersParams) {
  const [filterVisible, setFilterVisible] = useState(false);
  const [selectedFilterAccountId, setSelectedFilterAccountId] = useState('');
  const [selectedFilterCategoryKey, setSelectedFilterCategoryKey] = useState('');

  useEffect(() => {
    if (!selectedFilterAccountId) return;

    const accountExists = accounts.some(
      (account) => account.id === selectedFilterAccountId
    );

    if (!accountExists) {
      setSelectedFilterAccountId('');
    }
  }, [accounts, selectedFilterAccountId]);

  const selectedFilterAccount = useMemo(
    () =>
      accounts.find(
        (account) => account.id === selectedFilterAccountId
      ),
    [accounts, selectedFilterAccountId]
  );

  const selectedFilterCategory = useMemo(
    () =>
      categories.find(
        (category) =>
          buildCategoryFilterKey(category.type, category.name) ===
          selectedFilterCategoryKey
      ),
    [categories, selectedFilterCategoryKey]
  );

  const hasActiveFilters = Boolean(
    selectedFilterAccountId ||
    selectedFilterCategoryKey
  );

  const filterButtonLabel = getMovementFilterLabel(
    selectedFilterAccount?.name,
    selectedFilterCategory?.name
  );

  const filteredMovements = useMemo(
    () =>
      movements.filter((movement) => {
        const matchesAccount =
          !selectedFilterAccountId ||
          movement.account_id === selectedFilterAccountId;

        const matchesCategory = movementMatchesCategoryFilter(
          movement,
          selectedFilterCategoryKey
        );

        return matchesAccount && matchesCategory;
      }),
    [movements, selectedFilterAccountId, selectedFilterCategoryKey]
  );

  function clearFilters() {
    setSelectedFilterAccountId('');
    setSelectedFilterCategoryKey('');
  }

  return {
    filterVisible,
    setFilterVisible,
    selectedFilterAccountId,
    setSelectedFilterAccountId,
    selectedFilterCategoryKey,
    setSelectedFilterCategoryKey,
    selectedFilterAccount,
    selectedFilterCategory,
    hasActiveFilters,
    filterButtonLabel,
    filteredMovements,
    clearFilters,
  };
}