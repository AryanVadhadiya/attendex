import { useState, useEffect } from 'react';
import { attendanceApi } from '../../services/api';
import { AlertCircle, Check, ListChecks } from 'lucide-react';
import dayjs from 'dayjs';
import ReviewAttendanceModal from './ReviewAttendanceModal';
import { useToast } from '../../context/ToastContext';

const UnmarkedAttendanceAlert = () => {
    const [pending, setPending] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const toast = useToast();

    const fetchPending = async () => {
        try {
            const res = await attendanceApi.getPending();
            setPending(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Fire once on mount; relies on backend-side caching and optimized queries
        fetchPending();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleAcknowledgeAll = async () => {
        try {
            await attendanceApi.acknowledge('all');
            setPending([]);
            toast.success("Acknowledged all missed classes");
        } catch (err) {
            toast.error('Failed to acknowledge');
        }
    };

    if (loading || pending.length === 0) return null;

    const dates = [...new Set(pending.map(p => dayjs(p.date).format('MMM D')))];
    const dateText = dates.slice(0, 3).join(', ') + (dates.length > 3 ? ` +${dates.length - 3} more` : '');

    return (
        <>
            <div className="bg-destructive/10 border border-destructive/20 rounded-2xl p-4 mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-in">
                <div className="flex items-start gap-3">
                    <div className="p-2 bg-destructive/20 text-destructive rounded-xl shrink-0">
                        <AlertCircle className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-foreground">Missed Attendance Detected</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                            You forgot to mark attendance for <b className="text-foreground">{pending.length} classes</b> on {dateText}.
                            They have been marked as <span className="font-medium text-destructive">Absent</span> by default.
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <button
                        onClick={() => setShowModal(true)}
                        className="btn-secondary flex-1 md:flex-none flex items-center justify-center"
                    >
                        <ListChecks className="w-4 h-4 mr-2" /> Review
                    </button>
                    <button
                        onClick={handleAcknowledgeAll}
                        className="btn-primary flex-1 md:flex-none flex items-center justify-center bg-destructive hover:bg-destructive/90"
                    >
                        <Check className="w-4 h-4 mr-2" /> OK
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

