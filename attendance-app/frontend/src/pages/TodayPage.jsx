import { useState, useEffect } from 'react';
import { useSWRConfig } from 'swr';
import api from '../services/api';
import { useAttendanceByDate } from '../hooks/useAttendanceData';
import dayjs from 'dayjs';
import { Loader2, CheckCircle2, XCircle, Calendar as CalendarIcon, Save, Sparkles } from 'lucide-react';
import clsx from 'clsx';
import { Link } from 'react-router-dom';

const TodayPage = () => {
  const [date, setDate] = useState(dayjs().format('YYYY-MM-DD'));

  // SWR Hook
  const { occurrences, loading: loadingSessions, mutate } = useAttendanceByDate(date);
  const { mutate: globalMutate } = useSWRConfig();

  const [sessions, setSessions] = useState(occurrences || []);
  const [submitting, setSubmitting] = useState(false);

  // Sync server data to local
  useEffect(() => {
    if (occurrences) {
      setSessions(occurrences);
    }
  }, [occurrences]);

  const loading = loadingSessions && sessions.length === 0;

  // Removed manual fetchSessions function

  const shiftDate = (days) => {
    const newDate = dayjs(date).add(days, 'day').format('YYYY-MM-DD');
    setDate(newDate);
  };

  const setToday = () => {
    setDate(dayjs().format('YYYY-MM-DD'));
  };

  const toggleSession = (occurrenceId) => {
    setSessions(prev => prev.map(s => {
      if (s.occurrence._id === occurrenceId) {
        return { ...s, status: { ...s.status, present: !s.status.present } };
      }
      return s;
    }));
  };

  const markAll = (present) => {
    setSessions(prev => prev.map(s => ({
      ...s,
      status: { ...s.status, present }
    })));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    const entries = sessions.map(s => ({
      occurrenceId: s.occurrence._id,
      present: s.status.present
    }));

    try {
      await api.post('/attendance/bulk', { entries });
      alert("Attendance Saved!");
      mutate();
      globalMutate('/stats/dashboard?threshold=75'); // Invalidate Dashboard Stats
    } catch (err) {
      alert("Failed to save");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && sessions.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const allPresent = sessions.length > 0 && sessions.every(s => s.status.present);
  const allAbsent = sessions.length > 0 && sessions.every(s => !s.status.present);
  const presentCount = sessions.filter(s => s.status.present).length;

  return (
    <div className="max-w-2xl mx-auto animate-in">
      <header className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-accent/10 text-accent rounded-xl">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Mark Attendance</h1>
              <p className="text-sm text-muted-foreground">{dayjs(date).format('dddd, MMMM D, YYYY')}</p>
            </div>
          </div>

          <div className="flex items-center bg-card border border-border rounded-2xl p-1 gap-1">
            <button
              onClick={() => shiftDate(-1)}
              className="px-3 py-1.5 hover:bg-muted text-foreground rounded-xl transition-colors text-xs font-bold"
            >
              Prev
            </button>
            <button
              onClick={setToday}
              className={clsx(
                "px-4 py-1.5 rounded-xl text-xs font-bold transition-all",
                date === dayjs().format('YYYY-MM-DD')
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "hover:bg-muted text-muted-foreground"
              )}
            >
              Today
            </button>
            <button
              onClick={() => shiftDate(1)}
              className="px-3 py-1.5 hover:bg-muted text-foreground rounded-xl transition-colors text-xs font-bold"
            >
              Next
            </button>
            <div className="w-px h-4 bg-border mx-1" />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-transparent text-xs font-bold text-foreground px-2 outline-none cursor-pointer"
            />
          </div>
        </div>
      </header>

      {sessions.length === 0 ? (
        <div className="text-center py-16 card border-dashed">
          <Sparkles className="w-12 h-12 mx-auto text-muted-foreground/40 mb-4" />
          <p className="text-muted-foreground mb-2">No classes scheduled for today.</p>
          <Link to="/timetable" className="text-sm text-accent hover:underline">Check Timetable</Link>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="flex items-center justify-between p-4 card">
            <div>
              <p className="text-sm text-muted-foreground">Today's Progress</p>
              <p className="text-lg font-semibold text-foreground">{presentCount} / {sessions.length} marked present</p>
            </div>
            <div className="text-3xl font-bold text-accent">
              {sessions.length > 0 ? Math.round((presentCount / sessions.length) * 100) : 0}%
            </div>
          </div>

          {/* Controls */}
          <div className="flex gap-3">
            <button
              onClick={() => markAll(true)}
              className={clsx("flex-1 py-2.5 rounded-xl text-sm font-medium transition-all",
                allPresent
                  ? "bg-accent text-accent-foreground shadow-md"
                  : "btn-secondary"
              )}
            >
              Mark All Present
            </button>
            <button
              onClick={() => markAll(false)}
              className={clsx("flex-1 py-2.5 rounded-xl text-sm font-medium transition-all",
                allAbsent
                  ? "bg-destructive text-destructive-foreground shadow-md"
                  : "btn-secondary"
              )}
            >
              Mark All Absent
            </button>
          </div>

          {/* List */}
          <div className="space-y-3">
            {sessions.map(({ occurrence, status }) => {
              const isPresent = status.present;
              return (
                <div
                  key={occurrence._id}
                  onClick={() => toggleSession(occurrence._id)}
                  className={clsx(
                    "group flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all",
                    isPresent
                      ? "bg-accent/5 border-accent/30 shadow-sm"
                      : "bg-card border-border hover:border-muted-foreground/30"
                  )}
                >
                  <div className="flex items-center">
                    <div
                      className={clsx("w-10 h-10 rounded-full flex items-center justify-center mr-4 transition-colors",
                        isPresent ? "bg-accent/20 text-accent" : "bg-muted text-muted-foreground"
                      )}
                    >
                      {isPresent ? <CheckCircle2 className="w-6 h-6" /> : <XCircle className="w-6 h-6" />}
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{occurrence.subjectId.name}</h3>
                      <p className="text-xs text-muted-foreground uppercase flex items-center gap-2">
                        <span className="badge">{occurrence.sessionType}</span>
                        <span>{occurrence.startHour}:00 - {occurrence.startHour + occurrence.durationHours}:00</span>
                      </p>
                    </div>
                  </div>

                  {occurrence.isExcluded && (
                    <span className="badge-warning">Holiday</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Submit */}
          <div className="sticky bottom-6 pt-4">
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="btn-accent w-full py-3.5 text-base flex items-center justify-center"
            >
              {submitting ? <Loader2 className="animate-spin" /> : <><Save className="w-5 h-5 mr-2" /> Save Attendance</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TodayPage;

