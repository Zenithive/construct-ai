/**
 * services/apiClient.ts
 * Central API client used by all frontend components.
 * Replaces the old src/api/apiClient.ts — same interface, points at Next.js routes.
 */

export const AI_BASE_URL =
  process.env.NEXT_PUBLIC_AI_BASE_URL ||
  'https://construction-ai-new-production-9b17.up.railway.app';

// ── Token / user helpers ──────────────────────────────────────────────────────

export const getToken = (): string | null =>
  typeof window !== 'undefined' ? localStorage.getItem('token') : null;
export const setToken = (t: string) => {
  localStorage.setItem('token', t);
  // Keep cookie in sync so middleware can read it server-side
  document.cookie = `token=${t}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`;
};
export const removeToken = () => {
  localStorage.removeItem('token');
  // Clear the cookie too
  document.cookie = 'token=; path=/; max-age=0; SameSite=Lax';
};

export const loadCurrentSessionId = (): string | null =>
  typeof window !== 'undefined' ? localStorage.getItem('currentSessionId') : null;
export const saveCurrentSessionId = (id: string | null) => {
  if (typeof window === 'undefined') return;
  if (id) localStorage.setItem('currentSessionId', id);
  else localStorage.removeItem('currentSessionId');
};

export const getUser = (): Record<string, unknown> | null => {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('user');
  return raw ? JSON.parse(raw) : null;
};
export const getUserId = (): string | null => {
  const user = getUser();
  const id = user?.id;
  return typeof id === 'string' && id.length > 0 ? id : null;
};
export const setUser = (u: Record<string, unknown>) => localStorage.setItem('user', JSON.stringify(u));
export const removeUser = () => localStorage.removeItem('user');
export const isAuthenticated = (): boolean => !!getToken();

// ── Base fetch ────────────────────────────────────────────────────────────────

async function request<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(path, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error((data as { error?: string }).error || 'Something went wrong.');
  return data as T;
}

// ── Auth API ──────────────────────────────────────────────────────────────────

export const authApi = {
  register: (email: string, password: string, firstName: string, lastName: string) =>
    request('/api/auth/register', { method: 'POST', body: JSON.stringify({ email, password, firstName, lastName }) }),
  login: (email: string, password: string) =>
    request('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  logout: () => request('/api/auth/logout', { method: 'POST' }),
  me: () => request('/api/auth/me'),
};

// ── Chat API ──────────────────────────────────────────────────────────────────

export const chatApi = {
  getSessions: () => request('/api/chat/sessions'),
  createSession: (title?: string) =>
    request('/api/chat/sessions', { method: 'POST', body: JSON.stringify({ title: title || 'New Chat' }) }),
  deleteSession: (sessionId: string) =>
    request(`/api/chat/sessions/${sessionId}`, { method: 'DELETE' }),
  getMessages: (sessionId: string) =>
    request(`/api/chat/sessions/${sessionId}/messages`),
  saveMessage: (
    sessionId: string,
    message_type: 'user' | 'ai',
    content: string,
    extras?: { citations?: unknown; confidence?: number; region?: string; category?: string; sources?: unknown[] }
  ) =>
    request(`/api/chat/sessions/${sessionId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ message_type, content, ...extras }),
    }),
  submitFeedback: (
    messageId: string,
    sessionId: string,
    feedback_type: 'Like' | 'Dislike',
    feedback_reason?: string
  ) =>
    request(`/api/chat/messages/${messageId}/feedback`, {
      method: 'POST',
      body: JSON.stringify({ session_id: sessionId, feedback_type, feedback_reason: feedback_reason ?? '' }),
    }),
};

// ── Users API ─────────────────────────────────────────────────────────────────

export const usersApi = {
  updateCountry: (country: string) =>
    request('/api/users/country', { method: 'PATCH', body: JSON.stringify({ country }) }),
  updateProfile: (firstName: string, lastName: string) =>
    request('/api/users', { method: 'PATCH', body: JSON.stringify({ firstName, lastName }) }),
};

// ── Admin API ─────────────────────────────────────────────────────────────────

export type AdminUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isVerified: boolean;
  country: string;
  planType: string;
  subscriptionStatus: string;
  stripeCustomerId: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  createdAt: string;
  role: string;
  chatCount: number;
  totalTokens: number;
  totalMessages: number;
};

export type AdminUsersResponse = {
  users: AdminUser[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};

export type AdminStatsResponse = {
  totalUsers: number;
  freeUsers: number;
  proUsers: number;
  enterpriseUsers: number;
  activeSubscriptions: number;
  newUsers30d: number;
  totalChats: number;
  totalTokens: number;
};

export type AdminUserFilters = {
  page?: number;
  limit?: number;
  search?: string;
  plan?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
};

export const adminApi = {
  getStats: () =>
    request<AdminStatsResponse>('/api/admin/stats'),

  getUsers: (filters: AdminUserFilters = {}) => {
    const sp = new URLSearchParams();
    if (filters.page)     sp.set('page',     String(filters.page));
    if (filters.limit)    sp.set('limit',    String(filters.limit));
    if (filters.search)   sp.set('search',   filters.search);
    if (filters.plan)     sp.set('plan',     filters.plan);
    if (filters.status)   sp.set('status',   filters.status);
    if (filters.dateFrom) sp.set('dateFrom', filters.dateFrom);
    if (filters.dateTo)   sp.set('dateTo',   filters.dateTo);
    if (filters.sortBy)   sp.set('sortBy',   filters.sortBy);
    if (filters.sortDir)  sp.set('sortDir',  filters.sortDir);
    return request<AdminUsersResponse>(`/api/admin/users?${sp.toString()}`);
  },

  updateSubscription: (
    userId: string,
    planType: string,
    subscriptionStatus: string
  ) =>
    request<{ message: string; user: AdminUser }>(
      `/api/admin/users/${userId}/subscription`,
      { method: 'PATCH', body: JSON.stringify({ planType, subscriptionStatus }) }
    ),
};

// ── Upload API ────────────────────────────────────────────────────────────────

export const uploadApi = {
  uploadFile: async (file: File) => {
    const token = getToken();
    const userId = getUserId();
    if (!userId) throw new Error('User not found. Please log in again.');
    const formData = new FormData();
    formData.append('file', file);
    formData.append('user_id', userId);
    const res = await fetch('/api/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error((data as { error?: string }).error || 'Upload failed.');
    return data;
  },
};
