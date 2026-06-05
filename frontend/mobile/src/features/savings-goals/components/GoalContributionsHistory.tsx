import {
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AbonoMetaAhorro } from '@/features/savings-goals/savings-goals.types';
import { money } from '@/features/wallet/wallet.service';
import { colors } from '@/theme/colors';
import {
  AppTheme,
  useAppTheme,
} from '@/theme/ThemeContext';

type GoalContributionsHistoryProps = {
  contributions: AbonoMetaAhorro[];
};

export function GoalContributionsHistory({
  contributions,
}: GoalContributionsHistoryProps) {
  const { theme } = useAppTheme();
  const styles = createStyles(theme);

  return (
    <View style={styles.historyCard}>
      <Text style={styles.historyTitle}>Historial de abonos</Text>

      {contributions.length === 0 ? (
        <Text style={styles.emptyHistory}>
          Aun no registraste abonos para esta meta.
        </Text>
      ) : (
        contributions.map((contribution) => (
          <View key={contribution.id_abono} style={styles.historyItem}>
            <View style={styles.historyInfo}>
              <Text style={styles.historyAmount}>
                {money(contribution.monto)}
              </Text>

              <Text style={styles.historyMeta}>
                {formatDate(contribution.fecha_abono)}
                {contribution.account?.name
                  ? ` · ${contribution.account.name}`
                  : ''}
              </Text>

              {contribution.nota ? (
                <Text style={styles.historyNote}>
                  {contribution.nota}
                </Text>
              ) : null}
            </View>
          </View>
        ))
      )}
    </View>
  );
}

function formatDate(dateString: string) {
  const date = new Date(`${dateString}T00:00:00`);

  return date.toLocaleDateString('es-BO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    historyCard: {
      borderRadius: 16,
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: 16,
      marginBottom: 16,
    },
    historyTitle: {
      color: theme.colors.text,
      fontSize: 17,
      fontWeight: '900',
      marginBottom: 12,
    },
    emptyHistory: {
      color: theme.colors.textSecondary,
      fontSize: 13,
      fontWeight: '800',
      lineHeight: 18,
    },
    historyItem: {
      minHeight: 62,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      paddingVertical: 10,
    },
    historyInfo: {
      gap: 4,
    },
    historyAmount: {
      color: colors.secondary,
      fontSize: 15,
      fontWeight: '900',
    },
    historyMeta: {
      color: theme.colors.textSecondary,
      fontSize: 12,
      fontWeight: '800',
    },
    historyNote: {
      color: theme.colors.text,
      fontSize: 12,
      fontWeight: '700',
    },
  });
}