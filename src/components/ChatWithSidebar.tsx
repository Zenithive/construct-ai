import { useState, useEffect, useRef } from 'react';
import ChatSidebar from './ChatSidebar';
import ChatComponent from './ChatComponent';
import supabase from '../supaBase/supabaseClient';

const ChatWithSidebar = ({ selectedRegion, selectedCategory, regions, categories }) => {
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const sidebarRef = useRef<any>(null);
  const isCreatingSession = useRef(false);

  useEffect(() => {
    initializeUser();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const initializeUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUserId(user.id);
      // Load or create default session
      await loadOrCreateSession(user.id);
    }
  };

  const loadOrCreateSession = async (userId: string) => {

    // Try to load the most recent session
    const { data, error } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(1);


    if (error) {
      // If table doesn't exist or query fails, create a temporary session ID
      setCurrentSessionId(`temp-${userId}-${Date.now()}`);
      return;
    }

    if (data && data.length > 0) {
      setCurrentSessionId(data[0].id);
    } else {
      // Create a new session - pass userId directly since state might not be updated yet
      await createNewSession(userId);
    }
  };

  const createNewSession = async (userIdParam: string) => {
    const userIdToUse = userIdParam || userId;

    if (!userIdToUse) {
      return;
    }

    // Prevent duplicate session creation
    if (isCreatingSession.current) {
      return;
    }

    isCreatingSession.current = true;

    try {
      const { data, error } = await supabase
        .from('chat_sessions')
        .insert({
          user_id: userIdToUse,
          title: 'New Conversation',
          message_count: 0
        })
        .select()
        .single();

      if (error) {
        // If table doesn't exist or insert fails, create a temporary session ID
        setCurrentSessionId(`temp-${userIdToUse}-${Date.now()}`);
        isCreatingSession.current = false;
        return;
      }

      setCurrentSessionId(data.id);
      // Refresh sidebar to show new session
      if (sidebarRef.current?.refreshSessions) {
        sidebarRef.current.refreshSessions();
      }
      isCreatingSession.current = false;
    } catch (err) {
      // Create temporary session as last resort
      setCurrentSessionId(`temp-${userIdToUse}-${Date.now()}`);
      isCreatingSession.current = false;
    }
  };

  const handleNewChat = async () => {
    // Use the createNewSession function with the current userId from state
    await createNewSession(userId || '');
  };

  const handleMessageSent = () => {
    // Refresh sidebar when a message is sent (updates title and message count)
    if (sidebarRef.current?.refreshSessions) {
      sidebarRef.current.refreshSessions();
    }
  };

  const handleSelectSession = async (sessionId: string) => {
    setCurrentSessionId(sessionId);
  };

  const handleDeleteSession = async (sessionId: string) => {
    try {
      // Delete all messages in the session
      await supabase
        .from('chat_messages')
        .delete()
        .eq('session_id', sessionId);

      // Delete the session
      await supabase
        .from('chat_sessions')
        .delete()
        .eq('id', sessionId);

      // If deleting current session, create a new one
      if (sessionId === currentSessionId) {
        await handleNewChat();
      }
    } catch (err) {
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      {/* Sidebar */}
      <ChatSidebar
        ref={sidebarRef}
        currentSessionId={currentSessionId}
        onNewChat={handleNewChat}
        onSelectSession={handleSelectSession}
        onDeleteSession={handleDeleteSession}
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {currentSessionId ? (
          <ChatComponent
            selectedRegion={selectedRegion}
            selectedCategory={selectedCategory}
            regions={regions}
            categories={categories}
            sessionId={currentSessionId}
            onMessageSent={handleMessageSent}
            key={currentSessionId} // Force re-render when session changes
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatWithSidebar;
