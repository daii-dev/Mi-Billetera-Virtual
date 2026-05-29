import { View, Text, StyleSheet, ScrollView } from 'react-native';
import type { StatisticsData, PeriodData } from '../statistics.types';
import { AppTheme } from '@/theme/ThemeContext';

interface TrendChartProps {
  data: StatisticsData;
  theme: AppTheme;
  title: string;
}

function getMaxAmount(trend: PeriodData[]): number {
  return Math.max(...trend.map((d) => d.amount), 1);
}

export function TrendChart({ data, theme, title }: TrendChartProps) {
  const maxAmount = getMaxAmount(data.trend);
  const CHART_HEIGHT = 150;

  const formatCurrency = (value: number): string => {
    if (value >= 1000) {
      return `Bs. ${(value / 1000).toFixed(1)}k`;
    }
    return `Bs. ${value.toFixed(0)}`;
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.cardBackground }]}>
      <Text style={[styles.title, { color: theme.colors.text }]}>
        {title}
      </Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.scrollView}
      >
        <View style={styles.chartContainer}>
          {data.trend.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                Sin datos en este período
              </Text>
            </View>
          ) : (
            <View style={styles.bars}>
              {data.trend.map((period, index) => {
                const barHeight = (period.amount / maxAmount) * CHART_HEIGHT;
                const percentage = (period.amount / data.total) * 100;

                return (
                  <View key={`${period.date}-${index}`} style={styles.barItem}>
                    <View
                      style={[
                        styles.bar,
                        {
                          height: Math.max(barHeight, 4),
                          backgroundColor: theme.colors.primary,
                        },
                      ]}
                    />
                    <Text style={[styles.barLabel, { color: theme.colors.text }]}>
                      {period.label}
                    </Text>
                    <Text
                      style={[
                        styles.barValue,
                        { color: theme.colors.textSecondary },
                      ]}
                    >
                      {formatCurrency(period.amount)}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {data.averagePerDay !== undefined && data.averagePerDay > 0 && (
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
              Promedio por día
            </Text>
            <Text style={[styles.statValue, { color: theme.colors.text }]}>
              {formatCurrency(data.averagePerDay)}
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.statItem}>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
              Movimientos
            </Text>
            <Text style={[styles.statValue, { color: theme.colors.text }]}>
              {data.movementCount}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    marginVertical: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  scrollView: {
    marginBottom: 12,
  },
  chartContainer: {
    minHeight: 200,
  },
  bars: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: 12,
    paddingRight: 16,
  },
  barItem: {
    alignItems: 'center',
    width: 60,
  },
  bar: {
    width: '100%',
    borderRadius: 6,
    marginBottom: 8,
  },
  barLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 4,
    textAlign: 'center',
  },
  barValue: {
    fontSize: 9,
    textAlign: 'center',
  },
  emptyState: {
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 12,
    fontWeight: '500',
  },
  statsRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingTop: 12,
    marginTop: 12,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  divider: {
    width: 1,
    backgroundColor: '#E0E0E0',
  },
});
