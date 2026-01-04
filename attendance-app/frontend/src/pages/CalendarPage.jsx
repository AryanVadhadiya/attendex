import { useState } from 'react';
import { useSWRConfig } from 'swr';
import { useHolidays, useUserProfile, useRefreshData } from '../hooks/useAttendanceData';
import { api } from '../services/api';
import { Loader2, Plus, Trash2, Calendar, Lock, CalendarDays } from 'lucide-react';
import dayjs from 'dayjs';
import { useToast } from '../context/ToastContext';

const CalendarPage = () => {
    const { holidays = [], loading: holidaysLoading, mutate } = useHolidays();
    const { user, loading: userLoading } = useUserProfile();
    const { mutate: globalMutate } = useSWRConfig();
    const { toast } = useToast();
    const refreshData = useRefreshData();

    // Derived state
    const isLocked = user?.isTimetableLocked || false;
    const isLoading = holidaysLoading || userLoading;

    // Show form state
    const [showForm, setShowForm] = useState(false);

    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [reason, setReason] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await api.post('/holidays', { startDate, endDate: endDate || startDate, reason });
            setShowForm(false);
            setStartDate('');
            setEndDate('');
            setReason('');
            mutate(); // Refresh holidays list
            globalMutate('/stats/dashboard?threshold=75'); // Dashboard might change if holiday is today
            toast.success("Holiday added successfully");
            refreshData();
        } catch (err) {
            toast.error('Failed to add holiday');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Remove this holiday? Occurrences during this period will be restored.')) return;
        try {
            await api.delete(`/holidays/${id}`);
            mutate(); // Refresh list
            globalMutate('/stats/dashboard?threshold=75');
            toast.success("Holiday removed");
            refreshData();
        } catch (err) {
            toast.error('Failed to delete');
        }
    };

    // Only show full page loader if we have NO holiday data and are fetching it
    // If we have cached holidays, show them immediately while refreshing
    if (holidaysLoading && (!holidays || holidays.length === 0)) {
        return (
            <div className="flex h-64 items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto animate-in">
            <header className="flex justify-between items-center mb-8">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-accent/10 text-accent rounded-xl">
                            <CalendarDays className="w-5 h-5" />
                        </div>
                        <h1 className="text-2xl font-bold text-foreground">Calendar & Holidays</h1>
                    </div>
                    <p className="text-muted-foreground">Manage academic calendar and exceptions</p>
                </div>
                {isLocked ? (
                    <div className="badge-warning flex items-center gap-2 px-4 py-2">
                        <Lock className="w-4 h-4" /> Configuration Locked
                    </div>
                ) : (
                    <button
                        onClick={() => setShowForm(!showForm)}
                        className={showForm ? 'btn-secondary' : 'btn-primary flex items-center'}
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        {showForm ? 'Cancel' : 'Add Holiday'}
                    </button>
                )}
            </header>

            {showForm && (
                <div className="card p-6 mb-8 animate-in">
                    <h3 className="font-semibold text-foreground mb-4">Add Holiday / Vacation</h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1">Start Date</label>
                                <input
                                    type="date"
                                    required
                                    value={startDate}
                                    onChange={e => setStartDate(e.target.value)}
                                    className="input"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1">End Date (Optional)</label>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={e => setEndDate(e.target.value)}
                                    className="input"
                                />
                                <p className="text-xs text-muted-foreground mt-1">Leave empty for single day</p>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1">Reason</label>
                            <input
                                type="text"
                                value={reason}
                                onChange={e => setReason(e.target.value)}
                                placeholder="e.g. Winter Break"
                                className="input"
                            />
                        </div>
                        <div className="flex justify-end">
                            <button disabled={submitting} className="btn-accent">
                                {submitting ? 'Saving...' : 'Save Holiday'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="card overflow-hidden">
                <div className="p-4 border-b border-border bg-muted flex items-center text-sm font-medium text-muted-foreground">
                    <Calendar className="w-4 h-4 mr-2" /> Upcoming Holidays ({holidays.length})
                </div>
                {holidays.length === 0 ? (
                    <div className="p-12 text-center">
                        <CalendarDays className="w-12 h-12 mx-auto text-muted-foreground/40 mb-4" />
                        <p className="text-muted-foreground">No holidays recorded.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-border">
                        {holidays.map(h => (
                            <div key={h._id} className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                                <div>
                                    <h4 className="font-medium text-foreground">{h.reason || 'No description'}</h4>
                                    <p className="text-sm text-muted-foreground">
                                        {dayjs(h.startDate).format('MMM D, YYYY')}
                                        {h.endDate && h.endDate !== h.startDate && ` - ${dayjs(h.endDate).format('MMM D, YYYY')}`}
                                    </p>
                                </div>
                                {!isLocked && (
                                    <button
                                        onClick={() => handleDelete(h._id)}
                                        className="btn-ghost text-muted-foreground hover:text-destructive p-2"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default CalendarPage;

