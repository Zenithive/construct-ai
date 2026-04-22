'use client';

import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { MessageSquare, Plus, Trash2, LogOut, HardHat, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { chatApi, getUser, removeToken, removeUser } from '@/services/apiClient';
import ConfirmModal from './common/ConfirmModal';

type ChatSession = { id: string; title: string; created_at: string; updated_at: string; message_count: number };

type ChatSidebarProps = {
  currentSessionId: string | null;
  onNewChat: () => void;
  onSelectSession: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => void;
  isOpen: boolean;
  onToggle: () => void;
};

const ChatSidebar = forwardRef(({ currentSessionId, onNewChat, onSelectSession, onDeleteSession, isOpen, onToggle }: ChatSidebarProps, ref) => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userFirstName, setUserFirstName] = useState('User');
  const [userEmail, setUserEmail] = useState('');
  const [logoutModal, setLogoutModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState<string | null>(null); // holds sessionId to delete
  const router = useRouter();

  useImperativeHandle(ref, () => ({ refreshSessions: loadChatSessions }));

  useEffect(() => { loadChatSessions(); loadUserInfo(); }, []);

  const loadUserInfo = () => {
    const user = getUser();
    if (user?.firstName) setUserFirstName(user.firstName as string);
    else if (user?.email) setUserFirstName((user.email as string).split('@')[0]);
    if (user?.email) setUserEmail(user.email as string);
  };

  const loadChatSessions = async () => {
    try {
      setIsLoading(true);
      const data = await chatApi.getSessions() as any;
      setSessions((data.sessions || []).map((s: any) => ({ ...s, message_count: 0 })));
    } catch (err) { console.error('Failed to load sessions:', err); }
    finally { setIsLoading(false); }
  };

  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteModal(sessionId);
  };

  const confirmDelete = async () => {
    if (!deleteModal) return;
    const sessionId = deleteModal;
    setDeleteModal(null);
    onDeleteSession(sessionId);
    setSessions(sessions.filter(s => s.id !== sessionId));
  };

  const handleLogout = () => {
    setLogoutModal(true);
  };

  const confirmLogout = () => {
    setLogoutModal(false);
    removeToken();
    removeUser();
    router.push('/');
  };

  const truncateTitle = (title: string, max = 26) => title.length > max ? title.substring(0, max) + '…' : title;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const days = Math.floor((Date.now() - date.getTime()) / 86400000);
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <>
      {isOpen && <div className="md:hidden fixed inset-0 bg-black/30 z-30" onClick={onToggle} />}
      <div className={`relative flex flex-col flex-shrink-0 h-full bg-[#f9f9f9] border-r border-gray-200 transition-all duration-300 ease-in-out ${isOpen ? 'w-64' : 'w-14'}`}>
        {/* Top controls */}
        <div className={`flex items-center h-14 px-3 flex-shrink-0 ${isOpen ? 'justify-between' : 'justify-center'}`}>
          {isOpen && (
            <div className="flex items-center space-x-2 overflow-hidden">
              <div className="bg-blue-600 p-1.5 rounded-lg flex-shrink-0"><HardHat className="h-4 w-4 text-white" /></div>
              <span className="font-semibold text-gray-800 text-sm whitespace-nowrap">ConstructAI</span>
            </div>
          )}
          <button onClick={onToggle} className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-200 rounded-lg transition-colors flex-shrink-0" title={isOpen ? 'Close sidebar' : 'Open sidebar'}>
            {isOpen ? <PanelLeftClose className="h-5 w-5" /> : <PanelLeftOpen className="h-5 w-5" />}
          </button>
        </div>

        {/* New Chat */}
        <div className={`px-2 pb-2 flex-shrink-0 ${!isOpen ? 'flex justify-center' : ''}`}>
          {isOpen ? (
            <button onClick={onNewChat} className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-200 rounded-lg transition-colors font-medium">
              <Plus className="h-4 w-4 flex-shrink-0" /><span className="whitespace-nowrap">New chat</span>
            </button>
          ) : (
            <button onClick={onNewChat} title="New chat" className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-200 rounded-lg transition-colors">
              <Plus className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Sessions list */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-2 pb-2">
          {isOpen ? (
            isLoading ? (
              <div className="flex items-center justify-center py-8"><div className="animate-spin rounded-full h-5 w-5 border-2 border-gray-300 border-t-gray-600" /></div>
            ) : sessions.length === 0 ? (
              <div className="text-center py-10 px-4"><MessageSquare className="h-7 w-7 text-gray-300 mx-auto mb-2" /><p className="text-gray-400 text-xs">No conversations yet</p></div>
            ) : (
              <div className="space-y-0.5">
                {sessions.map(session => (
                  <div key={session.id} onClick={() => onSelectSession(session.id)} className={`group flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${currentSessionId === session.id ? 'bg-gray-200 text-gray-900' : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'}`}>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{truncateTitle(session.title)}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{formatDate(session.updated_at)}</p>
                    </div>
                    <button onClick={e => handleDeleteSession(session.id, e)} className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 rounded transition-all flex-shrink-0 ml-1">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )
          ) : (
            <div className="flex flex-col items-center space-y-1 pt-1">
              {sessions.slice(0, 8).map(session => (
                <button key={session.id} onClick={() => onSelectSession(session.id)} title={session.title} className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${currentSessionId === session.id ? 'bg-gray-300 text-gray-900' : 'text-gray-400 hover:bg-gray-200 hover:text-gray-700'}`}>
                  <MessageSquare className="h-4 w-4" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* User footer */}
        <div className={`flex-shrink-0 border-t border-gray-200 p-2 ${!isOpen ? 'flex justify-center' : ''}`}>
          {isOpen ? (
            <div className="flex items-center space-x-2.5 px-2 py-2 rounded-lg hover:bg-gray-200 transition-colors group cursor-default">
              <div className="w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-semibold text-white">{userFirstName.charAt(0).toUpperCase()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{userFirstName}</p>
                <p className="text-xs text-gray-400 truncate">{userEmail}</p>
              </div>
              <button onClick={handleLogout} title="Log out" className="p-1 text-gray-400 hover:text-red-500 rounded transition-colors flex-shrink-0">
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button onClick={handleLogout} title="Log out" className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-gray-200 rounded-lg transition-colors">
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
      {/* Logout confirmation */}
      <ConfirmModal
        isOpen={logoutModal}
        title="Logout"
        message="Are you sure you want to logout?"
        confirmText="Logout"
        cancelText="Cancel"
        variant="danger"
        onConfirm={confirmLogout}
        onCancel={() => setLogoutModal(false)}
      />

      {/* Delete session confirmation */}
      <ConfirmModal
        isOpen={!!deleteModal}
        title="Delete chat"
        message="This conversation will be permanently deleted."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteModal(null)}
      />
    </>
  );
});

ChatSidebar.displayName = 'ChatSidebar';
export default ChatSidebar;
