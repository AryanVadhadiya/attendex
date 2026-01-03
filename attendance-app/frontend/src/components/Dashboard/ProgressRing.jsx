import clsx from 'clsx';

const ProgressRing = ({ percentage = 0, size = 60, strokeWidth = 5, hideText = false }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  let color = 'text-accent';
  if (percentage < 70) color = 'text-destructive';
  else if (percentage < 75) color = 'text-amber-500';

  const displayPercentage = typeof percentage === 'number' ? (percentage % 1 === 0 ? percentage : percentage.toFixed(1)) : percentage;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90 w-full h-full">
        <circle
          className={clsx("transition-colors duration-1000", color, "opacity-20")}
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        <circle
          className={clsx("transition-all duration-1000 ease-out", color)}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
      </svg>
      {!hideText && (
        <div
          className="absolute font-bold text-foreground leading-none text-center"
          style={{ fontSize: size > 80 ? '1.25rem' : size > 50 ? '0.75rem' : '0.6rem' }}
        >
          {displayPercentage}%
        </div>
      )}
    </div>
  );
};

export default ProgressRing;
