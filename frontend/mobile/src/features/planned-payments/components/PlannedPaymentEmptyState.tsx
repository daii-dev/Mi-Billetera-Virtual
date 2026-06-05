import { CalendarClock } from 'lucide-react-native';

import { AppEmptyState } from '@/components/empty-state/AppEmptyState';

export function PlannedPaymentEmptyState() {
  return (
    <AppEmptyState
      icon={CalendarClock}
      title="Aun no tienes pagos planificados"
      description="Programa un pago con nombre, monto, cuenta, categoria y fecha."
      iconBackgroundColor="#28A9D6"
      iconSize={42}
      minHeight={185}
      marginTop={24}
    />
  );
}