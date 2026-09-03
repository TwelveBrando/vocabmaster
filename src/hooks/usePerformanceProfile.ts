import { useEffect, useState } from 'react';

interface NavigatorWithDeviceMemory extends Navigator {
  deviceMemory?: number;
}

function prefersLightweightRendering() {
  if (typeof window === 'undefined') return false;

  const navigatorWithMemory = navigator as NavigatorWithDeviceMemory;
  const hasLimitedCpu = typeof navigator.hardwareConcurrency === 'number' && navigator.hardwareConcurrency <= 4;
  const hasLimitedMemory = typeof navigatorWithMemory.deviceMemory === 'number' && navigatorWithMemory.deviceMemory <= 4;
  const hasCoarsePointer = window.matchMedia('(pointer: coarse)').matches;

  return hasLimitedCpu || hasLimitedMemory || hasCoarsePointer;
}

export function usePerformanceProfile() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  const [lightweightRendering] = useState(prefersLightweightRendering);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updatePreference = () => setPrefersReducedMotion(media.matches);
    media.addEventListener('change', updatePreference);
    return () => media.removeEventListener('change', updatePreference);
  }, []);

  return {
    lightweightRendering,
    prefersReducedMotion,
    // The shader keeps the same CSS size and parameters. Only its internal
    // framebuffer is capped, avoiding multi-million-pixel redraws on HiDPI screens.
    shaderMaxPixelCount: lightweightRendering ? 540 * 540 : 1920 * 1080,
    shaderMinPixelRatio: lightweightRendering ? 0.65 : 1,
  };
}
