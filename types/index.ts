// ── User ──────────────────────────────────────────────────────────────────────

export type PlanCode = 'free' | 'pro' | 'enterprise';
export type SubscriptionStatus = 'inactive' | 'active' | 'past_due' | 'canceled';

export interface UserRow {
  id: string;
  email: string;
  password: string;        // DB column is "password"
  firstName: string;       // DB column is "firstName" (camelCase)
  lastName: string;        // DB column is "lastName" (camelCase)
  is_verified: boolean;
  country: string;         // DB column is "country"; default 'England'
  plan_type: PlanCode;
  subscription_status: SubscriptionStatus;
  stripe_customer_id: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  created_at: string;
}

// ── Billing ───────────────────────────────────────────────────────────────────

export interface SubscriptionPlanRow {
  id: string;
  name: string;
  code: PlanCode;
  price_monthly: string | null;  // DECIMAL returned as string from pg
  message_limit: number | null;
  features: Record<string, unknown> | null;
  created_at: string;
}

export interface UsageTrackingRow {
  id: string;
  user_id: string;
  used_messages: number;
  used_tokens: number;
  period_start: string;
  period_end: string;
  created_at: string;
}

export interface SubscriptionRow {
  id: string;
  user_id: string;
  plan_code: string;
  provider: string;
  provider_subscription_id: string | null;
  status: string | null;
  amount: string | null;
  currency: string;
  started_at: string | null;
  expires_at: string | null;
  created_at: string;
}

export interface PaymentRow {
  id: string;
  user_id: string;
  subscription_id: string | null;
  provider_payment_id: string | null;
  amount: string | null;
  currency: string;
  status: string | null;
  payment_method: string | null;
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
  feedback_type: string | null;
  feedback_reason: string | null;
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
  id?: string;
  feedback_type?: 'Like' | 'Dislike' | null;
  feedback_reason?: string | null;
}
