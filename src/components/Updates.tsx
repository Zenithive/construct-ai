import React, { useState, useEffect } from 'react';
import { Bell, AlertCircle, Clock, RefreshCw } from 'lucide-react';
import supabase from '../supaBase/supabaseClient';

type Alert = {
  id: string;
  title: string;
  region: string;
  category: string;
  date: string;
  severity: 'high' | 'medium' | 'low';
  summary: string;
};

interface UpdatesProps {
  selectedRegion: string;
  selectedCategory: string;
  regions: any[];
  categories: any[];
}

const UpdatesComponent = ({ selectedRegion, selectedCategory, regions, categories }: UpdatesProps) => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [subscriptions] = useState<string[]>(['Fire Safety', 'Labor Law']);

  // Fetch alerts for the authenticated user
  const fetchAlerts = async (showRefreshLoader = false) => {
    try {
      if (showRefreshLoader) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      // Get the current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error('Auth error:', userError);
        setError('Authentication error. Please log in again.');
        return;
      }

      if (!user) {
        setError('You must be logged in to view alerts.');
        return;
      }

      console.log('Current user ID:', user.id);
      console.log('Current user:', user);

      // First, let's try to fetch ALL alerts to see what's in the database
      const { data: allAlerts, error: allAlertsError } = await supabase
        .from('alerts')
        .select('*');

      console.log('All alerts in database:', allAlerts);
      console.log('All alerts error:', allAlertsError);

      // Let's also check what user_ids are in the alerts table
      if (allAlerts && allAlerts.length > 0) {
        console.log('User IDs in alerts table:', allAlerts.map(alert => alert.user_id));
        console.log('Does our user ID match any alerts?', allAlerts.some(alert => alert.user_id === user.id));
      }

      // Now fetch alerts for the specific user
      const { data, error: fetchError } = await supabase
        .from('alerts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.error('Fetch error:', fetchError);
        setError(`Error fetching alerts: ${fetchError.message}`);
        return;
      }

      console.log('User-specific alerts:', data);
      console.log('Number of alerts found:', data?.length || 0);

      // Let's also try a test query to see if we can access the table at all
      const { data: testData, error: testError } = await supabase
        .from('alerts')
        .select('id, title, user_id')
        .limit(5);
      
      console.log('Test query (first 5 alerts):', testData);
      console.log('Test query error:', testError);

      // Format the alerts data - handle missing columns gracefully
      const formattedAlerts = (data || []).map((alert) => {
        console.log('Processing alert:', alert);
        return {
          id: alert.id,
          title: alert.title || 'No title',
          region: alert.region || 'Unknown region',
          category: alert.category || 'General',
          date: new Date(alert.date || alert.created_at).toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          }),
          severity: alert.severity || 'medium',
          summary: alert.summary || 'No summary available',
        };
      });

      console.log('Formatted alerts:', formattedAlerts);
      setAlerts(formattedAlerts);
      
    } catch (err: any) {
      console.error('Unexpected error:', err);
      setError('Failed to fetch alerts. Please try again.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Refresh alerts manually
  const refreshAlerts = () => {
    fetchAlerts(true);
  };

  // Scroll to top when component mounts
  useEffect(() => {
    const container = document.querySelector('.updates-container');
    if (container) {
      container.scrollTop = 0;
    }
  }, []);

  // Initial fetch on component mount
  useEffect(() => {
    fetchAlerts();
  }, []);

  return (
    <div className="updates-container p-4 sm:p-8 bg-gradient-to-b from-white to-gray-50 h-full overflow-y-auto">
      <div className="text-center mb-8 sm:mb-12">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl mb-4 shadow-xl">
          <Bell className="h-10 w-10 text-white" />
        </div>
        <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">Regulation Updates</h2>
        <p className="text-base sm:text-lg text-gray-600 px-4">Stay informed about the latest construction law changes</p>
      </div>

      <div className="max-w-5xl mx-auto">
        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border-2 border-red-200 text-red-700 p-4 rounded-xl mb-6 shadow-sm">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-5 w-5" />
                <span className="font-medium">{error}</span>
              </div>
              <button
                onClick={() => fetchAlerts()}
                className="ml-2 px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg text-sm font-medium transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Subscription Info with Refresh Button */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl p-4 sm:p-6 mb-6 sm:mb-8 shadow-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-white rounded-lg shadow-sm">
                <Bell className="h-5 w-5 text-blue-600" />
              </div>
              <span className="font-bold text-blue-900 text-base sm:text-lg">Alert Subscriptions</span>
            </div>
            <button
              onClick={refreshAlerts}
              disabled={isRefreshing}
              className="flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-all duration-200 disabled:opacity-50 shadow-sm font-medium"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
          <p className="text-blue-800 font-medium">
            You're subscribed to {subscriptions.join(' and ')} updates for India
          </p>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-600 border-t-transparent mx-auto mb-4"></div>
            <p className="text-gray-600 font-medium text-lg">Loading alerts...</p>
          </div>
        ) : (
          /* Alerts List */
          <div className="space-y-4 sm:space-y-5">
            {alerts.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border-2 border-gray-200 shadow-sm">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                  <AlertCircle className="h-8 w-8 text-gray-400" />
                </div>
                <p className="text-gray-600 font-medium text-lg mb-4">No alerts available</p>
                <button
                  onClick={refreshAlerts}
                  disabled={isRefreshing}
                  className="inline-flex items-center space-x-2 px-6 py-3 text-white bg-blue-600 hover:bg-blue-700 border-2 border-blue-600 hover:border-blue-700 rounded-xl transition-all disabled:opacity-50 shadow-md"
                >
                  <RefreshCw className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
                  <span className="font-medium">Check for Updates</span>
                </button>
              </div>
            ) : (
              alerts.map((alert) => (
                <div key={alert.id} className="border-2 border-gray-200 rounded-2xl p-5 sm:p-6 hover:shadow-xl hover:border-blue-300 transition-all duration-200 bg-white group">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-start space-x-4 mb-3">
                        <div
                          className={`w-4 h-4 rounded-full mt-1.5 flex-shrink-0 shadow-md ${
                            alert.severity === 'high' ? 'bg-gradient-to-br from-red-500 to-red-600 animate-pulse' :
                            alert.severity === 'medium' ? 'bg-gradient-to-br from-yellow-500 to-orange-500' : 'bg-gradient-to-br from-green-500 to-green-600'
                          }`}
                        ></div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
                            <span className="font-bold text-gray-900 text-base sm:text-lg group-hover:text-blue-600 transition-colors">{alert.title}</span>
                            <span className="text-sm text-gray-500 font-medium bg-gray-100 px-3 py-1 rounded-full w-fit">{alert.region}</span>
                          </div>
                        </div>
                      </div>
                      <p className="text-gray-700 mb-4 text-sm sm:text-base pl-8 leading-relaxed">{alert.summary}</p>
                      <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-gray-600 pl-8">
                        <span className="flex items-center space-x-2 bg-gray-50 px-3 py-1.5 rounded-lg">
                          <Clock className="h-4 w-4 text-blue-600" />
                          <span className="font-medium">{alert.date}</span>
                        </span>
                        <span className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg font-semibold border border-blue-200">{alert.category}</span>
                      </div>
                    </div>
                    <button className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-2 rounded-lg transition-colors flex-shrink-0 self-start sm:self-center">
                      <AlertCircle className="h-6 w-6" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default UpdatesComponent;



// import React, { useState, useRef, useEffect } from 'react';
// import { Send, Upload, FileText, AlertCircle, CheckSquare, Bell, Settings, User, MapPin, Search, Download, Share2, Clock, Shield, BookOpen, Zap } from 'lucide-react';


// type Alert = {
//   id: number;
//   title: string;
//   region: string;
//   category: string;
//   date: string;
//   severity: 'high' | 'medium' | 'low';
//   summary: string;
// };

// const UpdatesComponent = () => {
//   const mockAlerts: Alert[] = [
//     {
//       id: 1,
//       title: "New Fire Safety Amendment",
//       region: "India",
//       category: "Fire Safety",
//       date: "2 hours ago",
//       severity: "high",
//       summary: "Updated requirements for fire exits in commercial buildings"
//     },
//     {
//       id: 2,
//       title: "Labor Law Update",
//       region: "India",
//       category: "Labor",
//       date: "1 day ago",
//       severity: "medium",
//       summary: "Changes to overtime compensation rules"
//     }
//   ];

//   return (
//     <div className="p-6">
//       <div className="text-center mb-8">
//         <Bell className="h-16 w-16 text-orange-600 mx-auto mb-4" />
//         <h2 className="text-2xl font-bold text-gray-900 mb-2">Regulation Updates</h2>
//         <p className="text-gray-600">Stay informed about the latest construction law changes</p>
//       </div>

//       <div className="max-w-4xl mx-auto">
//         <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
//           <div className="flex items-center space-x-2">
//             <Bell className="h-5 w-5 text-blue-600" />
//             <span className="font-medium text-blue-900">Alert Subscriptions</span>
//           </div>
//           <p className="text-blue-700 mt-2">
//             You're subscribed to Fire Safety and Labor Law updates for India
//           </p>
//         </div>

//         <div className="space-y-4">
//           {mockAlerts.map((alert) => (
//             <div key={alert.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
//               <div className="flex items-start justify-between">
//                 <div className="flex-1">
//                   <div className="flex items-center space-x-3 mb-2">
//                     <div className={`w-3 h-3 rounded-full ${
//                       alert.severity === 'high' ? 'bg-red-500' : 
//                       alert.severity === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
//                     }`}></div>
//                     <span className="font-medium text-gray-900">{alert.title}</span>
//                     <span className="text-sm text-gray-500">{alert.region}</span>
//                   </div>
//                   <p className="text-gray-700 mb-2">{alert.summary}</p>
//                   <div className="flex items-center space-x-4 text-sm text-gray-500">
//                     <span className="flex items-center space-x-1">
//                       <Clock className="h-4 w-4" />
//                       <span>{alert.date}</span>
//                     </span>
//                     <span className="px-2 py-1 bg-gray-100 rounded text-xs">
//                       {alert.category}
//                     </span>
//                   </div>
//                 </div>
//                 <button className="text-blue-600 hover:text-blue-800">
//                   <AlertCircle className="h-5 w-5" />
//                 </button>
//               </div>
//             </div>
//           ))}
//         </div>
//       </div>
//     </div>
//   );
// };

// export default UpdatesComponent;