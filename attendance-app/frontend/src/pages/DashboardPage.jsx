import { useState, useEffect } from 'react';
import { useDashboardStats } from '../hooks/useAttendanceData';
import { api } from '../services/api';
import SubjectCard from '../components/Dashboard/SubjectCard';
import { Loader2, AlertCircle, TrendingUp, BookOpen, XCircle, Sparkles, CheckCircle, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import UnmarkedAttendanceAlert from '../components/Dashboard/UnmarkedAttendanceAlert';
import clsx from 'clsx';

const fetcher = url => api.get(url).then(res => res.data);

const DashboardPage = () => {
  const [threshold, setThreshold] = useState(80);
  const { data, loading, error } = useDashboardStats();

  // Preload other pages' data for snappy navigation
  useEffect(() => {
    // Only preload if we have authenticated (dashboard loaded)
    if (data) {
        import('swr').then(({ preload }) => {
            preload('/timetable', fetcher);
            preload('/subjects', fetcher);
            preload('/holidays', fetcher);
            preload('/user/profile', fetcher);
        });
    }
  }, [data]);

  const handleThresholdChange = (val) => {
    setThreshold(val);
  };

  if (loading && !data) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-destructive/10 text-destructive rounded-xl flex items-center border border-destructive/20">
        <AlertCircle className="w-5 h-5 mr-2 shrink-0" />
        Failed to load dashboard: {error}
      </div>
    );
  }

  if (!data || !data.global) {
      return (
          <div className="flex h-64 items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
      );
  }

  const { global, subjects = [] } = data || {};
  const currentThreshold = threshold || 80;

  const presentPercent = global?.presentPercent ?? 0;

  const attendanceColor = presentPercent >= currentThreshold
    ? 'text-accent'
    : presentPercent >= (currentThreshold - 10)
      ? 'text-amber-500'
      : 'text-destructive';

  return (
    <div className="animate-in">
      <UnmarkedAttendanceAlert />

      <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="p-3 glass rounded-2xl">
            <Sparkles className="w-6 h-6 text-accent" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground mt-1">Overview of your semester progress</p>
          </div>
        </div>

        <div className="bg-card p-1 rounded-2xl border border-border flex items-center gap-1">
            {[85, 80, 75, 70].map(val => (
                <button
                    key={val}
                    onClick={() => handleThresholdChange(val)}
                    className={clsx(
                        "px-4 py-2 rounded-xl text-xs font-bold transition-all",
                        threshold === val
                            ? "bg-primary text-primary-foreground shadow-lg scale-105"
                            : "hover:bg-muted text-muted-foreground"
                    )}
                >
                    {val}%
                </button>
            ))}
        </div>
      </header>

      {/* Risk Summary - Instant Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="glass-card p-4 border-l-4 border-accent">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-accent/10 rounded-lg">
              <CheckCircle className="w-5 h-5 text-accent" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {subjects.filter(s => (s.stats?.presentPercent ?? 0) >= threshold).length}
              </p>
              <p className="text-xs text-muted-foreground">Safe Subjects</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-4 border-l-4 border-amber-500">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {subjects.filter(s => (s.stats?.presentPercent ?? 0) >= (threshold - 10) && (s.stats?.presentPercent ?? 0) < threshold).length}
              </p>
              <p className="text-xs text-muted-foreground">Warning Zone</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-4 border-l-4 border-destructive">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-destructive/10 rounded-lg">
              <XCircle className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {subjects.filter(s => (s.stats?.presentPercent || 0) < (threshold - 10)).length}
              </p>
              <p className="text-xs text-muted-foreground">At Risk</p>
            </div>
          </div>
        </div>
      </div>

      {/* Global Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {/* Main Stat - Accent Card */}
        <div className="stat-card-accent relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 opacity-70" />
              <p className="text-sm font-medium opacity-80">Total Attendance</p>
            </div>
            <div className="flex items-baseline gap-2">
               <span className="text-4xl font-bold tracking-tight">
                {typeof presentPercent === 'number' ? presentPercent.toFixed(1) : presentPercent}%
              </span>
              <span className="text-sm opacity-60">average</span>
            </div>
            {/* Progress bar */}
            <div className="mt-4 h-1.5 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-white/80 rounded-full transition-all duration-700"
                style={{ width: `${presentPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Secondary Stats */}
        <div className="stat-card">
          <div className="flex items-center gap-2 mb-2">
            <BookOpen className="w-4 h-4 text-muted-foreground" />
            <p className="text-sm font-medium text-muted-foreground">Total Classes</p>
          </div>
          <p className="text-3xl font-bold text-foreground">{global.totalLoad}</p>
          <p className="text-xs text-muted-foreground mt-1">scheduled this semester</p>
        </div>

        {/* Derived Global Stats */}
        {(() => {
             // Local Calculation to avoid server roundtrip
             const totalLoad = global.totalLoad || 0;
             const absentCount = global.absentCount || 0;

             const reqPercent = threshold;
             const requiredClasses = Math.ceil(totalLoad * (reqPercent / 100));
             const semesterBudget = totalLoad - requiredClasses;
             const remainingAllowed = semesterBudget - absentCount;

             return (
                 <div className="stat-card">
                  <div className="flex items-center gap-2 mb-2">
                    <XCircle className="w-4 h-4 text-muted-foreground" />
                    <p className="text-sm font-medium text-muted-foreground">Missed Classes</p>
                  </div>
                  <p className={`text-3xl font-bold ${absentCount > 0 ? 'text-destructive' : 'text-foreground'}`}>
                    {absentCount}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {remainingAllowed >= 0
                      ? `${remainingAllowed} more allowed`
                      : `${Math.abs(remainingAllowed)} over limit`}
                  </p>
                </div>
             );
        })()}
      </div>

      {/* Subjects Grid */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-foreground">Subjects</h2>
        <span className="text-sm text-muted-foreground">{subjects.length} total</span>
      </div>

      {subjects.length === 0 ? (
        <div className="text-center py-16 card border-dashed">
          <BookOpen className="w-12 h-12 mx-auto text-muted-foreground/40 mb-4" />
          <p className="text-muted-foreground mb-4">No subjects added yet.</p>
          <Link to="/timetable" className="btn-primary inline-flex items-center">
            Setup Timetable
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {subjects.map((item) => (
            <SubjectCard
                key={item.subject._id}
                subject={item.subject}
                stats={item.stats}
                threshold={threshold}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default DashboardPage;

