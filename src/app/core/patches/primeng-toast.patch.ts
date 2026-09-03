import { ToastStyle } from 'primeng/toast';

/**
 * Patch for PrimeNG Toast component:
 * In PrimeNG's ToastStyle.inlineStyles.root, `right` and `bottom` were defined using boolean short-circuit `&& '20px'`:
 *   right: (_position === 'top-right' || _position === 'bottom-right') && '20px'
 *   bottom: (_position === 'bottom-left' || _position === 'bottom-right' || _position === 'bottom-center') && '20px'
 * When the condition is false, JavaScript evaluates `false && '20px'` to boolean `false`.
 * Angular's Ivy style binder (`checkStylingProperty`) validates bound style properties,
 * and throws `NG0318: [style.bottom] was bound to an invalid value. Expected a string, number, SafeValue, null, or undefined, but received boolean (false)`.
 *
 * This patch guarantees that ToastStyle always returns valid CSS values (`'20px'` or `null`).
 */
export function applyPrimeNGToastPatch(): void {
  try {
    const originalFac = (ToastStyle as any).ɵfac;
    if (originalFac) {
      (ToastStyle as any).ɵfac = function (...args: any[]) {
        const instance = originalFac(...args);
        if (instance) {
          instance.inlineStyles = {
            ...instance.inlineStyles,
            root: ({ instance: toastInstance }: any) => {
              const { _position } = toastInstance;
              return {
                position: 'fixed',
                top:
                  _position === 'top-right' ||
                  _position === 'top-left' ||
                  _position === 'top-center'
                    ? '20px'
                    : _position === 'center'
                      ? '50%'
                      : null,
                right:
                  _position === 'top-right' || _position === 'bottom-right'
                    ? '20px'
                    : null,
                bottom:
                  _position === 'bottom-left' ||
                  _position === 'bottom-right' ||
                  _position === 'bottom-center'
                    ? '20px'
                    : null,
                left:
                  _position === 'top-left' || _position === 'bottom-left'
                    ? '20px'
                    : _position === 'center' ||
                      _position === 'top-center' ||
                      _position === 'bottom-center'
                      ? '50%'
                      : null
              };
            }
          };
        }
        return instance;
      };
    }
  } catch (e) {
    console.warn('Failed to apply PrimeNG ToastStyle patch', e);
  }
}
