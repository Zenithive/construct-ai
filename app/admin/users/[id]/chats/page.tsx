'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, MessageSquare, ChevronRight, User, Bot,
  Clock, ShieldCheck, LogOut, AlertCircle,
} from 'lucide-react';
import { getToken, removeToken, removeUser } from '@/services/apiClient';
import { renderContent } from '@/utils/parseMessage';

// ── Types ─────────────────────────────────────────────────────────────────────

interface UserInfo {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  planType: string;
  chatCount: number;
}

interface ChatSession {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
}

interface ChatMessage {
  id: string;
  message_type: 'user' | 'ai';
  content: string;
  created_at: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function planBadge(plan: string) {
  const map: Record<string, string> = {
    free:       'bg-[#f0f0ec] text-[#555]',
    pro:        'bg-[#E1F5EE] text-[#0F6E56]',
    enterprise: 'bg-[#111] text-white',
  };
  return map[plan] ?? 'bg-[#f0f0ec] text-[#555]';
}

// ── Main page ─────────────────────────────────────────────────────────────────

const UserChatsPage: React.FC = () => {
  const params   = useParams();
  const router   = useRouter();
  const userId   = params.id as string;

  const [user, setUser]                       = useState<UserInfo | null>(null);
  const [sessions, setSessions]               = useState<ChatSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null);
  const [messages, setMessages]               = useState<ChatMessage[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError]                     = useState('');

  // ── Auth check ──────────────────────────────────────────────────────────

  useEffect(() => {
    const token = getToken();
    if (!token) { router.replace('/'); return; }
    fetch('/api/admin/stats', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => { if (r.status === 401 || r.status === 403) router.replace('/'); })
      .catch(() => router.replace('/'));
  }, [router]);

  // ── Fetch sessions + user info ──────────────────────────────────────────

  const fetchSessions = useCallback(async () => {
    setLoadingSessions(true);
    setError('');
    try {
      const token = getToken();
      // Fetch sessions
      const res = await fetch(`/api/admin/users/${userId}/chats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load chats.');
      setSessions(data.sessions);

      // Fetch user info from admin users list (search by id via stats endpoint)
      const uRes = await fetch(`/api/admin/users?limit=1&search=${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      // Fallback: get user info from the sessions data if available
      // We'll fetch the full user list and find by id
      const uRes2 = await fetch(`/api/admin/users?limit=100`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const uData = await uRes2.json();
      const found = uData.users?.find((u: UserInfo) => u.id === userId);
      if (found) setUser(found);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load data.');
    } finally {
      setLoadingSessions(false);
    }
  }, [userId]);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  // ── Fetch messages ──────────────────────────────────────────────────────

  const openSession = async (session: ChatSession) => {
    setSelectedSession(session);
    setMessages([]);
    setLoadingMessages(true);
    try {
      const token = getToken();
      const res = await fetch(
        `/api/admin/users/${userId}/chats/${session.id}/messages`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load messages.');
      setMessages(data.messages);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load messages.');
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleLogout = () => {
    removeToken(); removeUser();
    window.location.href = '/';
  };

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="h-screen flex flex-col bg-[#fafaf8] font-sans overflow-hidden">

      {/* ── Header ── */}
      <header className="bg-white border-b border-black/[0.09] flex-shrink-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/admin')}
              className="flex items-center gap-1.5 text-xs text-[#555] hover:text-[#111] transition-colors px-3 py-1.5 rounded-lg hover:bg-[#f0f0ec] border border-black/[0.09]"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Admin
            </button>
            <div className="h-4 w-px bg-black/[0.09]" />
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#1D9E75] flex items-center justify-center">
                <ShieldCheck className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-medium text-[#111]">
                {user ? `${user.firstName} ${user.lastName}` : 'User Chats'}
              </span>
              {user && (
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${planBadge(user.planType)}`}>
                  {user.planType}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-xs text-[#999] hover:text-[#555] transition-colors px-3 py-1.5 rounded-lg hover:bg-[#f0f0ec]"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign out
          </button>
        </div>
      </header>

      {/* ── Error banner ── */}
      {error && (
        <div className="flex-shrink-0 mx-6 mt-4 flex items-center gap-2.5 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* ── Two-column layout ── */}
      <div className="flex-1 flex overflow-hidden max-w-7xl w-full mx-auto px-6 py-5 gap-5">

        {/* ── Left: Sessions list ── */}
        <div className="w-80 flex-shrink-0 flex flex-col bg-white border border-black/[0.09] rounded-xl overflow-hidden">
          {/* Sessions header */}
          <div className="px-4 py-3.5 border-b border-black/[0.09] flex-shrink-0">
            <p className="text-sm font-semibold text-[#111]">Conversations</p>
            {user && (
              <p className="text-xs text-[#999] mt-0.5">
                {user.email} · {sessions.length} chat{sessions.length !== 1 ? 's' : ''}
              </p>
            )}
          </div>

          {/* Sessions scroll */}
          <div className="flex-1 overflow-y-auto">
            {loadingSessions ? (
              <div className="p-3 space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-16 bg-[#f7f7f5] rounded-xl animate-pulse" />
                ))}
              </div>
            ) : sessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                <div className="w-10 h-10 rounded-xl bg-[#f0f0ec] flex items-center justify-center mb-3">
                  <MessageSquare className="w-5 h-5 text-[#ccc]" />
                </div>
                <p className="text-sm font-medium text-[#555]">No chats yet</p>
                <p className="text-xs text-[#999] mt-1">This user hasn't started any conversations.</p>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {sessions.map(session => (
                  <button
                    key={session.id}
                    onClick={() => openSession(session)}
                    className={`w-full flex items-start gap-3 px-3 py-3 rounded-lg text-left transition-all group ${
                      selectedSession?.id === session.id
                        ? 'bg-[#E1F5EE] border border-[#1D9E75]/20'
                        : 'hover:bg-[#f7f7f5] border border-transparent'
                    }`}
                  >
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
                      selectedSession?.id === session.id ? 'bg-[#1D9E75]' : 'bg-[#f0f0ec] group-hover:bg-[#E1F5EE]'
                    }`}>
                      <MessageSquare className={`w-3.5 h-3.5 transition-colors ${
                        selectedSession?.id === session.id ? 'text-white' : 'text-[#999] group-hover:text-[#1D9E75]'
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate leading-snug ${
                        selectedSession?.id === session.id ? 'text-[#0F6E56]' : 'text-[#111]'
                      }`}>
                        {session.title}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-[11px] text-[#999]">{session.message_count} msg</span>
                        <span className="text-[#ddd] text-[10px]">·</span>
                        <span className="text-[11px] text-[#999] flex items-center gap-0.5">
                          <Clock className="w-2.5 h-2.5" />
                          {fmtDate(session.updated_at)}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className={`w-3.5 h-3.5 flex-shrink-0 mt-1 transition-colors ${
                      selectedSession?.id === session.id ? 'text-[#1D9E75]' : 'text-[#ddd] group-hover:text-[#999]'
                    }`} />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Right: Messages view ── */}
        <div className="flex-1 flex flex-col bg-white border border-black/[0.09] rounded-xl overflow-hidden min-w-0">
          {!selectedSession ? (
            /* Empty state */
            <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
              <div className="w-14 h-14 rounded-2xl bg-[#f0f0ec] flex items-center justify-center mb-4">
                <MessageSquare className="w-7 h-7 text-[#ccc]" />
              </div>
              <p className="text-base font-medium text-[#555]">Select a conversation</p>
              <p className="text-sm text-[#999] mt-1.5 max-w-xs">
                Choose a chat from the left to read the full conversation.
              </p>
            </div>
          ) : (
            <>
              {/* Messages header */}
              <div className="px-6 py-4 border-b border-black/[0.09] flex-shrink-0">
                <p className="text-sm font-semibold text-[#111]">{selectedSession.title}</p>
                <p className="text-xs text-[#999] mt-0.5">
                  {selectedSession.message_count} messages · {fmtDate(selectedSession.created_at)}
                </p>
              </div>

              {/* Messages scroll */}
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                {loadingMessages ? (
                  <div className="space-y-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
                        <div className="h-14 bg-[#f0f0ec] rounded-2xl animate-pulse" style={{ width: `${40 + Math.random() * 35}%` }} />
                      </div>
                    ))}
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-sm text-[#999]">No messages in this session.</p>
                  </div>
                ) : (
                  messages.map(msg => (
                    <div
                      key={msg.id}
                      className={`flex gap-3 ${msg.message_type === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      {/* AI avatar */}
                      {msg.message_type === 'ai' && (
                        <div className="w-8 h-8 rounded-full bg-[#1D9E75] flex items-center justify-center flex-shrink-0 mt-1">
                          <Bot className="w-4 h-4 text-white" />
                        </div>
                      )}

                      <div className={`max-w-[70%] flex flex-col gap-1 ${msg.message_type === 'user' ? 'items-end' : 'items-start'}`}>
                        {msg.message_type === 'user' ? (
                          <div className="px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words bg-[#E1F5EE] text-[#111] border border-[#5DCAA5]/30 rounded-br-sm">
                            {msg.content}
                          </div>
                        ) : (
                          <div
                            className="px-4 py-3 rounded-2xl rounded-bl-sm border border-black/[0.06] bg-white text-[#111] text-sm leading-relaxed break-words
                              [&_p]:mb-3 [&_p:last-child]:mb-0
                              [&_h1]:text-xl [&_h1]:font-semibold [&_h1]:text-gray-900 [&_h1]:mt-4 [&_h1]:mb-2
                              [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-gray-900 [&_h2]:mt-4 [&_h2]:mb-2 [&_h2]:border-b [&_h2]:border-gray-200 [&_h2]:pb-1
                              [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-gray-900 [&_h3]:mt-3 [&_h3]:mb-1
                              [&_h4]:text-sm [&_h4]:font-semibold [&_h4]:text-gray-900 [&_h4]:mt-2 [&_h4]:mb-1
                              [&_ul]:my-2 [&_ol]:my-2
                              [&_a]:text-[#1D9E75] [&_a]:underline [&_a:hover]:text-[#0F6E56]
                              [&_strong]:font-semibold [&_strong]:text-gray-900
                              [&_code]:text-pink-600 [&_code]:bg-pink-50 [&_code]:px-1 [&_code]:rounded [&_code]:text-xs
                              [&_blockquote]:border-l-4 [&_blockquote]:border-gray-300 [&_blockquote]:pl-3 [&_blockquote]:text-gray-600 [&_blockquote]:italic"
                            dangerouslySetInnerHTML={{ __html: renderContent(msg.content) }}
                          />
                        )}
                        <span className="text-[11px] text-[#bbb] px-1">{fmtDateTime(msg.created_at)}</span>
                      </div>

                      {/* User avatar */}
                      {msg.message_type === 'user' && (
                        <div className="w-8 h-8 rounded-full bg-[#E1F5EE] flex items-center justify-center flex-shrink-0 mt-1">
                          <User className="w-4 h-4 text-[#0F6E56]" />
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Footer */}
              {!loadingMessages && messages.length > 0 && (
                <div className="flex-shrink-0 px-6 py-3 border-t border-black/[0.09] bg-[#f7f7f5]">
                  <p className="text-xs text-[#999] text-center">
                    {messages.length} message{messages.length !== 1 ? 's' : ''} · Read-only view
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserChatsPage;
