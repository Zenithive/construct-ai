'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { X, MessageSquare, ChevronRight, ArrowLeft, User, Bot, Clock } from 'lucide-react';
import { getToken } from '@/services/apiClient';
import type { AdminUser } from '@/services/apiClient';

// ── Types ─────────────────────────────────────────────────────────────────────

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

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-GB', {
    hour: '2-digit', minute: '2-digit',
  });
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  user: AdminUser;
  onClose: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

const UserChatsDrawer: React.FC<Props> = ({ user, onClose }) => {
  const [sessions, setSessions]         = useState<ChatSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null);
  const [messages, setMessages]         = useState<ChatMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError]               = useState('');

  // ── Fetch sessions ──────────────────────────────────────────────────────

  const fetchSessions = useCallback(async () => {
    setLoadingSessions(true);
    setError('');
    try {
      const token = getToken();
      const res = await fetch(`/api/admin/users/${user.id}/chats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load chats.');
      setSessions(data.sessions);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load chats.');
    } finally {
      setLoadingSessions(false);
    }
  }, [user.id]);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  // ── Fetch messages ──────────────────────────────────────────────────────

  const openSession = async (session: ChatSession) => {
    setSelectedSession(session);
    setMessages([]);
    setLoadingMessages(true);
    try {
      const token = getToken();
      const res = await fetch(
        `/api/admin/users/${user.id}/chats/${session.id}/messages`,
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

  // ── Close on Escape ─────────────────────────────────────────────────────

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-xl z-50 flex flex-col bg-white shadow-2xl">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-black/[0.09] flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {selectedSession ? (
              <button
                onClick={() => setSelectedSession(null)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-[#555] hover:bg-[#f0f0ec] transition-colors flex-shrink-0"
                title="Back to sessions"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            ) : (
              <div className="w-8 h-8 rounded-full bg-[#E1F5EE] flex items-center justify-center flex-shrink-0 text-sm font-semibold text-[#0F6E56]">
                {user.firstName?.[0]?.toUpperCase() ?? '?'}
              </div>
            )}
            <div className="min-w-0">
              {selectedSession ? (
                <>
                  <p className="text-sm font-medium text-[#111] truncate">{selectedSession.title}</p>
                  <p className="text-xs text-[#999] mt-0.5">
                    {user.firstName} {user.lastName} · {selectedSession.message_count} messages · {fmtDate(selectedSession.created_at)}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm font-medium text-[#111]">{user.firstName} {user.lastName}</p>
                  <p className="text-xs text-[#999] mt-0.5">{user.email} · {user.chatCount} chat{user.chatCount !== 1 ? 's' : ''}</p>
                </>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-[#999] hover:text-[#555] hover:bg-[#f0f0ec] transition-colors flex-shrink-0 ml-2"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto">

          {error && (
            <div className="m-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Sessions list */}
          {!selectedSession && (
            <>
              {loadingSessions ? (
                <div className="p-4 space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-16 bg-[#f7f7f5] rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : sessions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center px-6">
                  <div className="w-12 h-12 rounded-xl bg-[#f0f0ec] flex items-center justify-center mb-3">
                    <MessageSquare className="w-6 h-6 text-[#ccc]" />
                  </div>
                  <p className="text-sm font-medium text-[#555]">No chats yet</p>
                  <p className="text-xs text-[#999] mt-1">This user hasn't started any conversations.</p>
                </div>
              ) : (
                <div className="p-3 space-y-1.5">
                  {sessions.map(session => (
                    <button
                      key={session.id}
                      onClick={() => openSession(session)}
                      className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border border-black/[0.06] bg-white hover:border-[#1D9E75]/30 hover:bg-[#f7fffe] transition-all text-left group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-[#f0f0ec] flex items-center justify-center flex-shrink-0 group-hover:bg-[#E1F5EE] transition-colors">
                        <MessageSquare className="w-4 h-4 text-[#999] group-hover:text-[#1D9E75] transition-colors" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#111] truncate">{session.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-[#999]">{session.message_count} message{session.message_count !== 1 ? 's' : ''}</span>
                          <span className="text-[#ddd]">·</span>
                          <span className="text-xs text-[#999] flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {fmtDate(session.updated_at)}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-[#ccc] group-hover:text-[#1D9E75] flex-shrink-0 transition-colors" />
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Messages view */}
          {selectedSession && (
            <div className="p-4 space-y-3">
              {loadingMessages ? (
                <div className="space-y-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
                      <div className="h-12 bg-[#f0f0ec] rounded-xl animate-pulse" style={{ width: `${50 + Math.random() * 30}%` }} />
                    </div>
                  ))}
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <p className="text-sm text-[#999]">No messages in this session.</p>
                </div>
              ) : (
                messages.map(msg => (
                  <div
                    key={msg.id}
                    className={`flex gap-2.5 ${msg.message_type === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {/* AI avatar */}
                    {msg.message_type === 'ai' && (
                      <div className="w-7 h-7 rounded-full bg-[#1D9E75] flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Bot className="w-3.5 h-3.5 text-white" />
                      </div>
                    )}

                    <div className={`max-w-[78%] ${msg.message_type === 'user' ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                      <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words ${
                        msg.message_type === 'user'
                          ? 'bg-[#111] text-white rounded-br-sm'
                          : 'bg-[#f7f7f5] text-[#111] border border-black/[0.06] rounded-bl-sm'
                      }`}>
                        {msg.content}
                      </div>
                      <span className="text-[10px] text-[#bbb] px-1">{fmtDateTime(msg.created_at)}</span>
                    </div>

                    {/* User avatar */}
                    {msg.message_type === 'user' && (
                      <div className="w-7 h-7 rounded-full bg-[#E1F5EE] flex items-center justify-center flex-shrink-0 mt-0.5">
                        <User className="w-3.5 h-3.5 text-[#0F6E56]" />
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        {selectedSession && !loadingMessages && messages.length > 0 && (
          <div className="flex-shrink-0 px-5 py-3 border-t border-black/[0.09] bg-[#f7f7f5]">
            <p className="text-xs text-[#999] text-center">
              {messages.length} message{messages.length !== 1 ? 's' : ''} · Read-only view
            </p>
          </div>
        )}
      </div>
    </>
  );
};

export default UserChatsDrawer;
