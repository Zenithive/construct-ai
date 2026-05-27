"use client";

import {
  useState,
  useEffect,
  forwardRef,
  useImperativeHandle,
  useRef,
} from "react";
import {
  MessageSquare,
  Plus,
  Trash2,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Globe,
  Clock,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  chatApi,
  usersApi,
  getUser,
  setUser,
  removeToken,
  removeUser,
} from "@/services/apiClient";
import ConfirmModal from "./common/ConfirmModal";
import { RegionDropdown } from "./common/RegionDropdown";
import UsageMeter from "./billing/UsageMeter";
import SidebarPlanTag from "./billing/SidebarPlanTag";
import { COUNTRIES, type CountryKey } from "@/constants/countries";
import EditProfileModal from "./auth/EditProfileModal";

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
  onCountryChange?: (code: string, label: string) => void;
};

/* ─── Main sidebar ───────────────────────────────────────────────────────── */
const ChatSidebar = forwardRef(
  (
    {
      currentSessionId,
      onNewChat,
      onSelectSession,
      onDeleteSession,
      isOpen,
      onToggle,
      onCountryChange,
    }: ChatSidebarProps,
    ref,
  ) => {
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [userFirstName, setUserFirstName] = useState("User");
    const [userEmail, setUserEmail] = useState("");
    const [logoutModal, setLogoutModal] = useState(false);
    const [deleteModal, setDeleteModal] = useState<string | null>(null);
    const [selectedCountry, setSelectedCountry] = useState<CountryKey | null>(
      null,
    );
    const [countryDropdownOpen, setCountryDropdownOpen] = useState(false);
    const [historyPopoverOpen, setHistoryPopoverOpen] = useState(false);
    const [popoverPos, setPopoverPos] = useState({ top: 0, left: 0 });
    const countryDropdownRef = useRef<HTMLDivElement>(null);
    const historyPopoverRef = useRef<HTMLDivElement>(null);
    const historyBtnRef = useRef<HTMLButtonElement>(null);
    const router = useRouter();

    useImperativeHandle(ref, () => ({ refreshSessions: loadChatSessions }));

    useEffect(() => {
      loadChatSessions();
      loadUserInfo();
    }, []);

    useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        if (
          countryDropdownRef.current &&
          !countryDropdownRef.current.contains(e.target as Node)
        ) {
          setCountryDropdownOpen(false);
        }
      };
      if (countryDropdownOpen)
        document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }, [countryDropdownOpen]);

    useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        if (
          historyPopoverRef.current &&
          !historyPopoverRef.current.contains(e.target as Node)
        ) {
          setHistoryPopoverOpen(false);
        }
      };
      if (historyPopoverOpen)
        document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }, [historyPopoverOpen]);

    const loadUserInfo = () => {
      const user = getUser();
      if (user?.firstName) setUserFirstName(user.firstName as string);
      else if (user?.email)
        setUserFirstName((user.email as string).split("@")[0]);
      if (user?.email) setUserEmail(user.email as string);

      // Initialise country dropdown from stored user (default to England)
      const storedCountry = (user?.country as string) || "England";
      const key = (Object.keys(COUNTRIES) as CountryKey[]).find(
        (k) => COUNTRIES[k].label === storedCountry,
      ) ?? "ENGLAND";
      setSelectedCountry(key);
      onCountryChange?.(COUNTRIES[key].code, COUNTRIES[key].label);
    };

    const loadChatSessions = async () => {
      try {
        setIsLoading(true);
        const data = (await chatApi.getSessions()) as any;
        setSessions(
          (data.sessions || []).map((s: any) => ({ ...s, message_count: 0 })),
        );
      } catch (err) {
        console.error("Failed to load sessions:", err);
      } finally {
        setIsLoading(false);
      }
    };

    const handleDeleteSession = async (
      sessionId: string,
      e: React.MouseEvent,
    ) => {
      e.stopPropagation();
      setDeleteModal(sessionId);
    };

    const confirmDelete = async () => {
      if (!deleteModal) return;
      const sessionId = deleteModal;
      setDeleteModal(null);
      onDeleteSession(sessionId);
      setSessions(sessions.filter((s) => s.id !== sessionId));
    };

    const handleLogout = () => setLogoutModal(true);

    const confirmLogout = () => {
      setLogoutModal(false);
      removeToken();
      removeUser();
      router.push("/");
    };

    const handleSelectCountry = async (key: CountryKey) => {
      setSelectedCountry(key);
      setCountryDropdownOpen(false);
      onCountryChange?.(COUNTRIES[key].code, COUNTRIES[key].label);
      try {
        await usersApi.updateCountry(COUNTRIES[key].label);
        // Keep localStorage in sync so the selection persists on reload
        const user = getUser();
        if (user) setUser({ ...user, country: COUNTRIES[key].label });
      } catch (e) {
        console.error("[handleSelectCountry] Failed to update country:", e);
      }
    };

    const truncateTitle = (title: string, max = 26) =>
      title.length > max ? title.substring(0, max) + "…" : title;

    const formatDate = (dateStr: string) => {
      const date = new Date(dateStr);
      const days = Math.floor((Date.now() - date.getTime()) / 86400000);
      if (days === 0) return "Today";
      if (days === 1) return "Yesterday";
      if (days < 7) return `${days}d ago`;
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    };

    return (
      <>
        {isOpen && (
          <div
            className="md:hidden fixed inset-0 bg-black/30 z-30"
            onClick={onToggle}
          />
        )}
        <div
          className={`relative flex flex-col flex-shrink-0 h-full bg-[#f7f7f5] border-r border-black/[0.09] transition-all duration-300 ease-in-out ${isOpen ? "w-64" : "w-14"}`}
        >
          {/* Top controls */}
          <div
            className={`flex items-center h-14 px-3 flex-shrink-0 ${isOpen ? "justify-between" : "justify-center"}`}
          >
            {isOpen && (
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="w-8 h-8 bg-[#1D9E75] rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 21h18M3 7v14M21 7v14M6 21V11M10 21V11M14 21V11M18 21V11M3 7l9-4 9 4" />
                  </svg>
                </div>
                <span className="text-[15px] font-medium text-[#111] whitespace-nowrap">
                  Construction<span className="text-[#1D9E75]">AI</span><span className="text-[#999]">.chat</span>
                </span>
              </div>
            )}
            <button
              onClick={onToggle}
              className="p-1.5 text-[#999] hover:text-[#111] hover:bg-black/[0.05] rounded-lg transition-colors flex-shrink-0"
              title={isOpen ? "Close sidebar" : "Open sidebar"}
            >
              {isOpen ? (
                <PanelLeftClose className="h-5 w-5" />
              ) : (
                <PanelLeftOpen className="h-5 w-5" />
              )}
            </button>
          </div>

          {/* New Chat */}
          <div
            className={`px-2 pb-2 flex-shrink-0 ${!isOpen ? "flex justify-center" : ""}`}
          >
            {isOpen ? (
              <button
                onClick={onNewChat}
                className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-[#555] hover:bg-black/[0.05] rounded-lg transition-colors font-medium"
              >
                <Plus className="h-4 w-4 flex-shrink-0" />
                <span className="whitespace-nowrap">New chat</span>
              </button>
            ) : (
              <button
                onClick={onNewChat}
                title="New chat"
                className="p-2 text-[#999] hover:text-[#111] hover:bg-black/[0.05] rounded-lg transition-colors"
              >
                <Plus className="h-5 w-5" />
              </button>
            )}
          </div>

          {/* Sessions list */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden px-2 pb-2">
            {isOpen ? (
              isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-gray-300 border-t-gray-600" />
                </div>
              ) : sessions.length === 0 ? (
                <div className="text-center py-10 px-4">
                  <MessageSquare className="h-7 w-7 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-400 text-xs">No conversations yet</p>
                </div>
              ) : (
                <div className="space-y-0.5">
                  {sessions.map((session) => (
                    <div
                      key={session.id}
                      onClick={() => onSelectSession(session.id)}
                      className={`group flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                        currentSessionId === session.id
                          ? "bg-black/[0.07] text-[#111]"
                          : "text-[#555] hover:bg-black/[0.05] hover:text-[#111]"
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">
                          {truncateTitle(session.title)}
                        </p>
                        <p className="text-xs text-[#999] mt-0.5">
                          {formatDate(session.updated_at)}
                        </p>
                      </div>
                      <button
                        onClick={(e) => handleDeleteSession(session.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 rounded transition-all flex-shrink-0 ml-1"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )
            ) : (
              /* ── Collapsed: single history icon + fixed popover ── */
              <div className="flex flex-col items-center pt-1">
                <div ref={historyPopoverRef}>
                  <button
                    ref={historyBtnRef}
                    type="button"
                    onClick={() => {
                      if (!historyPopoverOpen && historyBtnRef.current) {
                        const r = historyBtnRef.current.getBoundingClientRect();
                        setPopoverPos({ top: r.top, left: r.right + 8 });
                      }
                      setHistoryPopoverOpen((prev) => !prev);
                    }}
                    title="Recent chats"
                    className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${
                      historyPopoverOpen
                        ? "bg-black/[0.07] text-[#111]"
                        : "text-[#999] hover:bg-black/[0.05] hover:text-[#555]"
                    }`}
                  >
                    <Clock className="h-4 w-4" />
                  </button>

                  {/* Floating history popover — fixed so it escapes any overflow:hidden parent */}
                  <div
                    style={{ top: popoverPos.top, left: popoverPos.left }}
                    className={`fixed z-[999] w-60 origin-top-left transition-all duration-150 ease-in-out ${
                      historyPopoverOpen
                        ? "opacity-100 scale-100 pointer-events-auto"
                        : "opacity-0 scale-95 pointer-events-none"
                    }`}
                  >
                    <div className="overflow-hidden rounded-xl border border-black/[0.09] bg-white shadow-lg shadow-black/[0.06]">
                      {/* Header */}
                      <div className="border-b border-black/[0.06] px-3 pb-2 pt-3">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#999]">
                          Recent chats
                        </p>
                      </div>

                      {/* Body */}
                      <div className="max-h-80 overflow-y-auto p-1.5">
                        {isLoading ? (
                          <div className="flex justify-center py-5">
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-black/[0.09] border-t-[#1D9E75]" />
                          </div>
                        ) : sessions.length === 0 ? (
                          <div className="px-3 py-6 text-center">
                            <MessageSquare className="mx-auto mb-1.5 h-6 w-6 text-gray-200" />
                            <p className="text-xs text-[#999]">No conversations yet</p>
                          </div>
                        ) : (
                          <div className="space-y-0.5">
                            {sessions.map((session) => (
                              <button
                                key={session.id}
                                type="button"
                                onClick={() => {
                                  onSelectSession(session.id);
                                  setHistoryPopoverOpen(false);
                                }}
                                className={`group w-full flex flex-col text-left px-2.5 py-2 rounded-lg transition-colors ${
                                  currentSessionId === session.id
                                    ? "bg-[#E1F5EE]/80 ring-1 ring-inset ring-[#5DCAA5]/20"
                                    : "hover:bg-[#f7f7f5]"
                                }`}
                              >
                                <span
                                  className={`block truncate text-[13px] font-medium leading-snug ${
                                    currentSessionId === session.id
                                      ? "text-[#0F6E56]"
                                      : "text-[#111]"
                                  }`}
                                >
                                  {truncateTitle(session.title, 30)}
                                </span>
                                <span className="mt-0.5 text-[11px] text-[#999]">
                                  {formatDate(session.updated_at)}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── User footer ───────────────────────────────────────────────── */}
          <div
            className={`flex-shrink-0 border-t border-black/[0.09] p-2 ${!isOpen ? "flex flex-col items-center gap-1" : ""}`}
          >
            {isOpen ? (
              /* ── Expanded footer ── */
              <div className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-black/[0.04] transition-colors cursor-default">
                {/* Avatar */}
                <div className="w-7 h-7 bg-[#1D9E75] rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-medium text-white">
                    {userFirstName.charAt(0).toUpperCase()}
                  </span>
                </div>

                {/* Name + email + dropdown trigger */}
                <div
                  className="relative flex-1 min-w-0"
                  ref={countryDropdownRef}
                >
                  {/* Name row with inline region chip */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="text-[13px] font-medium text-[#111] truncate leading-tight">
                      {userFirstName}
                    </p>
                    <SidebarPlanTag refreshKey={usageRefreshKey} />
                    <button
                      onClick={() => setCountryDropdownOpen((prev) => !prev)}
                      title={
                        selectedCountry
                          ? `Region: ${COUNTRIES[selectedCountry].label}`
                          : "Select region"
                      }
                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border transition-all duration-150 flex-shrink-0 ${
                        countryDropdownOpen
                          ? "ring-1 ring-[#5DCAA5]/40 border-[#5DCAA5]/60 bg-[#E1F5EE]"
                          : selectedCountry
                            ? "border-black/[0.09] bg-white hover:bg-[#f7f7f5] text-[#555]"
                            : "border-dashed border-black/[0.14] hover:border-black/[0.2] text-[#999] hover:text-[#555] hover:bg-[#f7f7f5]"
                      }`}
                    >
                      {selectedCountry ? (
                        <>
                          <span
                            className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${COUNTRIES[selectedCountry].dot}`}
                          />
                          <span className="text-[10px] font-bold tracking-wide text-[#555]">
                            {COUNTRIES[selectedCountry].code}
                          </span>
                        </>
                      ) : (
                        <Globe className="h-2.5 w-2.5" />
                      )}
                    </button>
                  </div>
                  <p className="text-[11px] text-[#999] truncate leading-tight mt-0.5">
                    {userEmail}
                  </p>

                  {/* Dropdown panel — opens upward */}
                  {countryDropdownOpen && (
                    <div className="absolute bottom-full mb-2 left-0 w-52 z-50">
                      <RegionDropdown
                        selected={selectedCountry}
                        onSelect={handleSelectCountry}
                      />
                    </div>
                  )}
                </div>

                {/* Logout */}
                <button
                  onClick={handleLogout}
                  title="Log out"
                  className="p-1.5 text-[#999] hover:text-red-500 hover:bg-red-50 rounded-md transition-colors flex-shrink-0"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              /* ── Collapsed footer ── */
              <>
                {/* Country trigger */}
                <div className="relative" ref={countryDropdownRef}>
                  <button
                    onClick={() => setCountryDropdownOpen((prev) => !prev)}
                    title={
                      selectedCountry
                        ? `Region: ${COUNTRIES[selectedCountry].label}`
                        : "Select region"
                    }
                    className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${
                      countryDropdownOpen ? "bg-black/[0.07]" : "hover:bg-black/[0.04]"
                    }`}
                  >
                    {selectedCountry ? (
                      <span
                        className={`inline-flex items-center justify-center w-7 h-5 rounded text-[9px] font-bold tracking-wide ${COUNTRIES[selectedCountry].color}`}
                      >
                        {COUNTRIES[selectedCountry].code}
                      </span>
                    ) : (
                      <Globe className="h-4 w-4 text-gray-400" />
                    )}
                  </button>

                  {/* Dropdown panel — opens to the right */}
                  {countryDropdownOpen && (
                    <div className="absolute bottom-0 left-full ml-2 w-52 z-50">
                      <RegionDropdown
                        selected={selectedCountry}
                        onSelect={handleSelectCountry}
                      />
                    </div>
                  )}
                </div>

                {/* Logout */}
                <button
                  onClick={handleLogout}
                  title="Log out"
                  className="w-8 h-8 flex items-center justify-center text-[#999] hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </>
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
  },
);

ChatSidebar.displayName = "ChatSidebar";
export default ChatSidebar;
