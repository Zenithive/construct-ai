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

export const getUser = (): Record<string, unknown> | null => {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('user');
  return raw ? JSON.parse(raw) : null;
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
};

// ── Upload API ────────────────────────────────────────────────────────────────

export const uploadApi = {
  uploadFile: async (file: File) => {
    const token = getToken();
    const formData = new FormData();
    formData.append('file', file);
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
