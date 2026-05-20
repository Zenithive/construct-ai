-- Migration 002: Move feedback columns into chat_messages, drop message_feedback table

-- Add feedback columns directly to chat_messages
ALTER TABLE chat_messages
  ADD COLUMN IF NOT EXISTS feedback_type   TEXT CHECK (feedback_type IN ('Like', 'Dislike')),
  ADD COLUMN IF NOT EXISTS feedback_reason TEXT;

-- Migrate any existing feedback data
UPDATE chat_messages cm
SET feedback_type   = mf.feedback_type,
    feedback_reason = mf.feedback_reason
FROM message_feedback mf
WHERE cm.id = mf.message_id;

-- Drop the old separate table
DROP TABLE IF EXISTS message_feedback;
