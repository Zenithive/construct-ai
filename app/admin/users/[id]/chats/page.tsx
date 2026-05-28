'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, MessageSquare, ChevronRight, User, Bot, Clock, ShieldCheck, LogOut, AlertCircle, Zap } from 'lucide-react';
import { getToken, removeToken, removeUser } from '@/services/apiClient';

interface UserInfo { id: string; firstName: string; lastName: string; email: string; planType: string; chatCount: number; totalTokens: number; }
interface ChatSession { id: string; title: string; created_at: string; updated_at: string; message_count: number; session_tokens: number; }
interface ChatMessage { id: string; message_type: 'user' | 'ai'; content: string; prompt_tokens: number; completion_tokens: number; total_tokens: number; latency: number | null; created_at: string; }

function fmtDate(iso: string) { return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); }
function fmtDateTime(iso: string) { return new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
function fmtTokens(n: number) { return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n); }
function planBadge(plan: string) {
  const map: Record<string, string> = { free: 'bg-[#f0f0ec] text-[#555]', pro: 'bg-[#E1F5EE] text-[#0F6E56]', enterprise: 'bg-[#111] text-white' };
  return map[plan] ?? 'bg-[#f0f0ec] text-[#555]';
}

export default function UserChatsPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;

  const [user, setUser]                       = useState<UserInfo | null>(null);
  const [sessions, setSessions]               = useState<ChatSession[]>([]);
  const [totalTokens, setTotalTokens]         = useState(0);
  const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null);
  const [messages, setMessages]               = useState<ChatMessage[]>([]);
  const [sessionTokens, setSessionTokens]     = useState(0);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError]                     = useState('');

  useEffect(() => {
    const token = getToken();
    if (!token) { router.replace('/'); return; }
    fetch('/api/admin/stats', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => { if (r.status === 401 || r.status === 403) router.replace('/'); })
      .catch(() => router.replace('/'));
  }, [router]);

  const fetchData = useCallback(async () => {
    setLoadingSessions(true); setError('');
    try {
      const token = getToken();
      const [sessRes, usersRes] = await Promise.all([
        fetch(`/api/admin/users/${userId}/chats`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/admin/users?limit=100`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const sessData  = await sessRes.json();
      const usersData = await usersRes.json();
      if (!sessRes.ok) throw new Error(sessData.error || 'Failed to load chats.');
      setSessions(sessData.sessions);
      setTotalTokens(sessData.totalTokens ?? 0);
      const found = usersData.users?.find((u: UserInfo) => u.id === userId);
      if (found) setUser(found);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load data.');
    } finally { setLoadingSessions(false); }
  }, [userId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openSession = async (session: ChatSession) => {
    setSelectedSession(session); setMessages([]); setSessionTokens(0); setLoadingMessages(true);
    try {
      const token = getToken();
      const res   = await fetch(`/api/admin/users/${userId}/chats/${session.id}/messages`, { headers: { Authorization: `Bearer ${token}` } });
      const data  = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load messages.');
      setMessages(data.messages);
      setSessionTokens(data.sessionTokens ?? 0);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load messages.');
    } finally { setLoadingMessages(false); }
  };

  const handleLogout = () => { removeToken(); removeUser(); window.location.href = '/'; };

  return (
    <div className="h-screen flex flex-col bg-[#fafaf8] font-sans overflow-hidden">
      <header className="bg-white border-b border-black/[0.09] flex-shrink-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/admin')} className="flex items-center gap-1.5 text-xs text-[#555] hover:text-[#111] transition-colors px-3 py-1.5 rounded-lg hover:bg-[#f0f0ec] border border-black/[0.09]">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Admin
            </button>
            <div className="h-4 w-px bg-black/[0.09]" />
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#1D9E75] flex items-center justify-center"><ShieldCheck className="w-4 h-4 text-white" /></div>
              <span className="text-sm font-medium text-[#111]">{user ? `${user.firstName} ${user.lastName}` : 'User Chats'}</span>
              {user && <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${planBadge(user.planType)}`}>{user.planType}</span>}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Total tokens badge for this user across all sessions */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#f0f0ec] border border-black/[0.09]">
              <Zap className="w-3.5 h-3.5 text-[#1D9E75]" />
              <span className="text-xs text-[#555]">Total tokens:</span>
              <span className="text-xs font-semibold text-[#111]">{fmtTokens(totalTokens)}</span>
            </div>
            <button onClick={handleLogout} className="flex items-center gap-1.5 text-xs text-[#999] hover:text-[#555] transition-colors px-3 py-1.5 rounded-lg hover:bg-[#f0f0ec]">
              <LogOut className="w-3.5 h-3.5" /> Sign out
            </button>
          </div>
        </div>
      </header>

      {error && (
        <div className="flex-shrink-0 mx-6 mt-4 flex items-center gap-2.5 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
        </div>
      )}

      <div className="flex-1 flex overflow-hidden max-w-7xl w-full mx-auto px-6 py-5 gap-5">
        {/* Sessions list */}
        <div className="w-80 flex-shrink-0 flex flex-col bg-white border border-black/[0.09] rounded-xl overflow-hidden">
          <div className="px-4 py-3.5 border-b border-black/[0.09] flex-shrink-0">
            <p className="text-sm font-semibold text-[#111]">Conversations</p>
            {user && (
              <p className="text-xs text-[#999] mt-0.5">{user.email} · {sessions.length} chat{sessions.length !== 1 ? 's' : ''}</p>
            )}
          </div>
          <div className="flex-1 overflow-y-auto">
            {loadingSessions ? (
              <div className="p-3 space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-16 bg-[#f7f7f5] rounded-xl animate-pulse" />)}</div>
            ) : sessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                <div className="w-10 h-10 rounded-xl bg-[#f0f0ec] flex items-center justify-center mb-3"><MessageSquare className="w-5 h-5 text-[#ccc]" /></div>
                <p className="text-sm font-medium text-[#555]">No chats yet</p>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {sessions.map(session => (
                  <button key={session.id} onClick={() => openSession(session)}
                    className={`w-full flex items-start gap-3 px-3 py-3 rounded-lg text-left transition-all group ${selectedSession?.id === session.id ? 'bg-[#E1F5EE] border border-[#1D9E75]/20' : 'hover:bg-[#f7f7f5] border border-transparent'}`}>
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${selectedSession?.id === session.id ? 'bg-[#1D9E75]' : 'bg-[#f0f0ec] group-hover:bg-[#E1F5EE]'}`}>
                      <MessageSquare className={`w-3.5 h-3.5 transition-colors ${selectedSession?.id === session.id ? 'text-white' : 'text-[#999] group-hover:text-[#1D9E75]'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate leading-snug ${selectedSession?.id === session.id ? 'text-[#0F6E56]' : 'text-[#111]'}`}>{session.title}</p>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <span className="text-[11px] text-[#999]">{session.message_count} msg</span>
                        <span className="text-[#ddd] text-[10px]">·</span>
                        <span className="text-[11px] text-[#999] flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" />{fmtDate(session.updated_at)}</span>
                        {session.session_tokens > 0 && (
                          <>
                            <span className="text-[#ddd] text-[10px]">·</span>
                            <span className="text-[11px] text-[#1D9E75] flex items-center gap-0.5 font-medium">
                              <Zap className="w-2.5 h-2.5" />{fmtTokens(session.session_tokens)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <ChevronRight className={`w-3.5 h-3.5 flex-shrink-0 mt-1 transition-colors ${selectedSession?.id === session.id ? 'text-[#1D9E75]' : 'text-[#ddd] group-hover:text-[#999]'}`} />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 flex flex-col bg-white border border-black/[0.09] rounded-xl overflow-hidden min-w-0">
          {!selectedSession ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
              <div className="w-14 h-14 rounded-2xl bg-[#f0f0ec] flex items-center justify-center mb-4"><MessageSquare className="w-7 h-7 text-[#ccc]" /></div>
              <p className="text-base font-medium text-[#555]">Select a conversation</p>
              <p className="text-sm text-[#999] mt-1.5 max-w-xs">Choose a chat from the left to read the full conversation.</p>
            </div>
          ) : (
            <>
              <div className="px-6 py-4 border-b border-black/[0.09] flex-shrink-0 flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-[#111]">{selectedSession.title}</p>
                  <p className="text-xs text-[#999] mt-0.5">{selectedSession.message_count} messages · {fmtDate(selectedSession.created_at)}</p>
                </div>
                {/* Per-session token count badge */}
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#E1F5EE] border border-[#5DCAA5]/30 flex-shrink-0">
                  <Zap className="w-3 h-3 text-[#1D9E75]" />
                  <span className="text-[11px] text-[#0F6E56] font-medium">{fmtTokens(sessionTokens)} tokens</span>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                {loadingMessages ? (
                  <div className="space-y-4">{Array.from({ length: 5 }).map((_, i) => <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}><div className="h-14 bg-[#f0f0ec] rounded-2xl animate-pulse" style={{ width: `${40 + Math.random() * 35}%` }} /></div>)}</div>
                ) : messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full"><p className="text-sm text-[#999]">No messages in this session.</p></div>
                ) : (
                  messages.map(msg => (
                    <div key={msg.id} className={`flex gap-3 ${msg.message_type === 'user' ? 'justify-end' : 'justify-start'}`}>
                      {msg.message_type === 'ai' && (
                        <div className="w-8 h-8 rounded-full bg-[#1D9E75] flex items-center justify-center flex-shrink-0 mt-1"><Bot className="w-4 h-4 text-white" /></div>
                      )}
                      <div className={`max-w-[70%] flex flex-col gap-1 ${msg.message_type === 'user' ? 'items-end' : 'items-start'}`}>
                        <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words ${msg.message_type === 'user' ? 'bg-[#E1F5EE] text-[#111] border border-[#5DCAA5]/30 rounded-br-sm' : 'bg-[#f7f7f5] text-[#111] border border-black/[0.06] rounded-bl-sm'}`}>
                          {msg.content}
                        </div>
                        <div className={`flex items-center gap-2 px-1 ${msg.message_type === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                          <span className="text-[11px] text-[#bbb]">{fmtDateTime(msg.created_at)}</span>
                          {msg.total_tokens > 0 && (
                            <span className="text-[11px] text-[#1D9E75] flex items-center gap-0.5" title={msg.message_type === 'ai' ? `Prompt: ${msg.prompt_tokens} · Completion: ${msg.completion_tokens}` : undefined}>
                              <Zap className="w-2.5 h-2.5" />{msg.total_tokens}
                            </span>
                          )}
                        </div>
                      </div>
                      {msg.message_type === 'user' && (
                        <div className="w-8 h-8 rounded-full bg-[#E1F5EE] flex items-center justify-center flex-shrink-0 mt-1"><User className="w-4 h-4 text-[#0F6E56]" /></div>
                      )}
                    </div>
                  ))
                )}
              </div>
              {!loadingMessages && messages.length > 0 && (
                <div className="flex-shrink-0 px-6 py-3 border-t border-black/[0.09] bg-[#f7f7f5] flex items-center justify-between">
                  <p className="text-xs text-[#999]">{messages.length} message{messages.length !== 1 ? 's' : ''} · Read-only view</p>
                  <div className="flex items-center gap-1 text-xs text-[#1D9E75] font-medium">
                    <Zap className="w-3 h-3" />{fmtTokens(sessionTokens)} tokens this session
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
