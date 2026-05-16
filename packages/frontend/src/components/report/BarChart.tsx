export interface BarChartDataPoint {
  label: string;
  value: number;
  maxValue: number;
}

export interface BarChartProps {
  data: BarChartDataPoint[];
  /** Width of the chart */
  width?: number;
  /** Height of the chart */
  height?: number;
  /** Bar color */
  barColor?: string;
  /** Title for accessibility */
  title?: string;
  /** Whether to show value labels on bars */
  showValues?: boolean;
}

/**
 * SVG-based horizontal bar chart component.
 * Renders labeled horizontal bars for dimension score visualization.
 */
export function BarChart({
  data,
  width = 400,
  height: propHeight,
  barColor = '#3b82f6',
  title = 'Bar Chart',
  showValues = true,
}: BarChartProps) {
  const barHeight = 28;
  const barGap = 12;
  const labelWidth = 140;
  const valueWidth = 50;
  const chartPadding = 16;
  const calculatedHeight = propHeight ?? data.length * (barHeight + barGap) + chartPadding * 2;
  const barAreaWidth = width - labelWidth - valueWidth - chartPadding;

  return (
    <svg
      width={width}
      height={calculatedHeight}
      viewBox={`0 0 ${width} ${calculatedHeight}`}
      role="img"
      aria-label={title}
      className="bar-chart"
    >
      <title>{title}</title>

      {data.map((point, i) => {
        const y = chartPadding + i * (barHeight + barGap);
        const barWidth = Math.max(0, (point.value / point.maxValue) * barAreaWidth);

        return (
          <g key={i} data-testid={`bar-${point.label}`}>
            {/* Label */}
            <text
              x={labelWidth - 8}
              y={y + barHeight / 2}
              textAnchor="end"
              dominantBaseline="middle"
              fontSize="12"
              fill="#374151"
            >
              {point.label}
            </text>

            {/* Background bar */}
            <rect
              x={labelWidth}
              y={y}
              width={barAreaWidth}
              height={barHeight}
              fill="#f3f4f6"
              rx="4"
            />

            {/* Value bar */}
            <rect
              x={labelWidth}
              y={y}
              width={barWidth}
              height={barHeight}
              fill={barColor}
              rx="4"
              data-testid={`bar-fill-${point.label}`}
            />

            {/* Value label */}
            {showValues && (
              <text
                x={labelWidth + barAreaWidth + 8}
                y={y + barHeight / 2}
                textAnchor="start"
                dominantBaseline="middle"
                fontSize="12"
                fontWeight="600"
                fill="#1f2937"
              >
                {Math.round(point.value)}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
