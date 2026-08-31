import { useEffect, type RefObject } from 'react';
import Lenis from 'lenis';

/** Gives the app's content rail a calm, inertial scroll without touching dialogs. */
export function useSmoothScroll(
  wrapperRef: RefObject<HTMLElement | null>,
  contentRef: RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    const wrapper = wrapperRef.current;
    const content = contentRef.current;
    if (!wrapper || !content || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const lenis = new Lenis({
      wrapper,
      content,
      autoRaf: true,
      duration: 1.08,
      easing: (value) => 1 - Math.pow(1 - value, 4),
      smoothWheel: true,
      wheelMultiplier: 0.82,
      touchMultiplier: 1,
    });
    const observer = new ResizeObserver(() => lenis.resize());
    observer.observe(content);
    return () => {
      observer.disconnect();
      lenis.destroy();
    };
  }, [contentRef, wrapperRef]);
}
