import { ComponentType } from 'react';

import {
  BarChart3,
  CalendarClock,
  ChartPie,
  FileText,
  Home,
  PiggyBank,
  Tags,
  WalletCards,
} from 'lucide-react-native';

export type SidebarRouteKey =
  | 'home'
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
  { key: 'accounts', label: 'Cuentas', icon: WalletCards, path: '/accounts' },
  { key: 'categories', label: 'Categorías', icon: Tags, path: '/categories' },
  { key: 'budgets', label: 'Presupuestos', icon: ChartPie, path: '/budgets' },
  { key: 'goals', label: 'Metas de Ahorro', icon: PiggyBank, path: '/goals' },
  { key: 'planned-payments', label: 'Pagos Planificados', icon: CalendarClock, path: '/planned-payments'},
  { key: 'reports', label: 'Reportes', icon: FileText, path: '/reports' },
  { key: 'statistics', label: 'Estadísticas', icon: BarChart3, path: '/statistics' },
];

export function getSidebarItemByKey(key: SidebarRouteKey): SidebarItem | undefined {
  return sidebarItems.find((item) => item.key === key);
}