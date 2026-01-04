import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import api, { statsApi } from '../services/api';
import { Loader2, ArrowLeft, CheckCircle2, XCircle, Edit3, Save, X, Info } from 'lucide-react';
import clsx from 'clsx';
import dayjs from 'dayjs';
import ProgressRing from '../components/Dashboard/ProgressRing';
import { useToast } from '../context/ToastContext';
import { useRefreshData } from '../hooks/useAttendanceData';

const SubjectDetailPage = () => {
    const { id } = useParams();
    const [stats, setStats] = useState(null);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editMode, setEditMode] = useState(false);
    const [editedRecords, setEditedRecords] = useState({});
    const [saving, setSaving] = useState(false);
    const [threshold, setThreshold] = useState(80); // Default 80%
    const toast = useToast();
    const refreshData = useRefreshData();

    const fetchData = useCallback(async () => {
        try {
            // Fetch stats (initial/base)
            // We request with a default threshold (e.g. 75) but we will override calculations locally
            const statsRes = await statsApi.get({
                subjectId: id,
                threshold: 75
            });
            setStats(statsRes.data);

            // Fetch history
            const historyRes = await api.get(`/attendance/subject/${id}/history`);
            setHistory(historyRes.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleThresholdChange = (val) => {
        setThreshold(val);
        // Instant update, no network call
    };

    const toggleEdit = () => {
        if (editMode) setEditedRecords({});
        setEditMode(!editMode);
    };

    const toggleAttendance = (occurrenceId, currentStatus) => {
        setEditedRecords(prev => ({
            ...prev,
            [occurrenceId]: !currentStatus
        }));
    };

    const saveChanges = async () => {
        setSaving(true);
        try {
            const entries = Object.entries(editedRecords).map(([occurrenceId, present]) => ({
                occurrenceId,
                present
            }));
            await api.post('/attendance/bulk', { entries });
            await fetchData();
            setEditedRecords({});
            setEditMode(false);
            toast.success("Attendance updated successfully");
            refreshData();
        } catch (err) {
            toast.error('Failed to save changes');
        } finally {
            setSaving(false);
        }
    };

    if (loading && !stats) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    const subject = history[0]?.subject || {};

    // Dynamic Client-Side Calculation
    const totalLoad = stats?.totalLoad || 0;
    const currentLoad = stats?.currentLoad || 0;
    const presentCount = stats?.presentCount || 0;
    const absentCount = stats?.absentCount || 0;

    // Calculate requirements based on current selected threshold
    const requiredClasses = Math.ceil(totalLoad * (threshold / 100));
    const semesterBudget = totalLoad - requiredClasses;

    // Remaining Bunks (Safe Bunks Left)
    const remainingAllowed = semesterBudget - absentCount;

    // Bunk Usage %
    const bunkUsagePercent = semesterBudget > 0
        ? Math.min(100, Math.max(0, (absentCount / semesterBudget) * 100))
        : (absentCount > 0 ? 100 : 0);

    return (
        <div className="max-w-5xl mx-auto pb-20">
            {/* Header */}
            <div className="mb-8">
                <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-foreground flex items-center mb-4 transition-colors">
                    <ArrowLeft className="w-4 h-4 mr-1" /> Back to Dashboard
                </Link>

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="w-2 h-16 rounded-full" style={{ backgroundColor: subject.color }} />
                        <div>
                            <h1 className="text-3xl font-bold text-foreground">{subject.name}</h1>
                            <p className="text-muted-foreground mt-1 font-mono uppercase tracking-widest text-xs">{subject.code || 'NO CODE'}</p>
                        </div>
                    </div>

                    {/* Threshold Selectors */}
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
                </div>
            </div>

            {/* Main Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {/* Current Status Ring */}
                <div className="glass-card p-6 flex flex-col items-center justify-center text-center">
                    <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-4">Current Status</h3>
                    <div className="relative">
                        <ProgressRing
                            percentage={stats?.presentPercent || 0}
                            size={120}
                            strokeWidth={10}
                            hideText={true}
                        />
                        <div className="absolute inset-0 flex items-center justify-center flex-col">
                           <span className="text-2xl font-bold text-foreground">{presentCount}</span>
                           <div className="h-px w-8 bg-border my-1" />
                           <span className="text-xs text-muted-foreground">{currentLoad}</span>
                        </div>
                    </div>
                    <div className="mt-4">
                        <p className="text-3xl font-bold text-foreground">
                            {typeof stats?.presentPercent === 'number' ? stats.presentPercent.toFixed(1) : stats?.presentPercent}%
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">Present till today</p>
                    </div>
                </div>

                {/* Bunk Consumption Ring */}
                <div className="glass-card p-6 flex flex-col items-center justify-center text-center">
                    <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-4 text-destructive">Bunk Usage</h3>
                    <div className="relative">
                        <ProgressRing
                            percentage={bunkUsagePercent}
                            size={120}
                            strokeWidth={10}
                            hideText={true}
                        />
                        <div className="absolute inset-0 flex items-center justify-center flex-col">
                           <span className="text-2xl font-bold text-foreground">{absentCount}</span>
                           <div className="h-px w-8 bg-border my-1" />
                           <span className="text-xs text-muted-foreground">{semesterBudget}</span>
                        </div>
                    </div>
                    <div className="mt-4">
                        <p className="text-3xl font-bold text-foreground">{bunkUsagePercent.toFixed(1)}%</p>
                        <p className="text-xs text-muted-foreground mt-1">Budget Consumed</p>
                    </div>
                </div>

                {/* Quick Stats Column */}
                <div className="grid grid-rows-2 gap-4">
                   <div className="glass-card p-6 flex flex-col justify-center">
                        <div className="flex justify-between items-start mb-2">
                             <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Safe Bunks Left</p>
                             <span className="text-xs font-bold text-muted-foreground bg-muted px-2 py-1 rounded-lg">
                                {absentCount}/{semesterBudget} USED
                             </span>
                        </div>
                        <div className="flex items-end gap-2">
                             <span className={clsx(
                                 "text-4xl font-bold",
                                 remainingAllowed < 0 ? "text-destructive" : "text-accent"
                             )}>
                                 {remainingAllowed}
                             </span>
                             <span className="text-sm text-muted-foreground mb-1.5">classes</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1">
                            <Info className="w-3 h-3" /> Based on {threshold}% attendance criteria.
                        </p>
                   </div>
                   <div className="glass-card p-6 border-l-4 border-l-primary flex flex-col justify-center">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 text-primary">Class Summary</p>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground">Total Classes</span>
                            <span className="font-bold text-foreground">{currentLoad} / {totalLoad}</span>
                        </div>
                   </div>
                </div>
            </div>

            {/* Attendance History Section */}
            <div className="glass-card overflow-hidden">
                <div className="p-6 border-b border-border flex items-center justify-between bg-muted/20">
                    <div>
                        <h2 className="text-xl font-bold text-foreground">Attendance History</h2>
                        <p className="text-xs text-muted-foreground">Modify past records</p>
                    </div>
                    <div className="flex gap-2">
                        {editMode && (
                            <button
                                onClick={saveChanges}
                                disabled={saving || Object.keys(editedRecords).length === 0}
                                className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-bold shadow-lg hover:scale-105 transition-all disabled:opacity-50"
                            >
                                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                                Save changes
                            </button>
                        )}
                        <button
                            onClick={toggleEdit}
                            className={clsx(
                                "flex items-center px-4 py-2 rounded-xl text-sm font-bold transition-all border",
                                editMode
                                    ? "bg-muted text-foreground border-border"
                                    : "bg-card border-border text-foreground hover:bg-muted"
                            )}
                        >
                            {editMode ? <><X className="w-4 h-4 mr-2" /> Cancel</> : <><Edit3 className="w-4 h-4 mr-2" /> Edit</>}
                        </button>
                    </div>
                </div>

                <div className="divide-y divide-border">
                    {history.length === 0 ? (
                        <div className="text-center py-20 text-muted-foreground">Empty history. No records found till today.</div>
                    ) : (
                        history.map((record) => {
                            const isEdited = record._id in editedRecords;
                            const displayStatus = isEdited ? editedRecords[record._id] : record.present;

                            return (
                                <div key={record._id} className={clsx(
                                    "flex items-center justify-between p-5 transition-colors relative overflow-hidden",
                                    record.sessionType === 'lab' ? "bg-primary/[0.03]" : "",
                                    isEdited ? "bg-accent/5" : "hover:bg-muted/10"
                                )}>
                                    {record.sessionType === 'lab' && (
                                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary/40" />
                                    )}
                                    <div className="flex items-center gap-6">
                                        <div className="text-center w-12">
                                            <p className="text-[10px] font-bold text-muted-foreground uppercase">{dayjs(record.date).format('MMM')}</p>
                                            <p className="text-xl font-black text-foreground">{dayjs(record.date).format('DD')}</p>
                                        </div>
                                        <div className="h-10 w-px bg-border/50" />
                                        <div>
                                            <p className="text-sm font-bold text-foreground">{dayjs(record.date).format('dddd, MMMM D')}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className={clsx(
                                                    "px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter",
                                                    record.sessionType === 'lab' ? "bg-primary/10 text-primary border border-primary/20" : "bg-muted text-muted-foreground"
                                                )}>
                                                    {record.sessionType === 'lab' ? 'LAB' : 'LEC'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        {editMode ? (
                                            <button
                                                onClick={() => toggleAttendance(record._id, record.present)}
                                                className={clsx(
                                                    "w-32 py-2.5 rounded-xl font-bold text-xs transition-all border flex items-center justify-center gap-2",
                                                    displayStatus
                                                        ? "bg-accent/10 border-accent/20 text-accent"
                                                        : "bg-destructive/10 border-destructive/20 text-destructive"
                                                )}
                                            >
                                                {displayStatus ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                                                {displayStatus ? 'PRESENT' : 'ABSENT'}
                                            </button>
                                        ) : (
                                            <div className={clsx(
                                                "w-32 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border",
                                                displayStatus ? "bg-accent/5 border-accent/10 text-accent" : "bg-destructive/5 border-destructive/10 text-destructive"
                                            )}>
                                                {displayStatus ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                                                {displayStatus ? 'PRESENT' : 'ABSENT'}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
};

export default SubjectDetailPage;
