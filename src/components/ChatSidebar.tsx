import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { MessageSquare, Plus, Trash2, Menu, X } from 'lucide-react';
import supabase from '../supaBase/supabaseClient';

type ChatSession = {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
};

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
  const [userFirstName, setUserFirstName] = useState<string>('User');

  // Expose refresh function to parent
  useImperativeHandle(ref, () => ({
    refreshSessions: loadChatSessions
  }));

  useEffect(() => {
    loadChatSessions();
    loadUserInfo();
  }, []);

  const loadUserInfo = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        return;
      }


      // First, try to get firstName from user metadata (where it's being stored during signup)
      if (user.user_metadata?.firstName) {
        setUserFirstName(user.user_metadata.firstName);
        return;
      }

      // Fallback: Try to fetch from users table in Supabase
      const { data: userData, error: dbError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();


      if (dbError) {
        // Fallback to email username if database query fails
        if (user.email) {
          const emailUsername = user.email.split('@')[0];
          setUserFirstName(emailUsername.charAt(0).toUpperCase() + emailUsername.slice(1));
        }
        return;
      }


      if (userData?.firstName) {
        setUserFirstName(userData.firstName);
      } else {
        if (user.email) {
          const emailUsername = user.email.split('@')[0];
          setUserFirstName(emailUsername.charAt(0).toUpperCase() + emailUsername.slice(1));
        }
      }
    } catch (err) {
    }
  };

  const loadChatSessions = async () => {
    try {
      setIsLoading(true);

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        return;
      }

      // Load chat sessions
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (sessionsError) {
        return;
      }

      // Load message counts for each session
      const sessionsWithCounts = await Promise.all(
        (sessionsData || []).map(async (session) => {
          const { count, error: countError } = await supabase
            .from('chat_messages')
            .select('*', { count: 'exact', head: true })
            .eq('session_id', session.id);

          if (countError) {
            return { ...session, message_count: 0 };
          }

          return { ...session, message_count: count || 0 };
        })
      );

      setSessions(sessionsWithCounts);
    } catch (err) {
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!window.confirm('Are you sure you want to delete this chat?')) {
      return;
    }

    onDeleteSession(sessionId);

    // Remove from local state
    setSessions(sessions.filter(s => s.id !== sessionId));
  };

  const truncateTitle = (title: string, maxLength: number = 25) => {
    return title.length > maxLength ? title.substring(0, maxLength) + '...' : title;
  };

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
          fixed md:relative inset-y-0 left-0 z-40
          bg-gradient-to-b from-gray-50 to-gray-100 border-r border-gray-200 flex flex-col shadow-lg
          transform transition-all duration-300 ease-in-out flex-shrink-0
          ${isOpen ? 'w-72 translate-x-0' : 'w-0 md:w-0 -translate-x-full md:translate-x-0'}
        `}
        style={{ overflow: isOpen ? 'visible' : 'hidden' }}
      >
        {/* New Chat Button */}
        <div className="p-4 border-b border-gray-200">
          <button
            onClick={() => {
              onNewChat();
            }}
            className="w-full flex items-center space-x-3 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg transition-all shadow-md hover:shadow-lg group"
          >
            <Plus className="h-5 w-5" />
            <span className="font-medium">New Chat</span>
          </button>
        </div>

        {/* Chat History */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent mx-auto"></div>
              <p className="text-sm text-gray-600 mt-2">Loading chats...</p>
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50 text-gray-400" />
              <p className="text-sm">No chat history yet</p>
              <p className="text-xs mt-1">Start a new conversation!</p>
            </div>
          ) : (
            sessions.map((session) => (
              <div
                key={session.id}
                onClick={() => {
                  onSelectSession(session.id);
                }}
                className={`
                  group flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-all
                  ${currentSessionId === session.id
                    ? 'bg-blue-100 border-l-4 border-blue-600 text-blue-900 shadow-sm'
                    : 'hover:bg-white hover:shadow-sm text-gray-700 hover:text-gray-900 border-l-4 border-transparent'}
                `}
              >
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  <MessageSquare className={`h-4 w-4 flex-shrink-0 ${currentSessionId === session.id ? 'text-blue-600' : 'text-gray-500'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {truncateTitle(session.title)}
                    </p>
                    {session.message_count > 0 && (
                      <p className="text-xs text-gray-500">
                        {session.message_count} {session.message_count === 1 ? 'message' : 'messages'}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={(e) => handleDeleteSession(session.id, e)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-100 hover:text-red-600 rounded transition-all"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* User Info */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center space-x-3 px-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center shadow-md">
              <span className="text-sm font-bold text-white">{userFirstName.charAt(0).toUpperCase()}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{userFirstName}</p>
              <p className="text-xs text-gray-500">Free Plan</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
});

ChatSidebar.displayName = 'ChatSidebar';

export default ChatSidebar;
