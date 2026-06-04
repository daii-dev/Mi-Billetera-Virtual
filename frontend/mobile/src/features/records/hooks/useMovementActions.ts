import { useState } from 'react';

import { Alert } from 'react-native';

import {
  MovementModalMode,
  MovementSuccessAction,
  ValidMovementForm,
} from '@/features/records/records.types';
import {
  createManualMovement,
  deleteManualMovement,
  registerExpenseFromGoal,
  updateManualMovement,
} from '@/features/wallet/wallet.service';
import {
  ManualMovementType,
  Movement,
} from '@/features/wallet/wallet.types';
import type { SupabaseClient } from '@supabase/supabase-js';

type UseMovementActionsParams = {
  supabase: SupabaseClient;
  userId: string | null | undefined;
  type: ManualMovementType;
  selectedMovement: Movement | null;
  validateForm: () => ValidMovementForm | null;
  loadData: (showFullLoader?: boolean) => Promise<void>;
  closeModal: () => void;
  setModalMode: (mode: MovementModalMode) => void;
};

export function useMovementActions({
  supabase,
  userId,
  type,
  selectedMovement,
  validateForm,
  loadData,
  closeModal,
  setModalMode,
}: UseMovementActionsParams) {
  const [saving, setSaving] = useState(false);
  const [successAction, setSuccessAction] =
    useState<MovementSuccessAction>('create');

  async function handleCreateMovement() {
    if (!userId) return;

    const form = validateForm();

    if (!form) return;

    try {
      setSaving(true);

      if (form.goalId) {
        await registerExpenseFromGoal(supabase, {
          metaId: form.goalId,
          accountId: form.accountId,
          amount: form.amount,
          description: form.cleanDescription,
          categoryName: form.category,
        });
      } else {
        await createManualMovement(supabase, {
          clerkUserId: userId,
          accountId: form.accountId,
          type,
          title: form.cleanDescription,
          amount: form.amount,
          categoryName: form.category,
        });
      }

      await loadData(false);
      setSuccessAction('create');
      setModalMode('success');

      setTimeout(() => {
        closeModal();
      }, 1200);
    } catch (error: any) {
      Alert.alert(
        'Error',
        error?.message || 'No se pudo guardar el movimiento'
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateMovement() {
    if (!userId || !selectedMovement) return;

    const form = validateForm();

    if (!form) return;

    try {
      setSaving(true);

      await updateManualMovement(supabase, selectedMovement.id, {
        clerkUserId: userId,
        accountId: form.accountId,
        type,
        title: form.cleanDescription,
        amount: form.amount,
        categoryName: form.category,
      });

      await loadData(false);
      setSuccessAction('edit');
      setModalMode('success');

      setTimeout(() => {
        closeModal();
      }, 1200);
    } catch (error: any) {
      Alert.alert(
        'Error',
        error?.message || 'No se pudo actualizar el movimiento'
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteMovement() {
    if (!selectedMovement) return;

    try {
      setSaving(true);

      await deleteManualMovement(supabase, selectedMovement.id);

      await loadData(false);
      closeModal();
    } catch (error: any) {
      Alert.alert(
        'Error',
        error?.message || 'No se pudo eliminar el movimiento'
      );
    } finally {
      setSaving(false);
    }
  }

  return {
    saving,
    successAction,
    handleCreateMovement,
    handleUpdateMovement,
    handleDeleteMovement,
  };
}