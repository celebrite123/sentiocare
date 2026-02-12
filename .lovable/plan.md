
# Add Pilot Proof Metrics to Admin Center

## Why This Matters
The competition feedback is clear: generic stats like "62 check-ins" prove nothing. Investors and judges want to see weekly pickup rate trends, escalation accuracy, medication verification rates, and whether families actually engaged -- the metrics that prove the product works over time.

## What Gets Added

### 1. New "Pilot Metrics" Tab in Admin Center
A dedicated tab (alongside Analytics, B2B, Blog) that shows the hard evidence a pilot needs to present.

### 2. Weekly Pickup Rate Trend Chart
- Shows pickup rate (calls answered / calls attempted) by week
- Data already exists in `call_attempts` table (status = 'answered' vs total)
- Line chart showing whether rates held steady, improved, or degraded over time
- Current data: Week 1: 37.5%, Week 2: 63.9%, Week 3: 5.4%, Week 4: 65.4%

### 3. Escalation Accuracy Panel
- Total escalations triggered: 17 alerts
- Resolved (acted upon by caregiver): 13 (76.5%)
- Still pending: 4
- By severity breakdown (High: 1, Medium: 16)
- "False positive" proxy: alerts resolved within 1 hour (likely non-issues) vs alerts that took action
- Real emergencies caught: high-severity alerts that were resolved

### 4. Medication Adherence Verification Card
- Total completed check-ins where medication status was asked: 60
- Successfully verified (yes/no answer captured): 59 (98.3%)
- Took medicines: 42 (71.2%)
- Missed medicines: 17 (28.8%)
- Unknown/not captured: 1 (1.7%)

### 5. Family Engagement Metrics
- Notification settings configured: 7 families (100% of active elders have caregiver notifications ON)
- Alert notifications enabled: 7/7
- Weekly summary enabled: 7/7
- Missed check-in notifications: 7/7
- This proves families opted in and found value

### 6. Elder-Level Pilot Summary Table
- Per-elder breakdown: name, total calls attempted, answered, pickup rate, avg wellbeing, medicines taken rate, alerts triggered
- Sortable by any column
- Shows which elders are engaged vs which need attention

### 7. Wellbeing Score Trend (Weekly Average)
- Weekly average wellbeing score trend to show if the system maintains or improves elder wellbeing over time

---

## Technical Details

### Backend: Update `admin-analytics` Edge Function
**File:** `supabase/functions/admin-analytics/index.ts`

Add new queries to compute:
- Weekly pickup rates from `call_attempts` (group by week, status = 'answered' / total)
- Per-elder stats: join `elders` with `check_ins` and `call_attempts` for individual breakdowns
- Medication verification rate from `check_ins` (medicines_taken IS NOT NULL / total completed)
- Alert resolution timing: compare `created_at` to when `resolved = true` was set (use `updated_at` if available on alerts table or fallback to current data)
- Family engagement: count notification_settings records with flags enabled
- Weekly wellbeing averages from `check_ins`

New response fields added to the analytics object:
```
pilotMetrics: {
  weeklyPickupRates: [{ week, totalAttempts, answered, pickupRate }],
  medicationVerification: { total, verified, tookMeds, missedMeds, unknown, verificationRate, adherenceRate },
  escalationAccuracy: { total, resolved, pending, resolvedQuickly, highSeverity, resolutionRate },
  familyEngagement: { totalFamilies, alertsEnabled, weeklySummaryEnabled, missedCheckinEnabled, engagementRate },
  elderBreakdown: [{ name, callsAttempted, callsAnswered, pickupRate, avgWellbeing, medsTakenRate, alertsTriggered }],
  weeklyWellbeing: [{ week, avgScore, count }]
}
```

### Frontend: New Component + Tab

**New file:** `src/components/admin/PilotMetrics.tsx`
- Receives the `pilotMetrics` data from the analytics response
- Weekly Pickup Rate: Line chart (Recharts) with percentage on Y-axis, weeks on X-axis
- Escalation Accuracy: Card with donut chart (resolved vs pending) + severity breakdown
- Medication Verification: Card with progress bars showing verification rate and adherence rate
- Family Engagement: Simple stat cards showing opt-in rates
- Elder Breakdown: Sortable table with per-elder metrics
- Weekly Wellbeing Trend: Line chart showing average scores over time

**Modified file:** `src/pages/AdminCenter.tsx`
- Add "Pilot Metrics" tab with a beaker/target icon
- Import and render `PilotMetrics` component
- Update `AnalyticsData` interface to include `pilotMetrics`

### Files Changed

| File | Change |
|------|--------|
| `supabase/functions/admin-analytics/index.ts` | Add pilot metric queries (call_attempts weekly, per-elder stats, medication rates, family engagement) |
| `src/components/admin/PilotMetrics.tsx` | New component with 6 metric sections |
| `src/pages/AdminCenter.tsx` | Add Pilot Metrics tab, update interface |

### No Database Changes Required
All data already exists in `call_attempts`, `check_ins`, `alerts`, `notification_settings`, and `elders` tables.
