import React, { useMemo } from 'react';

/**
 * Tiny inline sparkline. Pure SVG, no chart-library dependency, no
 * tooltips — KPI cards just need a glance-shape. The line is rendered
 * at the natural aspect ratio of the data points, then SVG handles
 * proportional scaling so it adapts cleanly to any container width.
 *
 * Defaults: smooth (Catmull-Rom-ish via quadratic curves) when there
 * are >= 3 points, straight polylines otherwise. A faint area fill
 * underneath gives the line visual weight without competing with the
 * number above it.
 *
 * Usage:
 *   <Sparkline values={[12, 15, 9, 18, 22, 17]} tone="gain" />
 */
export function Sparkline({
  values = [],
  width = 120,
  height = 36,
  strokeWidth = 1.75,
  // 'gain' = positive trend green, 'loss' = expense red, 'brand' = violet,
  // 'neutral' = current text color. Picks the colour from CSS variables
  // so light/dark themes both look right.
  tone = 'brand',
  // Fill the area under the line at low opacity. Off by default for
  // dense rows; on by default for KPI cards.
  fill = true,
  className = '',
}) {
  const stroke = useMemo(() => {
    switch (tone) {
      case 'gain':    return 'hsl(var(--gain))';
      case 'loss':    return 'hsl(var(--loss))';
      case 'neutral': return 'currentColor';
      case 'brand':
      default:        return 'hsl(var(--primary))';
    }
  }, [tone]);

  const { d, area } = useMemo(() => {
    if (!values || values.length === 0) return { d: '', area: '' };
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const stepX = values.length > 1 ? width / (values.length - 1) : 0;

    const points = values.map((v, i) => ({
      x: i * stepX,
      y: height - ((v - min) / range) * (height - 4) - 2,
    }));

    if (points.length < 3) {
      const linear = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
      const fillPath = `${linear} L${width},${height} L0,${height} Z`;
      return { d: linear, area: fillPath };
    }

    // Smooth via averaged midpoints — gives a clean monotone curve
    // without pulling Catmull-Rom math into a sparkline.
    let path = `M${points[0].x},${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const mx = (prev.x + curr.x) / 2;
      const my = (prev.y + curr.y) / 2;
      path += ` Q${prev.x},${prev.y} ${mx},${my}`;
    }
    path += ` T${points[points.length - 1].x},${points[points.length - 1].y}`;
    const fillPath = `${path} L${width},${height} L0,${height} Z`;
    return { d: path, area: fillPath };
  }, [values, width, height]);

  if (!values || values.length === 0) return null;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={className}
      aria-hidden
    >
      {fill && (
        <path
          d={area}
          fill={stroke}
          opacity={0.14}
        />
      )}
      <path
        d={d}
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default Sparkline;
