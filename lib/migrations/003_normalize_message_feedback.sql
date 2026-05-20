-- Migration 003: Align feedback_type CHECK with schema (lowercase) and normalize existing rows.
-- Run if you already applied 002 with ('Like', 'Dislike') constraint.

-- Drop generated CHECK name from ADD COLUMN (PostgreSQL: chat_messages_feedback_type_check)
ALTER TABLE chat_messages DROP CONSTRAINT IF EXISTS chat_messages_feedback_type_check;

UPDATE chat_messages
SET feedback_type = LOWER(feedback_type)
WHERE feedback_type IS NOT NULL;

ALTER TABLE chat_messages
  ADD CONSTRAINT chat_messages_feedback_type_check
  CHECK (feedback_type IS NULL OR feedback_type IN ('like', 'dislike'));
