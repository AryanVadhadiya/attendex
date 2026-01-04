import { useState } from 'react';
import { X, CheckCircle2, Save, Loader2 } from 'lucide-react';
import api, { attendanceApi } from '../../services/api';
import dayjs from 'dayjs';
import clsx from 'clsx';
import { useToast } from '../../context/ToastContext';
import { useRefreshData } from '../../hooks/useAttendanceData';

const ReviewAttendanceModal = ({ pending, onClose, onRefresh }) => {
    const [selections, setSelections] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const toast = useToast();
    const refreshData = useRefreshData();

    const toggle = (id) => {
        setSelections(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    const handleSave = async () => {
        setSubmitting(true);
        try {
            const presentIds = Object.keys(selections).filter(id => selections[id]);
            const absentIds = pending.map(p => p._id).filter(id => !selections[id]);

            if (presentIds.length > 0) {
                const entries = presentIds.map(id => ({ occurrenceId: id, present: true }));
                await api.post('/attendance/bulk', { entries });
            }

            if (absentIds.length > 0) {
                await attendanceApi.acknowledge(absentIds);
            }

            onRefresh();
            onClose();
            refreshData();
        } catch (err) {
            if (err.response && err.response.status === 403) {
                toast.error("Cannot mark Present: Configuration is Locked. Unlock to edit past records.", 5000);
            } else {
                toast.error("Failed to save changes.");
            }
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in">
            <div className="card w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-4 border-b border-border flex justify-between items-center bg-muted">
                    <h2 className="font-bold text-lg text-foreground">Review Missed Attendance</h2>
                    <button onClick={onClose} className="btn-ghost p-2 rounded-full">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-4 overflow-y-auto flex-1 space-y-3">
                    <p className="text-sm text-muted-foreground mb-2">
                        Tap to mark as <span className="text-accent font-medium">Present</span>.
                        Leave untapped for <span className="text-destructive font-medium">Absent</span>.
                    </p>

                    {pending.map(p => {
                        const isPresent = !!selections[p._id];
                        return (
                            <div
                                key={p._id}
                                onClick={() => toggle(p._id)}
                                className={clsx(
                                    "flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all",
                                    isPresent ? "bg-accent/10 border-accent/30" : "bg-card border-border hover:border-muted-foreground/30"
                                )}
                            >
                                <div>
                                    <div className="font-semibold text-foreground">
                                        {p.subjectId.name} <span className="text-muted-foreground text-xs font-normal">({p.sessionType})</span>
                                    </div>
                                    <div className="text-xs text-muted-foreground">{dayjs(p.date).format('ddd, MMM D')} • {p.startHour}:00</div>
                                </div>
                                <div className={clsx(
                                    "w-8 h-8 rounded-full flex items-center justify-center transition-all",
                                    isPresent ? "bg-accent text-accent-foreground shadow-md" : "bg-muted text-muted-foreground"
                                )}>
                                    <CheckCircle2 className="w-5 h-5" />
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
                        {submitting ? <Loader2 className="animate-spin" /> : <><Save className="w-5 h-5 mr-2" /> Save Changes</>}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ReviewAttendanceModal;

