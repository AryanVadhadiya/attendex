import { useState, useMemo, useEffect, useRef } from 'react';
import { useDashboardStats, useRefreshData, useUserProfile } from '../hooks/useAttendanceData';
import SubjectCard from '../components/Dashboard/SubjectCard';
import { Loader2, AlertCircle, TrendingUp, BookOpen, XCircle, Sparkles, CheckCircle, AlertTriangle, PlusCircle } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import UnmarkedAttendanceAlert from '../components/Dashboard/UnmarkedAttendanceAlert';
import clsx from 'clsx';
import ExtraClassModal from '../components/Dashboard/ExtraClassModal';
import { attendanceApi } from '../services/api';
import { useToast } from '../context/ToastContext';

const DashboardPage = () => {
  const [threshold, setThreshold] = useState(80);
  const { data, loading, error, isValidating, mutate: mutateDashboard } = useDashboardStats();
  const { user } = useUserProfile();
  const location = useLocation();
  const [updatingSubjectId, setUpdatingSubjectId] = useState(() => {
    const fromState = location.state?.updatingSubjectId || null;
    if (fromState) return fromState;
    try {
      return localStorage.getItem('lastUpdatedSubjectId') || null;
    } catch (_) {
      return null;
    }
  });
  const hasValidatedRef = useRef(false);
  const mountTimeRef = useRef(performance.now());
  const loggedReadyRef = useRef(false);
  const toast = useToast();
  const refreshData = useRefreshData();
  const [extraModalOpen, setExtraModalOpen] = useState(false);
  const [extraSubmitting, setExtraSubmitting] = useState(false);
  const [extraError, setExtraError] = useState('');

  const handleThresholdChange = (val) => {
    setThreshold(val);
  };

  // Log when dashboard data is fully ready on the client.
  useEffect(() => {
    if (!loading && data && !loggedReadyRef.current) {
      loggedReadyRef.current = true;
      const elapsed = performance.now() - mountTimeRef.current;
      console.log('[PERF] dashboard ready:', (elapsed / 1000).toFixed(2) + 's');
    }
  }, [loading, data]);

  // Track if we've seen at least one validation after coming back
  useEffect(() => {
    if (isValidating) {
      hasValidatedRef.current = true;
    } else if (!isValidating && updatingSubjectId && hasValidatedRef.current) {
      // Validation cycle completed, clear updating state so card shows fresh data
      setUpdatingSubjectId(null);
      try {
        localStorage.removeItem('lastUpdatedSubjectId');
      } catch (_) {}
    }
  }, [isValidating, updatingSubjectId]);

  const { global, subjects = [] } = data || {};
  const subjectOptions = useMemo(
    () => (subjects || []).map(item => item.subject).filter(Boolean),
    [subjects]
  );
    const handleExtraClassSubmit = async (form) => {
      setExtraError('');
      setExtraSubmitting(true);
      try {
        await attendanceApi.addExtraClass(form);
        toast.success('Extra class recorded');
        setExtraModalOpen(false);
        await mutateDashboard();
        await refreshData();
      } catch (err) {
        const message = err.response?.data?.message || err.message || 'Failed to add extra class';
        setExtraError(message);
      } finally {
        setExtraSubmitting(false);
      }
    };

    const closeExtraModal = () => {
      setExtraModalOpen(false);
      setExtraError('');
    };

  const currentThreshold = threshold || 80;

  const presentPercent = global?.presentPercent ?? 0;

  // Precompute subject risk buckets to avoid repeated filtering work
  const { safeCount, warningCount, riskCount } = useMemo(() => {
    if (!subjects || subjects.length === 0) {
      return { safeCount: 0, warningCount: 0, riskCount: 0 };
    }

    let safe = 0;
    let warn = 0;
    let risk = 0;

    for (const s of subjects) {
      const pct = s.stats?.presentPercent ?? 0;
      if (pct >= threshold) safe++;
      else if (pct >= threshold - 10) warn++;
      else risk++;
    }

    return { safeCount: safe, warningCount: warn, riskCount: risk };
  }, [subjects, threshold]);

  const { totalLoad, absentCount, semesterBudget, remainingAllowed, unitBreakdown } = useMemo(() => {
    const total = global?.totalLoad || 0;
    const absent = global?.absentCount || 0;

    const reqPercent = threshold;
    const requiredClasses = Math.ceil(total * (reqPercent / 100));
    const budget = total - requiredClasses;
    const remaining = budget - absent;

    const labUnit = user?.labUnitValue || 1;
    const lecturesOnly = Math.floor(remaining / 1);
    const labsOnly = Math.floor(remaining / labUnit);

    return {
      totalLoad: total,
      absentCount: absent,
      semesterBudget: budget,
      remainingAllowed: remaining,
      unitBreakdown: {
        lectures: lecturesOnly,
        labs: labsOnly,
        labUnit
      }
    };
  }, [global, threshold, user]);

  if (loading) {
    // Glazing skeleton for dashboard layout
    return (
      <div className="animate-in space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3 glass rounded-2xl">
              <div className="w-6 h-6 rounded-full bg-muted animate-pulse" />
            </div>
            <div className="space-y-2">
              <div className="h-6 w-40 bg-muted rounded animate-pulse" />
              <div className="h-4 w-64 bg-muted rounded animate-pulse" />
            </div>
          </div>
          <div className="bg-card p-1 rounded-2xl border border-border flex items-center gap-1 animate-pulse">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="px-4 py-2 rounded-xl bg-muted h-8 w-14" />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="glass-card p-4 border-l-4 border-border animate-pulse space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-muted" />
                <div className="space-y-2 flex-1">
                  <div className="h-5 w-12 bg-muted rounded" />
                  <div className="h-3 w-20 bg-muted rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="stat-card p-4 animate-pulse space-y-3">
              <div className="h-4 w-32 bg-muted rounded" />
              <div className="h-8 w-20 bg-muted rounded" />
              <div className="h-3 w-24 bg-muted rounded" />
            </div>
          ))}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="h-5 w-24 bg-muted rounded animate-pulse" />
            <div className="h-4 w-16 bg-muted rounded animate-pulse" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="card h-32 border animate-pulse">
                <div className="h-full w-full bg-muted rounded-xl" />
              </div>
            ))}
          </div>
        </div>
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

  const attendanceColor = presentPercent >= currentThreshold
    ? 'text-accent'
    : presentPercent >= (currentThreshold - 10)
      ? 'text-amber-500'
      : 'text-destructive';

  return (
    <div className="animate-in px-4 md:px-6 lg:px-0">
      <UnmarkedAttendanceAlert />

      <header className="mb-8 md:mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6">
        <div className="flex items-center gap-3 md:gap-4">
          <div className="p-2 md:p-3 glass rounded-2xl">
            <Sparkles className="w-5 h-5 md:w-6 md:h-6 text-accent" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">Dashboard</h1>
            <p className="text-sm md:text-base text-muted-foreground mt-1">Overview of your semester progress</p>
          </div>
        </div>

        <div className="flex flex-col items-stretch sm:flex-row sm:items-center gap-3">
          <div className="bg-card p-1 rounded-2xl border border-border flex items-center gap-1">
            {[85, 80, 75, 70].map(val => (
              <button
                key={val}
                onClick={() => handleThresholdChange(val)}
                className={clsx(
                  "px-3 md:px-4 py-2 rounded-xl text-xs font-bold transition-all",
                  threshold === val
                    ? "bg-primary text-primary-foreground shadow-lg scale-105"
                    : "hover:bg-muted text-muted-foreground"
                )}
              >
                {val}%
              </button>
            ))}
          </div>
          <button
          onClick={() => setExtraModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-2xl border border-accent/40 bg-accent/10 text-accent text-sm font-semibold hover:bg-accent/20 transition"
          >
          <PlusCircle className="w-4 h-4" />
          Extra Class
          </button>
        </div>
      </header>

      {/* Risk Summary - Instant Status */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 mb-6 md:mb-8">
        <div className="glass-card p-3 md:p-4 border-l-4 border-accent">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="p-1.5 md:p-2 bg-accent/10 rounded-lg">
              <CheckCircle className="w-4 h-4 md:w-5 md:h-5 text-accent" />
            </div>
            <div>
              <p className="text-xl md:text-2xl font-bold text-foreground">
                {safeCount}
              </p>
              <p className="text-[10px] md:text-xs text-muted-foreground">Safe Subjects</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-3 md:p-4 border-l-4 border-amber-500">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="p-1.5 md:p-2 bg-amber-500/10 rounded-lg">
              <AlertTriangle className="w-4 h-4 md:w-5 md:h-5 text-amber-500" />
            </div>
            <div>
              <p className="text-xl md:text-2xl font-bold text-foreground">
                {warningCount}
              </p>
              <p className="text-[10px] md:text-xs text-muted-foreground">Warning Zone</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-3 md:p-4 border-l-4 border-destructive">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="p-1.5 md:p-2 bg-destructive/10 rounded-lg">
              <XCircle className="w-4 h-4 md:w-5 md:h-5 text-destructive" />
            </div>
            <div>
              <p className="text-xl md:text-2xl font-bold text-foreground">
                {riskCount}
              </p>
              <p className="text-[10px] md:text-xs text-muted-foreground">At Risk</p>
            </div>
          </div>
        </div>
      </div>

      {/* Global Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-8 md:mb-10">
        {/* Main Stat - Accent Card */}
        <div className="stat-card-accent relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 md:w-32 md:h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-3 h-3 md:w-4 md:h-4 opacity-70" />
              <p className="text-xs md:text-sm font-medium opacity-80">Total Attendance</p>
            </div>
            <div className="flex items-baseline gap-2">
               <span className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">
                {typeof presentPercent === 'number' ? presentPercent.toFixed(1) : presentPercent}%
              </span>
              <span className="text-xs md:text-sm opacity-60">average</span>
            </div>
            {/* Progress bar */}
            <div className="mt-3 md:mt-4 h-1 md:h-1.5 bg-white/20 rounded-full overflow-hidden">
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
            <BookOpen className="w-3 h-3 md:w-4 md:h-4 text-muted-foreground" />
            <p className="text-xs md:text-sm font-medium text-muted-foreground">Total Classes</p>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-foreground">{totalLoad}</p>
          <p className="text-[10px] md:text-xs text-muted-foreground mt-1">scheduled this semester</p>
        </div>

        {/* Derived Global Stats */}
        <div className="stat-card">
          <div className="flex items-center gap-2 mb-2">
            <XCircle className="w-3 h-3 md:w-4 md:h-4 text-muted-foreground" />
            <p className="text-xs md:text-sm font-medium text-muted-foreground">Missed Classes</p>
          </div>
          <p className={`text-2xl sm:text-3xl font-bold ${absentCount > 0 ? 'text-destructive' : 'text-foreground'}`}>
            {absentCount}
          </p>
          <p className="text-[10px] md:text-xs text-muted-foreground mt-1">
            {remainingAllowed >= 0
              ? `${remainingAllowed} more allowed`
              : `${Math.abs(remainingAllowed)} over limit`}
          </p>
        </div>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          {subjects.map((item) => {
            const isTarget = updatingSubjectId === item.subject._id;
            const shouldGlaze = isTarget && (isValidating || !hasValidatedRef.current);

            if (shouldGlaze) {
              // Glaze only the inner data areas, keep card structure identical
              return (
                <div
                  key={item.subject._id}
                  className="card p-5 relative overflow-hidden group transition-transform animate-pulse"
                >
                  <div
                    className="absolute top-0 left-0 w-1 h-full"
                    style={{ backgroundColor: item.subject.color }}
                  />

                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="h-5 w-32 bg-muted rounded mb-2" />
                      <div className="h-3 w-20 bg-muted rounded" />
                    </div>
                    <div className="w-12 h-12 rounded-full bg-muted" />
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <div className="h-3 w-16 bg-muted rounded mb-2" />
                      <div className="h-4 w-20 bg-muted rounded mb-1" />
                      <div className="h-3 w-24 bg-muted rounded" />
                    </div>
                    <div>
                      <div className="h-3 w-24 bg-muted rounded mb-2" />
                      <div className="h-4 w-10 bg-muted rounded" />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-border flex justify-between items-center">
                    <div className="h-5 w-20 bg-muted rounded-full" />
                    <div className="h-4 w-16 bg-muted rounded" />
                  </div>
                </div>
              );
            }

            return (
              <SubjectCard
                key={item.subject._id}
                subject={item.subject}
                stats={item.stats}
                threshold={threshold}
              />
            );
          })}
        </div>
      )}

      <ExtraClassModal
        isOpen={extraModalOpen}
        subjects={subjectOptions}
        submitting={extraSubmitting}
        error={extraError}
        onClose={closeExtraModal}
        onSubmit={handleExtraClassSubmit}
      />
    </div>
  );
};

export default DashboardPage;

