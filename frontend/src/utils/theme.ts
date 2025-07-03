import { createTheme } from '@mui/material/styles';

// Custom color palette inspired by modern medical/educational apps
const colors = {
  primary: {
    50: '#e3f2fd',
    100: '#bbdefb',
    200: '#90caf9',
    300: '#64b5f6',
    400: '#42a5f5',
    500: '#2196f3',  // main
    600: '#1e88e5',
    700: '#1976d2',
    800: '#1565c0',
    900: '#0d47a1',
  },
  secondary: {
    50: '#fce4ec',
    100: '#f8bbd0',
    200: '#f48fb1',
    300: '#f06292',
    400: '#ec407a',
    500: '#e91e63',  // main
    600: '#d81b60',
    700: '#c2185b',
    800: '#ad1457',
    900: '#880e4f',
  },
  neutral: {
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#eeeeee',
    300: '#e0e0e0',
    400: '#bdbdbd',
    500: '#9e9e9e',
    600: '#757575',
    700: '#616161',
    800: '#424242',
    900: '#212121',
  },
  success: '#2e7d32',
  error: '#d32f2f',
  warning: '#ed6c02',
  info: '#0288d1',
};

export const theme = createTheme({
  palette: {
    primary: {
      main: colors.primary[500],
      light: colors.primary[300],
      dark: colors.primary[700],
    },
    secondary: {
      main: colors.secondary[500],
      light: colors.secondary[300],
      dark: colors.secondary[700],
    },
    error: {
      main: colors.error,
    },
    warning: {
      main: colors.warning,
    },
    info: {
      main: colors.info,
    },
    success: {
      main: colors.success,
    },
    background: {
      default: colors.neutral[50],
      paper: '#ffffff',
    },
    text: {
      primary: colors.neutral[900],
      secondary: colors.neutral[600],
    },
  },
  typography: {
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 600,
      letterSpacing: '-0.02em',
      lineHeight: 1.2,
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 600,
      letterSpacing: '-0.01em',
      lineHeight: 1.3,
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 500,
      letterSpacing: '-0.01em',
      lineHeight: 1.4,
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 500,
      lineHeight: 1.4,
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 500,
      lineHeight: 1.5,
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 500,
      lineHeight: 1.5,
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.5,
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.57,
    },
    button: {
      textTransform: 'none',
      fontWeight: 500,
    },
  },
  shape: {
    borderRadius: 8,
  },
  shadows: [
    'none',
    '0px 2px 4px rgba(31, 41, 55, 0.06)',
    '0px 4px 6px rgba(31, 41, 55, 0.1)',
    '0px 6px 8px rgba(31, 41, 55, 0.12)',
    '0px 8px 12px rgba(31, 41, 55, 0.14)',
    '0px 10px 14px rgba(31, 41, 55, 0.15)',
    '0px 12px 16px rgba(31, 41, 55, 0.16)',
    '0px 14px 18px rgba(31, 41, 55, 0.17)',
    '0px 16px 20px rgba(31, 41, 55, 0.18)',
    '0px 18px 22px rgba(31, 41, 55, 0.19)',
    '0px 20px 24px rgba(31, 41, 55, 0.20)',
    '0px 22px 26px rgba(31, 41, 55, 0.21)',
    '0px 24px 28px rgba(31, 41, 55, 0.22)',
    '0px 26px 30px rgba(31, 41, 55, 0.23)',
    '0px 28px 32px rgba(31, 41, 55, 0.24)',
    '0px 30px 34px rgba(31, 41, 55, 0.25)',
    '0px 32px 36px rgba(31, 41, 55, 0.26)',
    '0px 34px 38px rgba(31, 41, 55, 0.27)',
    '0px 36px 40px rgba(31, 41, 55, 0.28)',
    '0px 38px 42px rgba(31, 41, 55, 0.29)',
    '0px 40px 44px rgba(31, 41, 55, 0.30)',
    '0px 42px 46px rgba(31, 41, 55, 0.31)',
    '0px 44px 48px rgba(31, 41, 55, 0.32)',
    '0px 46px 50px rgba(31, 41, 55, 0.33)',
    '0px 48px 52px rgba(31, 41, 55, 0.34)',
  ],
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '8px',
          padding: '8px 20px',
          fontSize: '0.875rem',
          fontWeight: 500,
          textTransform: 'none',
          '&:hover': {
            boxShadow: '0px 2px 4px rgba(31, 41, 55, 0.06)',
          },
        },
        contained: {
          boxShadow: 'none',
        },
        outlined: {
          borderWidth: '1.5px',
          '&:hover': {
            borderWidth: '1.5px',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: '12px',
          boxShadow: '0px 2px 4px rgba(31, 41, 55, 0.06)',
          border: `1px solid ${colors.neutral[200]}`,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
        rounded: {
          borderRadius: '12px',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#ffffff',
          color: colors.neutral[900],
          boxShadow: '0px 1px 3px rgba(31, 41, 55, 0.08)',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: '8px',
            '& fieldset': {
              borderColor: colors.neutral[300],
            },
            '&:hover fieldset': {
              borderColor: colors.neutral[400],
            },
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: '6px',
          height: '28px',
        },
      },
    },
  },
}); 