-- First, delete orphaned data for the duplicate profiles

-- Delete whatsapp_messages for conversations belonging to duplicate elders
DELETE FROM whatsapp_messages WHERE conversation_id IN (
  SELECT id FROM whatsapp_conversations WHERE elder_id IN (
    'ba0485fb-8229-4cf3-a3d9-e910484bad33',
    '48ac5572-2deb-4f57-b84a-034f16b8dd26'
  )
);

-- Delete whatsapp_conversations for duplicate elders
DELETE FROM whatsapp_conversations WHERE elder_id IN (
  'ba0485fb-8229-4cf3-a3d9-e910484bad33',
  '48ac5572-2deb-4f57-b84a-034f16b8dd26'
);

-- Delete conversation_logs for check-ins belonging to duplicate elders
DELETE FROM conversation_logs WHERE check_in_id IN (
  SELECT id FROM check_ins WHERE elder_id IN (
    'ba0485fb-8229-4cf3-a3d9-e910484bad33',
    '48ac5572-2deb-4f57-b84a-034f16b8dd26'
  )
);

-- Delete check_ins for duplicate elders
DELETE FROM check_ins WHERE elder_id IN (
  'ba0485fb-8229-4cf3-a3d9-e910484bad33',
  '48ac5572-2deb-4f57-b84a-034f16b8dd26'
);

-- Delete alerts for duplicate elders
DELETE FROM alerts WHERE elder_id IN (
  'ba0485fb-8229-4cf3-a3d9-e910484bad33',
  '48ac5572-2deb-4f57-b84a-034f16b8dd26'
);

-- Delete medicines for duplicate elders
DELETE FROM medicines WHERE elder_id IN (
  'ba0485fb-8229-4cf3-a3d9-e910484bad33',
  '48ac5572-2deb-4f57-b84a-034f16b8dd26'
);

-- Delete health_metrics for duplicate elders
DELETE FROM health_metrics WHERE elder_id IN (
  'ba0485fb-8229-4cf3-a3d9-e910484bad33',
  '48ac5572-2deb-4f57-b84a-034f16b8dd26'
);

-- Delete check_in_schedules for duplicate elders
DELETE FROM check_in_schedules WHERE elder_id IN (
  'ba0485fb-8229-4cf3-a3d9-e910484bad33',
  '48ac5572-2deb-4f57-b84a-034f16b8dd26'
);

-- Delete notification_settings for duplicate elders
DELETE FROM notification_settings WHERE elder_id IN (
  'ba0485fb-8229-4cf3-a3d9-e910484bad33',
  '48ac5572-2deb-4f57-b84a-034f16b8dd26'
);

-- Now delete the duplicate elder profiles
DELETE FROM elders WHERE id IN (
  'ba0485fb-8229-4cf3-a3d9-e910484bad33',
  '48ac5572-2deb-4f57-b84a-034f16b8dd26'
);

-- Add unique constraint on whatsapp_number to prevent future duplicates
CREATE UNIQUE INDEX unique_whatsapp_number ON elders (whatsapp_number) WHERE whatsapp_number IS NOT NULL;