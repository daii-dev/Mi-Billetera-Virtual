import type { ReactNode } from 'react';
import {
  useCallback,
  useMemo,
  useState,
} from 'react';

import {
  router,
  useFocusEffect,
} from 'expo-router';
import {
  CalendarDays,
  ChevronDown,
  Download,
  Search,
} from 'lucide-react-native';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import type {
  ReportAccount,
  ReportDateRange,
  ReportFileType,
  ReportFilters,
  ReportMovement,
  ReportMovementTypeFilter,
  ReportPeriodKey,
  ReportSectionKey,
} from '@/features/reports/report.types';
import {
  calculateReportSummary,
  formatBobCurrency,
  groupMovementsByDate,
} from '@/features/reports/reportCalculations';
import { generateReportFile } from '@/features/reports/reportExport';
import {
  formatDateValue,
  getLast30DaysRange,
  getReportDateRange,
  isValidDateRange,
} from '@/features/reports/reportPeriods';
import {
  getPreviousPeriodMovements,
  getReportAccounts,
  getReportMovements,
} from '@/features/reports/reports.service';
import { useProfileName } from '@/hooks/useProfileName';
import { useSidebarNavigation } from '@/hooks/useSidebarNavigation';
import { useSidebarSwipe } from '@/hooks/useSidebarSwipe';
import { AppHeader } from '@/layouts/header/AppHeader';
import { AppSidebar } from '@/layouts/sidebar/AppSidebar';
import { useSupabase } from '@/lib/useSupabase';
import { colors } from '@/theme/colors';
import {
  AppTheme,
  useAppTheme,
} from '@/theme/ThemeContext';
import {
  useAuth,
  useClerk,
} from '@clerk/expo';

const PERIOD_OPTIONS: Array<{
  key: ReportPeriodKey;
  label: string;
}> = [
  { key: 'last7days', label: 'Ultimos 7 dias' },
  { key: 'last30days', label: 'Ultimos 30 dias' },
  { key: 'currentMonth', label: 'Este mes' },
  { key: 'previousMonth', label: 'Mes anterior' },
  { key: 'custom', label: 'Personalizado' },
];

const TYPE_OPTIONS: Array<{
  key: ReportMovementTypeFilter;
  label: string;
}> = [
  { key: 'all', label: 'Todos' },
  { key: 'income', label: 'Ingresos' },
  { key: 'expense', label: 'Gastos' },
];

const FILE_TYPE_OPTIONS: Array<{
  key: ReportFileType;
  label: string;
}> = [
  { key: 'pdf', label: 'PDF' },
  { key: 'xlsx', label: 'Excel' },
  { key: 'csv', label: 'CSV' },
];

const SECTION_OPTIONS: Array<{
  key: ReportSectionKey;
  label: string;
}> = [
  { key: 'summary', label: 'Resumen general' },
  { key: 'movements', label: 'Lista de movimientos' },
  { key: 'statistics', label: 'Estadisticas' },
  { key: 'charts', label: 'Graficos y categorias' },
];

export function ReportsMovementsScreen() {
  const { userId, isLoaded, isSignedIn } = useAuth();
  const { signOut } = useClerk();
  const supabase = useSupabase();
  const { theme, isDarkMode, setDarkMode } = useAppTheme();
  const styles = createStyles(theme);

  const { profileName } = useProfileName();
  const [accounts, setAccounts] = useState<ReportAccount[]>([]);
  const [movements, setMovements] = useState<ReportMovement[]>([]);
  const [previousMovements, setPreviousMovements] = useState<ReportMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [periodMenuVisible, setPeriodMenuVisible] = useState(false);
  const [accountMenuVisible, setAccountMenuVisible] = useState(false);
  const [typeMenuVisible, setTypeMenuVisible] = useState(false);
  const [customPeriodVisible, setCustomPeriodVisible] = useState(false);
  const [downloadModalVisible, setDownloadModalVisible] = useState(false);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [selectedFileType, setSelectedFileType] =
    useState<ReportFileType | null>('pdf');
  const [selectedSections, setSelectedSections] = useState<ReportSectionKey[]>([
    'summary',
    'movements',
    'statistics',
    'charts',
  ]);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [searchText, setSearchText] = useState('');
  const [filters, setFilters] = useState<ReportFilters>({
    period: 'last30days',
    dateRange: getLast30DaysRange(),
    accountId: null,
    type: 'all',
  });

  const handleSelectSidebarItem = useSidebarNavigation({
    currentKey: 'reports',
    onClose: () => setSidebarVisible(false),
  });

  const sidebarSwipeHandlers = useSidebarSwipe({
    onOpen: () => setSidebarVisible(true),
  });

  const loadReports = useCallback(async (showFullLoader = false) => {
    if (!isLoaded) return;

    if (!isSignedIn || !userId) {
      router.replace('/sign-in');
      return;
    }

    try {
      if (showFullLoader) {
        setLoading(true);
      }

      setErrorMessage('');

      const [reportAccounts, reportMovements, previousData] =
        await Promise.all([
          getReportAccounts(supabase, userId),
          getReportMovements(supabase, userId, filters),
          getPreviousPeriodMovements(supabase, userId, filters),
        ]);

      setAccounts(reportAccounts);
      setMovements(reportMovements);
      setPreviousMovements(previousData);
    } catch (error: any) {
      const message = error?.message || 'No se pudieron cargar los reportes';
      setErrorMessage(message);
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filters, isLoaded, isSignedIn, supabase, userId]);

  useFocusEffect(
    useCallback(() => {
      loadReports(true);
    }, [loadReports])
  );

  const filteredMovements = useMemo(() => {
    const cleanSearch = searchText.trim().toLowerCase();

    if (!cleanSearch) {
      return movements;
    }

    return movements.filter((movement) => {
      const accountName = movement.savings_goal_account_names
        || movement.account?.name
        || '';
      const searchableText = [
        movement.title,
        movement.category_name,
        movement.description,
        accountName,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchableText.includes(cleanSearch);
    });
  }, [movements, searchText]);

  const summary = useMemo(
    () => calculateReportSummary(filteredMovements, previousMovements),
    [filteredMovements, previousMovements]
  );

  const movementGroups = useMemo(
    () => groupMovementsByDate(filteredMovements),
    [filteredMovements]
  );

  const selectedPeriodLabel =
    PERIOD_OPTIONS.find((option) => option.key === filters.period)?.label
    ?? 'Periodo';

  const selectedAccountLabel =
    accounts.find((account) => account.id === filters.accountId)?.name
    ?? 'Todas las cuentas';

  const selectedTypeLabel =
    TYPE_OPTIONS.find((option) => option.key === filters.type)?.label
    ?? 'Todos';

  async function handleRefresh() {
    setRefreshing(true);
    await loadReports(false);
  }

  async function handleLogout() {
    try {
      await signOut();
      router.replace('/sign-in');
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'No se pudo cerrar sesion');
    }
  }

  function handleSelectPeriod(period: ReportPeriodKey) {
    setPeriodMenuVisible(false);

    if (period === 'custom') {
      setCustomStartDate(filters.dateRange.startDate);
      setCustomEndDate(filters.dateRange.endDate);
      setCustomPeriodVisible(true);
      return;
    }

    setFilters((currentFilters) => ({
      ...currentFilters,
      period,
      dateRange: getReportDateRange(period),
    }));
  }

  function handleApplyCustomPeriod() {
    const range: ReportDateRange = {
      startDate: customStartDate.trim(),
      endDate: customEndDate.trim(),
    };
    const today = formatDateValue(new Date());

    if (!range.startDate || !range.endDate) {
      Alert.alert('Fechas requeridas', 'Ingresa fecha inicio y fecha fin');
      return;
    }

    if (!isValidDateRange(range)) {
      Alert.alert(
        'Rango invalido',
        'La fecha inicio no puede ser mayor que la fecha fin'
      );
      return;
    }

    if (range.startDate > today || range.endDate > today) {
      Alert.alert('Fecha invalida', 'No se permiten fechas futuras');
      return;
    }

    setFilters((currentFilters) => ({
      ...currentFilters,
      period: 'custom',
      dateRange: range,
    }));
    setCustomPeriodVisible(false);
  }

  function renderComparison(value: number | null) {
    if (value === null) {
      return 'Sin periodo anterior';
    }

    if (value === 0) {
      return 'Sin variacion';
    }

    const sign = value > 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}% vs. periodo anterior`;
  }

  function renderMovementAmount(movement: ReportMovement) {
    const isIncome = movement.type === 'income';
    const isExpense = movement.type === 'expense';
    const sign = isIncome ? '+' : isExpense ? '-' : '';
    const amountColor = isIncome
      ? colors.secondary
      : isExpense
        ? colors.expense
        : theme.colors.textSecondary;

    return (
      <Text style={[styles.movementAmount, { color: amountColor }]}>
        {sign}{formatBobCurrency(movement.amount)}
      </Text>
    );
  }

  function toggleReportSection(section: ReportSectionKey) {
    setSelectedSections((currentSections) => {
      if (currentSections.includes(section)) {
        return currentSections.filter((currentSection) => currentSection !== section);
      }

      return [...currentSections, section];
    });
  }

  async function generateCurrentReport() {
    if (!selectedFileType) {
      Alert.alert('Formato requerido', 'Selecciona PDF, Excel o CSV.');
      return;
    }

    if (selectedSections.length === 0) {
      Alert.alert(
        'Secciones requeridas',
        'Selecciona al menos una seccion para el reporte.'
      );
      return;
    }

    if (filters.period === 'custom' && !isValidDateRange(filters.dateRange)) {
      Alert.alert('Rango invalido', 'Revisa la fecha inicio y fecha fin.');
      return;
    }

    if (filteredMovements.length === 0 && !selectedSections.includes('summary')) {
      Alert.alert(
        'Sin movimientos',
        'No hay movimientos para exportar. Activa el resumen general para generar un reporte sin lista de movimientos.'
      );
      return;
    }

    try {
      setGeneratingReport(true);

      await generateReportFile({
        movements: filteredMovements,
        summary,
        groups: movementGroups,
        filters,
        selectedFileType,
        selectedSections,
        periodLabel: selectedPeriodLabel,
        startDate: filters.dateRange.startDate,
        endDate: filters.dateRange.endDate,
      });

      setDownloadModalVisible(false);
      Alert.alert('Reporte generado', 'El reporte se genero correctamente.');
    } catch (error: any) {
      Alert.alert(
        'Error',
        error?.message || 'No se pudo generar el reporte.'
      );
    } finally {
      setGeneratingReport(false);
    }
  }

  function handleGenerateReport() {
    if (filteredMovements.length === 0 && selectedSections.includes('summary')) {
      Alert.alert(
        'Sin movimientos',
        'No hay movimientos para los filtros actuales. Se generara un reporte con el resumen disponible.',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Generar',
            onPress: () => {
              generateCurrentReport();
            },
          },
        ]
      );
      return;
    }

    generateCurrentReport();
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Cargando reportes...</Text>
      </View>
    );
  }

  return (
    <View
      style={styles.container}
      {...sidebarSwipeHandlers}
    >
      <AppHeader
        title="Reportes"
        onOpenSidebar={() => setSidebarVisible(true)}
        onLogout={handleLogout}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <View style={styles.headerBox}>
          <Text style={styles.title}>Reportes de movimientos</Text>
          <Text style={styles.subtitle}>
            Analiza tus ingresos, gastos y movimientos segun el periodo seleccionado.
          </Text>
        </View>

        <View style={styles.summaryGrid}>
          <SummaryCard
            styles={styles}
            title="Ingresos totales"
            value={formatBobCurrency(summary.totalIncome)}
            detail={renderComparison(summary.incomeComparisonPercentage)}
            accentColor={colors.secondary}
          />
          <SummaryCard
            styles={styles}
            title="Gastos totales"
            value={formatBobCurrency(summary.totalExpense)}
            detail={renderComparison(summary.expenseComparisonPercentage)}
            accentColor={colors.expense}
          />
          <SummaryCard
            styles={styles}
            title="Total neto"
            value={formatBobCurrency(summary.netTotal)}
            detail={renderComparison(summary.netComparisonPercentage)}
            accentColor={summary.netTotal >= 0 ? colors.primary : colors.expense}
          />
          <SummaryCard
            styles={styles}
            title="Movimientos"
            value={String(summary.movementCount)}
            detail="Segun filtros actuales"
            accentColor={theme.colors.textSecondary}
          />
        </View>

        <View style={styles.searchBox}>
          <Search size={20} color={theme.colors.textSecondary} />
          <TextInput
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Buscar por titulo, categoria, descripcion o cuenta"
            placeholderTextColor={theme.colors.textSecondary}
            style={styles.searchInput}
          />
        </View>

        <View style={styles.filtersBox}>
          <FilterDropdown
            styles={styles}
            label="Periodo"
            value={selectedPeriodLabel}
            open={periodMenuVisible}
            onToggle={() => {
              setPeriodMenuVisible(!periodMenuVisible);
              setAccountMenuVisible(false);
              setTypeMenuVisible(false);
            }}
          >
            {PERIOD_OPTIONS.map((option) => (
              <Pressable
                key={option.key}
                style={styles.optionItem}
                onPress={() => handleSelectPeriod(option.key)}
              >
                <Text style={styles.optionText}>{option.label}</Text>
              </Pressable>
            ))}
          </FilterDropdown>

          <FilterDropdown
            styles={styles}
            label="Cuenta"
            value={selectedAccountLabel}
            open={accountMenuVisible}
            onToggle={() => {
              setAccountMenuVisible(!accountMenuVisible);
              setPeriodMenuVisible(false);
              setTypeMenuVisible(false);
            }}
          >
            <Pressable
              style={styles.optionItem}
              onPress={() => {
                setFilters((currentFilters) => ({
                  ...currentFilters,
                  accountId: null,
                }));
                setAccountMenuVisible(false);
              }}
            >
              <Text style={styles.optionText}>Todas las cuentas</Text>
            </Pressable>

            {accounts.map((account) => (
              <Pressable
                key={account.id}
                style={styles.optionItem}
                onPress={() => {
                  setFilters((currentFilters) => ({
                    ...currentFilters,
                    accountId: account.id,
                  }));
                  setAccountMenuVisible(false);
                }}
              >
                <Text style={styles.optionText}>{account.name}</Text>
              </Pressable>
            ))}
          </FilterDropdown>

          <FilterDropdown
            styles={styles}
            label="Tipo"
            value={selectedTypeLabel}
            open={typeMenuVisible}
            onToggle={() => {
              setTypeMenuVisible(!typeMenuVisible);
              setPeriodMenuVisible(false);
              setAccountMenuVisible(false);
            }}
          >
            {TYPE_OPTIONS.map((option) => (
              <Pressable
                key={option.key}
                style={styles.optionItem}
                onPress={() => {
                  setFilters((currentFilters) => ({
                    ...currentFilters,
                    type: option.key,
                  }));
                  setTypeMenuVisible(false);
                }}
              >
                <Text style={styles.optionText}>{option.label}</Text>
              </Pressable>
            ))}
          </FilterDropdown>
        </View>

        <Pressable
          style={styles.downloadButton}
          onPress={() => setDownloadModalVisible(true)}
        >
          <Download size={19} color="#FFFFFF" />
          <Text style={styles.downloadButtonText}>Generar reporte</Text>
        </Pressable>

        {errorMessage ? (
          <View style={styles.stateBox}>
            <Text style={styles.stateTitle}>No se pudo cargar el reporte</Text>
            <Text style={styles.stateText}>{errorMessage}</Text>
            <Pressable style={styles.retryButton} onPress={() => loadReports(true)}>
              <Text style={styles.retryButtonText}>Reintentar</Text>
            </Pressable>
          </View>
        ) : movementGroups.length === 0 ? (
          <View style={styles.stateBox}>
            <Text style={styles.stateTitle}>Sin movimientos</Text>
            <Text style={styles.stateText}>
              No hay movimientos para los filtros seleccionados.
            </Text>
          </View>
        ) : (
          <View style={styles.movementsSection}>
            {movementGroups.map((group) => (
              <View key={group.date} style={styles.groupBox}>
                <Text style={styles.groupTitle}>{group.label}</Text>

                {group.movements.map((movement) => {
                  const accountName = movement.savings_goal_account_names
                    || movement.account?.name
                    || 'Cuenta';
                  const createdAt = new Date(movement.created_at);
                  const timeLabel = Number.isNaN(createdAt.getTime())
                    ? ''
                    : createdAt.toLocaleTimeString('es-BO', {
                      hour: '2-digit',
                      minute: '2-digit',
                    });

                  return (
                    <View key={movement.id} style={styles.movementCard}>
                      <View style={styles.movementInfo}>
                        <Text style={styles.movementTitle} numberOfLines={1}>
                          {movement.title}
                        </Text>
                        <Text style={styles.movementMeta} numberOfLines={1}>
                          {movement.category_name || 'Sin categoria'}
                          {timeLabel ? ` · ${timeLabel}` : ''}
                        </Text>
                        <Text style={styles.movementAccount} numberOfLines={1}>
                          {accountName}
                        </Text>
                      </View>

                      {renderMovementAmount(movement)}
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
        )}

        <View style={styles.footerTotals}>
          <Text style={styles.footerText}>
            Total de movimientos: {summary.movementCount}
          </Text>
          <Text style={styles.footerNet}>
            Total neto: {formatBobCurrency(summary.netTotal)}
          </Text>
        </View>
      </ScrollView>

      <CustomPeriodModal
        visible={customPeriodVisible}
        styles={styles}
        startDate={customStartDate}
        endDate={customEndDate}
        onChangeStartDate={setCustomStartDate}
        onChangeEndDate={setCustomEndDate}
        onCancel={() => setCustomPeriodVisible(false)}
        onApply={handleApplyCustomPeriod}
      />

      <ReportDownloadModal
        visible={downloadModalVisible}
        styles={styles}
        selectedFileType={selectedFileType}
        selectedSections={selectedSections}
        generating={generatingReport}
        onSelectFileType={setSelectedFileType}
        onToggleSection={toggleReportSection}
        onGenerate={handleGenerateReport}
        onClose={() => setDownloadModalVisible(false)}
      />

      <AppSidebar
        visible={sidebarVisible}
        userName={profileName}
        selectedKey="reports"
        visualMode={isDarkMode}
        onToggleVisualMode={setDarkMode}
        onClose={() => setSidebarVisible(false)}
        onSelectItem={handleSelectSidebarItem}
      />
    </View>
  );
}

type SummaryCardProps = {
  styles: ReturnType<typeof createStyles>;
  title: string;
  value: string;
  detail: string;
  accentColor: string;
};

function SummaryCard({
  styles,
  title,
  value,
  detail,
  accentColor,
}: SummaryCardProps) {
  return (
    <View style={styles.summaryCard}>
      <View style={[styles.summaryAccent, { backgroundColor: accentColor }]} />
      <Text style={styles.summaryTitle}>{title}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryDetail}>{detail}</Text>
    </View>
  );
}

type FilterDropdownProps = {
  styles: ReturnType<typeof createStyles>;
  label: string;
  value: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
};

function FilterDropdown({
  styles,
  label,
  value,
  open,
  onToggle,
  children,
}: FilterDropdownProps) {
  return (
    <View style={styles.filterBlock}>
      <Text style={styles.filterLabel}>{label}</Text>
      <Pressable style={styles.selectorBox} onPress={onToggle}>
        <Text style={styles.selectorText} numberOfLines={1}>
          {value}
        </Text>
        <ChevronDown size={18} color="#6B7280" />
      </Pressable>

      {open && (
        <View style={styles.optionsBox}>
          {children}
        </View>
      )}
    </View>
  );
}

type CustomPeriodModalProps = {
  visible: boolean;
  styles: ReturnType<typeof createStyles>;
  startDate: string;
  endDate: string;
  onChangeStartDate: (value: string) => void;
  onChangeEndDate: (value: string) => void;
  onCancel: () => void;
  onApply: () => void;
};

function CustomPeriodModal({
  visible,
  styles,
  startDate,
  endDate,
  onChangeStartDate,
  onChangeEndDate,
  onCancel,
  onApply,
}: CustomPeriodModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalBox}>
          <View style={styles.modalHeader}>
            <CalendarDays size={22} color="#FFFFFF" />
            <Text style={styles.modalTitle}>Periodo personalizado</Text>
          </View>

          <View style={styles.modalContent}>
            <Text style={styles.inputLabel}>Fecha inicio</Text>
            <TextInput
              value={startDate}
              onChangeText={onChangeStartDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#A8A8A8"
              style={styles.input}
            />

            <Text style={styles.inputLabel}>Fecha fin</Text>
            <TextInput
              value={endDate}
              onChangeText={onChangeEndDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#A8A8A8"
              style={styles.input}
            />

            <View style={styles.modalButtonsRow}>
              <Pressable style={[styles.modalButton, styles.cancelButton]} onPress={onCancel}>
                <Text style={styles.modalButtonText}>Cancelar</Text>
              </Pressable>

              <Pressable style={[styles.modalButton, styles.saveButton]} onPress={onApply}>
                <Text style={styles.modalButtonText}>Aplicar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

type ReportDownloadModalProps = {
  visible: boolean;
  styles: ReturnType<typeof createStyles>;
  selectedFileType: ReportFileType | null;
  selectedSections: ReportSectionKey[];
  generating: boolean;
  onSelectFileType: (fileType: ReportFileType) => void;
  onToggleSection: (section: ReportSectionKey) => void;
  onGenerate: () => void;
  onClose: () => void;
};

function ReportDownloadModal({
  visible,
  styles,
  selectedFileType,
  selectedSections,
  generating,
  onSelectFileType,
  onToggleSection,
  onGenerate,
  onClose,
}: ReportDownloadModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={generating ? undefined : onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalBox}>
          <View style={styles.modalHeader}>
            <Download size={22} color="#FFFFFF" />
            <Text style={styles.modalTitle}>Generar reporte</Text>
          </View>

          <View style={styles.modalContent}>
            <Text style={styles.inputLabel}>Tipo de archivo</Text>
            <View style={styles.segmentRow}>
              {FILE_TYPE_OPTIONS.map((option) => {
                const selected = selectedFileType === option.key;

                return (
                  <Pressable
                    key={option.key}
                    style={[
                      styles.segmentButton,
                      selected && styles.segmentButtonSelected,
                    ]}
                    onPress={() => onSelectFileType(option.key)}
                    disabled={generating}
                  >
                    <Text
                      style={[
                        styles.segmentButtonText,
                        selected && styles.segmentButtonTextSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={[styles.inputLabel, styles.sectionLabel]}>
              Incluir en el reporte
            </Text>

            <View style={styles.sectionOptionsBox}>
              {SECTION_OPTIONS.map((option) => {
                const selected = selectedSections.includes(option.key);

                return (
                  <Pressable
                    key={option.key}
                    style={styles.sectionOption}
                    onPress={() => onToggleSection(option.key)}
                    disabled={generating}
                  >
                    <View
                      style={[
                        styles.checkbox,
                        selected && styles.checkboxSelected,
                      ]}
                    >
                      {selected && <Text style={styles.checkboxMark}>✓</Text>}
                    </View>
                    <Text style={styles.sectionOptionText}>{option.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.modalButtonsRow}>
              <Pressable
                style={[styles.modalButton, styles.cancelButton]}
                onPress={onClose}
                disabled={generating}
              >
                <Text style={styles.modalButtonText}>Cancelar</Text>
              </Pressable>

              <Pressable
                style={[styles.modalButton, styles.saveButton]}
                onPress={onGenerate}
                disabled={generating}
              >
                {generating ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalButtonText}>Generar</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    content: {
      padding: 16,
      paddingBottom: 44,
    },
    headerBox: {
      marginBottom: 16,
    },
    title: {
      color: theme.colors.text,
      fontSize: 25,
      fontWeight: '900',
    },
    subtitle: {
      color: theme.colors.textSecondary,
      fontSize: 14,
      lineHeight: 20,
      marginTop: 6,
    },
    summaryGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    summaryCard: {
      width: '48%',
      minHeight: 124,
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 12,
      padding: 13,
      shadowColor: '#000',
      shadowOpacity: 0.12,
      shadowOffset: { width: 0, height: 2 },
      shadowRadius: 3,
      elevation: 2,
    },
    summaryAccent: {
      width: 32,
      height: 4,
      borderRadius: 4,
      marginBottom: 10,
    },
    summaryTitle: {
      color: theme.colors.textSecondary,
      fontSize: 12,
      fontWeight: '800',
    },
    summaryValue: {
      color: theme.colors.text,
      fontSize: 18,
      fontWeight: '900',
      marginTop: 7,
    },
    summaryDetail: {
      color: theme.colors.textSecondary,
      fontSize: 11,
      lineHeight: 15,
      marginTop: 5,
    },
    searchBox: {
      height: 46,
      marginTop: 18,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 10,
      paddingHorizontal: 12,
      backgroundColor: theme.colors.surface,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    searchInput: {
      flex: 1,
      color: theme.colors.text,
      fontSize: 14,
    },
    filtersBox: {
      marginTop: 14,
      gap: 10,
    },
    filterBlock: {
      position: 'relative',
      zIndex: 1,
    },
    filterLabel: {
      color: theme.colors.text,
      fontSize: 13,
      fontWeight: '900',
      marginBottom: 6,
    },
    selectorBox: {
      minHeight: 42,
      borderWidth: 1.5,
      borderColor: colors.primary,
      borderRadius: 9,
      paddingHorizontal: 12,
      backgroundColor: theme.colors.surface,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    selectorText: {
      flex: 1,
      color: theme.colors.text,
      fontSize: 14,
      fontWeight: '800',
    },
    optionsBox: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 8,
      backgroundColor: theme.colors.surface,
      marginTop: 6,
      overflow: 'hidden',
    },
    optionItem: {
      paddingVertical: 11,
      paddingHorizontal: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    optionText: {
      color: theme.colors.text,
      fontSize: 14,
      fontWeight: '700',
    },
    downloadButton: {
      minHeight: 46,
      marginTop: 16,
      borderRadius: 10,
      backgroundColor: colors.primary,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    downloadButtonText: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '900',
    },
    movementsSection: {
      marginTop: 20,
    },
    groupBox: {
      marginBottom: 16,
    },
    groupTitle: {
      color: theme.colors.text,
      fontSize: 17,
      fontWeight: '900',
      marginBottom: 10,
    },
    movementCard: {
      minHeight: 72,
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 10,
      padding: 13,
      marginBottom: 10,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
    },
    movementInfo: {
      flex: 1,
    },
    movementTitle: {
      color: theme.colors.text,
      fontSize: 15,
      fontWeight: '900',
    },
    movementMeta: {
      color: theme.colors.textSecondary,
      fontSize: 12,
      marginTop: 5,
    },
    movementAccount: {
      color: theme.colors.textSecondary,
      fontSize: 12,
      marginTop: 3,
    },
    movementAmount: {
      minWidth: 96,
      textAlign: 'right',
      fontSize: 14,
      fontWeight: '900',
    },
    stateBox: {
      marginTop: 20,
      padding: 18,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.card,
      alignItems: 'center',
    },
    stateTitle: {
      color: theme.colors.text,
      fontSize: 17,
      fontWeight: '900',
      textAlign: 'center',
    },
    stateText: {
      color: theme.colors.textSecondary,
      fontSize: 14,
      lineHeight: 20,
      textAlign: 'center',
      marginTop: 7,
    },
    retryButton: {
      marginTop: 14,
      minHeight: 38,
      borderRadius: 20,
      paddingHorizontal: 18,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    retryButtonText: {
      color: '#FFFFFF',
      fontWeight: '900',
    },
    footerTotals: {
      marginTop: 6,
      paddingTop: 18,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      gap: 8,
    },
    footerText: {
      color: theme.colors.textSecondary,
      fontSize: 14,
      fontWeight: '800',
    },
    footerNet: {
      color: theme.colors.text,
      fontSize: 18,
      fontWeight: '900',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: theme.colors.overlay,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 18,
    },
    modalBox: {
      width: '100%',
      maxWidth: 350,
      backgroundColor: theme.colors.card,
      borderRadius: 14,
      overflow: 'hidden',
    },
    modalHeader: {
      minHeight: 54,
      backgroundColor: theme.colors.sidebarHeader,
      paddingHorizontal: 18,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    modalTitle: {
      color: '#FFFFFF',
      fontSize: 21,
      fontWeight: '900',
    },
    modalContent: {
      padding: 20,
      alignItems: 'stretch',
    },
    inputLabel: {
      color: theme.colors.text,
      fontSize: 14,
      fontWeight: '900',
      marginBottom: 6,
    },
    input: {
      height: 42,
      borderWidth: 1.5,
      borderColor: colors.primary,
      borderRadius: 8,
      paddingHorizontal: 12,
      color: theme.colors.text,
      backgroundColor: theme.colors.surface,
      fontSize: 15,
      marginBottom: 12,
    },
    modalButtonsRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 14,
      marginTop: 10,
    },
    modalButton: {
      minWidth: 112,
      minHeight: 39,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 16,
    },
    cancelButton: {
      backgroundColor: colors.expense,
    },
    saveButton: {
      backgroundColor: colors.secondary,
      alignSelf: 'center',
    },
    modalButtonText: {
      color: '#FFFFFF',
      fontWeight: '900',
      fontSize: 14,
    },
    segmentRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 14,
    },
    segmentButton: {
      flex: 1,
      minHeight: 38,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surface,
    },
    segmentButtonSelected: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    segmentButtonText: {
      color: theme.colors.text,
      fontSize: 13,
      fontWeight: '900',
    },
    segmentButtonTextSelected: {
      color: '#FFFFFF',
    },
    sectionLabel: {
      marginTop: 4,
    },
    sectionOptionsBox: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 10,
      backgroundColor: theme.colors.surface,
      overflow: 'hidden',
    },
    sectionOption: {
      minHeight: 44,
      paddingHorizontal: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    sectionOptionText: {
      flex: 1,
      color: theme.colors.text,
      fontSize: 14,
      fontWeight: '800',
    },
    checkbox: {
      width: 22,
      height: 22,
      borderRadius: 6,
      borderWidth: 1.5,
      borderColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkboxSelected: {
      backgroundColor: colors.primary,
    },
    checkboxMark: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '900',
      lineHeight: 18,
    },
    pendingText: {
      color: theme.colors.text,
      fontSize: 16,
      fontWeight: '900',
      lineHeight: 22,
      textAlign: 'center',
    },
    pendingDetail: {
      color: theme.colors.textSecondary,
      fontSize: 14,
      lineHeight: 20,
      textAlign: 'center',
      marginTop: 8,
      marginBottom: 18,
    },
    loadingContainer: {
      flex: 1,
      backgroundColor: theme.colors.background,
      alignItems: 'center',
      justifyContent: 'center',
    },
    loadingText: {
      marginTop: 14,
      color: theme.colors.text,
      fontWeight: '800',
    },
  });
}
