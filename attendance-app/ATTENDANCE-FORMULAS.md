# Attendance Math Guide

This document captures the exact calculations used across the dashboard, Today view, and subject detail screens. Every metric comes directly from the helpers inside `backend/src/services/attendance.service.js`.

## Key Terms

- **Lecture unit**: Hard-coded weight of `1` for every lecture occurrence.
- **Lab unit**: Configurable weight (`labUnitValue`) per user, clamped between `1` and `4`. For example, if your lab counts as two lectures, the weight is `2`.
- **Occurrence**: A single scheduled class pulled from the timetable (or created manually via extra class). Each occurrence knows its `sessionType` (`lecture`/`lab`).
- **Current load**: Weighted total of all occurrences up to *today* (inclusive).
- **Present units**: Sum of weights for occurrences that have an attendance record with `present: true`.
- **Absent units**: `currentLoad - presentUnits`. Includes classes auto-marked as absent when the user never responded.
- **Semester load**: Weighted total of **all** occurrences for the term window, regardless of date.

## Core Formulas

Let $L$ be the number of lecture occurrences, $B$ the number of lab occurrences, $w_{lab}$ the configured lab-unit weight, and $p$ the attendance threshold (default $75$).

1. **Total semester load**
   $$\text{totalLoad} = (L \times 1) + (B \times w_{lab})$$
   Reference: aggregation in [backend/src/services/attendance.service.js](backend/src/services/attendance.service.js#L9-L205).

2. **Current load (till today)**
   $$\text{currentLoad} = \sum_{occ \le today} \text{unitWeight}(occ)$$
   where unitWeight is `1` for lectures and $w_{lab}$ for labs.

3. **Present units**
   $$\text{presentUnits} = \sum_{occ \le today,\ present} \text{unitWeight}(occ)$$

4. **Absent units**
   $$\text{absentUnits} = \text{currentLoad} - \text{presentUnits}$$
   Auto-missed classes increment this value immediately (see auto-mark section below).

5. **Attendance percentage**
   $$\text{attendance\%} = \frac{\text{presentUnits}}{\text{currentLoad}} \times 100$$

6. **Required classes for threshold**
   $$\text{requiredClasses} = \lceil \text{totalLoad} \times \frac{p}{100} \rceil$$

7. **Semester bunk budget**
   $$\text{semesterBudget} = \text{totalLoad} - \text{requiredClasses}$$

8. **Remaining allowed bunks**
   $$\text{remainingAllowed} = \text{semesterBudget} - \text{absentUnits}$$

All dashboards and subject cards surface these exact numbers (or derivatives like "safe to miss" or "need to attend").

## Auto-Marking Missed Classes

When a day ends and an occurrence has no manual record, it gets auto-inserted with `present: false` and `isAutoMarked: true`. This happens inside `autoMarkMissedClasses()` and is triggered every time the app queries pending attendance (dashboard alert).

Effects:
- Those auto records immediately contribute to `absentUnits` and the percentage math above.
- If the user later reviews and toggles an entry to present, the system updates the existing record and clears `isAutoMarked`.

## Extra Classes & Lab Weighting

Extra/adhoc classes use the same pipelines:
- Creating an extra class inserts a new `Occurrence` with `sessionType` set to the chosen value and `isAdhoc: true` (see [backend/src/controllers/attendance.controller.js](backend/src/controllers/attendance.controller.js#L214-L285)).
- Stat queries never filter out adhoc occurrences—they only skip `isExcluded: true`. Therefore extra lectures and labs immediately change the semester load, present/absent units, and bunk budget.
- Because each occurrence carries its `sessionType`, lab weighting ($w_{lab}$) still applies. A lab extra class in a "2 units" system adds two units to every formula (and to both total and current loads).

In short, **anything that shows up on the dashboard calendar (including extra sessions) participates in attendance math using the exact lecture/lab unit weights you configured**.
