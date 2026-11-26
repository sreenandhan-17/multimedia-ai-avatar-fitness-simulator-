# Issue #9 — Build the dashboard page

Branch: `feature/9-dashboard`
Spec: Phase 6 in `IMPLEMENTATION_PLAN.md`.

## Why

The dashboard is the biggest missing piece for the mid-review. It shows a user
their workout history, pulled only through `client/src/services/sessions.js`
(already merged — KRB's PRs #11/#23/#25).

## Data contract (already available, no waiting needed)

```js
// client/src/services/sessions.js — every function is async
saveSession(session)    -> Promise<void>
getSessions()           -> Promise<Session[]>   newest first
getSessionsSince(days)  -> Promise<Session[]>   days = 7, 30, or null for all
addSampleSessions()     -> Promise<void>        dev only
clearSessions()         -> Promise<void>

Session = {
  id: "1732441200000",
  date: "2026-11-24T10:20:00.000Z",
  exerciseId: "squat",
  sets: 3, reps: 45, accuracy: 82, avgTempo: 2.8, durationSeconds: 540,
  mistakes: { "Go lower": 4, "Slow down": 2 }
}
```

## Files to add / touch

- `client/src/pages/DashboardPage.jsx` (new)
- `client/src/pages/DashboardPage.css` (new)
- `client/src/components/TopBar.jsx` — add the Dashboard nav link only
- `client/src/App.jsx` — add the protected `/dashboard` route only

Do not touch `client/src/pose/`, `motionStateMachine.js`, or `exercises.json`.
Reuse existing CSS variables and card/button patterns already used in
`WorkoutPage.css` (`--color-bg`, `--color-surface`, `--color-border`,
`--color-accent`, etc.) so the page matches the rest of the app.

## Step-by-step plan

1. **Route + nav**
   - Add `<Route path="/dashboard" element={<ProtectedRoute><DashboardPage .../></ProtectedRoute>} />` in `App.jsx`, following the pattern of the other protected routes.
   - Add a "Dashboard" link in `TopBar.jsx` next to the existing Tutorial link.

2. **Page shell + data loading**
   - `DashboardPage.jsx` holds filter state (`7 | 30 | null`), a `sessions` state, and a `loading` state.
   - On mount and whenever the filter changes, `await getSessionsSince(filterDays)` and store the result.
   - Show a loading state while the call is in flight, and an empty state ("No sessions yet — finish a workout or add sample sessions") when the list is empty.

3. **Totals row**
   - From the filtered sessions, compute: total reps (sum `reps`), total sets (sum `sets`), average accuracy (mean of `accuracy`, rounded).
   - Render as three small stat cards, matching the `.summary-stat-box` style used in `WorkoutPage.css`.

4. **Progression chart (plain SVG, no chart library)**
   - A toggle switches between two views of the same filtered sessions:
     - Accuracy per session → line chart (x = session order/date, y = accuracy 0-100).
     - Reps per day → bar chart (x = day, y = reps summed per day).
   - Keep the chart in its own small component, e.g. `components/ProgressionChart.jsx`, so `DashboardPage.jsx` stays short.
   - Use `--color-accent` for the line/bars and `--color-border`/`--color-text-muted` for axes and labels. Handle both themes (no hardcoded colors).

5. **Streak calendar**
   - Small component, e.g. `components/StreakCalendar.jsx`.
   - Render a grid of the last ~30 days (or fewer if filter is 7 days), marking which days have at least one session.
   - Compute the current streak (consecutive days up to today with a session) and show it as a number above the grid.

6. **Common mistakes list**
   - Aggregate the `mistakes` maps across the filtered sessions, grouped by `exerciseId` (or overall if that's simpler to start).
   - Show the top few mistakes with their counts, sorted descending.

7. **Next-session suggestion**
   - Simple rule-based text, computed from the most recent session (or recent average):
     - accuracy ≥ 85% → suggest adding reps or a set.
     - accuracy < 70% → suggest fewer reps and focus on the top mistake.
     - avgTempo < 2.5s → suggest slowing down.
   - Show one suggestion line; if multiple rules match, pick the most important (accuracy rules before tempo).

8. **Filter + dev tools**
   - Render 7 days / 30 days / all time buttons that update filter state.
   - Dev-only "Add sample sessions" button that calls `addSampleSessions()` and reloads the list (only show in dev, e.g. guard with `import.meta.env.DEV`).

9. **Responsive + theme check**
   - Verify the layout at 360px width: stat cards and chart should stack, nothing should overflow horizontally.
   - Verify on a laptop width: side-by-side layout for chart/calendar is fine.
   - Check both light and dark themes.

10. **Final check (no console errors)**
    - Open dev tools console while loading the dashboard, toggling filters, switching chart view, and clicking "Add sample sessions" / "Clear sessions" (if you wire one in for testing) — confirm nothing errors.

## Done when

- The 7 days / 30 days / all time filter works.
- The chart toggle (accuracy vs reps) works.
- Totals, streak calendar, common mistakes, and suggestion all render from real `sessions.js` data.
- Looks right in both themes, at 360px and on a laptop.
- No console errors.

## Commit style

Small commits, each ending in `(#9)`. Open the PR with "Closes #9" when ready.
