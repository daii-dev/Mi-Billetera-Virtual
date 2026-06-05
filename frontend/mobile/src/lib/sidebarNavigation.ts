import { ComponentType } from 'react';

import {
  BarChart3,
  CalendarClock,
  ChartPie,
  FileText,
  HandCoins,
  Home,
  Tags,
  Target,
  WalletCards,
} from 'lucide-react-native';

export type SidebarRouteKey =
  | 'home'
  | 'records'
  | 'accounts'
  | 'categories'
  | 'budgets'
  | 'goals'
  | 'planned-payments'
  | 'reports'
  | 'statistics';

export type SidebarIcon = ComponentType<{
    size?: number;
    color?: string;
    strokeWidth?: number;
}>;

export type SidebarItem = {
    key: SidebarRouteKey;
    label: string;
    icon: SidebarIcon;
    path?: string;
};

export const sidebarItems: SidebarItem[] = [
  { key: 'home', label: 'Inicio', icon: Home, path: '/home' },
  { key: 'records', label: 'Registros', icon: HandCoins, path: '/records' },
  { key: 'accounts', label: 'Cuentas', icon: WalletCards, path: '/accounts' },
  { key: 'categories', label: 'Categorías', icon: Tags, path: '/categories' },
  { key: 'budgets', label: 'Presupuestos', icon: ChartPie, path: '/budgets' },
  { key: 'goals', label: 'Metas de Ahorro', icon: Target, path: '/goals' },
  { key: 'planned-payments', label: 'Pagos Planificados', icon: CalendarClock, path: '/planned-payments'},
  { key: 'reports', label: 'Reportes', icon: FileText, path: '/reports' },
  { key: 'statistics', label: 'Estadísticas', icon: BarChart3, path: '/statistics' },
];

export function getSidebarItemByKey(key: SidebarRouteKey): SidebarItem | undefined {
  return sidebarItems.find((item) => item.key === key);
}