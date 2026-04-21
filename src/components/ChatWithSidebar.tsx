import { useState, useEffect, useRef } from 'react';
import ChatSidebar from './ChatSidebar';
import ChatComponent from './ChatComponent';
import { chatApi, getUser } from '../api/apiClient';

const ChatWithSidebar = ({ selectedRegion, selectedCategory, regions, categories }) => {
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const sidebarRef = useRef<any>(null);
  const isCreatingSession = useRef(false);

  useEffect(() => {
    initializeSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const initializeSession = async () => {
    try {
      const data = await chatApi.getSessions();
      const sessions = data.sessions || [];

      if (sessions.length > 0) {
        // Load the most recent session
        setCurrentSessionId(sessions[0].id);
      } else {
        // No sessions yet — create one
        await createNewSession();
      }
    } catch (err) {
      console.error('Failed to initialize session:', err);
    }
  };

  const createNewSession = async () => {
    if (isCreatingSession.current) return;
    isCreatingSession.current = true;

    try {
      const data = await chatApi.createSession('New Conversation');
      setCurrentSessionId(data.session.id);
      if (sidebarRef.current?.refreshSessions) {
        sidebarRef.current.refreshSessions();
      }
    } catch (err) {
      console.error('Failed to create session:', err);
    } finally {
      isCreatingSession.current = false;
    }
  };

  const handleNewChat = async () => {
    await createNewSession();
  };

  const handleMessageSent = () => {
    if (sidebarRef.current?.refreshSessions) {
      sidebarRef.current.refreshSessions();
    }
  };

  const handleSelectSession = (sessionId: string) => {
    setCurrentSessionId(sessionId);
  };

  const handleDeleteSession = async (sessionId: string) => {
    try {
      await chatApi.deleteSession(sessionId);

      // If deleting current session, create a new one
      if (sessionId === currentSessionId) {
        await handleNewChat();
      }
    } catch (err) {
      console.error('Failed to delete session:', err);
    }
  };

  return (
    <div className="flex h-full overflow-hidden bg-gray-100">
      {/* Sidebar */}
      <ChatSidebar
        ref={sidebarRef}
        currentSessionId={currentSessionId}
        onNewChat={handleNewChat}
        onSelectSession={handleSelectSession}
        onDeleteSession={handleDeleteSession}
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col overflow-hidden h-full">
        {currentSessionId ? (
          <ChatComponent
            selectedRegion={selectedRegion}
            selectedCategory={selectedCategory}
            regions={regions}
            categories={categories}
            sessionId={currentSessionId}
            onMessageSent={handleMessageSent}
            onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
            isSidebarOpen={isSidebarOpen}
            key={currentSessionId}
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
