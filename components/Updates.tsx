'use client';

import React, { useState, useEffect } from 'react';
import { Bell, AlertCircle, Clock, RefreshCw } from 'lucide-react';
import { getToken } from '@/services/apiClient';

type Alert = { id: string; title: string; region: string; category: string; date: string; severity: 'high' | 'medium' | 'low'; summary: string };

interface UpdatesProps { selectedRegion: string; selectedCategory: string; regions: any[]; categories: any[] }

const UpdatesComponent = ({ selectedRegion, selectedCategory, regions, categories }: UpdatesProps) => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [subscriptions] = useState<string[]>(['Fire Safety', 'Labor Law']);

  const fetchAlerts = async (showRefreshLoader = false) => {
    try {
      if (showRefreshLoader) setIsRefreshing(true); else setIsLoading(true);
      setError(null);
      const token = getToken();
      if (!token) { setError('You must be logged in to view alerts.'); return; }
      const res = await fetch('/api/alerts', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) { setError('Failed to fetch alerts.'); return; }
      const data = await res.json();
      setAlerts((data.alerts || []).map((alert: any) => ({ id: alert.id, title: alert.title || 'No title', region: alert.region || 'Unknown region', category: alert.category || 'General', date: new Date(alert.date || alert.created_at).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }), severity: alert.severity || 'medium', summary: alert.summary || 'No summary available' })));
    } catch { setError('Failed to fetch alerts. Please try again.'); }
    finally { setIsLoading(false); setIsRefreshing(false); }
  };

  useEffect(() => { fetchAlerts(); }, []);

  return (
    <div className="updates-container p-4 sm:p-8 bg-[#fafaf8] h-full overflow-y-auto">
      <div className="text-center mb-8 sm:mb-10">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-[#E1F5EE] rounded-xl mb-4"><Bell className="h-8 w-8 text-[#1D9E75]" /></div>
        <h2 className="text-2xl sm:text-3xl font-medium text-[#111] mb-2 tracking-tight">Regulation Updates</h2>
        <p className="text-sm sm:text-base text-[#555] px-4">Stay informed about the latest construction law changes</p>
      </div>
      <div className="max-w-5xl mx-auto">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-6">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-2"><AlertCircle className="h-4 w-4" /><span className="font-medium text-sm">{error}</span></div>
              <button onClick={() => fetchAlerts()} className="ml-2 px-3 py-1.5 bg-red-600 text-white hover:bg-red-700 rounded-lg text-xs font-medium transition-colors">Retry</button>
            </div>
          </div>
        )}
        <div className="bg-[#E1F5EE] border border-[#5DCAA5]/30 rounded-xl p-4 sm:p-5 mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
            <div className="flex items-center space-x-3"><div className="p-1.5 bg-white rounded-lg border border-black/[0.06]"><Bell className="h-4 w-4 text-[#1D9E75]" /></div><span className="font-medium text-[#0F6E56] text-sm sm:text-base">Alert Subscriptions</span></div>
            <button onClick={() => fetchAlerts(true)} disabled={isRefreshing} className="flex items-center justify-center space-x-2 px-4 py-2 bg-[#1D9E75] text-white hover:bg-[#0F6E56] rounded-lg transition-colors duration-150 disabled:opacity-50 text-sm font-medium">
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} /><span>Refresh</span>
            </button>
          </div>
          <p className="text-[#0F6E56] text-sm">You&apos;re subscribed to {subscriptions.join(' and ')} updates for India</p>
        </div>
        {isLoading ? (
          <div className="text-center py-12"><div className="animate-spin rounded-full h-10 w-10 border-2 border-[#E1F5EE] border-t-[#1D9E75] mx-auto mb-4" /><p className="text-[#555] text-sm">Loading alerts...</p></div>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {alerts.length === 0 ? (
              <div className="text-center py-14 bg-white rounded-xl border border-black/[0.09]">
                <div className="inline-flex items-center justify-center w-14 h-14 bg-[#f7f7f5] rounded-xl mb-4"><AlertCircle className="h-7 w-7 text-[#999]" /></div>
                <p className="text-[#555] text-sm mb-4">No alerts available</p>
                <button onClick={() => fetchAlerts(true)} disabled={isRefreshing} className="inline-flex items-center space-x-2 px-5 py-2.5 text-white bg-[#1D9E75] hover:bg-[#0F6E56] rounded-lg transition-colors disabled:opacity-50 text-sm font-medium">
                  <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} /><span>Check for Updates</span>
                </button>
              </div>
            ) : alerts.map(alert => (
              <div key={alert.id} className="border border-black/[0.09] rounded-xl p-4 sm:p-5 hover:border-[#5DCAA5]/50 transition-colors duration-150 bg-white group">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-start space-x-3 mb-3">
                      <div className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${alert.severity === 'high' ? 'bg-red-500 animate-pulse' : alert.severity === 'medium' ? 'bg-yellow-500' : 'bg-[#1D9E75]'}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-1.5">
                          <span className="font-medium text-[#111] text-sm sm:text-base group-hover:text-[#1D9E75] transition-colors">{alert.title}</span>
                          <span className="text-xs text-[#555] bg-[#f7f7f5] px-2.5 py-1 rounded-full w-fit border border-black/[0.06]">{alert.region}</span>
                        </div>
                      </div>
                    </div>
                    <p className="text-[#555] mb-3 text-sm pl-5 leading-relaxed">{alert.summary}</p>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-[#555] pl-5">
                      <span className="flex items-center space-x-1.5 bg-[#f7f7f5] px-2.5 py-1 rounded-lg border border-black/[0.06]"><Clock className="h-3.5 w-3.5 text-[#1D9E75]" /><span>{alert.date}</span></span>
                      <span className="px-2.5 py-1 bg-[#E1F5EE] text-[#0F6E56] rounded-lg font-medium border border-[#5DCAA5]/30">{alert.category}</span>
                    </div>
                  </div>
                  <button className="text-[#999] hover:text-[#1D9E75] hover:bg-[#E1F5EE] p-1.5 rounded-lg transition-colors flex-shrink-0 self-start sm:self-center"><AlertCircle className="h-5 w-5" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default UpdatesComponent;
