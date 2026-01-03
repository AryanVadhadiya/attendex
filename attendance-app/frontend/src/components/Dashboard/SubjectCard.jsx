import ProgressRing from './ProgressRing';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const SubjectCard = ({ subject, stats, threshold = 75 }) => {
  if (!stats) return null;
  const { currentLoad, presentCount } = stats;

  // Recalculate based on dynamic threshold
  // Formula: How many more classes can I miss?
  // Safe Bunks = floor(Present / Threshold) - Total
  const safeBunks = Math.floor(presentCount / (threshold / 100)) - currentLoad;
  const remainingAllowed = safeBunks;
  const presentPercent = currentLoad > 0 ? Math.round((presentCount / currentLoad) * 100) : 0;

  return (
    <div className="card p-5 relative overflow-hidden group hover:scale-[1.01] transition-transform">
      {/* Decorative colored strip */}
      <div
        className="absolute top-0 left-0 w-1 h-full"
        style={{ backgroundColor: subject.color }}
      />

      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="font-semibold text-lg text-foreground leading-tight">{subject.name}</h3>
          <p className="text-muted-foreground text-sm mt-1">{subject.code}</p>
        </div>
        <ProgressRing percentage={presentPercent} size={48} strokeWidth={4} threshold={threshold} />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Present</p>
          <p className="font-medium text-foreground">{presentCount}/{currentLoad}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            ({stats.lectureLoad || 0} Lec + {stats.labLoad || 0} Lab)
          </p>
        </div>
        <div>
           <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Remaining Bunks</p>
           <p className={`font-medium ${remainingAllowed < 0 ? 'text-destructive' : 'text-foreground'}`}>
             {remainingAllowed}
           </p>
        </div>
      </div>

      <div className="pt-4 border-t border-border flex justify-between items-center">
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${remainingAllowed < 0 ? 'badge-danger' : 'badge-success'}`}>
            {remainingAllowed < 0 ? 'Shortage!' : 'On Track'}
        </span>
        <Link
            to={`/subjects/${subject._id}`}
            className="text-sm font-medium text-foreground flex items-center hover:text-accent transition-colors"
        >
            Details <ArrowRight className="w-4 h-4 ml-1" />
        </Link>
      </div>
    </div>
  );
};

export default SubjectCard;

