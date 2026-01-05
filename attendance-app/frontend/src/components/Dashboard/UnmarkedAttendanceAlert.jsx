import { useState, useEffect } from 'react';
import { attendanceApi } from '../../services/api';
import { Info, ListChecks, CheckCircle2, XCircle } from 'lucide-react';
import dayjs from 'dayjs';
import ReviewAttendanceModal from './ReviewAttendanceModal';
import { useToast } from '../../context/ToastContext';
import clsx from 'clsx';
import api from '../../services/api';
import { useRefreshData } from '../../hooks/useAttendanceData';

const UnmarkedAttendanceAlert = () => {
    const [pending, setPending] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [localSelections, setLocalSelections] = useState({}); // track present/absent
    const [saving, setSaving] = useState(false);
    const toast = useToast();
    const refreshData = useRefreshData();

    const fetchPending = async () => {
        try {
            const res = await attendanceApi.getPending();
            setPending(res.data);
            // Initialize all as present (default)
            const initialSelections = {};
            res.data.forEach(p => {
                initialSelections[p._id] = true; // true = present
            });
            setLocalSelections(initialSelections);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPending();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const toggle = (id) => {
        setLocalSelections(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    const handleSaveAll = async () => {
        setSaving(true);
        try {
            const entries = pending.map(p => ({
                occurrenceId: p._id,
                present: localSelections[p._id],
                isAutoMarked: false // Clear auto-mark flag so dashboard counts these
            }));
            await api.post('/attendance/bulk', { entries });
            toast.success("Attendance saved successfully");
            setPending([]);
            await refreshData();
        } catch (err) {
            toast.error('Failed to save attendance');
        } finally {
            setSaving(false);
        }
    };

    if (loading || pending.length === 0) return null;

    // Group by date
    const groupedByDate = pending.reduce((acc, p) => {
        const dateKey = dayjs(p.date).format('YYYY-MM-DD');
        if (!acc[dateKey]) acc[dateKey] = [];
        acc[dateKey].push(p);
        return acc;
    }, {});

    const sortedDates = Object.keys(groupedByDate).sort();
    const presentCount = Object.values(localSelections).filter(Boolean).length;
    const absentCount = pending.length - presentCount;

    return (
        <>
            <div className="bg-accent/10 border border-accent/30 rounded-2xl p-4 mb-6 animate-in">
                <div className="flex items-start gap-3 mb-4">
                    <div className="p-2 bg-accent/20 text-accent rounded-xl shrink-0">
                        <Info className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-semibold text-foreground">Auto-Marked Attendance</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                            You didn't mark attendance for <b className="text-foreground">{pending.length} classes</b>.
                            They are marked as <span className="font-medium text-accent">Present</span> by default. Review and adjust below.
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                            {presentCount} present • {absentCount} absent
                        </p>
                    </div>
                </div>

                {/* Classes grouped by date */}
                <div className="space-y-4 mb-4 max-h-[50vh] overflow-y-auto pr-2">
                    {sortedDates.map(dateKey => {
                        const items = groupedByDate[dateKey];
                        return (
                            <div key={dateKey}>
                                <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 px-2">
                                    {dayjs(dateKey).format('dddd, MMM D')}
                                </div>
                                <div className="space-y-2">
                                    {items.map(p => {
                                        const isPresent = localSelections[p._id];
                                        return (
                                            <div
                                                key={p._id}
                                                onClick={() => toggle(p._id)}
                                                className={clsx(
                                                    "flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all",
                                                    isPresent
                                                        ? "bg-accent/10 border-accent/30"
                                                        : "bg-destructive/10 border-destructive/30"
                                                )}
                                            >
                                                <div>
                                                    <div className="font-semibold text-sm text-foreground">
                                                        {p.subjectId.name} <span className="text-muted-foreground text-xs font-normal">({p.sessionType})</span>
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">{p.startHour}:00</div>
                                                </div>
                                                <div className={clsx(
                                                    "w-7 h-7 rounded-full flex items-center justify-center transition-all",
                                                    isPresent
                                                        ? "bg-accent text-accent-foreground"
                                                        : "bg-destructive text-destructive-foreground"
                                                )}>
                                                    {isPresent ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={handleSaveAll}
                        disabled={saving}
                        className="btn-accent flex-1 flex items-center justify-center"
                    >
                        {saving ? 'Saving...' : 'Save Attendance'}
                    </button>
                    <button
                        onClick={() => setShowModal(true)}
                        className="btn-secondary flex items-center justify-center"
                    >
                        <ListChecks className="w-4 h-4 mr-2" /> Full View
                    </button>
                </div>
            </div>

            {showModal && (
                <ReviewAttendanceModal
                    pending={pending}
                    onClose={() => setShowModal(false)}
                    onRefresh={fetchPending}
                />
            )}
        </>
    );
};

export default UnmarkedAttendanceAlert;

