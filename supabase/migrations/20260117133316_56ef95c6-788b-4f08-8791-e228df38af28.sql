-- Add raw_transcript column to check_ins for storing full unprocessed transcripts
ALTER TABLE public.check_ins ADD COLUMN IF NOT EXISTS raw_transcript TEXT;

-- Add monitoring_responses column to check_ins for AI-extracted answers
ALTER TABLE public.check_ins ADD COLUMN IF NOT EXISTS monitoring_responses JSONB DEFAULT '{}';

-- Add monitoring_config column to elders for storing custom health monitoring preferences
ALTER TABLE public.elders ADD COLUMN IF NOT EXISTS monitoring_config JSONB DEFAULT '{"topics": [], "custom_questions": []}';

-- Add comment for documentation
COMMENT ON COLUMN public.check_ins.raw_transcript IS 'Full unprocessed transcript from voice calls for display when parsed logs are empty';
COMMENT ON COLUMN public.check_ins.monitoring_responses IS 'AI-extracted responses to monitoring topics and custom questions';
COMMENT ON COLUMN public.elders.monitoring_config IS 'Custom health monitoring configuration: topics array and custom_questions array';