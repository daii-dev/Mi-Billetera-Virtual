import { View, Text, StyleSheet, FlatList } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import type { StatisticsData } from '../statistics.types';
import { AppTheme } from '@/theme/ThemeContext';

interface DonutChartProps {
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

export function DonutChart({ data, theme }: DonutChartProps) {
  const formatCurrency = (value: number): string => {
    return `Bs. ${value.toLocaleString('es-BO', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const hasData = data.categories.length > 0 && data.total > 0;

  // Circle properties for proper SVG Donut Chart
  const radius = 70;
  const strokeWidth = 24;
  const circumference = 2 * Math.PI * radius;

  let accumulatedOffset = 0;
  const segments = data.categories.map((cat) => {
    const strokeDashoffset = accumulatedOffset;
    const strokeDasharray = `${(cat.percentage / 100) * circumference} ${circumference}`;
    
    // SVG stroke-dashoffset shifts the starting point.
    // Shifting clockwise (forward) is negative in SVG.
    accumulatedOffset -= (cat.percentage / 100) * circumference;
    
    return {
      ...cat,
      strokeDasharray,
      strokeDashoffset,
      color: getColorForCategory(cat.categoryName, cat.categoryColor),
    };
  });

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.card }]}>
      {/* Donut Ring */}
      <View style={styles.ringContainer}>
        <View style={[styles.centerContent, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.totalLabel, { color: theme.colors.textSecondary }]}>
            Total
          </Text>
          <Text style={[styles.totalAmount, { color: theme.colors.text }]} numberOfLines={1}>
            {formatCurrency(data.total)}
          </Text>
        </View>

        <Svg width={200} height={200} viewBox="0 0 200 200">
          <G transform="rotate(-90 100 100)">
            {!hasData ? (
              <Circle
                cx={100}
                cy={100}
                r={radius}
                stroke={theme.colors.border}
                strokeWidth={strokeWidth}
                fill="none"
              />
            ) : (
              segments.map((segment, index) => (
                <Circle
                  key={`segment-${index}`}
                  cx={100}
                  cy={100}
                  r={radius}
                  stroke={segment.color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={segment.strokeDasharray}
                  strokeDashoffset={segment.strokeDashoffset}
                  fill="none"
                />
              ))
            )}
          </G>
        </Svg>
      </View>

      {/* Legend */}
      <View style={[styles.legend, { borderTopColor: theme.colors.border }]}>
        <Text style={[styles.legendTitle, { color: theme.colors.text }]}>
          Por Categoría
        </Text>
        {segments.length === 0 ? (
          <View style={styles.emptyLegend}>
            <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
              Sin movimientos registrados en este período.
            </Text>
          </View>
        ) : (
          <FlatList
            data={segments}
            keyExtractor={(item, index) => `${item.categoryName}-${index}`}
            scrollEnabled={false}
            renderItem={({ item }) => (
              <View style={[styles.legendItem, { borderBottomColor: theme.colors.border }]}>
                <View
                  style={[
                    styles.legendColor,
                    { backgroundColor: item.color },
                  ]}
                />
                <View style={styles.legendText}>
                  <Text
                    style={[styles.legendLabel, { color: theme.colors.text }]}
                    numberOfLines={1}
                  >
                    {item.categoryName}
                  </Text>
                  <Text style={[styles.legendSubtext, { color: theme.colors.textSecondary }]}>
                    {item.percentage.toFixed(1)}% • {item.movementCount} {item.movementCount === 1 ? 'movimiento' : 'movimientos'}
                  </Text>
                </View>
                <Text style={[styles.legendAmount, { color: theme.colors.text }]}>
                  {formatCurrency(item.amount)}
                </Text>
              </View>
            )}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    marginVertical: 12,
  },
  ringContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    height: 220,
    position: 'relative',
  },
  centerContent: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  totalLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 4,
    paddingHorizontal: 8,
    textAlign: 'center',
  },
  legend: {
    borderTopWidth: 1,
    paddingTop: 12,
  },
  legendTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 12,
  },
  emptyLegend: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 3,
    marginRight: 12,
  },
  legendText: {
    flex: 1,
  },
  legendLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  legendSubtext: {
    fontSize: 10,
  },
  legendAmount: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 8,
  },
});
