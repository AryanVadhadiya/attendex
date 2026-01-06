import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { subjectApi, userApi } from '../services/api';
import { useSubjects, useUserProfile, useRefreshData } from '../hooks/useAttendanceData';
import { Loader2, Plus, Trash2, BookOpen, Pencil, Lock } from 'lucide-react';
import clsx from 'clsx';
import { Link } from 'react-router-dom';
import { useToast } from '../context/ToastContext';

const SubjectsPage = () => {
    const { subjects = [], loading: subjectsLoading, mutate } = useSubjects();
    const { user, loading: userLoading, mutate: userMutate } = useUserProfile();
    const toast = useToast();
    const refreshData = useRefreshData();

    // Derived state
    const loading = subjectsLoading || userLoading;
    const isLocked = user && user.isTimetableLocked;
    const labUnitValue = user?.labUnitValue || 1;
    const labsLocked = Boolean(user?.labUnitLockedAt);
    const labLockedLabel = user?.labUnitLockedAt
        ? new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(new Date(user.labUnitLockedAt))
        : null;

    const [creating, setCreating] = useState(false);
    const [labEditorOpen, setLabEditorOpen] = useState(false);
    const [labSelection, setLabSelection] = useState(1);
    const [labConfirmStep, setLabConfirmStep] = useState(0);
    const [labSaving, setLabSaving] = useState(false);
    const [unlockingLab, setUnlockingLab] = useState(false);
    const [showUnlockConfirm, setShowUnlockConfirm] = useState(false);

    // Form for new subject
    const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm();
    const [showForm, setShowForm] = useState(false);
    const [assignedColor, setAssignedColor] = useState('#3b82f6');
    const [editingId, setEditingId] = useState(null);
    // const [isLocked, setIsLocked] = useState(false); // Removed local state

    const PALETTE = ['#ef4444', '#f97316', '#f59e0b', '#10b981', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'];

    const handleOpenForm = () => {
        if (isLocked) return;
        if (!showForm) {
            // Assign random unused color
            const usedColors = (subjects || []).map(s => s.color);
            const available = PALETTE.filter(c => !usedColors.includes(c));
            const pool = available.length > 0 ? available : PALETTE;
            const randomColor = pool[Math.floor(Math.random() * pool.length)];

            setAssignedColor(randomColor);
            setValue('color', randomColor);
            setValue('lecturesPerWeek', 0);
            setValue('labsPerWeek', 0);
        }
        setShowForm(!showForm);
    };

    useEffect(() => {
        if (user) {
            setLabSelection(user.labUnitValue || 1);
        }
    }, [user]);

    const clampLabValue = (value) => {
        const numeric = Number(value);
        if (Number.isNaN(numeric)) return 1;
        return Math.max(1, Math.min(4, numeric));
    };

    const handleLabUnitEditToggle = () => {
        if (labsLocked) return;
        setLabSelection(labUnitValue);
        setLabConfirmStep(0);
        setLabEditorOpen(prev => !prev);
    };

    const handleLabSelectionChange = (value) => {
        setLabSelection(clampLabValue(value));
        setLabConfirmStep(0);
    };

    const handlePrimeConfirmation = () => {
        setLabConfirmStep(prev => (prev >= 1 ? prev : 1));
    };

    const handleLockLabUnits = async () => {
        if (labConfirmStep < 1) return;
        setLabSaving(true);
        try {
            await userApi.updateLabUnits({
                strategy: labSelection === 1 ? 'nirma' : 'custom',
                labUnitValue: labSelection,
                doubleConfirmed: true
            });
            toast.success('Lab units locked in');
            setLabEditorOpen(false);
            setLabConfirmStep(0);
            await Promise.all([userMutate(), refreshData()]);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to update lab units');
        } finally {
            setLabSaving(false);
        }
    };

    const handleUnlockPrompt = () => {
        toast.warning('Unlock lab units? You will be able to change the multiplier again.', 5000);
        setShowUnlockConfirm(true);
    };

    const handleUnlockLabUnits = async () => {
        if (unlockingLab) return;
        setUnlockingLab(true);
        try {
            await userApi.unlockLabUnits();
            toast.success('Lab units unlocked');
            await Promise.all([userMutate(), refreshData()]);
            setLabEditorOpen(true);
            setLabConfirmStep(0);
            setShowUnlockConfirm(false);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to unlock lab units');
        } finally {
            setUnlockingLab(false);
        }
    };

    const handleCancelUnlock = () => {
        if (unlockingLab) return;
        setShowUnlockConfirm(false);
    };

    const onSubmit = async (data) => {
        setCreating(true);
        try {
            if (editingId) {
                await subjectApi.update(editingId, data);
                toast.success("Subject updated successfully");
            } else {
                await subjectApi.create(data);
                toast.success("Subject created successfully");
            }
            reset();
            setShowForm(false);
            setEditingId(null);
            // Refresh local subjects list
            mutate();
            // Refresh core dependent data (dashboard, timetable, today, etc.)
            await refreshData();
        } catch (err) {
            toast.error('Failed to save subject');
        } finally {
            setCreating(false);
        }
    };

    const handleEdit = (sub, e) => {
        if (e) e.preventDefault();
        setEditingId(sub._id);
        setAssignedColor(sub.color);
        reset({
            name: sub.name,
            code: sub.code || '',
            lecturesPerWeek: sub.lecturesPerWeek || 0,
            labsPerWeek: sub.labsPerWeek || 0,
            color: sub.color
        });
        setShowForm(true);
        // Scroll to top or form?
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (id, e) => {
        if (e) e.preventDefault();
        // Keep confirm as it's a destructive action, or replace with custom modal?
        // User asked to replace errors/success alerts. Native confirm is arguably okay for major delete, but requested "apple type toast" implies better UI.
        // For now, I will keep confirm for safety as it's blocking, but replace the error/success feedback.
        if (!confirm('Are you sure? This does NOT remove old attendance records but hides the subject from future.')) return;
        try {
            await subjectApi.delete(id);
            mutate();
            if (editingId === id) {
                setShowForm(false);
                setEditingId(null);
            }
            toast.success("Subject deleted");
            refreshData();
        } catch (err) {
            toast.error('Failed to delete subject');
        }
    };

    if (loading) {
        // Glazing skeleton for subjects grid
        return (
            <div className="max-w-4xl mx-auto p-4 animate-in">
                <div className="flex justify-between items-center mb-8 animate-pulse">
                    <div className="space-y-2">
                        <div className="h-6 w-32 bg-muted rounded" />
                        <div className="h-4 w-40 bg-muted rounded" />
                    </div>
                    <div className="h-9 w-32 bg-muted rounded" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="bg-card rounded-xl p-5 border border-border shadow-sm">
                            <div className="h-4 w-40 bg-muted rounded mb-3" />
                            <div className="h-3 w-24 bg-muted rounded mb-4" />
                            <div className="h-3 w-28 bg-muted rounded mb-1" />
                            <div className="h-3 w-24 bg-muted rounded" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto">
            <section className="bg-card border border-border rounded-2xl p-5 shadow-sm mb-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                            <BookOpen className="w-4 h-4" /> Attendance Units
                        </p>
                        <h2 className="text-xl font-semibold text-foreground mt-1">
                            Lab Units: {labUnitValue} {labUnitValue === 1 ? 'unit' : 'units'}
                        </h2>
                        <p className="text-sm text-muted-foreground mt-1">
                            1 lecture always counts as 1 unit. Labs can be worth 1, 2, 3, or even 4 units depending on your university policy.
                        </p>
                    </div>
                    <div className="flex flex-col items-start md:items-end gap-2">
                        {labsLocked ? (
                            <div className="flex flex-col items-start md:items-end gap-2">
                                <span className="text-sm text-muted-foreground flex items-center gap-2">
                                    <Lock className="w-4 h-4" /> Locked on {labLockedLabel}
                                </span>
                                <div className="flex flex-col gap-2 w-full">
                                    <button
                                        onClick={handleUnlockPrompt}
                                        disabled={unlockingLab}
                                        className="px-4 py-2 rounded-lg border border-border text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors flex items-center gap-2"
                                    >
                                        {unlockingLab && <Loader2 className="w-4 h-4 animate-spin" />}
                                        Unlock Lab Units
                                    </button>
                                    {showUnlockConfirm && (
                                        <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
                                            <p className="font-semibold mb-2">Unlock lab units?</p>
                                            <p className="text-destructive/80 text-xs mb-3">You will be able to change the multiplier again. This might impact attendance calculations.</p>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    className="flex-1 px-3 py-2 rounded-lg border border-border text-foreground hover:bg-muted transition-colors"
                                                    onClick={handleCancelUnlock}
                                                    disabled={unlockingLab}
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    type="button"
                                                    className="flex-1 px-3 py-2 rounded-lg bg-destructive text-white font-semibold hover:bg-destructive/90 transition-colors flex items-center justify-center gap-2"
                                                    onClick={handleUnlockLabUnits}
                                                    disabled={unlockingLab}
                                                >
                                                    {unlockingLab && <Loader2 className="w-4 h-4 animate-spin" />}
                                                    Yes, unlock
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <button
                                onClick={handleLabUnitEditToggle}
                                className="px-4 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors"
                            >
                                {labEditorOpen ? 'Close' : 'Change Lab Units'}
                            </button>
                        )}
                        {!labsLocked && (
                            <span className="text-xs text-muted-foreground">
                                You’ll need to confirm twice before we lock this.
                            </span>
                        )}
                    </div>
                </div>

                {labEditorOpen && !labsLocked && (
                    <div className="mt-5 border-t border-border pt-5 space-y-5">
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="rounded-2xl border border-border p-4 bg-card/50">
                                <div className="flex items-center gap-3 mb-3">
                                    <span className="text-xs font-bold tracking-widest text-primary px-2 py-0.5 rounded-full bg-primary/10">STEP 1</span>
                                    <p className="text-sm font-semibold text-foreground">Choose how many units a lab counts for</p>
                                </div>
                                <p className="text-xs text-muted-foreground mb-4">Set the multiplier exactly as your university defines it. Lectures stay fixed at 1 unit.</p>
                                <label className="text-xs font-medium text-muted-foreground">Enter value (1-4)</label>
                                <div className="flex items-center gap-3 mt-1">
                                    <input
                                        type="number"
                                        min="1"
                                        max="4"
                                        step="1"
                                        value={labSelection}
                                        onChange={(e) => handleLabSelectionChange(Number(e.target.value))}
                                        className="input w-24 text-center font-semibold"
                                    />
                                    <div className="flex gap-2">
                                        {[1, 2, 3, 4].map(value => (
                                            <button
                                                key={value}
                                                type="button"
                                                onClick={() => handleLabSelectionChange(value)}
                                                className={clsx(
                                                    'px-4 py-2 rounded-xl border text-sm font-semibold transition-all',
                                                    labSelection === value
                                                        ? 'border-primary bg-primary/10 text-primary shadow-sm'
                                                        : 'border-border hover:border-foreground/30'
                                                )}
                                            >
                                                {value}x
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <p className="text-[11px] text-muted-foreground mt-2">Example: set 2 if a lab counts as two lectures worth of attendance, 4 if it is treated as four units.</p>
                            </div>

                            <div className="rounded-2xl border border-border p-4 bg-card/50">
                                <div className="flex items-center gap-3 mb-3">
                                    <span className="text-xs font-bold tracking-widest text-emerald-600 px-2 py-0.5 rounded-full bg-emerald-50">STEP 2</span>
                                    <p className="text-sm font-semibold text-foreground">Double-confirm before locking</p>
                                </div>
                                <p className="text-xs text-muted-foreground mb-4">We require two taps so you do not accidentally lock the wrong configuration.</p>
                                <div className="flex flex-wrap gap-3">
                                    <button
                                        type="button"
                                        onClick={handlePrimeConfirmation}
                                        className={clsx(
                                            'px-4 py-2 rounded-xl border text-sm font-semibold shadow-sm transition-colors',
                                            labConfirmStep >= 1 ? 'border-emerald-500 text-emerald-600 bg-emerald-50' : 'border-border text-foreground'
                                        )}
                                        disabled={labConfirmStep >= 1}
                                    >
                                        Step 1 · I verified this
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleLockLabUnits}
                                        disabled={labConfirmStep < 1 || labSaving}
                                        className="btn-primary flex items-center gap-2"
                                    >
                                        {labSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                                        Step 2 · Lock Lab Units
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleLabUnitEditToggle}
                                        className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
                                    >
                                        Cancel
                                    </button>
                                </div>
                                <p className="text-[11px] text-muted-foreground mt-3">
                                    Once locked, labs will always count using this unit value for all dashboards, alerts, and calculations.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </section>

            <header className="flex justify-between items-center mb-8">
                <div>
                   <h1 className="text-2xl font-bold text-foreground">Subjects</h1>
                   <p className="text-muted-foreground">Manage your courses</p>
                </div>
                {isLocked ? (
                     <div className="flex items-center text-amber-600 bg-amber-50 px-4 py-2 rounded-lg text-sm border border-amber-200">
                         <Lock className="w-4 h-4 mr-2" /> Configuration Locked
                     </div>
                ) : (
                    <button
                      onClick={handleOpenForm}
                      className="btn-primary flex items-center text-sm"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        {showForm ? 'Cancel' : 'Add Subject'}
                    </button>
                )}
            </header>

            {/* Create Form */}
            {showForm && (
                <div className="bg-card p-6 rounded-xl border border-border shadow-sm mb-8 animate-in slide-in-from-top-4 fade-in">
                    <h3 className="font-semibold mb-4 text-foreground">New Subject</h3>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1">Subject Name</label>
                                <input {...register('name', { required: true })} className="input w-full" placeholder="e.g. Data Structures" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1">Subject Code</label>
                                <input {...register('code')} className="input w-full" placeholder="e.g. CS101" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1">Lectures / Week</label>
                                <input
                                    type="number"
                                    min="0"
                                    {...register('lecturesPerWeek', { valueAsNumber: true })}
                                    className="input w-full"
                                    placeholder="0"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1">Labs / Week</label>
                                <input
                                    type="number"
                                    min="0"
                                    {...register('labsPerWeek', { valueAsNumber: true })}
                                    className="input w-full"
                                    placeholder="0"
                                />
                            </div>
                        </div>

                        <div>
                             <label className="block text-sm font-medium text-foreground mb-1">Assigned Color</label>
                             <div className="flex items-center gap-3">
                                 <div
                                    className="w-8 h-8 rounded-full shadow-sm ring-2 ring-border"
                                    style={{ backgroundColor: assignedColor }}
                                 />
                                 <span className="text-sm text-muted-foreground">Auto-assigned</span>
                                 <input type="hidden" {...register('color')} />
                             </div>
                        </div>

                        <div className="flex justify-end gap-2">
                             <button
                                type="button"
                                onClick={() => setShowForm(false)}
                                className="px-4 py-2 text-muted-foreground hover:text-foreground text-sm font-medium"
                             >
                                Cancel
                             </button>
                            <button disabled={creating} className="btn-primary">
                                {creating ? 'Saving...' : (editingId ? 'Update Subject' : 'Save Subject')}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {subjects.map(sub => (
                    <Link to={`/subjects/${sub._id}`} key={sub._id} className="block group">
                        <div className="bg-card rounded-xl p-5 border border-border shadow-sm hover:shadow-md transition-all relative overflow-hidden h-full">
                            <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: sub.color }} />
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="font-semibold text-foreground group-hover:opacity-80 transition-opacity">{sub.name}</h3>
                                    <p className="text-sm text-muted-foreground mt-1">{sub.code}</p>
                                    <div className="flex gap-3 mt-3 text-xs text-muted-foreground font-medium">
                                         <span className="flex items-center gap-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-muted"></span>
                                            {sub.lecturesPerWeek || 0} Lec
                                         </span>
                                         <span className="flex items-center gap-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-muted"></span>
                                            {sub.labsPerWeek || 0} Lab
                                         </span>
                                    </div>
                                </div>
                                {!isLocked && (
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={(e) => handleEdit(sub, e)}
                                            className="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-accent transition-colors"
                                            title="Edit Subject"
                                        >
                                            <Pencil className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={(e) => handleDelete(sub._id, e)}
                                            className="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-destructive transition-colors"
                                            title="Delete Subject"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </Link>
                ))}
            </div>

            {subjects.length === 0 && !showForm && (
                <div className="text-center py-12 text-muted-foreground bg-muted/30 rounded-xl border border-dashed border-border">
                    No subjects yet. Add one to get started.
                </div>
            )}
        </div>
    );
};

export default SubjectsPage;
