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
          focusBorderColor: '{primary.600}',
          invalidBorderColor: '#dc2626'
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
      },
      body: {
        padding: '1.5rem'
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
    },
    // Master-Detail Drawer configuration (Compact Enterprise Density)
    drawer: {
      root: {
        background: '{surface.0}',
        borderColor: '{surface.200}'
      },
      header: {
        padding: '0.75rem 1rem'
      },
      content: {
        padding: '1rem'
      },
      footer: {
        padding: '0.75rem 1rem'
      }
    },

    datatable: {
      root: {
        borderColor: '{surface.200}'
      },
      header: {
        background: '{surface.0}',
        borderColor: '{surface.200}',
        padding: '0.875rem 1rem'
      },
      headerCell: {
        background: '{surface.50}',
        borderColor: '{surface.200}',
        color: '{surface.700}'
      },
      row: {
        background: '{surface.0}',
        hoverBackground: '{surface.50}',
        selectedBackground: '{primary.50}',
        selectedColor: '{primary.700}'
      }
    },
    // Institutional toasts & alerts
    toast: {
      root: {
        borderRadius: '10px'
      }
    },
    // Loading skeleton states for Bento layouts
    skeleton: {
      root: {
        borderRadius: '8px',
        background: '{surface.200}'
      }
    },
    // Status tags (enrollment status, payment clearances)
    tag: {
      root: {
        borderRadius: '6px'
      }
    }
  }
});