-- Migration 004: Change feedback_type CHECK to title-case ('Like', 'Dislike').

ALTER TABLE chat_messages DROP CONSTRAINT IF EXISTS chat_messages_feedback_type_check;

UPDATE chat_messages
SET feedback_type = INITCAP(feedback_type)
WHERE feedback_type IS NOT NULL;

ALTER TABLE chat_messages
  ADD CONSTRAINT chat_messages_feedback_type_check
  CHECK (feedback_type IS NULL OR feedback_type IN ('Like', 'Dislike'));
