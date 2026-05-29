import { useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import type { StatisticsData } from '../statistics.types';
import { AppTheme } from '@/theme/ThemeContext';

interface TopCategoriesProps {
  data: StatisticsData;
  theme: AppTheme;
}

function getColorForCategory(
  categoryName: string,
  categoryColor?: string | null
): string {
  if (categoryColor && categoryColor.startsWith('#')) {
    return categoryColor;
  }

  const colors = [
    '#FF6B6B', // Red
    '#4ECDC4', // Teal
    '#45B7D1', // Blue
    '#FFA07A', // Peach
    '#98D8C8', // Sage green
    '#F7DC6F', // Yellow
    '#BB8FCE', // Purple
    '#85C1E2', // Sky blue
    '#F8B88B', // Orange
    '#80D8FF', // Light blue
  ];

  const charSum = (categoryName || '').split('').reduce((a, b) => a + b.charCodeAt(0), 0);
  return colors[charSum % colors.length];
}

export function TopCategories({ data, theme }: TopCategoriesProps) {
  const [showAll, setShowAll] = useState(false);

  const formatCurrency = (value: number): string => {
    return `Bs. ${value.toLocaleString('es-BO', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const getRankMedal = (rank: number): string => {
    switch (rank) {
      case 1:
        return '🥇';
      case 2:
        return '🥈';
      case 3:
        return '🥉';
      default:
        return `#${rank}`;
    }
  };

  const displayedCategories = showAll ? data.categories : data.topCategories;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.card }]}>
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: theme.colors.text }]}>
          {showAll ? 'Todas las Categorías' : 'Top 5 Categorías'}
        </Text>
        {data.categories.length > 5 && (
          <Pressable onPress={() => setShowAll(!showAll)} hitSlop={8}>
            <Text style={[styles.seeAllButton, { color: theme.colors.primary }]}>
              {showAll ? 'Ver menos' : 'Ver todo'}
            </Text>
          </Pressable>
        )}
      </View>

      {displayedCategories.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
            Sin datos disponibles
          </Text>
        </View>
      ) : (
        <FlatList
          data={displayedCategories}
          keyExtractor={(item, index) => `${index}-${item.categoryName}`}
          scrollEnabled={false}
          renderItem={({ item, index }) => {
            const rank = index + 1;
            const maxAmount = Math.max(
              ...displayedCategories.map((c) => c.amount),
              1
            );
            const barWidth = (item.amount / maxAmount) * 100;

            return (
              <View style={styles.categoryItem}>
                <View style={styles.rankSection}>
                  <Text style={[styles.rank, { color: theme.colors.primary }]}>
                    {getRankMedal(rank)}
                  </Text>
                </View>

                <View style={styles.categoryInfo}>
                  <Text
                    style={[styles.categoryName, { color: theme.colors.text }]}
                    numberOfLines={1}
                  >
                    {item.categoryName}
                  </Text>
                  <View style={styles.barContainer}>
                    <View
                      style={[
                        styles.bar,
                        {
                          width: `${barWidth}%`,
                          backgroundColor: getColorForCategory(
                            item.categoryName,
                            item.categoryColor
                          ),
                        },
                      ]}
                    />
                  </View>
                  <View style={styles.statsRow}>
                    <Text
                      style={[
                        styles.statsText,
                        { color: theme.colors.textSecondary },
                      ]}
                    >
                      {item.percentage.toFixed(1)}%
                    </Text>
                    <Text
                      style={[
                        styles.statsText,
                        { color: theme.colors.textSecondary },
                      ]}
                    >
                      {item.movementCount} {item.movementCount === 1 ? 'movimiento' : 'movimientos'}
                    </Text>
                  </View>
                </View>

                <View style={styles.amountSection}>
                  <Text style={[styles.amount, { color: theme.colors.text }]}>
                    {formatCurrency(item.amount)}
                  </Text>
                </View>
              </View>
            );
          }}
        />
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
  },
  seeAllButton: {
    fontSize: 12,
    fontWeight: '700',
  },
  emptyState: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 12,
    fontWeight: '500',
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  rankSection: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rank: {
    fontSize: 14,
    fontWeight: '600',
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  barContainer: {
    height: 6,
    backgroundColor: '#E8E8E8',
    borderRadius: 3,
    marginBottom: 6,
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    borderRadius: 3,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statsText: {
    fontSize: 10,
    fontWeight: '500',
  },
  amountSection: {
    marginLeft: 12,
  },
  amount: {
    fontSize: 13,
    fontWeight: '700',
  },
});
