import { useState, useEffect, useMemo, useRef } from 'react';
import { useSWRConfig } from 'swr';
import { Link, useNavigate } from 'react-router-dom';
import { DndContext, DragOverlay } from '@dnd-kit/core';
import api, { userApi } from '../services/api';
import { useSubjects, useUserProfile, useTimetable, useHolidays, useRefreshData } from '../hooks/useAttendanceData';
import DraggableSubject from '../components/TimetableEditor/DraggableSubject';
import DroppableCell from '../components/TimetableEditor/DroppableCell';
import PublishModal from '../components/TimetableEditor/PublishModal';
import { useToast } from '../context/ToastContext';
import { Loader2, Save, Lock, Unlock, X, CalendarDays, Info } from 'lucide-react';
import dayjs from 'dayjs';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const HOURS = Array.from({ length: 11 }, (_, i) => i + 8); // 8 to 18

const TimetablePage = () => {
    // SWR Hooks
    const { subjects = [] } = useSubjects();
    const navigate = useNavigate();
    const { user, mutate: mutateUser } = useUserProfile();
    const { holidays: serverHolidays } = useHolidays(); // Read-only from server initially
    const { slots: serverSlots, loading: slotsLoading, mutate: mutateTimetable } = useTimetable();
    const { mutate: globalMutate } = useSWRConfig();
    const toast = useToast();
    const refreshData = useRefreshData();

    // Derived State
    const isLocked = user && user.isTimetableLocked;

    // Local State
    const [slots, setSlots] = useState([]);
    const [startDate, setStartDate] = useState('2025-12-22');
    const [endDate, setEndDate] = useState('2026-04-18');
    const [holidays, setHolidays] = useState([]); // Local editable state
    const [activeDrag, setActiveDrag] = useState(null);
    const [initialStartDate, setInitialStartDate] = useState(null);
    const [startResetMode, setStartResetMode] = useState(false);

    const hasPublishedWindow = Boolean(user?.semesterEndDate);
    const availableDraggables = useMemo(() => {
        if (!subjects?.length) {
            return 0;
        }

        return subjects.reduce((total, sub) => {
            const placedLec = slots.filter(s => s.subject && s.subject._id === sub._id && s.sessionType === 'lecture').length;
            const placedLab = slots.filter(s => s.subject && s.subject._id === sub._id && s.sessionType === 'lab').length;

            const remainingLec = Math.max(0, (sub.lecturesPerWeek || 0) - placedLec);
            const remainingLab = Math.max(0, (sub.labsPerWeek || 0) - placedLab);
            return total + remainingLec + remainingLab;
        }, 0);
    }, [subjects, slots]);

    const showSubjectPalette = !isLocked && availableDraggables > 0;
    const showPalettePanel = isLocked || showSubjectPalette;
    const showCreateSubjectsCTA = !isLocked && subjects.length === 0;
    const lockedStartValue = useMemo(() => {
        return user?.semesterStartDate ? dayjs(user.semesterStartDate).format('YYYY-MM-DD') : null;
    }, [user?.semesterStartDate]);
    const lockedStartLabel = lockedStartValue ? dayjs(lockedStartValue).format('DD MMM YYYY') : 'Not set';

    // Perf timers
    const lockTimerRef = useRef(null);
    const publishTimerRef = useRef(null);

    // Modal State
    const [publishModal, setPublishModal] = useState({
        isOpen: false,
        step: 'idle', // idle, publishing, confirm_auto_mark, confirm_force_reset, success, error
        message: '',
        payload: null
    });

    const beginResetFlow = () => {
        setPublishModal({
            isOpen: true,
            step: 'confirm_reset_primary',
            message: 'Resetting lets you change the semester start date but will wipe all attendance once you publish again. Continue?',
            payload: null
        });
    };

    const cancelResetMode = () => {
        if (lockedStartValue) {
            setStartDate(lockedStartValue);
        }
        setStartResetMode(false);
    };

    // Sync User Profile & Holidays
    useEffect(() => {
        if (user) {
             const userStart = user.semesterStartDate ? dayjs(user.semesterStartDate).format('YYYY-MM-DD') : null;
             if (userStart) {
                 setStartDate(userStart);
                 setInitialStartDate(userStart);
             }
             const userEnd = user.semesterEndDate ? dayjs(user.semesterEndDate).format('YYYY-MM-DD') : null;
             if (userEnd) {
                 setEndDate(userEnd);
             }
             setStartResetMode(false);
        }
    }, [user]);

    useEffect(() => {
        if (serverHolidays) {
            setHolidays(serverHolidays);
        }
    }, [serverHolidays]);

    // Initialize Slots from Server
    useEffect(() => {
        if (serverSlots && subjects.length > 0) {
             const mappedSlots = serverSlots.map(s => {
                 const subject = typeof s.subjectId === 'object' ? s.subjectId : subjects.find(sub => sub._id === s.subjectId);
                 return {
                     day: DAYS[s.dayOfWeek - 1],
                     dayOfWeek: s.dayOfWeek,
                     hour: s.startHour,
                     startHour: s.startHour,
                     durationHours: s.durationHours,
                     sessionType: s.sessionType,
                     subject: subject
                 };
             }).filter(s => s.subject);
             setSlots(mappedSlots);
        }
    }, [serverSlots, subjects]);

    const loading = slotsLoading || !user;

    const syncTimetable = async (currentSlots) => {
        try {
            const weeklySlots = currentSlots.map(s => ({
                dayOfWeek: DAYS.indexOf(s.day) + 1,
                startHour: s.hour,
                durationHours: s.sessionType === 'lab' ? 2 : 1,
                sessionType: s.sessionType,
                subjectId: s.subject._id
            }));
            await api.post('/timetable', { slots: weeklySlots });
        } catch (err) {
            console.error("Auto-sync failed", err);
        }
    };

    const handleDragStart = (event) => {
        if (isLocked) return;
        setActiveDrag(event.active.data.current);
    };

    const handleDragEnd = (event) => {
        const { active, over } = event;
        setActiveDrag(null);

        if (over && over.data.current.origin === 'grid') {
            const { day, hour } = over.data.current;
            const { subject, sessionType, duration } = active.data.current;

            if (sessionType === 'lab') {
                const nextHourSlot = slots.find(s => s.day === day && s.hour === hour + 1);
                 if (nextHourSlot) {
                     toast.error("Lab requires 2 consecutive slots!");
                     return;
                 }
                 if (hour >= 18) {
                     toast.error("Lab cannot fit at the end of the day!");
                     return;
                 }
            }

            const newSlot = {
                day,
                hour,
                subject,
                sessionType,
                startHour: hour,
                durationHours: duration,
                dayOfWeek: DAYS.indexOf(day) + 1
            };

            setSlots(prev => {
                const filtered = prev.filter(s =>
                    !((s.day === day && s.hour === hour) ||
                      (s.day === day && s.hour === hour + 1 && s.sessionType === 'lab') ||
                      (s.day === day && s.hour === hour - 1 && s.sessionType === 'lab')
                     )
                );
                const updated = [...filtered, newSlot];
                syncTimetable(updated);
                return updated;
            });
        }
    };

    const handleRemove = (slotToRemove) => {
        if (isLocked) return;
        setSlots(prev => {
            const updated = prev.filter(s => s !== slotToRemove);
            syncTimetable(updated);
            return updated;
        });
    };

    const toggleLock = async () => {
        try {
            const newState = !isLocked;

            // Start lock/unlock timer
            lockTimerRef.current = performance.now();

            // Set initial modal state
            setPublishModal({
                isOpen: true,
                step: newState ? 'locking' : 'unlocking',
                message: '',
                payload: null
            });

            const res = await userApi.updateProfile({ isTimetableLocked: newState });
            // Optimistically update user profile from response without extra GET
            await mutateUser(res.data, false);

            // Success state
            setPublishModal(prev => ({
                ...prev,
                step: newState ? 'lock_success' : 'unlock_success'
            }));

            if (lockTimerRef.current != null) {
                const elapsed = performance.now() - lockTimerRef.current;
                console.log('[PERF] timetable lock:', newState ? 'lock' : 'unlock', (elapsed / 1000).toFixed(2) + 's');
            }

            // Close after delay
            setTimeout(() => {
                setPublishModal(prev => ({ ...prev, isOpen: false }));
            }, 1000); // Faster closing for quick actions
        } catch (err) {
            setPublishModal({
                isOpen: true,
                step: 'error',
                message: "Failed to update lock status: " + (err.response?.data?.message || err.message),
                payload: null
            });
            if (lockTimerRef.current != null) {
                const elapsed = performance.now() - lockTimerRef.current;
                console.log('[PERF] timetable lock FAILED:', (elapsed / 1000).toFixed(2) + 's');
            }
            // Also show toast for extra visibility if modal fails? No, modal is enough.
            // The existing code sets modal state.
        }
    };

    // --- Publishing Logic with Modal ---

    const executePublish = async (payload, confirmAutoMark = false, forceResetOverride) => {
        try {
            const effectiveForceReset = typeof forceResetOverride === 'boolean'
                ? forceResetOverride
                : Boolean(payload?.forceReset);
            const { forceReset: _forceReset, ...publishPayload } = payload || {};
            const res = await api.post('/timetable/publish', {
                ...publishPayload,
                confirmAutoMark,
                forceReset: effectiveForceReset
            });

            if (res.data.requiresConfirmation) {
                setPublishModal({
                    isOpen: true,
                    step: 'confirm_auto_mark',
                    message: res.data.message,
                    payload: payload
                });
            } else {
                // Success!
                setPublishModal(prev => ({ ...prev, step: 'success', isOpen: true, message: res.data.summary }));
                setInitialStartDate(startDate);
                setStartResetMode(false);

                if (publishTimerRef.current != null) {
                    const elapsed = performance.now() - publishTimerRef.current;
                    console.log('[PERF] timetable publish success:', (elapsed / 1000).toFixed(2) + 's');
                }

                // Refresh core data (timetable, dashboard, today, etc.) in background
                // so the UI success state is not blocked on network.
                refreshData().catch(err => {
                    console.error('refreshData failed after publish', err);
                });

                // Close after delay
                setTimeout(() => {
                    setPublishModal(prev => ({ ...prev, isOpen: false }));
                }, 2000);
            }
        } catch (err) {
            if (err.response?.status === 409 && err.response.data.requiresForceReset) {
                setPublishModal({
                    isOpen: true,
                    step: 'confirm_force_reset',
                    message: err.response.data.message,
                    payload: payload
                });
            } else {
                setPublishModal({
                    isOpen: true,
                    step: 'error',
                    message: "Error: " + (err.response?.data?.message || err.message),
                    payload: null
                });
            }

            if (publishTimerRef.current != null) {
                const elapsed = performance.now() - publishTimerRef.current;
                console.log('[PERF] timetable publish FAILED:', (elapsed / 1000).toFixed(2) + 's');
            }
        }
    };

    const handlePublishClick = () => {
        // Start publish timer from button click
        publishTimerRef.current = performance.now();

        const payload = {
            startDate,
            endDate,
            weeklySlots: slots.map(s => ({
                dayOfWeek: DAYS.indexOf(s.day) + 1,
                startHour: s.hour,
                durationHours: s.sessionType === 'lab' ? 2 : 1,
                sessionType: s.sessionType,
                subjectId: s.subject._id
            })),
            holidays: holidays,
            forceReset: startResetMode
        };

        setPublishModal({
            isOpen: true,
            step: 'publishing',
            message: '',
            payload: payload
        });

        executePublish(payload, false, startResetMode);
    };

    const handleModalConfirm = () => {
        if (publishModal.step === 'confirm_auto_mark') {
            setPublishModal(prev => ({ ...prev, step: 'publishing' }));
            executePublish(publishModal.payload, true, publishModal.payload?.forceReset || startResetMode);
        } else if (publishModal.step === 'confirm_force_reset') {
            setPublishModal(prev => ({ ...prev, step: 'publishing' }));
            executePublish(publishModal.payload, false, true);
        } else if (publishModal.step === 'confirm_reset_primary') {
            setPublishModal(prev => ({ ...prev, step: 'confirm_reset_secondary', message: 'This will clear every attendance record and timetable entry once you publish again. Are you absolutely sure?' }));
        } else if (publishModal.step === 'confirm_reset_secondary') {
            if (lockedStartValue) {
                setStartDate(lockedStartValue);
            }
            setStartResetMode(true);
            setPublishModal({
                isOpen: true,
                step: 'reset_ready',
                message: 'Reset armed. Update the start date and publish to rebuild everything from scratch.',
                payload: null
            });
            setTimeout(() => {
                setPublishModal(prev => ({ ...prev, isOpen: false }));
            }, 1800);
        }
    };

    const handleModalCancel = () => {
        setPublishModal(prev => ({ ...prev, isOpen: false }));
    };

    if (loading) {
        // Glazing skeleton for timetable grid and sidebars
        return (
            <div className="flex h-[calc(100vh-100px)] gap-3 animate-in">
                <div className="w-44 flex flex-col card p-3 overflow-y-auto shrink-0 animate-pulse">
                    <div className="h-5 w-24 bg-muted rounded mb-4" />
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-12 rounded-lg bg-muted mb-3" />
                    ))}
                </div>

                <div className="flex-1 overflow-auto card flex flex-col animate-pulse">
                    <div className="grid grid-cols-[60px_repeat(5,1fr)] border-b border-border bg-muted/60">
                        <div className="p-3" />
                        {DAYS.map(day => (
                            <div key={day} className="p-3">
                                <div className="h-4 w-16 bg-muted rounded mx-auto" />
                            </div>
                        ))}
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {HOURS.map(hour => (
                            <div key={hour} className="grid grid-cols-[60px_repeat(5,1fr)] h-16">
                                <div className="border-b border-r border-border/60 p-2" />
                                {DAYS.map(day => (
                                    <div
                                        key={`${day}-${hour}`}
                                        className="border-b border-r border-border/60 h-16 bg-muted/40"
                                    />
                                ))}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="w-44 card p-3 h-fit shrink-0 animate-pulse space-y-4">
                    <div className="h-5 w-28 bg-muted rounded" />
                    <div className="h-9 w-full bg-muted rounded" />
                    <div className="h-20 w-full bg-muted rounded" />
                    <div className="h-9 w-full bg-muted rounded" />
                </div>
            </div>
        );
    }

    return (
        <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className={`flex h-[calc(100vh-100px)] ${showPalettePanel ? 'gap-3' : 'gap-4'}`}>
                {showPalettePanel && (
                    <div className="w-48 flex flex-col card p-4 overflow-y-auto shrink-0 bg-card/90 border border-border/60 rounded-3xl">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-foreground">Subjects</h3>
                            {!isLocked && <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Drag</span>}
                        </div>
                        {isLocked ? (
                            <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-center py-8">
                                <Lock className="w-8 h-8 mb-2 opacity-50" />
                                <p className="text-sm font-medium">Configuration Locked</p>
                                <p className="text-xs opacity-70 mt-1">Unlock to make changes</p>
                            </div>
                        ) : (
                            subjects.map(sub => {
                                const placedLec = slots.filter(s => s.subject && s.subject._id === sub._id && s.sessionType === 'lecture').length;
                                const placedLab = slots.filter(s => s.subject && s.subject._id === sub._id && s.sessionType === 'lab').length;

                                const remainingLec = (sub.lecturesPerWeek || 0) - placedLec;
                                const remainingLab = (sub.labsPerWeek || 0) - placedLab;

                                if (remainingLec <= 0 && remainingLab <= 0) return null;

                                return (
                                    <div key={sub._id} className="space-y-2 mb-3">
                                        {remainingLec > 0 && (
                                            <DraggableSubject
                                                subject={sub}
                                                sessionType="lecture"
                                                remaining={remainingLec}
                                            />
                                        )}
                                        {remainingLab > 0 && (
                                            <DraggableSubject
                                                subject={sub}
                                                sessionType="lab"
                                                remaining={remainingLab}
                                            />
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}

                {/* Grid */}
                <div className="flex-1 overflow-auto card flex flex-col min-w-0">
                    {showCreateSubjectsCTA && (
                        <div className="border-b border-border/60 bg-gradient-to-r from-muted/60 to-transparent px-4 py-3">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm text-muted-foreground">
                                <div className="flex items-center gap-2 font-medium">
                                    <Info className="w-4 h-4 text-accent" />
                                    Add subjects before arranging your timetable.
                                </div>
                                <Link to="/subjects" className="btn-primary text-xs px-3 py-1.5 w-fit">
                                    Create Subjects
                                </Link>
                            </div>
                        </div>
                    )}
                    {/* Header */}
                    <div className="grid grid-cols-[60px_repeat(5,1fr)] border-b border-border bg-muted">
                        <div className="p-3 text-center text-xs font-semibold text-muted-foreground border-r border-border/60">Time</div>
                        {DAYS.map(day => (
                            <div key={day} className="p-3 text-center text-sm font-semibold text-foreground border-r border-border/60 last:border-r-0">
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Body */}
                    <div className="flex-1 overflow-y-auto">
                        {HOURS.map(hour => (
                            <div key={hour} className="grid grid-cols-[60px_repeat(5,1fr)] h-16">
                                <div className="border-b border-r border-border/60 p-2 text-xs text-muted-foreground font-mono text-center flex items-center justify-center">
                                    {hour}:00
                                </div>
                                {DAYS.map(day => {
                                    // Check if covered by a previous lab
                                    const coveredByLab = slots.find(s =>
                                        s.day === day &&
                                        s.sessionType === 'lab' &&
                                        s.hour === hour - 1
                                    );

                                    if (coveredByLab) return (
                                        <div key={`${day}-${hour}`} className="border-b border-r border-border/60 h-16 bg-transparent pointer-events-none" />
                                    );

                                    const slot = slots.find(s => s.day === day && s.hour === hour);

                                    return (
                                        <DroppableCell
                                            key={`${day}-${hour}`}
                                            day={day}
                                            hour={hour}
                                            slot={slot}
                                            onRemove={handleRemove}
                                        />
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Controls - Compact */}
                <div className="w-60 card p-4 h-fit shrink-0 rounded-3xl border border-border/70 space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-foreground">Configuration</h3>
                        {hasPublishedWindow && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide bg-emerald-500/10 text-emerald-600">
                                Live
                            </span>
                        )}
                    </div>

                    <button
                        onClick={toggleLock}
                        className={`w-full py-2.5 rounded-2xl border text-sm font-semibold flex items-center justify-center transition-colors ${isLocked ? 'bg-accent/10 text-accent border-accent/30' : 'bg-muted hover:bg-muted/80 border-border/70'}`}
                    >
                        {isLocked ? (
                            <><Unlock className="w-4 h-4 mr-2" /> Unlock Config</>
                        ) : (
                            <><Lock className="w-4 h-4 mr-2" /> Lock Config</>
                        )}
                    </button>

                    {!isLocked ? (
                        <>
                            {hasPublishedWindow ? (
                                startResetMode ? (
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <label className="text-xs font-medium text-destructive uppercase tracking-wide">Reset Start Date</label>
                                            <button
                                                className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold"
                                                onClick={cancelResetMode}
                                            >
                                                Cancel Reset
                                            </button>
                                        </div>
                                        <input
                                            type="date"
                                            value={startDate}
                                            onChange={e => setStartDate(e.target.value)}
                                            className="input text-sm border-destructive/60"
                                        />
                                        <p className="text-[11px] text-destructive/80 leading-relaxed">
                                            Publishing while reset is armed will erase every attendance entry and regenerate your timetable from the new start date.
                                        </p>
                                        <div>
                                            <label className="text-xs font-medium text-muted-foreground block mb-1">End Date</label>
                                            <input
                                                type="date"
                                                value={endDate}
                                                onChange={e => setEndDate(e.target.value)}
                                                className="input text-sm"
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-muted/50 to-card p-4 shadow-inner">
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">Start Date</p>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-base font-semibold text-foreground">{lockedStartLabel}</span>
                                                        <CalendarDays className="w-4 h-4 text-muted-foreground" />
                                                    </div>
                                                    <p className="text-[11px] text-muted-foreground mt-2">Locked after your first publish.</p>
                                                </div>
                                                <button
                                                    onClick={beginResetFlow}
                                                    className="text-[10px] uppercase tracking-wide text-destructive font-semibold"
                                                >
                                                    Reset
                                                </button>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-xs font-medium text-muted-foreground block mb-1">End Date</label>
                                            <input
                                                type="date"
                                                value={endDate}
                                                onChange={e => setEndDate(e.target.value)}
                                                className="input text-sm"
                                            />
                                        </div>
                                    </div>
                                )
                            ) : (
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-xs font-medium text-muted-foreground block mb-1">Start Date</label>
                                        <input
                                            type="date"
                                            value={startDate}
                                            onChange={e => setStartDate(e.target.value)}
                                            className={`input text-sm ${initialStartDate && startDate !== initialStartDate ? 'border-amber-500' : ''}`}
                                        />
                                        {initialStartDate && startDate !== initialStartDate && (
                                            <p className="text-[10px] text-amber-600 mt-1 font-medium leading-tight">
                                                Warning: Changing the start date will require a full reset of all attendance data.
                                            </p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-muted-foreground block mb-1">End Date</label>
                                        <input
                                            type="date"
                                            value={endDate}
                                            onChange={e => setEndDate(e.target.value)}
                                            className="input text-sm"
                                        />
                                    </div>
                                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                                        Pick your initial semester window. You can extend the end date later without touching past attendance.
                                    </p>
                                </div>
                            )}

                            <div className="rounded-2xl border border-dashed border-border/70 p-3 bg-muted/30 space-y-2">
                                <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground">
                                    <span>Holidays ({holidays.length})</span>
                                    <button
                                        className="text-[10px] uppercase tracking-wide text-accent font-semibold"
                                        onClick={() => navigate('/calendar')}
                                    >
                                        Manage
                                    </button>
                                </div>
                                <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                                    {holidays.length === 0 ? (
                                        <p className="text-xs text-muted-foreground/80">No breaks added yet.</p>
                                    ) : (
                                        holidays.map((h, i) => (
                                            <div key={i} className="flex justify-between items-start bg-card/80 p-2 rounded-xl text-xs border border-border/50">
                                                <div>
                                                    <div className="font-medium text-foreground">{h.reason}</div>
                                                    <div className="text-muted-foreground">{dayjs(h.startDate).format('DD MMM YYYY')}</div>
                                                </div>
                                                <button
                                                    onClick={() => setHolidays(holidays.filter((_, idx) => idx !== i))}
                                                    className="btn-ghost text-muted-foreground hover:text-destructive p-1"
                                                    title="Remove Holiday"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            <button
                                onClick={handlePublishClick}
                                className="btn-accent w-full py-3 flex items-center justify-center text-sm font-semibold rounded-2xl shadow-lg shadow-accent/20"
                            >
                                <Save className="w-4 h-4 mr-2" />
                                Publish
                            </button>
                            <p className="text-[11px] text-muted-foreground leading-relaxed">
                                {hasPublishedWindow
                                    ? 'Publishing reuses existing classes, trims future ones if needed, and only adds extra weeks beyond your last end date.'
                                    : 'Publishing will generate occurrences for the selected date range.'}
                            </p>
                        </>
                    ) : (
                        <p className="text-xs text-muted-foreground text-center">Unlock to edit or publish.</p>
                    )}
                </div>
            </div>
            <DragOverlay>
                {activeDrag ? (
                    <div className="card p-2 shadow-xl opacity-90 rotate-3">
                         {activeDrag.subject.name} ({activeDrag.sessionType})
                    </div>
                ) : null}
            </DragOverlay>

            <PublishModal
                isOpen={publishModal.isOpen}
                step={publishModal.step}
                message={publishModal.message}
                onConfirm={handleModalConfirm}
                onCancel={handleModalCancel}
                onClose={handleModalCancel}
            />
        </DndContext>
    );
};

export default TimetablePage;
