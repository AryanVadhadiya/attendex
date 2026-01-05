import ProgressRing from './ProgressRing';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useUserProfile } from '../../hooks/useAttendanceData';

const SubjectCard = ({ subject, stats, threshold = 75 }) => {
  const { user } = useUserProfile();
  if (!stats) return null;
  const { currentLoad, presentCount, totalLoad } = stats;

  const baseLoad = totalLoad || currentLoad;
  const absentCount = currentLoad - presentCount;

  const allowedMisses = Math.floor(baseLoad * (1 - threshold / 100));
  const calculatedBunks = allowedMisses - absentCount;

  const labUnit = user?.labUnitValue || 1;
  const lecturesOnly = Math.floor(calculatedBunks / 1);
  const labsOnly = Math.floor(calculatedBunks / labUnit);

  const presentPercent = currentLoad > 0 ? Math.round((presentCount / currentLoad) * 100) : 0;

  return (
    <div className="relative overflow-hidden group transition-all duration-300 hover:scale-[1.01] rounded-3xl bg-card backdrop-blur-xl border border-border shadow-lg p-5">
      <div
        className="absolute top-0 left-0 w-1 h-full"
        style={{ backgroundColor: subject.color }}
      />

      {/* Header */}
      <div className="mb-4">
        <h3 className="font-semibold text-lg text-foreground">{subject.name}</h3>
        <p className="text-muted-foreground text-xs mt-0.5 uppercase tracking-wider font-mono">{subject.code}</p>
      </div>

      {/* Main Content Grid: Left (Present) | Right (Safe to Miss) */}
      <div className="relative grid grid-cols-2 gap-6 mb-4">
        {/* Vertical Divider Line */}
        {/* Vertical Divider Line */}
        <div className="absolute left-1/2 top-2 bottom-2 w-0.5 bg-border -translate-x-1/2 rounded-full" />

        {/* LEFT SIDE: Present */}
        <div className="flex flex-col">
          <p className="text-sm text-muted-foreground uppercase tracking-wider mb-2 text-center">
            Present
          </p>

          {/* Progress Ring - Centered */}
          <div className="mb-3 flex justify-center">
            <ProgressRing
              percentage={presentPercent}
              size={64}
              strokeWidth={6}
              threshold={threshold}
            />
          </div>

          {/* Present Stats - Centered */}
          <div className="flex flex-col items-center">
            <p className="font-bold text-3xl text-foreground mb-1">{presentCount}/{currentLoad}</p>
            <p className="text-sm text-muted-foreground">
              ({stats.lectureLoad || 0} Lec + {stats.labLoad || 0} Lab)
            </p>
          </div>
        </div>

        {/* RIGHT SIDE: Safe to Miss */}
        <div className="flex flex-col">
          <p className="text-sm text-muted-foreground uppercase tracking-wider mb-3 text-center">
            Safe to miss
          </p>

          {/* Horizontal Layout: Number (left) + Equivalence (right) */}
          <div className="flex items-center gap-3 justify-center">
            {/* Left: Large Number + units */}
            <div className="flex flex-col items-center">
              <span className={`text-6xl font-bold leading-none ${calculatedBunks < 0 ? 'text-destructive' : 'text-accent'}`}>
                {calculatedBunks}
              </span>
              <p className="text-base text-muted-foreground mt-1">units</p>
            </div>

            {/* Right: Equivalence breakdown */}
            {calculatedBunks > 0 && (
              <div className="text-sm text-muted-foreground space-y-0.5 text-left">
                <p className="whitespace-nowrap">≈ {lecturesOnly} lecture{lecturesOnly !== 1 ? 's' : ''}</p>
                <p className="whitespace-nowrap">≈ {labsOnly} lab{labsOnly !== 1 ? 's' : ''}</p>
                <p className="text-xs leading-tight">
                  ≈ equivalent<br />
                  combination
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="pt-4 border-t border-border flex justify-between items-center">
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
          calculatedBunks < 0
            ? 'bg-destructive/10 text-destructive'
            : 'bg-accent/10 text-accent'
        }`}>
          {calculatedBunks < 0 ? 'At Risk' : 'On Track'}
        </span>
        <Link
          to={`/subjects/${subject._id}`}
          className="text-sm font-medium text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
        >
          Details
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
};

export default SubjectCard;
