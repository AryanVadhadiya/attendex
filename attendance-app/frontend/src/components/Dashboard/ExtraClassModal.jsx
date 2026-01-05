import { useEffect, useState, useMemo } from 'react';
import dayjs from 'dayjs';
import { X, CalendarDays, PlusCircle } from 'lucide-react';
import clsx from 'clsx';

const defaultForm = (subjects) => ({
  subjectId: subjects?.[0]?._id || '',
  date: dayjs().format('YYYY-MM-DD'),
  sessionType: 'lecture',
  present: true
});

const ExtraClassModal = ({ isOpen, subjects = [], submitting, error, onClose, onSubmit }) => {
  const [form, setForm] = useState(() => defaultForm(subjects));

  useEffect(() => {
    if (isOpen) {
      setForm(defaultForm(subjects));
    }
  }, [isOpen, subjects]);

  const subjectOptions = useMemo(() => subjects.filter(Boolean), [subjects]);
  const disabled = !form.subjectId || !form.date || submitting || subjectOptions.length === 0;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (disabled) return;
    onSubmit?.(form);
  };

  const updateField = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="w-full max-w-md bg-card border border-border rounded-3xl shadow-2xl p-6 relative animate-in">
        <button
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
          onClick={onClose}
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-2xl bg-accent/10 text-accent">
            <PlusCircle className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Add Extra Class</h2>
            <p className="text-sm text-muted-foreground">Log ad-hoc lectures or labs and mark attendance instantly.</p>
          </div>
        </div>

        {subjectOptions.length === 0 ? (
          <div className="text-sm text-muted-foreground bg-muted/40 border border-dashed border-border rounded-2xl p-4 text-center">
            Add a subject first to record extra classes.
          </div>
        ) : (
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="text-xs uppercase tracking-wide font-semibold text-muted-foreground block mb-2">Subject</label>
              <select
                value={form.subjectId}
                onChange={(e) => updateField('subjectId', e.target.value)}
                className="input w-full text-sm"
              >
                {subjectOptions.map((sub) => (
                  <option key={sub._id} value={sub._id}>
                    {sub.name} {sub.code ? `(${sub.code})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs uppercase tracking-wide font-semibold text-muted-foreground block mb-2">Date</label>
              <div className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-muted-foreground" />
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => updateField('date', e.target.value)}
                  className="input text-sm"
                />
              </div>
            </div>

            <div>
              <label className="text-xs uppercase tracking-wide font-semibold text-muted-foreground block mb-2">Session Type</label>
              <div className="grid grid-cols-2 gap-2">
                {['lecture', 'lab'].map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => updateField('sessionType', type)}
                    className={clsx(
                      'py-2 rounded-2xl border text-sm font-semibold transition-colors',
                      form.sessionType === type
                        ? 'bg-accent text-accent-foreground border-accent'
                        : 'bg-muted border-border text-muted-foreground hover:bg-muted/80'
                    )}
                  >
                    {type === 'lecture' ? 'Lecture' : 'Lab'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs uppercase tracking-wide font-semibold text-muted-foreground block mb-2">Mark As</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Present', value: true },
                  { label: 'Absent', value: false }
                ].map(option => (
                  <button
                    key={option.label}
                    type="button"
                    onClick={() => updateField('present', option.value)}
                    className={clsx(
                      'py-2 rounded-2xl border text-sm font-semibold transition-colors',
                      form.present === option.value
                        ? option.value
                          ? 'bg-emerald-500 text-white border-emerald-500'
                          : 'bg-destructive text-white border-destructive'
                        : 'bg-muted border-border text-muted-foreground hover:bg-muted/80'
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-2xl p-3">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={disabled}
              className={clsx(
                'w-full py-3 rounded-2xl text-sm font-semibold shadow-lg shadow-accent/20 transition',
                disabled ? 'bg-muted text-muted-foreground cursor-not-allowed' : 'bg-accent text-accent-foreground hover:bg-accent/90'
              )}
            >
              {submitting ? 'Saving...' : 'Save Extra Class'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ExtraClassModal;
