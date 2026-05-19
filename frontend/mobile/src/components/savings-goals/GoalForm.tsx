import {
  Calendar,
  Check,
  Gift,
  GraduationCap,
  Home,
  PiggyBank,
  Plane,
  Target,
} from 'lucide-react-native';
import {
  Modal,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';

import { AppButton } from '@/components/ui/AppButton';
import { AppInput } from '@/components/ui/AppInput';
import { SavingsGoal } from '@/features/savings-goals/savings-goals.types';
import { money } from '@/features/wallet/wallet.service';
import { Account } from '@/features/wallet/wallet.types';
import { colors } from '@/theme/colors';
import {
  AppTheme,
  useAppTheme,
} from '@/theme/ThemeContext';
import { useMemo, useState } from 'react';

type GoalFormValues = {
  nombre: string;
  montoObjetivo: string;
  fechaLimite: string;
  cuentaId: string | null;
  icono: string | null;
  color: string | null;
};

type GoalFormSubmitValues = {
  nombre: string;
  monto_objetivo?: number;
  fecha_limite: string;
  cuenta_id: string | null;
  icono: string | null;
  color: string | null;
};

type GoalFormProps = {
  initialGoal?: SavingsGoal | null;
  personalAccount?: Account | null;
  submitLabel: string;
  loading?: boolean;
  onSubmit: (values: GoalFormSubmitValues) => Promise<void> | void;
};

const iconOptions = [
  { value: 'piggy-bank', Icon: PiggyBank },
  { value: 'target', Icon: Target },
  { value: 'plane', Icon: Plane },
  { value: 'home', Icon: Home },
  { value: 'gift', Icon: Gift },
  { value: 'education', Icon: GraduationCap },
];

const colorOptions = [
  '#53FF35',
  '#082B8C',
  '#FF5A5F',
  '#F7C948',
  '#7C3AED',
  '#0EA5E9',
];

export function GoalForm({
  initialGoal,
  personalAccount,
  submitLabel,
  loading = false,
  onSubmit,
}: GoalFormProps) {
  const { theme } = useAppTheme();
  const styles = createStyles(theme);

  const initialValues = useMemo<GoalFormValues>(() => ({
    nombre: initialGoal?.nombre ?? '',
    montoObjetivo: initialGoal ? String(initialGoal.monto_objetivo) : '',
    fechaLimite: initialGoal?.fecha_limite ?? '',
    cuentaId: initialGoal?.cuenta_id ?? null,
    icono: initialGoal?.icono ?? 'piggy-bank',
    color: initialGoal?.color ?? '#53FF35',
  }), [initialGoal]);

  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    return initialGoal?.fecha_limite
      ? new Date(`${initialGoal.fecha_limite}T00:00:00`)
      : new Date();
  });

  const hasPersonalAccount = Boolean(personalAccount?.id);
  const isEditing = Boolean(initialGoal);
  const associateAccount = hasPersonalAccount && values.cuentaId === personalAccount?.id;

  function setValue<K extends keyof GoalFormValues>(key: K, value: GoalFormValues[K]) {
    setValues((current) => ({
      ...current,
      [key]: value,
    }));
    setErrors((current) => ({
      ...current,
      [key]: '',
    }));
  }

  async function handleSubmit() {
    const nextErrors = validate(values, isEditing);

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    const submitValues: GoalFormSubmitValues = {
      nombre: values.nombre.trim(),
      fecha_limite: values.fechaLimite,
      cuenta_id: values.cuentaId,
      icono: values.icono,
      color: values.color,
    };

    if (!isEditing) {
      submitValues.monto_objetivo = Number(normalizeAmount(values.montoObjetivo));
    }

    await onSubmit(submitValues);
  }

  function openCalendar() {
    if (values.fechaLimite) {
      setCalendarMonth(new Date(`${values.fechaLimite}T00:00:00`));
    }

    setCalendarVisible(true);
  }

  function handleSelectDate(date: Date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (date <= today) {
      setErrors((current) => ({
        ...current,
        fechaLimite: 'La fecha límite debe ser una fecha futura',
      }));
      return;
    }

    setValue('fechaLimite', formatDateValue(date));
    setCalendarVisible(false);
  }

  return (
    <View style={styles.form}>
      <View style={styles.field}>
        <Text style={styles.label}>Nombre de la meta</Text>
        <AppInput
          value={values.nombre}
          onChangeText={(text) => setValue('nombre', text)}
          placeholder="Ej. Viaje, emergencia, estudios"
          maxLength={50}
          autoCapitalize="sentences"
        />
        <View style={styles.helpRow}>
          <Text style={styles.errorText}>{errors.nombre}</Text>
          <Text style={styles.counter}>{values.nombre.length}/50</Text>
        </View>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Monto objetivo</Text>
        {isEditing ? (
          <View style={styles.readOnlyBox}>
            <Text style={styles.readOnlyValue}>{money(initialGoal?.monto_objetivo)}</Text>
          </View>
        ) : (
          <>
            <AppInput
              value={values.montoObjetivo}
              onChangeText={(text) => setValue('montoObjetivo', text)}
              placeholder="0.00"
              keyboardType="decimal-pad"
            />
            <Text style={styles.errorText}>{errors.montoObjetivo}</Text>
          </>
        )}
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Fecha limite</Text>
        <Pressable onPress={openCalendar}>
          <AppInput
            value={formatDisplayDate(values.fechaLimite)}
            placeholder="Selecciona una fecha"
            editable={false}
            pointerEvents="none"
            leftIcon={<Calendar size={18} color={colors.gray} />}
          />
        </Pressable>
        <Text style={styles.errorText}>{errors.fechaLimite}</Text>
      </View>

      {hasPersonalAccount && !isEditing && (
        <View style={styles.accountRow}>
          <View style={styles.accountTextBox}>
            <Text style={styles.label}>Cuenta asociada</Text>
            <Text style={styles.accountName}>{personalAccount?.name}</Text>
          </View>
          <Switch
            value={associateAccount}
            onValueChange={(enabled) => {
              setValue('cuentaId', enabled ? personalAccount?.id ?? null : null);
            }}
            trackColor={{
              false: '#D9D9D9',
              true: '#A7E3FF',
            }}
            thumbColor={associateAccount ? colors.primary : '#F4F4F4'}
          />
        </View>
      )}

      <View style={styles.field}>
        <Text style={styles.label}>Icono</Text>
        <View style={styles.optionGrid}>
          {iconOptions.map(({ value, Icon }) => {
            const selected = values.icono === value;

            return (
              <Pressable
                key={value}
                onPress={() => setValue('icono', selected ? null : value)}
                style={[
                  styles.iconOption,
                  selected && styles.optionSelected,
                ]}
              >
                <Icon
                  size={22}
                  color={selected ? '#FFFFFF' : theme.colors.primary}
                />
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Color</Text>
        <View style={styles.colorRow}>
          {colorOptions.map((option) => {
            const selected = values.color === option;

            return (
              <Pressable
                key={option}
                onPress={() => setValue('color', selected ? null : option)}
                style={[
                  styles.colorOption,
                  { backgroundColor: option },
                  selected && styles.colorSelected,
                ]}
              >
                {selected && <Check size={18} color="#FFFFFF" />}
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          {isEditing
            ? 'El monto objetivo, el monto ahorrado y la cuenta asociada no se modifican al editar la meta.'
            : 'El monto actual se mantiene en Bs. 0,00 al crear la meta.'}
        </Text>
      </View>

      <AppButton
        title={submitLabel}
        onPress={handleSubmit}
        loading={loading}
      />

      <CalendarPickerModal
        visible={calendarVisible}
        selectedValue={values.fechaLimite}
        monthDate={calendarMonth}
        onChangeMonth={setCalendarMonth}
        onSelectDate={handleSelectDate}
        onClose={() => setCalendarVisible(false)}
      />
    </View>
  );
}

function normalizeAmount(value: string) {
  return value.replace(',', '.').trim();
}

function formatDateValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function formatDisplayDate(value: string) {
  if (!value) return '';

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString('es-BO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function getCalendarDays(monthDate: Date) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingEmptyDays = firstDay.getDay();
  const days: Array<Date | null> = [];

  for (let index = 0; index < leadingEmptyDays; index += 1) {
    days.push(null);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    days.push(new Date(year, month, day));
  }

  return days;
}

function isSameDate(first: Date, second: Date) {
  return first.getFullYear() === second.getFullYear()
    && first.getMonth() === second.getMonth()
    && first.getDate() === second.getDate();
}

type CalendarPickerModalProps = {
  visible: boolean;
  selectedValue: string;
  monthDate: Date;
  onChangeMonth: (date: Date) => void;
  onSelectDate: (date: Date) => void;
  onClose: () => void;
};

function CalendarPickerModal({
  visible,
  selectedValue,
  monthDate,
  onChangeMonth,
  onSelectDate,
  onClose,
}: CalendarPickerModalProps) {
  const { theme } = useAppTheme();
  const styles = createStyles(theme);
  const days = getCalendarDays(monthDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const selectedDate = selectedValue ? new Date(`${selectedValue}T00:00:00`) : null;
  const monthLabel = monthDate.toLocaleDateString('es-BO', {
    month: 'long',
    year: 'numeric',
  });

  function moveMonth(delta: number) {
    onChangeMonth(new Date(monthDate.getFullYear(), monthDate.getMonth() + delta, 1));
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.calendarOverlay} onPress={onClose}>
        <Pressable style={styles.calendarCard}>
          <View style={styles.calendarHeader}>
            <Pressable style={styles.monthButton} onPress={() => moveMonth(-1)}>
              <Text style={styles.monthButtonText}>‹</Text>
            </Pressable>
            <Text style={styles.monthTitle}>{capitalize(monthLabel)}</Text>
            <Pressable style={styles.monthButton} onPress={() => moveMonth(1)}>
              <Text style={styles.monthButtonText}>›</Text>
            </Pressable>
          </View>

          <View style={styles.weekRow}>
            {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((day, index) => (
              <Text key={`${day}-${index}`} style={styles.weekDay}>{day}</Text>
            ))}
          </View>

          <View style={styles.daysGrid}>
            {days.map((day, index) => {
              if (!day) {
                return <View key={`empty-${index}`} style={styles.dayCell} />;
              }

              const disabled = day <= today;
              const selected = Boolean(selectedDate && isSameDate(day, selectedDate));

              return (
                <Pressable
                  key={formatDateValue(day)}
                  disabled={disabled}
                  onPress={() => onSelectDate(day)}
                  style={[
                    styles.dayCell,
                    selected && styles.daySelected,
                    disabled && styles.dayDisabled,
                  ]}
                >
                  <Text
                    style={[
                      styles.dayText,
                      selected && styles.daySelectedText,
                      disabled && styles.dayDisabledText,
                    ]}
                  >
                    {day.getDate()}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.calendarActions}>
            <Pressable onPress={onClose} style={styles.cancelDateButton}>
              <Text style={styles.cancelDateText}>Cancelar</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function validate(values: GoalFormValues, isEditing = false) {
  const errors: Record<string, string> = {};
  const cleanName = values.nombre.trim();
  const amount = Number(normalizeAmount(values.montoObjetivo));
  const date = new Date(`${values.fechaLimite}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (!cleanName) {
    errors.nombre = 'El nombre es obligatorio';
  } else if (cleanName.length > 50) {
    errors.nombre = 'Maximo 50 caracteres';
  }

  if (!isEditing) {
    if (!values.montoObjetivo.trim()) {
      errors.montoObjetivo = 'El monto objetivo es obligatorio';
    } else if (!Number.isFinite(amount) || amount <= 0) {
      errors.montoObjetivo = 'Debe ser mayor a 0';
    }
  }

  if (!values.fechaLimite.trim()) {
    errors.fechaLimite = 'La fecha limite es obligatoria';
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(values.fechaLimite) || Number.isNaN(date.getTime())) {
    errors.fechaLimite = 'Selecciona una fecha valida';
  } else if (date <= today) {
    errors.fechaLimite = 'La fecha límite debe ser una fecha futura';
  }

  return errors;
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    form: {
      gap: 14,
    },
    field: {
      gap: 7,
    },
    label: {
      color: theme.colors.text,
      fontSize: 13,
      fontWeight: '900',
    },
    helpRow: {
      minHeight: 18,
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 10,
    },
    counter: {
      color: theme.colors.textSecondary,
      fontSize: 12,
      fontWeight: '700',
    },
    errorText: {
      minHeight: 18,
      color: colors.expense,
      fontSize: 12,
      fontWeight: '700',
      flex: 1,
    },
    accountRow: {
      minHeight: 64,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.card,
      paddingHorizontal: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    accountTextBox: {
      flex: 1,
    },
    accountName: {
      marginTop: 4,
      color: theme.colors.textSecondary,
      fontSize: 13,
      fontWeight: '800',
    },
    readOnlyBox: {
      minHeight: 52,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.mode === 'dark' ? '#0F172A' : '#F8FAFC',
      paddingHorizontal: 14,
      justifyContent: 'center',
    },
    readOnlyValue: {
      color: theme.colors.text,
      fontSize: 16,
      fontWeight: '900',
    },
    optionGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    iconOption: {
      width: 46,
      height: 46,
      borderRadius: 23,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.card,
    },
    optionSelected: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    colorRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    colorOption: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: 'center',
      justifyContent: 'center',
    },
    colorSelected: {
      borderWidth: 3,
      borderColor: theme.mode === 'dark' ? '#FFFFFF' : '#111827',
    },
    infoBox: {
      borderRadius: 12,
      padding: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.mode === 'dark' ? '#0F172A' : '#F8FAFC',
    },
    infoText: {
      color: theme.colors.textSecondary,
      fontSize: 12,
      lineHeight: 18,
      fontWeight: '700',
    },
    calendarOverlay: {
      flex: 1,
      backgroundColor: theme.colors.overlay,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
    },
    calendarCard: {
      width: '100%',
      maxWidth: 360,
      borderRadius: 16,
      backgroundColor: theme.colors.card,
      padding: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    calendarHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 14,
    },
    monthButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.mode === 'dark' ? '#0F172A' : '#F8FAFC',
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    monthButtonText: {
      color: theme.colors.primary,
      fontSize: 28,
      fontWeight: '900',
      lineHeight: 30,
    },
    monthTitle: {
      flex: 1,
      color: theme.colors.text,
      textAlign: 'center',
      fontSize: 17,
      fontWeight: '900',
    },
    weekRow: {
      flexDirection: 'row',
      marginBottom: 8,
    },
    weekDay: {
      width: `${100 / 7}%`,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      fontSize: 12,
      fontWeight: '900',
    },
    daysGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    dayCell: {
      width: `${100 / 7}%`,
      aspectRatio: 1,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 20,
    },
    dayText: {
      color: theme.colors.text,
      fontSize: 14,
      fontWeight: '800',
    },
    daySelected: {
      backgroundColor: colors.secondary,
    },
    daySelectedText: {
      color: '#FFFFFF',
    },
    dayDisabled: {
      opacity: 0.4,
    },
    dayDisabledText: {
      color: theme.colors.textSecondary,
    },
    calendarActions: {
      marginTop: 12,
      alignItems: 'flex-end',
    },
    cancelDateButton: {
      minHeight: 38,
      paddingHorizontal: 14,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 19,
    },
    cancelDateText: {
      color: theme.colors.primary,
      fontSize: 14,
      fontWeight: '900',
    },
  });
}
