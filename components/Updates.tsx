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
    <div className="updates-container p-4 sm:p-8 bg-gradient-to-b from-white to-gray-50 h-full overflow-y-auto">
      <div className="text-center mb-8 sm:mb-12">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl mb-4 shadow-xl"><Bell className="h-10 w-10 text-white" /></div>
        <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">Regulation Updates</h2>
        <p className="text-base sm:text-lg text-gray-600 px-4">Stay informed about the latest construction law changes</p>
      </div>
      <div className="max-w-5xl mx-auto">
        {error && (
          <div className="bg-red-50 border-2 border-red-200 text-red-700 p-4 rounded-xl mb-6 shadow-sm">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-2"><AlertCircle className="h-5 w-5" /><span className="font-medium">{error}</span></div>
              <button onClick={() => fetchAlerts()} className="ml-2 px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg text-sm font-medium transition-colors">Retry</button>
            </div>
          </div>
        )}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl p-4 sm:p-6 mb-6 sm:mb-8 shadow-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
            <div className="flex items-center space-x-3"><div className="p-2 bg-white rounded-lg shadow-sm"><Bell className="h-5 w-5 text-blue-600" /></div><span className="font-bold text-blue-900 text-base sm:text-lg">Alert Subscriptions</span></div>
            <button onClick={() => fetchAlerts(true)} disabled={isRefreshing} className="flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-all duration-200 disabled:opacity-50 shadow-sm font-medium">
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} /><span>Refresh</span>
            </button>
          </div>
          <p className="text-blue-800 font-medium">You&apos;re subscribed to {subscriptions.join(' and ')} updates for India</p>
        </div>
        {isLoading ? (
          <div className="text-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-600 border-t-transparent mx-auto mb-4" /><p className="text-gray-600 font-medium text-lg">Loading alerts...</p></div>
        ) : (
          <div className="space-y-4 sm:space-y-5">
            {alerts.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border-2 border-gray-200 shadow-sm">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4"><AlertCircle className="h-8 w-8 text-gray-400" /></div>
                <p className="text-gray-600 font-medium text-lg mb-4">No alerts available</p>
                <button onClick={() => fetchAlerts(true)} disabled={isRefreshing} className="inline-flex items-center space-x-2 px-6 py-3 text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all disabled:opacity-50 shadow-md">
                  <RefreshCw className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} /><span className="font-medium">Check for Updates</span>
                </button>
              </div>
            ) : alerts.map(alert => (
              <div key={alert.id} className="border-2 border-gray-200 rounded-2xl p-5 sm:p-6 hover:shadow-xl hover:border-blue-300 transition-all duration-200 bg-white group">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-start space-x-4 mb-3">
                      <div className={`w-4 h-4 rounded-full mt-1.5 flex-shrink-0 shadow-md ${alert.severity === 'high' ? 'bg-gradient-to-br from-red-500 to-red-600 animate-pulse' : alert.severity === 'medium' ? 'bg-gradient-to-br from-yellow-500 to-orange-500' : 'bg-gradient-to-br from-green-500 to-green-600'}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
                          <span className="font-bold text-gray-900 text-base sm:text-lg group-hover:text-blue-600 transition-colors">{alert.title}</span>
                          <span className="text-sm text-gray-500 font-medium bg-gray-100 px-3 py-1 rounded-full w-fit">{alert.region}</span>
                        </div>
                      </div>
                    </div>
                    <p className="text-gray-700 mb-4 text-sm sm:text-base pl-8 leading-relaxed">{alert.summary}</p>
                    <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-gray-600 pl-8">
                      <span className="flex items-center space-x-2 bg-gray-50 px-3 py-1.5 rounded-lg"><Clock className="h-4 w-4 text-blue-600" /><span className="font-medium">{alert.date}</span></span>
                      <span className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg font-semibold border border-blue-200">{alert.category}</span>
                    </div>
                  </div>
                  <button className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-2 rounded-lg transition-colors flex-shrink-0 self-start sm:self-center"><AlertCircle className="h-6 w-6" /></button>
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
