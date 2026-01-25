-- Performance Indexes for Production Speed

-- Index for check_ins: heavily queried by elder_id + date range
CREATE INDEX IF NOT EXISTS idx_check_ins_elder_date ON check_ins(elder_id, created_at DESC);

-- Index for whatsapp_messages: queried by conversation with ordering
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_conversation ON whatsapp_messages(conversation_id, created_at ASC);

-- Index for alerts: queried by elder + resolved status
CREATE INDEX IF NOT EXISTS idx_alerts_elder_resolved ON alerts(elder_id, resolved, created_at DESC);

-- Index for health_metrics: queried by elder + date
CREATE INDEX IF NOT EXISTS idx_health_metrics_elder_date ON health_metrics(elder_id, recorded_at DESC);

-- Index for medicines: queried by elder + active status
CREATE INDEX IF NOT EXISTS idx_medicines_elder_active ON medicines(elder_id, active);

-- Index for call_attempts: queried by elder + status
CREATE INDEX IF NOT EXISTS idx_call_attempts_elder_status ON call_attempts(elder_id, status, created_at DESC);