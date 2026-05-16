import { useMemo } from 'react';

export interface RadarChartDataPoint {
  label: string;
  value: number;
  maxValue: number;
}

export interface RadarChartProps {
  data: RadarChartDataPoint[];
  size?: number;
  /** Color for the filled polygon */
  fillColor?: string;
  /** Color for the polygon stroke */
  strokeColor?: string;
  /** Title for accessibility */
  title?: string;
}

/**
 * SVG-based radar chart component.
 * Renders a polygon chart with labeled axes for multi-dimensional data visualization.
 */
export function RadarChart({
  data,
  size = 300,
  fillColor = 'rgba(59, 130, 246, 0.3)',
  strokeColor = '#3b82f6',
  title = 'Radar Chart',
}: RadarChartProps) {
  const center = size / 2;
  const radius = size * 0.35;
  const labelOffset = size * 0.45;

  const points = useMemo(() => {
    const count = data.length;
    if (count === 0) return { polygon: '', axes: [], labels: [] };

    const angleStep = (2 * Math.PI) / count;
    // Start from top (-PI/2)
    const startAngle = -Math.PI / 2;

    const polygon = data
      .map((point, i) => {
        const angle = startAngle + i * angleStep;
        const normalizedValue = Math.min(point.value / point.maxValue, 1);
        const x = center + radius * normalizedValue * Math.cos(angle);
        const y = center + radius * normalizedValue * Math.sin(angle);
        return `${x},${y}`;
      })
      .join(' ');

    const axes = data.map((_, i) => {
      const angle = startAngle + i * angleStep;
      return {
        x: center + radius * Math.cos(angle),
        y: center + radius * Math.sin(angle),
      };
    });

    const labels = data.map((point, i) => {
      const angle = startAngle + i * angleStep;
      return {
        x: center + labelOffset * Math.cos(angle),
        y: center + labelOffset * Math.sin(angle),
        text: point.label,
        value: point.value,
      };
    });

    return { polygon, axes, labels };
  }, [data, center, radius, labelOffset]);

  // Grid rings (25%, 50%, 75%, 100%)
  const gridRings = [0.25, 0.5, 0.75, 1.0];

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={title}
      className="radar-chart"
    >
      <title>{title}</title>

      {/* Grid rings */}
      {gridRings.map((scale) => (
        <circle
          key={scale}
          cx={center}
          cy={center}
          r={radius * scale}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="1"
        />
      ))}

      {/* Axis lines */}
      {points.axes?.map((axis, i) => (
        <line
          key={i}
          x1={center}
          y1={center}
          x2={axis.x}
          y2={axis.y}
          stroke="#d1d5db"
          strokeWidth="1"
        />
      ))}

      {/* Data polygon */}
      {points.polygon && (
        <polygon
          points={points.polygon}
          fill={fillColor}
          stroke={strokeColor}
          strokeWidth="2"
          data-testid="radar-polygon"
        />
      )}

      {/* Data points */}
      {data.map((point, i) => {
        const count = data.length;
        const angleStep = (2 * Math.PI) / count;
        const startAngle = -Math.PI / 2;
        const angle = startAngle + i * angleStep;
        const normalizedValue = Math.min(point.value / point.maxValue, 1);
        const x = center + radius * normalizedValue * Math.cos(angle);
        const y = center + radius * normalizedValue * Math.sin(angle);
        return (
          <circle
            key={i}
            cx={x}
            cy={y}
            r="4"
            fill={strokeColor}
          />
        );
      })}

      {/* Labels */}
      {points.labels?.map((label, i) => (
        <text
          key={i}
          x={label.x}
          y={label.y}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="11"
          fill="#374151"
          className="radar-chart__label"
        >
          {label.text} ({Math.round(label.value)})
        </text>
      ))}
    </svg>
  );
}
