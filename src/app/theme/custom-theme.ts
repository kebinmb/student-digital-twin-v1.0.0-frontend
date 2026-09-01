// src/app/custom-theme.ts
import { definePreset } from '@primeng/themes';
import Lara from '@primeng/themes/lara';

export const CustomTheme = definePreset(Lara, {
  semantic: {
    // Primary: CHMSU Forest Green / Emerald
    primary: {
      50: '#ecfdf5',
      100: '#d1fae5',
      200: '#a7f3d0',
      300: '#6ee7b7',
      400: '#34d399',
      500: '#15803d', // Accent Green
      600: '#116834', // Main CHMSU Seal Green
      700: '#0c5027', // Deep Border Green
      800: '#1b4332', // Dark Green Center BG
      900: '#0d281e',
      950: '#051b14'
    },
    // Global form control radius
    formField: {
      borderRadius: '8px'
    },
    colorScheme: {
      light: {
        surface: {
          0: '#ffffff',
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617'
        },
        formField: {
          hoverBorderColor: '{primary.500}',
          focusBorderColor: '{primary.600}'
        },
        focusRing: {
          shadow: '0 0 0 0.2rem color-mix(in srgb, {primary.500} 20%, transparent)'
        },
        highlight: {
          background: '{primary.50}',
          focusBackground: '{primary.100}',
          color: '{primary.700}',
          focusColor: '{primary.800}'
        }
      }
    }
  },
  components: {
    card: {
      root: {
        borderRadius: '16px',
        background: '{surface.0}'
      }
    },
    button: {
      root: {
        borderRadius: '8px'
      }
    },
    inputtext: {
      root: {
        borderRadius: '8px'
      }
    }
  }
});