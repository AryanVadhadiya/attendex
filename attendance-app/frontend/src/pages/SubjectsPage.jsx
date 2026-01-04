import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { subjectApi } from '../services/api';
import { useSWRConfig } from 'swr';
import { useSubjects, useUserProfile, useRefreshData } from '../hooks/useAttendanceData';
import { Loader2, Plus, Trash2, BookOpen, Pencil, Lock } from 'lucide-react';
import clsx from 'clsx';
import { Link } from 'react-router-dom';
import { useToast } from '../context/ToastContext';

const SubjectsPage = () => {
    const { subjects = [], loading: subjectsLoading, mutate } = useSubjects();
    const { mutate: globalMutate } = useSWRConfig();
    const { user, loading: userLoading } = useUserProfile();
    const toast = useToast();
    const refreshData = useRefreshData();

    // Derived state
    const loading = subjectsLoading || userLoading;
    const isLocked = user && user.isTimetableLocked;

    const [creating, setCreating] = useState(false);

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

    // Removed useEffect and fetchSubjects

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
            mutate();
            globalMutate('/stats/dashboard?threshold=75');
            globalMutate('/timetable');
            refreshData();
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

    if (loading) return <div className="p-8"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="max-w-4xl mx-auto">
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
