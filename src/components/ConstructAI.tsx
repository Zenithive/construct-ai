import React, { useEffect, useState } from 'react';
import { Upload, HardHat, Menu, X } from 'lucide-react';
import ChatWithSidebar from './ChatWithSidebar';
import UpdatesComponent from './Updates';
import UploadComponent from './Upload';
import ChecklistComponent from './CheckList';
import { getUser } from '../api/apiClient';

const ConstructAI = () => {
  const [activeTab, setActiveTab] = useState('chat');
  const [selectedRegion] = useState('india');
  const [selectedCategory] = useState('all');
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [role, setRole] = useState<'admin' | 'user' | null>(null);

  useEffect(() => {
    const user = getUser();
    setRole(user?.email === 'rajvikamani2211@gmail.com' ? 'admin' : 'user');
  }, []);

  if (!role) return (
    <div className="h-screen bg-white flex items-center justify-center">
      <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent" />
    </div>
  );

  const regions = [
    { value: 'india', label: 'India', flag: '🇮🇳' },
    { value: 'usa', label: 'United States', flag: '🇺🇸' },
    { value: 'uk', label: 'United Kingdom', flag: '🇬🇧' },
    { value: 'uae', label: 'UAE', flag: '🇦🇪' },
    { value: 'canada', label: 'Canada', flag: '🇨🇦' },
  ];

  const categories = [
    { value: 'all', label: 'All Categories' },
    { value: 'building-codes', label: 'Building Codes' },
    { value: 'safety-regulations', label: 'Safety Regulations' },
    { value: 'environmental-compliance', label: 'Environmental Compliance' },
    { value: 'zoning-laws', label: 'Zoning Laws' },
    { value: 'labor-laws', label: 'Labor Laws' },
    { value: 'contract-requirements', label: 'Contract Requirements' },
    { value: 'permit-requirements', label: 'Permit Requirements' },
    { value: 'quality-standards', label: 'Quality Standards' },
    { value: 'insurance-requirements', label: 'Insurance Requirements' },
    { value: 'dispute-resolution', label: 'Dispute Resolution' },
  ];

  const tabs = [
    role === 'admin' && { id: 'upload', label: 'Upload & Ask', icon: Upload },
  ].filter(Boolean) as { id: string; label: string; icon: any }[];

  const renderContent = () => {
    switch (activeTab) {
      case 'upload': return <UploadComponent />;
      case 'checklist': return <ChecklistComponent />;
      case 'updates': return <UpdatesComponent selectedRegion={selectedRegion} selectedCategory={selectedCategory} regions={regions} categories={categories} />;
      default: return <ChatWithSidebar selectedRegion={selectedRegion} selectedCategory={selectedCategory} regions={regions} categories={categories} />;
    }
  };

  return (
    <div className="bg-white h-screen flex flex-col overflow-hidden">
      {/* Header — only shown for admin with extra tabs */}
      {tabs.length > 0 && (
        <div className="bg-white border-b border-gray-200 flex-shrink-0 z-40">
          <div className="mx-auto px-4 sm:px-6">
            <div className="flex items-center justify-between h-12">
              <div className="flex items-center space-x-2">
                <div className="bg-blue-600 p-1.5 rounded-lg">
                  <HardHat className="h-4 w-4 text-white" />
                </div>
                <span className="font-semibold text-gray-900 text-sm">ConstructAI</span>
              </div>

              <nav className="hidden sm:flex items-center space-x-1">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        activeTab === tab.id
                          ? 'bg-gray-100 text-gray-900'
                          : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </nav>

              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="sm:hidden p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                {showMobileMenu ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {showMobileMenu && (
            <div className="sm:hidden border-t border-gray-100 px-4 py-2 space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => { setActiveTab(tab.id); setShowMobileMenu(false); }}
                    className={`w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeTab === tab.id ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div className="flex-1 overflow-hidden">{renderContent()}</div>
    </div>
  );
};

export default ConstructAI;
