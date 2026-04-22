// ── User ──────────────────────────────────────────────────────────────────────

export interface UserRow {
  id: string;
  email: string;
  password: string;        // DB column is "password"
  firstName: string;       // DB column is "firstName" (camelCase)
  lastName: string;        // DB column is "lastName" (camelCase)
  is_verified: boolean;
  created_at: string;
}

// ── OTP ───────────────────────────────────────────────────────────────────────

export interface OTPRow {
  id: string;
  email: string;
  otp: string;             // DB column is "otp"
  expires_at: string;
  created_at: string;
}

// ── Chat ──────────────────────────────────────────────────────────────────────

export interface ChatSessionRow {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface ChatMessageRow {
  id: string;
  session_id: string;
  user_id: string;
  message_type: 'user' | 'ai';
  content: string;
  citations: string[] | null;
  confidence: number | null;
  region: string | null;
  category: string | null;
  sources: Source[] | null;
  created_at: string;
}

export interface Source {
  url?: string;
  title?: string;
}

// ── Alerts ────────────────────────────────────────────────────────────────────

export interface AlertRow {
  id: string;
  user_id: string;
  title: string;
  region: string;
  category: string;
  severity: 'high' | 'medium' | 'low';
  summary: string;
  date: string;
  created_at: string;
}

// ── Messages ──────────────────────────────────────────────────────────────────

export interface Message {
  type: 'user' | 'ai';
  content: string;
  citations?: string[];
  confidence?: number;
  timestamp: Date;
  sources?: Source[];
}
