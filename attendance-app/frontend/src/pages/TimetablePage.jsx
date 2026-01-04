import { useState, useEffect, useMemo } from 'react';
import { useSWRConfig } from 'swr';
import { Link } from 'react-router-dom';
import { DndContext, DragOverlay } from '@dnd-kit/core';
import api, { subjectApi, userApi } from '../services/api';
import { useSubjects, useUserProfile, useTimetable, useHolidays } from '../hooks/useAttendanceData';
import DraggableSubject from '../components/TimetableEditor/DraggableSubject';
import DroppableCell from '../components/TimetableEditor/DroppableCell';
import { Loader2, Save, Lock, Unlock, X } from 'lucide-react';
import dayjs from 'dayjs';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const HOURS = Array.from({ length: 11 }, (_, i) => i + 8); // 8 to 18

const TimetablePage = () => {
    // SWR Hooks
    const { subjects = [] } = useSubjects();
    const { user, mutate: mutateUser } = useUserProfile();
    const { holidays: serverHolidays } = useHolidays(); // Read-only from server initially
    const { slots: serverSlots, loading: slotsLoading, mutate: mutateTimetable } = useTimetable();
    const { mutate: globalMutate } = useSWRConfig();

    // Derived State
    const isLocked = user && user.isTimetableLocked;

    // Local State
    const [slots, setSlots] = useState([]);
    const [startDate, setStartDate] = useState('2025-12-22');
    const [endDate, setEndDate] = useState('2026-04-18');
    const [holidays, setHolidays] = useState([]); // Local editable state
    const [activeDrag, setActiveDrag] = useState(null);
    const [initialStartDate, setInitialStartDate] = useState(null);

    // Sync User Profile & Holidays
    useEffect(() => {
        if (user) {
             const userStart = user.semesterStartDate ? dayjs(user.semesterStartDate).format('YYYY-MM-DD') : null;
             if (userStart) {
                 setStartDate(userStart);
                 setInitialStartDate(userStart);
             }
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
                     alert("Lab requires 2 consecutive slots!");
                     return;
                 }
                 if (hour >= 18) {
                     alert("Lab cannot fit at the end of the day!");
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
            await userApi.updateProfile({ isTimetableLocked: newState });
            mutateUser();
        } catch (err) {
            alert("Failed to update lock status");
        }
    };

     const handlePublish = async (forceReset = false) => {
          // Transform slots to API format
          const payload = {
              startDate,
              endDate,
              forceReset,
              weeklySlots: slots.map(s => ({
                  dayOfWeek: DAYS.indexOf(s.day) + 1,
                  startHour: s.hour,
                  durationHours: s.sessionType === 'lab' ? 2 : 1,
                  sessionType: s.sessionType,
                  subjectId: s.subject._id
              })),
              holidays: holidays
          };

          try {
              await api.post('/timetable', { slots: payload.weeklySlots }); // Save template
              const res = await api.post('/timetable/publish', { ...payload, confirmAutoMark: false });

              if (res.data.requiresConfirmation) {
                  if (confirm(res.data.message)) {
                      await api.post('/timetable/publish', { ...payload, confirmAutoMark: true });
                      alert("Published & Auto-Marked!");
                      // Invalidate everything as this changes attendance
                      globalMutate(key => true); // Invalidate ALL SWR keys (safest for major operation)
                  }
              } else {
                  alert("Published successfully!");
                  setInitialStartDate(startDate); // Update local initial state
                  globalMutate('/stats/dashboard?threshold=75'); // Invalidate dashboard
              }
          } catch (err) {
              if (err.response?.status === 409 && err.response.data.requiresForceReset) {
                  if (confirm(err.response.data.message)) {
                      handlePublish(true); // Retry with forceReset
                  }
              } else {
                  alert("Error: " + (err.response?.data?.message || err.message));
              }
          }
     };

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="flex h-[calc(100vh-100px)] gap-3">
                {/* Sidebar Palette - Compact */}
                <div className="w-44 flex flex-col card p-3 overflow-y-auto shrink-0">
                    <h3 className="font-semibold text-foreground mb-4">Subjects</h3>
                    {isLocked ? (
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-center py-8">
                            <Lock className="w-8 h-8 mb-2 opacity-50" />
                            <p className="text-sm font-medium">Configuration Locked</p>
                            <p className="text-xs opacity-70 mt-1">Unlock to make changes</p>
                        </div>
                    ) : (
                        <>
                            {subjects.map(sub => {
                                const placedLec = slots.filter(s => s.subject._id === sub._id && s.sessionType === 'lecture').length;
                                const placedLab = slots.filter(s => s.subject._id === sub._id && s.sessionType === 'lab').length;

                                const remainingLec = (sub.lecturesPerWeek || 0) - placedLec;
                                const remainingLab = (sub.labsPerWeek || 0) - placedLab;

                                if (remainingLec <= 0 && remainingLab <= 0) return null;

                                return (
                                    <div key={sub._id}>
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
                            })}
                            {subjects.length === 0 && (
                                <div className="text-center py-8">
                                    <p className="text-sm text-muted-foreground mb-4">No subjects yet.</p>
                                    <Link to="/subjects" className="btn-primary text-xs py-2 block">
                                        Create Subjects
                                    </Link>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Grid */}
                <div className="flex-1 overflow-auto card flex flex-col">
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
                <div className="w-44 card p-3 h-fit shrink-0">
                    <h3 className="font-semibold text-foreground mb-4">Configuration</h3>

                    <button
                        onClick={toggleLock}
                        className={`btn-secondary w-full py-2 mb-6 flex items-center justify-center text-xs font-bold ${isLocked ? 'bg-accent/10 text-accent border-accent/30' : ''}`}
                    >
                        {isLocked ? (
                            <><Unlock className="w-4 h-4 mr-2" /> Unlock Config</>
                        ) : (
                            <><Lock className="w-4 h-4 mr-2" /> Lock Config</>
                        )}
                    </button>

                    {!isLocked && (
                        <>
                            <div className="space-y-4 mb-6">
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
                            </div>

                            <div className="mb-6 border-t border-border pt-4">
                                 <label className="text-xs font-medium text-muted-foreground block mb-2">Holidays ({holidays.length})</label>
                                 <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                                     {holidays.map((h, i) => (
                                         <div key={i} className="flex justify-between items-start bg-muted p-2 rounded-lg text-xs border border-border">
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
                                     ))}
                                 </div>
                            </div>

                            <button
                                onClick={() => handlePublish(false)}
                                className="btn-accent w-full py-2 flex items-center justify-center text-xs font-bold"
                            >
                                <Save className="w-3.5 h-3.5 mr-1.5" />
                                Publish
                            </button>
                            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                                Publishing will generate occurrences for the selected date range.
                            </p>
                        </>
                    )}
                     {isLocked && <p className="text-xs text-muted-foreground text-center">Unlock to edit or publish.</p>}
                </div>
            </div>
            <DragOverlay>
                {activeDrag ? (
                    <div className="card p-2 shadow-xl opacity-90 rotate-3">
                         {activeDrag.subject.name} ({activeDrag.sessionType})
                    </div>
                ) : null}
            </DragOverlay>
        </DndContext>
    );
};

export default TimetablePage;
