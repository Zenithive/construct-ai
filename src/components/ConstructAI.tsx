import React, { useEffect, useState, useRef } from 'react';
import {
  Upload, CheckSquare, Bell, Settings, User, Search, Shield, Zap, Menu, X, LogOut
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ChatComponent from './ChatComponent.tsx';
import UpdatesComponent from './Updates.tsx';
import UploadComponent from './Upload.tsx';
import ChecklistComponent from './CheckList.tsx';
import supabase from '../supaBase/supabaseClient.tsx';

const ConstructAI = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('chat');
  const [selectedRegion, setSelectedRegion] = useState('india');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [role, setRole] = useState<'admin' | 'user' | null>(null);
  const [fullName, setFullName] = useState('User'); // ✅ persistent fullName

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchUserData = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) {
        console.error("Error fetching user:", error.message);
        return;
      }

      const user = data.user;
      if (user) {
        // Role check
        setRole(user.email === 'admin@gmail.com' ? 'admin' : 'user');

        // ✅ Get name from metadata (stored during signup)
        const meta = user.user_metadata;
        if (meta?.firstName || meta?.lastName) {
          setFullName(`${meta.firstName || ''} ${meta.lastName || ''}`.trim());
        } else {
          setFullName(user.email || 'User'); // fallback
        }
      }
    };

    fetchUserData();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowProfileDropdown(false);
      }
    };

    if (showProfileDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showProfileDropdown]);

  if (!role) return <p>Loading...</p>;

  const regions = [
    { value: 'india', label: 'India', flag: '🇮🇳' },
    { value: 'usa', label: 'United States', flag: '🇺🇸' },
    { value: 'uk', label: 'United Kingdom', flag: '🇬🇧' },
    { value: 'uae', label: 'UAE', flag: '🇦🇪' },
    { value: 'canada', label: 'Canada', flag: '🇨🇦' }
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
    { value: 'dispute-resolution', label: 'Dispute Resolution' }
  ];

  const tabs = [
    { id: 'chat', label: 'Ask AI', icon: Search },
    role === 'admin' && { id: 'upload', label: 'Upload & Ask', icon: Upload },
    { id: 'checklist', label: 'Checklists', icon: CheckSquare },
    { id: 'updates', label: 'Updates', icon: Bell },
  ].filter(Boolean) as { id: string; label: string; icon: any }[];

  const renderContent = () => {
    switch (activeTab) {
      case 'chat':
        return <ChatComponent selectedRegion={selectedRegion} selectedCategory={selectedCategory} regions={regions} categories={categories} />;
      case 'upload':
        return <UploadComponent />;
      case 'checklist':
        return <ChecklistComponent />;
      case 'updates':
        return <UpdatesComponent selectedRegion={selectedRegion} selectedCategory={selectedCategory} regions={regions} categories={categories} />;
      default:
        return <UpdatesComponent selectedRegion={selectedRegion} selectedCategory={selectedCategory} regions={regions} categories={categories} />;
    }
  };

  return (
    <div className="bg-gray-50">

      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="bg-blue-600 p-1.5 sm:p-2 rounded-lg">
                <Shield className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-gray-900">ConstructAI</h1>
                <p className="text-xs text-gray-500 hidden sm:block">Your AI compliance co-pilot</p>
              </div>
            </div>

            {/* Desktop Icons */}
            <div className="hidden sm:flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Zap className="h-4 w-4 text-yellow-500" />
                <span>{fullName}</span> {/* ✅ Show persistent fullName */}
              </div>
              
              <button className="p-2 text-gray-400 hover:text-gray-600/">
                <Settings className="h-4 w-4 sm:h-5 sm:w-5"/>
              </button>

              {/* Logout */}
              <button
                onClick={async () => {
                  try {
                    const { error } = await supabase.auth.signOut();
                    if (error) {
                      console.error('Logout error:', error.message);
                      return;
                    }
                    navigate('/');
                  } catch (err: any) {
                    console.error('Unexpected error during logout:', err);
                  }
                }}
                className="relative group p-2 text-gray-400 hover:text-gray-600 flex items-center"
              >
                <User className="h-5 w-5" />
                <span
                  className="absolute left-full ml-2 px-2 py-1 rounded bg-gray-800 text-white text-xs 
                  opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap"
                >
                  Logout
                </span>
              </button>
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                  className="p-2 text-gray-400 hover:text-gray-600 flex items-center"
                >
                  <User className="h-5 w-5" />
                </button>

                {/* Dropdown Menu */}
                {showProfileDropdown && (
                  <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-50">
                    <div className="py-1">
                      <button
                        onClick={async () => {
                          setShowProfileDropdown(false);
                          try {
                            const { error } = await supabase.auth.signOut();
                            if (error) {
                              console.error('Logout error:', error.message);
                              return;
                            }
                            navigate('/');
                          } catch (err: any) {
                            console.error('Unexpected error during logout:', err);
                          }
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                      >
                        <LogOut className="h-4 w-4" />
                        <span>Logout</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>



            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="sm:hidden p-2 text-gray-400 hover:text-gray-600"
            >
              {showMobileMenu ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {showMobileMenu && (
        <div className="sm:hidden bg-white border-b shadow-sm">
          <div className="px-4 py-2 space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => { setActiveTab(tab.id); setShowMobileMenu(false); }}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${activeTab === tab.id ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="font-medium">{tab.label}</span>
                </button>
              );
            })}

            {/* Mobile Logout */}
            <button
              onClick={() => navigate('/')}
              className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left text-gray-700 hover:bg-gray-50"
            >
              <LogOut className="h-5 w-5" />
              <span className="font-medium">Logout</span>
            </button>
          </div>
        </div>
      )}

      {/* Desktop Navigation */}
      <div className="hidden sm:block bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-4 sm:space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-3 sm:py-4 px-1 sm:px-2 border-b-2 font-medium text-sm transition-colors ${activeTab === tab.id ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                >
                  <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto">
        {renderContent()}
      </div>
    </div>
  );
};

export default ConstructAI;
