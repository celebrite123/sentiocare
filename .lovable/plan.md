

# Fix Plan: B2B Dashboard Updates & Authentication Stability

## Issues Identified

### Issue 1: Webhook Not Processing Calls
**Error:** `Missing patient_id or organization_id in user_data`

The webhook is receiving data from Bolna, but the `user_data` that was passed during call initiation is NOT returned at the top level of the webhook payload. Looking at the B2C webhook (which works), it extracts data from multiple locations:

```javascript
// B2C webhook - checks multiple locations
const elderId = 
  context_details?.recipient_data?.elder_id ||
  context_details?.user_data?.elder_id ||
  user_data?.elder_id ||
  payload.recipient_data?.elder_id ||
  payload.metadata?.elder_id ||
  payload.elder_id;
```

However, the B2B webhook only checks `user_data?.patient_id` directly.

**Solution:** Create a `b2b_pending_calls` table to store the `execution_id` → `patient_id` + `organization_id` mapping when initiating calls. Then modify the webhook to look up patient context from this table using the `execution_id` from the webhook payload.

---

### Issue 2: Excessive Website Refreshing
**Symptoms:** 
- Tab switching causes page reload
- Refresh redirects to login page
- State loss during navigation

**Root Cause:** Race condition in `AuthContext.tsx` where both `onAuthStateChange` listener and `getSession()` can run simultaneously and set `loading` to `false` at unpredictable times:

```javascript
// CURRENT (problematic)
useEffect(() => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);  // ❌ Can fire before getSession completes
    }
  );

  supabase.auth.getSession().then(({ data: { session } }) => {
    setSession(session);
    setUser(session?.user ?? null);
    setLoading(false);  // ❌ Can fire before listener is ready
  });
  // ...
});
```

**Solution:** Separate initial load from ongoing changes:
1. Use `getSession()` for initial load with proper `isLoading` control
2. Use `onAuthStateChange` only for ongoing auth events (NOT controlling `isLoading`)
3. Add mounted flag to prevent state updates after unmount

---

## Technical Implementation

### Step 1: Create `b2b_pending_calls` Table

```sql
CREATE TABLE b2b_pending_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id TEXT NOT NULL UNIQUE,
  patient_id UUID NOT NULL REFERENCES discharged_patients(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  call_type TEXT DEFAULT 'health_check',
  day_number INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMPTZ
);

CREATE INDEX idx_pending_calls_execution ON b2b_pending_calls(execution_id);

-- RLS policy
ALTER TABLE b2b_pending_calls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role only" ON b2b_pending_calls FOR ALL USING (false);
```

### Step 2: Update `run-scheduled-b2b-calls` Edge Function

After successfully initiating a call, store the execution_id mapping:

```javascript
const bolnaData = await bolnaResponse.json();
const executionId = bolnaData.execution_id || bolnaData.call_id || bolnaData.id;

// Store mapping for webhook lookup
await supabase.from("b2b_pending_calls").insert({
  execution_id: executionId,
  patient_id: patient.id,
  organization_id: org.id,
  call_type: callType,
  day_number: dayNumber,
});
```

### Step 3: Update `b2b-bolna-webhook` Edge Function

Change how it extracts patient context:

```javascript
// Extract execution ID from webhook payload
const executionId = payload.id || payload.execution_id || payload.call_id;

// First try user_data (in case Bolna returns it)
let patientId = payload.user_data?.patient_id || 
                payload.context_details?.user_data?.patient_id ||
                payload.recipient_data?.patient_id;
let organizationId = payload.user_data?.organization_id ||
                     payload.context_details?.user_data?.organization_id ||
                     payload.recipient_data?.organization_id;

// Fallback: look up from b2b_pending_calls table
if ((!patientId || !organizationId) && executionId) {
  const { data: pendingCall } = await supabase
    .from("b2b_pending_calls")
    .select("patient_id, organization_id, call_type, day_number")
    .eq("execution_id", executionId)
    .single();

  if (pendingCall) {
    patientId = pendingCall.patient_id;
    organizationId = pendingCall.organization_id;
    callType = pendingCall.call_type;
    dayNumber = pendingCall.day_number;
  }
}

// Mark as processed
if (executionId) {
  await supabase.from("b2b_pending_calls")
    .update({ processed: true, processed_at: new Date().toISOString() })
    .eq("execution_id", executionId);
}
```

### Step 4: Fix `AuthContext.tsx` Race Condition

```javascript
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;

    // Listener for ONGOING auth changes (does NOT control isLoading)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!isMounted) return;
        setSession(session);
        setUser(session?.user ?? null);
        // DO NOT set loading here - only update state
      }
    );

    // INITIAL load (controls isLoading)
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!isMounted) return;
        setSession(session);
        setUser(session?.user ?? null);
      } catch (error) {
        console.error('Error getting session:', error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    initializeAuth();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // ... rest of the component
};
```

---

## Files to Modify

| File | Change |
|------|--------|
| `supabase/functions/run-scheduled-b2b-calls/index.ts` | Store execution_id → patient mapping after call initiation |
| `supabase/functions/b2b-bolna-webhook/index.ts` | Look up patient context from `b2b_pending_calls` table |
| `src/contexts/AuthContext.tsx` | Fix race condition with proper initial load handling |
| Database migration | Create `b2b_pending_calls` table |

---

## Expected Results After Fix

### Webhook Processing
- Edge function logs will show: `Found pending call for execution_id: xxx`
- Patient check-ins will be created with correct patient_id and organization_id
- Dashboard will update with call results

### Authentication Stability
- No more redirects to login on page refresh
- Tab switching won't cause state loss
- Smooth navigation without unnecessary reloads

---

## Testing Plan

1. **Webhook Test:**
   - Go to B2B Dashboard → Patient List
   - Click "Call Now" on a patient
   - Answer the call and complete it
   - Verify dashboard updates within 30 seconds

2. **Auth Stability Test:**
   - Log in to B2B dashboard
   - Switch to another tab for 1 minute
   - Switch back - should remain logged in
   - Press browser refresh - should stay on dashboard (not redirect to login)

