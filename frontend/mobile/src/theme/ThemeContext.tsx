import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_STORAGE_KEY = 'mbv_theme_mode';

export type AppTheme = {
  mode: 'light' | 'dark';
  colors: {
    primary: string;
    background: string;
    surface: string;
    card: string;
    text: string;
    textSecondary: string;
    border: string;
    overlay: string;
    income: string;
    expense: string;
    warning: string;
    sidebarSelected: string;
    sidebarHeader: string;
    summaryCard: string;
  };
};

const lightTheme: AppTheme = {
  mode: 'light',
  colors: {
    primary: '#082B8C',
    background: '#FFFFFF',
    surface: '#FFFFFF',
    card: '#FFFFFF',
    text: '#082B8C',
    textSecondary: '#555555',
    border: '#E5E7EB',
    overlay: 'rgba(0,0,0,0.55)',
    income: '#53FF35',
    expense: '#FF5A5F',
    warning: '#F7C948',
    sidebarSelected: '#AEE4FF',
    sidebarHeader: '#082B8C',
    summaryCard: '#40388E',
  },
};

const darkTheme: AppTheme = {
  mode: 'dark',
  colors: {
    primary: '#4F7CFF',
    background: '#0F172A',
    surface: '#111827',
    card: '#1E293B',
    text: '#FFFFFF',
    textSecondary: '#CBD5E1',
    border: '#334155',
    overlay: 'rgba(0,0,0,0.65)',
    income: '#53FF35',
    expense: '#FF5A5F',
    warning: '#F7C948',
    sidebarSelected: '#1E3A8A',
    sidebarHeader: '#071A58',
    summaryCard: '#312E81',
  },
};

type ThemeContextValue = {
  theme: AppTheme;
  isDarkMode: boolean;
  setDarkMode: (value: boolean) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

type ThemeProviderProps = {
  children: ReactNode;
};

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    async function loadTheme() {
      const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);

      if (savedTheme === 'dark') {
        setIsDarkMode(true);
      }

      if (savedTheme === 'light') {
        setIsDarkMode(false);
      }
    }

    loadTheme();
  }, []);

  async function setDarkMode(value: boolean) {
    setIsDarkMode(value);
    await AsyncStorage.setItem(THEME_STORAGE_KEY, value ? 'dark' : 'light');
  }

  function toggleTheme() {
    setDarkMode(!isDarkMode);
  }

  const theme = isDarkMode ? darkTheme : lightTheme;

  const value = useMemo(
    () => ({
      theme,
      isDarkMode,
      setDarkMode,
      toggleTheme,
    }),
    [theme, isDarkMode]
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useAppTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useAppTheme debe usarse dentro de ThemeProvider');
  }

  return context;
}