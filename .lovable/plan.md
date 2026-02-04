

# Fix: Call Recording Playback in B2B Dashboard

## Investigation Summary

The `proxy-recording` edge function is actually working - analytics show successful `200` responses when called from the browser. However, there are two potential issues:

1. **RLS Access Issue**: The `url` parameter approach requires matching the URL in `patient_checkins` table with RLS. If the user's organization membership doesn't allow access, the query fails.

2. **Frontend Approach**: Currently the frontend passes `url=` which requires a database lookup. Using `patientCheckinId=` would be more direct and reliable.

## Technical Fix

### Change 1: Update Frontend to Use `patientCheckinId`

**File:** `src/pages/b2b/PatientDetail.tsx`
**Location:** Lines 766-767

Instead of passing the raw URL which requires a lookup:
```typescript
// Current - requires DB lookup with RLS
`proxy-recording?url=${encodeURIComponent(checkin.recording_url)}`

// Better - direct lookup by check-in ID
`proxy-recording?patientCheckinId=${checkin.id}`
```

This change:
- Queries by primary key (faster)
- Uses the same RLS check but simpler
- Avoids URL encoding issues

### Files to Modify

| File | Change |
|------|--------|
| `src/pages/b2b/PatientDetail.tsx` | Use `patientCheckinId` instead of `url` parameter |

### Expected Behavior After Fix

1. Click play on a recording in patient check-in history
2. Frontend calls `proxy-recording?patientCheckinId=<uuid>`
3. Edge function queries `patient_checkins` by ID with user's RLS
4. If user is in the organization, returns the recording audio
5. Audio plays successfully

### Why This Works Better

- The `patientCheckinId` approach is already implemented in the edge function
- Primary key lookup is more reliable than URL string matching
- RLS on `patient_checkins` table already verifies organization membership
- No URL encoding/decoding issues with special characters

