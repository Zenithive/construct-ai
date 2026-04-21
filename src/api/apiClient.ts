// Central API client — replaces supabaseClient.tsx

const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// ─── Token helpers ────────────────────────────────────────────────────────────
export const getToken = (): string | null => localStorage.getItem('token');
export const setToken = (token: string) => localStorage.setItem('token', token);
export const removeToken = () => localStorage.removeItem('token');

export const getUser = (): any | null => {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
};
export const setUser = (user: any) => localStorage.setItem('user', JSON.stringify(user));
export const removeUser = () => localStorage.removeItem('user');

export const isAuthenticated = (): boolean => !!getToken();

// ─── Base fetch wrapper ───────────────────────────────────────────────────────
const request = async (path: string, options: RequestInit = {}) => {
  const token = getToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || 'Something went wrong.');
  }

  return data;
};

// ─── Auth API ─────────────────────────────────────────────────────────────────
export const authApi = {
  register: (email: string, password: string, firstName: string, lastName: string) =>
    request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, firstName, lastName }),
    }),

  login: (email: string, password: string) =>
    request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  logout: () =>
    request('/api/auth/logout', { method: 'POST' }),

  me: () => request('/api/auth/me'),
};

// ─── Chat API ─────────────────────────────────────────────────────────────────
export const chatApi = {
  getSessions: () => request('/api/chat/sessions'),

  createSession: (title?: string) =>
    request('/api/chat/sessions', {
      method: 'POST',
      body: JSON.stringify({ title: title || 'New Chat' }),
    }),

  deleteSession: (sessionId: string) =>
    request(`/api/chat/sessions/${sessionId}`, { method: 'DELETE' }),

  getMessages: (sessionId: string) =>
    request(`/api/chat/sessions/${sessionId}/messages`),

  saveMessage: (
    sessionId: string,
    message_type: 'user' | 'ai',
    content: string,
    extras?: { citations?: any; confidence?: number; region?: string; category?: string; sources?: any[] }
  ) =>
    request(`/api/chat/sessions/${sessionId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ message_type, content, ...extras }),
    }),
};

// ─── Upload API ───────────────────────────────────────────────────────────────
export const uploadApi = {
  uploadFile: async (file: File) => {
    const token = getToken();
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${BASE_URL}/api/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Upload failed.');
    return data;
  },
};
