-- Add Bolna agent configuration to organizations for multi-hospital support
ALTER TABLE organizations 
  ADD COLUMN IF NOT EXISTS bolna_agent_id text,
  ADD COLUMN IF NOT EXISTS bolna_agent_id_hindi text,
  ADD COLUMN IF NOT EXISTS voice_enabled boolean DEFAULT true;

-- Add comment for clarity
COMMENT ON COLUMN organizations.bolna_agent_id IS 'Bolna AI Agent ID for English calls (per-hospital customization)';
COMMENT ON COLUMN organizations.bolna_agent_id_hindi IS 'Bolna AI Agent ID for Hindi calls (per-hospital customization)';
COMMENT ON COLUMN organizations.voice_enabled IS 'Whether voice calls are enabled for this organization';