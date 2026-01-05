  # Performance Logging Guide

This project includes lightweight `[PERF]` logs on the backend so you can measure how long each major action takes in production (e.g. on Vercel).

## Where to View Logs

- Open your project in the Vercel dashboard.
- Go to the **Logs** (or **Functions**) tab.
- Select the appropriate environment (Production / Preview).
- Filter logs by the keyword `PERF`.

## Example Log Lines

Examples you might see:

```text
[PERF] getDashboard <userId> 92 ms
[PERF] getAttendanceByDate <userId> 74 ms
[PERF] getPendingAttendance <userId> 15 ms pending: 3
[PERF] publishTimetable <userId> 430 ms { autoMarkedCount: 25, weeklySlotCount: 12, holidayCount: 3 }
[PERF] getHolidays <userId> 18 ms count: 5
[PERF] getSubjects <userId> 20 ms count: 6
[PERF] updateProfile <userId> 31 ms { isTimetableLocked: true }
```

Each line is structured as:

```text
[PERF] <handlerName> <userId> <elapsedMs> ms [extra context]
```

- `handlerName` – which controller function ran (maps to a specific page/action).
- `elapsedMs` – how long that request took **inside your code and MongoDB**, after the function was warm.
- Extra context – counts or flags (e.g. number of subjects, holidays, auto-marked records).

## What Each Handler Corresponds To

- `getDashboard` – Dashboard page overall stats.
- `getAttendanceByDate` – Today page and next/previous day navigation.
- `getPendingAttendance`, `acknowledgePending` – Unmarked attendance alert and its "OK"/review actions.
- `publishTimetable`, `getOccurrences`, `getTimetable`, `saveTimetable` – Timetable editor and publish flow.
- `getHolidays`, `createHoliday`, `deleteHoliday` – Calendar (holidays list, add, remove).
- `getProfile`, `updateProfile` – Profile/lock toggle (`isTimetableLocked`).
- `getSubjects`, `createSubject`, `updateSubject`, `deleteSubject` – Subjects page CRUD.

## How to Interpret Timings

As a rough guide (for **warm** functions):

- **Good**: `< 150 ms` – normal dashboard/today/subjects/profile/holidays requests.
- **Heavy but OK**: `200–600 ms` – publish timetable, acknowledge-all, very large ranges.
- **Suspicious**: consistently `> 600 ms` for the same action and user, even when repeating it quickly.

Remember: serverless cold start + network can still add ~500–1500 ms **before** your handler runs. If the UI feels slow but the `[PERF]` line shows e.g. `80 ms`, most of the delay is platform/network, not your MongoDB or business logic.

## How to Use This When Debugging

1. Open the deployed app and the Vercel logs side by side.
2. Trigger an action (load dashboard, move to next day on Today page, publish timetable, add holiday, lock/unlock, create subject).
3. Look for the corresponding `[PERF]` line and note the `ms` value.
4. Trigger the same action again a few seconds later (still warm) and compare timings.
5. If a specific handler shows high values while warm, that handler is the right place to optimize next.

You can share a small sample of `[PERF]` lines for any slow-feeling action, and we can target that handler specifically for further optimization.
