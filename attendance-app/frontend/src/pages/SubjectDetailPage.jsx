import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import api, { statsApi, attendanceApi } from '../services/api';
import { Loader2, ArrowLeft, CheckCircle2, XCircle, Edit3, Save, X, Info, Trash2 } from 'lucide-react';
import clsx from 'clsx';
import dayjs from 'dayjs';
import ProgressRing from '../components/Dashboard/ProgressRing';
import { useToast } from '../context/ToastContext';
import { useRefreshData, useUserProfile } from '../hooks/useAttendanceData';

const SubjectDetailPage = () => {
    const { id } = useParams();
    const { user } = useUserProfile();
    const [stats, setStats] = useState(null);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [historyLoaded, setHistoryLoaded] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [editedRecords, setEditedRecords] = useState({});
    const [saving, setSaving] = useState(false);
    const [removingExtraId, setRemovingExtraId] = useState(null);
    const [threshold, setThreshold] = useState(80); // Default 80%
    const toast = useToast();
    const refreshData = useRefreshData();

    const fetchData = useCallback(async () => {
        try {
            setHistoryLoaded(false);
            // Fetch subject stats once; threshold-specific math is done client-side
            const statsRes = await statsApi.get({
                subjectId: id
            });
            setStats(statsRes.data);

            // Fetch history
            const historyRes = await api.get(`/attendance/subject/${id}/history`);
            setHistory(historyRes.data);
            setHistoryLoaded(true);
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
            // Mark this subject as recently updated so dashboard can glaze only this card
            try {
                localStorage.setItem('lastUpdatedSubjectId', id);
            } catch (_) {}
            await refreshData();
        } catch (err) {
            toast.error('Failed to save changes');
        } finally {
            setSaving(false);
        }
    };

    const handleRemoveExtraClass = async (occurrenceId) => {
        if (removingExtraId || !occurrenceId) return;
        const confirmed = window.confirm('Remove this extra class from your schedule? This cannot be undone.');
        if (!confirmed) return;
        setRemovingExtraId(occurrenceId);
        try {
            await attendanceApi.removeExtraClass(occurrenceId);
            toast.success('Extra class removed');
            await fetchData();
            await refreshData();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to remove extra class');
        } finally {
            setRemovingExtraId(null);
        }
    };

    if (loading && !stats) {
        // Glazing skeleton for subject detail header and main stats
        return (
            <div className="max-w-5xl mx-auto pb-20 animate-in space-y-8">
                <div className="mb-4 animate-pulse">
                    <div className="h-4 w-40 bg-muted rounded mb-4" />
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                            <div className="w-2 h-16 rounded-full bg-muted" />
                            <div className="space-y-2">
                                <div className="h-6 w-40 bg-muted rounded" />
                                <div className="h-4 w-32 bg-muted rounded" />
                            </div>
                        </div>
                        <div className="bg-card p-1 rounded-2xl border border-border flex items-center gap-1">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="px-4 py-2 rounded-xl bg-muted h-8 w-14" />
                            ))}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="glass-card p-6 flex flex-col items-center justify-center text-center space-y-4">
                            <div className="h-5 w-32 bg-muted rounded" />
                            <div className="w-24 h-24 rounded-full bg-muted" />
                            <div className="h-5 w-20 bg-muted rounded" />
                        </div>
                    ))}
                </div>
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

    // Unit breakdown for better understanding
    const labUnit = user?.labUnitValue || 1;
    const lecturesOnly = Math.floor(remainingAllowed / 1);
    const labsOnly = Math.floor(remainingAllowed / labUnit);

    return (
        <div className="max-w-5xl mx-auto pb-20">
            {/* Header */}
            <div className="mb-8">
                <Link
                    to="/dashboard"
                    state={{ updatingSubjectId: id }}
                    className="text-sm text-muted-foreground hover:text-foreground flex items-center mb-4 transition-colors"
                >
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

            {/* Main Stats Grid - 2-column layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {/* Card 1: Current Status */}
                <div className="glass-card p-5 flex flex-col">
                    <h3 className="text-base font-bold text-muted-foreground uppercase tracking-widest mb-3 text-center">Current Status</h3>

                    {/* Progress Ring */}
                    <div className="flex justify-center mb-3">
                        <div className="relative">
                            <ProgressRing
                                percentage={stats?.presentPercent || 0}
                                size={100}
                                strokeWidth={8}
                                hideText={true}
                            />
                            <div className="absolute inset-0 flex items-center justify-center flex-col">
                                <span className="text-3xl font-bold text-foreground">{presentCount}</span>
                                <div className="h-px w-6 bg-border my-0.5" />
                                <span className="text-sm text-muted-foreground">{currentLoad}</span>
                            </div>
                        </div>
                    </div>

                    {/* Percentage */}
                    <div className="text-center mb-3">
                        <p className="text-4xl font-bold text-foreground">
                            {typeof stats?.presentPercent === 'number' ? stats.presentPercent.toFixed(1) : stats?.presentPercent}%
                        </p>
                        <p className="text-sm text-muted-foreground mt-0.5">Present till today</p>
                    </div>

                    {/* Divider */}
                    <div className="border-t border-border/50 pt-3 mt-auto">
                        <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-2 text-primary">Class Summary</p>
                        <div className="flex justify-between items-center text-base">
                            <span className="text-muted-foreground">Total Classes</span>
                            <span className="font-bold text-foreground">{currentLoad} / {totalLoad}</span>
                        </div>
                    </div>
                </div>

                {/* Card 2: Bunk Usage + Safe to Miss + Equivalence (Merged) */}
                <div className="glass-card p-5 flex flex-col">
                    <h3 className="text-base font-bold text-muted-foreground uppercase tracking-widest mb-3 text-center text-destructive">Bunk Usage</h3>

                    {/* Compact Top Section: Ring + Percentage */}
                    <div className="flex items-center justify-center gap-4 mb-3">
                        <div className="relative">
                            <ProgressRing
                                percentage={bunkUsagePercent}
                                size={80}
                                strokeWidth={7}
                                hideText={true}
                            />
                            <div className="absolute inset-0 flex items-center justify-center flex-col">
                                <span className="text-2xl font-bold text-foreground">{absentCount}</span>
                                <div className="h-px w-5 bg-border my-0.5" />
                                <span className="text-xs text-muted-foreground">{semesterBudget}</span>
                            </div>
                        </div>
                        <div className="text-left">
                            <p className="text-4xl font-bold text-foreground">{bunkUsagePercent.toFixed(1)}%</p>
                            <p className="text-sm text-muted-foreground">Budget Consumed</p>
                        </div>
                    </div>

                    {/* Safe to Miss Section - Horizontal Layout */}
                    <div className="border-t border-border/50 pt-3">
                        <div className="flex justify-between items-center mb-2">
                            <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Safe to miss</p>
                            <span className="text-xs font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded">
                                {absentCount}/{semesterBudget} USED
                            </span>
                        </div>

                        {/* Horizontal Layout: Number + Equivalence */}
                        <div className="flex items-center gap-4">
                            {/* Left: Large Number */}
                            <div className="flex items-end gap-1.5">
                                <span className={clsx(
                                    "text-5xl font-bold leading-none",
                                    remainingAllowed < 0 ? "text-destructive" : "text-accent"
                                )}>
                                    {remainingAllowed}
                                </span>
                                <span className="text-sm text-muted-foreground mb-1">{remainingAllowed === 1 ? 'unit' : 'units'}</span>
                            </div>

                            {/* Right: Horizontal Equivalence Pills */}
                            {remainingAllowed > 0 && (
                                <div className="flex-1 flex items-center gap-2">
                                    <div className="flex-1 text-center py-1.5 px-2 rounded-lg bg-muted/30 border border-border/50">
                                        <p className="text-2xl font-bold text-foreground leading-none">{lecturesOnly}</p>
                                        <p className="text-xs text-muted-foreground uppercase tracking-wider mt-0.5">Lecture{lecturesOnly !== 1 ? 's' : ''}</p>
                                    </div>
                                    <span className="text-sm text-muted-foreground font-medium">or</span>
                                    <div className="flex-1 text-center py-1.5 px-2 rounded-lg bg-muted/30 border border-border/50">
                                        <p className="text-2xl font-bold text-foreground leading-none">{labsOnly}</p>
                                        <p className="text-xs text-muted-foreground uppercase tracking-wider mt-0.5">Lab{labsOnly !== 1 ? 's' : ''}</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                            <Info className="w-3 h-3" /> Based on {threshold}% attendance criteria.
                        </p>
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
                    {!historyLoaded ? (
                        // Glazed loading state for history
                        <div>
                            {[1, 2, 3, 4].map((i) => (
                                <div
                                    key={i}
                                    className="flex items-center justify-between p-5 animate-pulse"
                                >
                                    <div className="flex items-center gap-6 w-full">
                                        <div className="w-12 h-10 rounded-md bg-muted" />
                                        <div className="h-10 w-px bg-border/50" />
                                        <div className="flex-1 space-y-2">
                                            <div className="h-3 w-40 bg-muted rounded" />
                                            <div className="h-3 w-24 bg-muted rounded" />
                                        </div>
                                    </div>
                                    <div className="w-32 h-9 bg-muted rounded-xl" />
                                </div>
                            ))}
                        </div>
                    ) : history.length === 0 ? (
                        <div className="text-center py-20 text-muted-foreground">Empty history. No records found till today.</div>
                    ) : (
                        history.map((record) => {
                            const isEdited = record._id in editedRecords;
                            const displayStatus = isEdited ? editedRecords[record._id] : record.present;
                            const isExtraClass = Boolean(record.isAdhoc);

                            return (
                                <div key={record._id} className={clsx(
                                    "flex items-center justify-between p-5 transition-colors relative overflow-hidden",
                                    record.sessionType === 'lab' ? "bg-primary/[0.03]" : "",
                                    isExtraClass ? "ring-1 ring-accent/30 bg-accent/5" : "",
                                    isEdited ? "bg-accent/10" : "hover:bg-muted/10"
                                )}>
                                    {record.sessionType === 'lab' && (
                                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary/40" />
                                    )}
                                    {isExtraClass && (
                                        <div className="absolute right-0 top-0 bottom-0 w-1 bg-accent" />
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
                                                {isExtraClass && (
                                                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-accent/10 text-accent border border-accent/20">
                                                        Extra Class
                                                    </span>
                                                )}
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
                                        {editMode && isExtraClass && (
                                            <button
                                                onClick={() => handleRemoveExtraClass(record._id)}
                                                disabled={removingExtraId === record._id}
                                                className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border border-destructive/40 text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-60"
                                            >
                                                {removingExtraId === record._id ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <Trash2 className="w-4 h-4" />
                                                )}
                                                Remove
                                            </button>
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
