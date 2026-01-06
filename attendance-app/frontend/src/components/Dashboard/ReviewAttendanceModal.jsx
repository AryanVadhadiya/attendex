import { useState } from 'react';
import { X, XCircle, Save, Loader2 } from 'lucide-react';
import api from '../../services/api';
import dayjs from 'dayjs';
import clsx from 'clsx';
import { useToast } from '../../context/ToastContext';
import { useRefreshData } from '../../hooks/useAttendanceData';

const ReviewAttendanceModal = ({ pending, onClose, onRefresh }) => {
    // Store IDs of classes marked ABSENT (everything else is present by default)
    const [absentIds, setAbsentIds] = useState(new Set());
    const [submitting, setSubmitting] = useState(false);
    const toast = useToast();
    const refreshData = useRefreshData();

    const toggleAbsent = (id) => {
        setAbsentIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id); // Was absent, now present
            } else {
                newSet.add(id); // Was present, now absent
            }
            return newSet;
        });
    };

    const handleSave = async () => {
        setSubmitting(true);
        try {
            // Build entries for ALL pending items
            const entries = pending.map(p => ({
                occurrenceId: p._id,
                present: !absentIds.has(p._id), // If NOT in absentIds, it's present
                isAutoMarked: false // Clear the auto-mark flag
            }));

            await api.post('/attendance/bulk', { entries });

            toast.success("Attendance updated successfully");
            onRefresh();
            onClose();
            refreshData();
        } catch (err) {
            if (err.response && err.response.status === 403) {
                toast.error("Cannot update: Configuration is Locked. Unlock to edit past records.", 5000);
            } else {
                toast.error("Failed to save changes.");
            }
        } finally {
            setSubmitting(false);
        }
    };

    // Group pending by date
    const groupedByDate = pending.reduce((acc, p) => {
        const dateKey = dayjs(p.date).format('YYYY-MM-DD');
        if (!acc[dateKey]) acc[dateKey] = [];
        acc[dateKey].push(p);
        return acc;
    }, {});

    const sortedDates = Object.keys(groupedByDate).sort();

    const presentCount = pending.length - absentIds.size;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in">
            <div className="card w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-4 border-b border-border flex justify-between items-center bg-muted">
                    <div>
                        <h2 className="font-bold text-lg text-foreground">Review Auto-Marked Attendance</h2>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            {presentCount} present • {absentIds.size} absent
                        </p>
                    </div>
                    <button onClick={onClose} className="btn-ghost p-2 rounded-full">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-4 overflow-y-auto flex-1 space-y-4 max-h-[60vh]">
                    <p className="text-sm text-muted-foreground mb-2 bg-accent/10 border border-accent/20 rounded-lg p-2">
                        All classes below are marked as <span className="text-accent font-medium">Present</span> by default.
                        Tap any to mark as <span className="text-destructive font-medium">Absent</span>.
                    </p>

                    {sortedDates.map(dateKey => {
                        const items = groupedByDate[dateKey];
                        return (
                            <div key={dateKey}>
                                {/* Date Header */}
                                <div className="sticky top-0 bg-muted/95 backdrop-blur-sm -mx-4 px-4 py-2 mb-2 border-y border-border z-10">
                                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                        {dayjs(dateKey).format('dddd, MMMM D, YYYY')}
                                    </p>
                                </div>

                                {/* Classes for this date */}
                                <div className="space-y-2">
                                    {items.map(p => {
                                        const isAbsent = absentIds.has(p._id);
                                        return (
                                            <div
                                                key={p._id}
                                                onClick={() => toggleAbsent(p._id)}
                                                className={clsx(
                                                    "flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all",
                                                    isAbsent
                                                        ? "bg-destructive/10 border-destructive/30"
                                                        : "bg-accent/10 border-accent/30"
                                                )}
                                            >
                                                <div>
                                                    <div className="font-semibold text-foreground">
                                                        {p.subjectId.name} <span className="text-muted-foreground text-xs font-normal">({p.sessionType})</span>
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">{p.startHour}:00 - {p.startHour + (p.durationHours || 1)}:00</div>
                                                </div>
                                                <div className={clsx(
                                                    "w-8 h-8 rounded-full flex items-center justify-center transition-all",
                                                    isAbsent
                                                        ? "bg-destructive text-destructive-foreground shadow-md"
                                                        : "bg-accent text-accent-foreground shadow-md"
                                                )}>
                                                    {isAbsent ? <XCircle className="w-5 h-5" /> : <span className="text-sm font-bold">✓</span>}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="p-4 border-t border-border bg-card">
                    <button
                        onClick={handleSave}
                        disabled={submitting}
                        className="btn-accent w-full py-3 flex items-center justify-center"
                    >
                        {submitting ? <Loader2 className="animate-spin" /> : <><Save className="w-5 h-5 mr-2" /> Save Attendance</>}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ReviewAttendanceModal;

