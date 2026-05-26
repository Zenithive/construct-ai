'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Users, TrendingUp, MessageSquare, Zap, Search, Filter,
  ChevronUp, ChevronDown, ChevronsUpDown, Edit2, RefreshCw,
  LogOut, ShieldCheck, X, ChevronLeft, ChevronRight, ArrowLeft,
} from 'lucide-react';
import {
  adminApi,
  type AdminUser,
  type AdminStatsResponse,
  type AdminUserFilters,
  getToken,
  removeToken,
  removeUser,
} from '@/services/apiClient';
import EditSubscriptionModal from './EditSubscriptionModal';

// ── Helpers ───────────────────────────────────────────────────────────────────

function planBadge(plan: string) {
  const map: Record<string, string> = {
    free:       'bg-[#f0f0ec] text-[#555]',
    pro:        'bg-[#E1F5EE] text-[#0F6E56]',
    enterprise: 'bg-[#111] text-white',
  };
  return map[plan] ?? 'bg-[#f0f0ec] text-[#555]';
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    active:   'bg-green-100 text-green-700',
    inactive: 'bg-[#f0f0ec] text-[#999]',
    past_due: 'bg-amber-100 text-amber-700',
    canceled: 'bg-red-100 text-red-600',
  };
  return map[status] ?? 'bg-[#f0f0ec] text-[#999]';
}

function fmtDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtNumber(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

// ── Stat card ─────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  accent?: string;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, sub, icon, accent = 'bg-[#E1F5EE]' }) => (
  <div className="bg-white border border-black/[0.09] rounded-xl p-5 flex items-start gap-4">
    <div className={`w-10 h-10 rounded-lg ${accent} flex items-center justify-center flex-shrink-0`}>
      {icon}
    </div>
    <div className="min-w-0">
      <p className="text-xs text-[#999] font-medium">{label}</p>
      <p className="text-2xl font-semibold text-[#111] mt-0.5 leading-none">{value}</p>
      {sub && <p className="text-xs text-[#999] mt-1">{sub}</p>}
    </div>
  </div>
);

// ── Sort button ───────────────────────────────────────────────────────────────

interface SortBtnProps {
  col: string;
  label: string;
  current: string;
  dir: 'asc' | 'desc';
  onSort: (col: string) => void;
}

const SortBtn: React.FC<SortBtnProps> = ({ col, label, current, dir, onSort }) => {
  const active = current === col;
  return (
    <button
      onClick={() => onSort(col)}
      className="flex items-center gap-1 text-xs font-medium text-[#555] hover:text-[#111] transition-colors group"
    >
      {label}
      <span className="text-[#ccc] group-hover:text-[#999]">
        {active ? (dir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />) : <ChevronsUpDown className="w-3 h-3" />}
      </span>
    </button>
  );
};

// ── Main component ────────────────────────────────────────────────────────────

const LIMIT = 10; // 10 per page so pagination is always visible

const AdminDashboard: React.FC = () => {
  const [stats, setStats]               = useState<AdminStatsResponse | null>(null);
  const [users, setUsers]               = useState<AdminUser[]>([]);
  const [pagination, setPagination]     = useState({ total: 0, page: 1, totalPages: 1 });
  const [isLoadingStats, setLoadingStats] = useState(true);
  const [isLoadingUsers, setLoadingUsers] = useState(true);
  const [editUser, setEditUser]         = useState<AdminUser | null>(null);
  const [toast, setToast]               = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // Filters
  const [search, setSearch]     = useState('');
  const [plan, setPlan]         = useState('');
  const [status, setStatus]     = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo]     = useState('');
  const [sortBy, setSortBy]     = useState('created_at');
  const [sortDir, setSortDir]   = useState<'asc' | 'desc'>('desc');
  const [page, setPage]         = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Toast helper ─────────────────────────────────────────────────────────

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Fetch stats ───────────────────────────────────────────────────────────

  const fetchStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const data = await adminApi.getStats();
      setStats(data);
    } catch {
      // stats are non-critical, silently fail
    } finally {
      setLoadingStats(false);
    }
  }, []);

  // ── Fetch users ───────────────────────────────────────────────────────────

  const fetchUsers = useCallback(async (filters: AdminUserFilters) => {
    setLoadingUsers(true);
    try {
      const data = await adminApi.getUsers(filters);
      setUsers(data.users);
      setPagination(data.pagination);
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Failed to load users.', 'error');
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  // ── Initial load ──────────────────────────────────────────────────────────

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchUsers({ page, limit: LIMIT, search, plan, status, dateFrom, dateTo, sortBy, sortDir });
  }, [fetchUsers, page, plan, status, dateFrom, dateTo, sortBy, sortDir]);

  // Debounce search
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setPage(1);
      fetchUsers({ page: 1, limit: LIMIT, search, plan, status, dateFrom, dateTo, sortBy, sortDir });
    }, 350);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Sort handler ──────────────────────────────────────────────────────────

  const handleSort = (col: string) => {
    const newDir = sortBy === col && sortDir === 'asc' ? 'desc' : 'asc';
    setSortBy(col);
    setSortDir(newDir);
    setPage(1);
  };

  // ── Filter reset ──────────────────────────────────────────────────────────

  const resetFilters = () => {
    setSearch(''); setPlan(''); setStatus('');
    setDateFrom(''); setDateTo('');
    setSortBy('created_at'); setSortDir('desc');
    setPage(1);
  };

  const hasActiveFilters = search || plan || status || dateFrom || dateTo;

  // ── Subscription update ───────────────────────────────────────────────────

  const handleUpdateSubscription = async (planType: string, subscriptionStatus: string) => {
    if (!editUser) return;
    const result = await adminApi.updateSubscription(editUser.id, planType, subscriptionStatus);
    // Update the user in the local list
    setUsers(prev => prev.map(u => u.id === editUser.id ? { ...u, ...result.user, planType: result.user.planType, subscriptionStatus: result.user.subscriptionStatus } : u));
    showToast(`Subscription updated for ${editUser.firstName} ${editUser.lastName}.`);
    fetchStats(); // refresh stats
  };

  // ── Logout ────────────────────────────────────────────────────────────────

  const handleLogout = () => {
    removeToken();
    removeUser();
    window.location.href = '/';
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="h-screen overflow-y-auto bg-[#fafaf8] font-sans">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2.5 px-4 py-3 rounded-lg shadow-lg text-sm font-medium transition-all ${
          toast.type === 'success' ? 'bg-[#1D9E75] text-white' : 'bg-red-500 text-white'
        }`}>
          {toast.msg}
          <button onClick={() => setToast(null)} className="ml-1 opacity-70 hover:opacity-100">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-black/[0.09] sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#1D9E75] flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-medium text-[#111]">ConstructAI Admin</span>
            <span className="text-xs text-[#999] bg-[#f0f0ec] px-2 py-0.5 rounded-full">Portal</span>
          </div>
          <div className="flex items-center gap-2">
            {/* Back to Portal */}
            <a
              href="/dashboard"
              className="flex items-center gap-1.5 text-xs text-[#555] hover:text-[#111] transition-colors px-3 py-1.5 rounded-lg hover:bg-[#f0f0ec] border border-black/[0.09]"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Portal
            </a>
            {/* Sign out */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-xs text-[#999] hover:text-[#555] transition-colors px-3 py-1.5 rounded-lg hover:bg-[#f0f0ec]"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Stats grid */}
        <section>
          <h1 className="text-lg font-semibold text-[#111] mb-4">Overview</h1>
          {isLoadingStats ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-white border border-black/[0.09] rounded-xl p-5 h-24 animate-pulse" />
              ))}
            </div>
          ) : stats ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                label="Total Users"
                value={fmtNumber(stats.totalUsers)}
                sub={`+${stats.newUsers30d} last 30 days`}
                icon={<Users className="w-5 h-5 text-[#1D9E75]" />}
              />
              <StatCard
                label="Active Subscriptions"
                value={fmtNumber(stats.activeSubscriptions)}
                sub={`${stats.proUsers} Pro · ${stats.enterpriseUsers} Enterprise`}
                icon={<TrendingUp className="w-5 h-5 text-[#1D9E75]" />}
              />
              <StatCard
                label="Total Chats"
                value={fmtNumber(stats.totalChats)}
                icon={<MessageSquare className="w-5 h-5 text-[#1D9E75]" />}
              />
              <StatCard
                label="Total Tokens Used"
                value={fmtNumber(stats.totalTokens)}
                icon={<Zap className="w-5 h-5 text-[#1D9E75]" />}
                accent="bg-amber-50"
              />
            </div>
          ) : null}
        </section>

        {/* Users table */}
        <section>
          {/* Table header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-base font-semibold text-[#111]">Users</h2>
              {!isLoadingUsers && (
                <p className="text-xs text-[#999] mt-0.5">{pagination.total.toLocaleString()} total</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchUsers({ page, limit: LIMIT, search, plan, status, dateFrom, dateTo, sortBy, sortDir })}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-black/[0.09] text-[#999] hover:text-[#555] hover:bg-[#f0f0ec] transition-colors"
                title="Refresh"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setShowFilters(v => !v)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                  showFilters || hasActiveFilters
                    ? 'border-[#1D9E75] bg-[#E1F5EE] text-[#0F6E56]'
                    : 'border-black/[0.09] text-[#555] hover:bg-[#f0f0ec]'
                }`}
              >
                <Filter className="w-3.5 h-3.5" />
                Filters
                {hasActiveFilters && (
                  <span className="w-4 h-4 rounded-full bg-[#1D9E75] text-white text-[10px] flex items-center justify-center font-medium">
                    {[search, plan, status, dateFrom, dateTo].filter(Boolean).length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative mb-3">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#999]" />
            <input
              type="text"
              placeholder="Search by name or email…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-black/[0.09] rounded-lg text-sm text-[#111] placeholder-[#999] focus:outline-none focus:ring-2 focus:ring-[#E1F5EE] focus:border-[#1D9E75] transition-all"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#999] hover:text-[#555]">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Expanded filters */}
          {showFilters && (
            <div className="bg-white border border-black/[0.09] rounded-xl p-4 mb-3 grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs text-[#999] mb-1.5">Plan</label>
                <select
                  value={plan}
                  onChange={e => { setPlan(e.target.value); setPage(1); }}
                  className="w-full px-3 py-2 bg-[#f7f7f5] border border-black/[0.09] rounded-lg text-sm text-[#111] focus:outline-none focus:ring-2 focus:ring-[#E1F5EE] focus:border-[#1D9E75]"
                >
                  <option value="">All plans</option>
                  <option value="free">Free</option>
                  <option value="pro">Pro</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-[#999] mb-1.5">Status</label>
                <select
                  value={status}
                  onChange={e => { setStatus(e.target.value); setPage(1); }}
                  className="w-full px-3 py-2 bg-[#f7f7f5] border border-black/[0.09] rounded-lg text-sm text-[#111] focus:outline-none focus:ring-2 focus:ring-[#E1F5EE] focus:border-[#1D9E75]"
                >
                  <option value="">All statuses</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="past_due">Past Due</option>
                  <option value="canceled">Canceled</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-[#999] mb-1.5">Joined from</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={e => { setDateFrom(e.target.value); setPage(1); }}
                  className="w-full px-3 py-2 bg-[#f7f7f5] border border-black/[0.09] rounded-lg text-sm text-[#111] focus:outline-none focus:ring-2 focus:ring-[#E1F5EE] focus:border-[#1D9E75]"
                />
              </div>
              <div>
                <label className="block text-xs text-[#999] mb-1.5">Joined to</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={e => { setDateTo(e.target.value); setPage(1); }}
                  className="w-full px-3 py-2 bg-[#f7f7f5] border border-black/[0.09] rounded-lg text-sm text-[#111] focus:outline-none focus:ring-2 focus:ring-[#E1F5EE] focus:border-[#1D9E75]"
                />
              </div>
              {hasActiveFilters && (
                <div className="col-span-2 md:col-span-4 flex justify-end">
                  <button
                    onClick={resetFilters}
                    className="text-xs text-[#999] hover:text-[#555] flex items-center gap-1 transition-colors"
                  >
                    <X className="w-3 h-3" /> Clear all filters
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Table */}
          <div className="bg-white border border-black/[0.09] rounded-xl overflow-hidden">
            <div className={`overflow-x-auto transition-opacity duration-150 ${isLoadingUsers ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-black/[0.09] bg-[#f7f7f5]">
                    <th className="text-left px-4 py-3">
                      <SortBtn col="name" label="Name" current={sortBy} dir={sortDir} onSort={handleSort} />
                    </th>
                    <th className="text-left px-4 py-3">
                      <SortBtn col="email" label="Email" current={sortBy} dir={sortDir} onSort={handleSort} />
                    </th>
                    <th className="text-left px-4 py-3">
                      <SortBtn col="created_at" label="Joined" current={sortBy} dir={sortDir} onSort={handleSort} />
                    </th>
                    <th className="text-left px-4 py-3">
                      <SortBtn col="chats" label="Chats" current={sortBy} dir={sortDir} onSort={handleSort} />
                    </th>
                    <th className="text-left px-4 py-3">
                      <SortBtn col="tokens" label="Tokens" current={sortBy} dir={sortDir} onSort={handleSort} />
                    </th>
                    <th className="text-left px-4 py-3">
                      <SortBtn col="plan_type" label="Plan" current={sortBy} dir={sortDir} onSort={handleSort} />
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-[#555]">Status</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-[#555]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoadingUsers ? (
                    Array.from({ length: 8 }).map((_, i) => (
                      <tr key={i} className="border-b border-black/[0.06]">
                        {Array.from({ length: 8 }).map((__, j) => (
                          <td key={j} className="px-4 py-3.5">
                            <div className="h-4 bg-[#f0f0ec] rounded animate-pulse" style={{ width: `${60 + Math.random() * 40}%` }} />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center text-sm text-[#999]">
                        No users found matching your filters.
                      </td>
                    </tr>
                  ) : (
                    users.map(user => (
                      <tr
                        key={user.id}
                        className="border-b border-black/[0.06] hover:bg-[#fafaf8] transition-colors"
                      >
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-[#E1F5EE] flex items-center justify-center flex-shrink-0 text-xs font-medium text-[#0F6E56]">
                              {user.firstName?.[0]?.toUpperCase() ?? '?'}
                            </div>
                            <span className="font-medium text-[#111] whitespace-nowrap">
                              {user.firstName} {user.lastName}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-[#555] max-w-[200px] truncate">
                          {user.email}
                        </td>
                        <td className="px-4 py-3.5 text-[#999] whitespace-nowrap">
                          {fmtDate(user.createdAt)}
                        </td>
                        <td className="px-4 py-3.5 text-[#555] font-mono text-xs">
                          {user.chatCount.toLocaleString()}
                        </td>
                        <td className="px-4 py-3.5 text-[#555] font-mono text-xs">
                          {fmtNumber(user.totalTokens)}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${planBadge(user.planType)}`}>
                            {user.planType}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusBadge(user.subscriptionStatus)}`}>
                            {user.subscriptionStatus.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <button
                            onClick={() => setEditUser(user)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-[#555] hover:text-[#1D9E75] hover:bg-[#E1F5EE] rounded-lg border border-transparent hover:border-[#1D9E75]/20 transition-all"
                            title="Edit subscription"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination — always visible */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-black/[0.09] bg-[#f7f7f5]">
              {/* Left: result range */}
              <p className="text-xs text-[#999]">
                {isLoadingUsers ? (
                  <span className="inline-block w-32 h-3 bg-[#e8e8e4] rounded animate-pulse" />
                ) : pagination.total === 0 ? (
                  'No users found'
                ) : (
                  <>
                    Showing{' '}
                    <span className="font-medium text-[#555]">
                      {(pagination.page - 1) * LIMIT + 1}–{Math.min(pagination.page * LIMIT, pagination.total)}
                    </span>{' '}
                    of{' '}
                    <span className="font-medium text-[#555]">{pagination.total.toLocaleString()}</span>{' '}
                    users
                  </>
                )}
              </p>

              {/* Right: page controls */}
              <div className="flex items-center gap-1">
                {/* Prev */}
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={pagination.page <= 1 || isLoadingUsers}
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-black/[0.09] bg-white text-[#555] hover:border-[#1D9E75]/40 hover:text-[#1D9E75] disabled:opacity-35 disabled:cursor-not-allowed transition-all"
                  title="Previous page"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>

                {/* Page number pills */}
                {(() => {
                  const total = pagination.totalPages;
                  const cur   = pagination.page;
                  // Build window of up to 5 pages centred on current
                  const start = Math.max(1, Math.min(cur - 2, total - 4));
                  const end   = Math.min(total, start + 4);
                  const pages = [];
                  for (let p = start; p <= end; p++) pages.push(p);
                  return pages.map(p => (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      disabled={isLoadingUsers}
                      className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-medium transition-all ${
                        p === cur
                          ? 'bg-[#1D9E75] text-white shadow-sm shadow-[#1D9E75]/20'
                          : 'border border-black/[0.09] bg-white text-[#555] hover:border-[#1D9E75]/40 hover:text-[#1D9E75]'
                      } disabled:opacity-50`}
                    >
                      {p}
                    </button>
                  ));
                })()}

                {/* Next */}
                <button
                  onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                  disabled={pagination.page >= pagination.totalPages || isLoadingUsers}
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-black/[0.09] bg-white text-[#555] hover:border-[#1D9E75]/40 hover:text-[#1D9E75] disabled:opacity-35 disabled:cursor-not-allowed transition-all"
                  title="Next page"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Edit subscription modal */}
      {editUser && (
        <EditSubscriptionModal
          user={editUser}
          onClose={() => setEditUser(null)}
          onSave={handleUpdateSubscription}
        />
      )}
    </div>
  );
};

export default AdminDashboard;
