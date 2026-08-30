/**
 * Triggers a silky smooth, continuous page-turn sweep transition from left to right.
 * Sound is disabled. Optimized for rock-solid 60/120 FPS with no frame drops or mid-animation sags.
 */
export function executeThemeTransition(applyUpdate: () => void): void {
  const duration = 650; // Optimized duration for natural, responsive sweep without dragging

  // Check if browser supports View Transitions API (Chromium, Electron, Safari 18+)
  if (typeof document !== 'undefined' && 'startViewTransition' in document) {
    try {
      const transition = (document as unknown as {
        startViewTransition: (cb: () => void) => { ready: Promise<void> };
      }).startViewTransition(() => {
        applyUpdate();
      });

      transition.ready
        .then(() => {
          document.documentElement.animate(
            [
              {
                clipPath: 'inset(0 100% 0 0)',
              },
              {
                clipPath: 'inset(0 0% 0 0)',
              },
            ],
            {
              duration,
              easing: 'cubic-bezier(0.25, 1, 0.5, 1)', // Smooth natural deceleration without mid-way drop
              pseudoElement: '::view-transition-new(root)',
            }
          );
        })
        .catch(() => {
          applyUpdate();
        });
    } catch {
      applyUpdate();
    }
  } else {
    // Fallback
    applyUpdate();
  }
}
