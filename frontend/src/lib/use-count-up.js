import { useEffect, useRef, useState } from 'react';

/**
 * Animates a number from its previous value to the new target. RAF-
 * driven so it tracks the display refresh, easing built in (cubic
 * out) so the number lands instead of overshooting.
 *
 * Returns the current display value. Component is responsible for
 * formatting it (₹, decimals, etc.) — keeps the hook decoupled from
 * locale concerns.
 *
 * Usage:
 *   const display = useCountUp(transactionTotal, { duration: 700 });
 *   return <span>₹{Math.round(display).toLocaleString('en-IN')}</span>;
 *
 * Why not the obvious useState + setInterval? requestAnimationFrame
 * pauses when the tab is backgrounded and ticks at the monitor's
 * refresh rate, so we get smooth motion on 120Hz screens and zero
 * CPU when the tab isn't visible.
 */
export function useCountUp(target, { duration = 600 } = {}) {
  const [value, setValue] = useState(target);
  const fromRef = useRef(target);
  const startRef = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => {
    if (target === value) return;
    fromRef.current = value;
    startRef.current = null;

    const tick = (ts) => {
      if (startRef.current == null) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const t = Math.min(1, elapsed / duration);
      // Cubic ease-out — fast start, gentle settle. Reads as "the
      // number was already counting and just locked in".
      const eased = 1 - Math.pow(1 - t, 3);
      const next = fromRef.current + (target - fromRef.current) * eased;
      setValue(next);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // Intentionally omit `value` from deps — we only want to retrigger
    // on target change, not on each frame's value update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, duration]);

  return value;
}
