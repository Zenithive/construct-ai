/*
import React from 'react';
import { X, Menu, Plus } from 'lucide-react';

export type Message = {
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
};

interface SidebarProps {
  messages: Message[];
  onSelectMessage: (content: string) => void;
  onNewChat: () => void;
  isLoadingHistory: boolean;
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const SidebarLayout: React.FC<SidebarProps> = ({
  messages,
  onSelectMessage,
  onNewChat,
  isLoadingHistory,
  isOpen,
  setIsOpen,
}) => {
  const userMessages = messages.filter((msg) => msg.type === 'user');
  const sortedUserMessages = [...userMessages].sort(
    (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
  );

  return (
    <>
      {!isOpen && (
        <button
          className="fixed left-0 top-4 p-2 text-black rounded-r "
          onClick={() => setIsOpen(true)}
        >
          <Menu size={20} />
        </button>
      )}

      <div
        className={`w-60 h-screen border-r bg-gray-50 fixed top-0 left-0 flex flex-col shadow-md transform transition-transform duration-300 ease-in-out z-40 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b bg-gray-50 sticky top-0 z-10">
          <h2 className="font-bold text-lg">Chat History</h2>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 rounded hover:bg-gray-200 transition"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-4 border-b">
          <button
            className="flex items-center gap-2 w-full justify-center p-2 rounded bg-blue-500 text-white hover:bg-blue-600 transition"
            onClick={onNewChat}
          >
            <Plus size={16} /> New Chat
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
          {isLoadingHistory ? (
            <p>Loading history...</p>
          ) : sortedUserMessages.length === 0 ? (
            <p className="text-gray-500">No chat history yet.</p>
          ) : (
            sortedUserMessages.map((msg, idx) => (
              <div
                key={idx}
                className="p-2 rounded-lg cursor-pointer bg-blue-100 text-blue-800 hover:bg-blue-200 transition"
                onClick={() => onSelectMessage(msg.content)}
              >
                <div className="truncate">{msg.content}</div>
                <div className="text-xs opacity-50">
                  {msg.timestamp.toLocaleTimeString()}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
};

export default SidebarLayout;
*/
import React from "react";
import { X, Menu, Plus } from "lucide-react";

export type Message = {
  type: "user" | "ai";
  content: string;
  timestamp: Date;
};

interface SidebarProps {
  messages: Message[];
  onSelectMessage: (content: string) => void;
  onNewChat: () => void;
  isLoadingHistory: boolean;
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const SidebarLayout: React.FC<SidebarProps> = ({
  messages,
  onSelectMessage,
  onNewChat,
  isLoadingHistory,
  isOpen,
  setIsOpen,
}) => {
  // Filter only user messages
  const userMessages = messages.filter((msg) => msg.type === "user");

  // Sort latest messages first
  const sortedUserMessages = [...userMessages].sort(
    (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
  );

  return (
    <>
      {/* Sidebar Toggle Button (visible when sidebar is closed) */}
      {!isOpen && (
        <button
          className="fixed left-2 top-4 p-2 bg-gray-100 text-black rounded-r shadow hover:bg-gray-200 transition z-50"
          onClick={() => setIsOpen(true)}
        >
          <Menu size={20} />
        </button>
      )}

      {/* Sidebar Panel */}
      <div
        className={`fixed top-0 left-0 w-60 h-screen bg-gray-50 border-r shadow-md flex flex-col transform transition-transform duration-300 ease-in-out z-40
        ${isOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gray-50 sticky top-0 z-10">
          <h2 className="font-bold text-lg">Chat History</h2>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 rounded hover:bg-gray-200 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* New Chat Button */}
        <div className="p-4 border-b">
          <button
            className="flex items-center gap-2 w-full justify-center p-2 rounded bg-blue-500 text-white hover:bg-blue-600 transition"
            onClick={onNewChat}
          >
            <Plus size={16} /> New Chat
          </button>
        </div>

        {/* Chat List (Scrollable Area) */}
        <div
          className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar shadow-inner scroll-area-border"
          style={{ maxHeight: "calc(100vh - 140px)" }}
        >
          {isLoadingHistory ? (
            <p>Loading history...</p>
          ) : sortedUserMessages.length === 0 ? (
            <p className="text-gray-500">No chat history yet.</p>
          ) : (
            sortedUserMessages.map((msg, idx) => (
              <div
                key={idx}
                className="p-2 rounded-lg cursor-pointer bg-blue-100 text-blue-800 hover:bg-blue-200 transition"
                onClick={() => onSelectMessage(msg.content)}
              >
                <div className="truncate">{msg.content}</div>
                <div className="text-xs opacity-50">
                  {msg.timestamp.toLocaleTimeString()}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
};

export default SidebarLayout;
