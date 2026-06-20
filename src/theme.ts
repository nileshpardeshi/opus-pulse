import type { ThemeConfig } from 'antd';

export const BRAND = {
  primary: '#1f6feb',
  success: '#1a7f37',
  warning: '#bf8700',
  danger: '#cf222e',
  ink: '#0d1117',
};

// Chart palette used consistently across screens.
export const CHART_COLORS = ['#1f6feb', '#1a7f37', '#bf8700', '#8250df', '#cf222e', '#0aa2c0', '#6e7781'];

export const MODEL_COLORS: Record<string, string> = {
  tnm: '#6e7781',
  'managed-capacity': '#0aa2c0',
  'gain-share': '#bf8700',
  outcome: '#1f6feb',
  'outcome-warranty': '#1a7f37',
};

export const antdTheme: ThemeConfig = {
  token: {
    colorPrimary: BRAND.primary,
    colorSuccess: BRAND.success,
    colorWarning: BRAND.warning,
    colorError: BRAND.danger,
    borderRadius: 6,
    fontSize: 13,
    colorBgLayout: '#f4f6f9',
  },
  components: {
    Layout: {
      headerBg: '#0d1117',
      siderBg: '#161b22',
      headerHeight: 56,
    },
    Menu: {
      darkItemBg: '#161b22',
      darkSubMenuItemBg: '#0d1117',
    },
    Card: {
      paddingLG: 16,
    },
    Table: {
      cellPaddingBlock: 8,
    },
    Statistic: {
      contentFontSize: 22,
    },
  },
};
