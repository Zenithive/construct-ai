import React, { useState, useRef, useEffect } from 'react';
import { Upload, CheckSquare, Bell, Settings, User, Search,  Shield, Zap } from 'lucide-react';
import ChatComponent from './ChatComponent.tsx';
import CheckListComponent from './CheckList.tsx';
import UpdatesComponent from './Updates.tsx';
import UploadComponent from './Upload.tsx';


const ConstructAI = () => {
  const [activeTab, setActiveTab] = useState('chat');
  const [selectedRegion, setSelectedRegion] = useState('india');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const regions = [
    { value: 'india', label: 'India', flag: '🇮🇳' },
    { value: 'usa', label: 'United States', flag: '🇺🇸' },
    { value: 'uk', label: 'United Kingdom', flag: '🇬🇧' },
    { value: 'uae', label: 'UAE', flag: '🇦🇪' },
    { value: 'canada', label: 'Canada', flag: '🇨🇦' }
  ];

  const categories = [
    { value: 'all', label: 'All Categories' },
    { value: 'fire-safety', label: 'Fire Safety' },
    { value: 'labor', label: 'Labor Laws' },
    { value: 'structural', label: 'Structural Standards' },
    { value: 'environmental', label: 'Environmental' },
    { value: 'electrical', label: 'Electrical Safety' }
  ];

  const tabs = [
    { id: 'chat', label: 'Ask AI', icon: Search },
    { id: 'upload', label: 'Upload & Ask', icon: Upload },
    { id: 'checklist', label: 'Checklists', icon: CheckSquare },
    { id: 'alerts', label: 'Updates', icon: Bell }
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'chat':
        return (
          <ChatComponent 
            selectedRegion={selectedRegion}
            selectedCategory={selectedCategory}
            regions={regions}
            categories={categories}
          />
        );
      case 'upload':
        return <UploadComponent />;
      case 'checklist':
        return <CheckListComponent />;
      case 'alerts':
        return <UpdatesComponent />;
      default:
        return <ChatComponent selectedRegion={selectedRegion} selectedCategory={selectedCategory} regions={regions} categories={categories} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-600 p-2 rounded-lg">
                <Shield className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">ConstructAI</h1>
                <p className="text-xs text-gray-500">Your AI compliance co-pilot</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Zap className="h-4 w-4 text-yellow-500" />
                <span>MVP Demo</span>
              </div>
              <button className="p-2 text-gray-400 hover:text-gray-600">
                <Settings className="h-5 w-5" />
              </button>
              <button className="p-2 text-gray-400 hover:text-gray-600">
                <User className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto h-[calc(100vh-120px)]">
        {renderContent()}
      </div>
    </div>
  );
};

export default ConstructAI;