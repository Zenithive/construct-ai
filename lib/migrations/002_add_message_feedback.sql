-- Migration 002: Add message_feedback table for like/dislike tracking

CREATE TABLE IF NOT EXISTS message_feedback (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id      UUID NOT NULL REFERENCES chat_messages (id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  session_id      UUID NOT NULL REFERENCES chat_sessions (id) ON DELETE CASCADE,
  feedback_type   TEXT NOT NULL CHECK (feedback_type IN ('like', 'dislike')),
  feedback_reason TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (message_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_message_feedback_message_id ON message_feedback (message_id);
CREATE INDEX IF NOT EXISTS idx_message_feedback_user_id    ON message_feedback (user_id);
