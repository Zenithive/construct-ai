import React, { useEffect, useState, useRef } from 'react';
import {
  Upload, CheckSquare, Bell, User, Search, Shield, Menu, X, Power,
  LogOut
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ChatWithSidebar from './ChatWithSidebar';
import UpdatesComponent from './Updates';
import UploadComponent from './Upload';
import ChecklistComponent from './CheckList';
import supabase from '../supaBase/supabaseClient';

const ConstructAI = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('chat');
  const [selectedRegion, ] = useState('india');
  const [selectedCategory,] = useState('all');
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [role, setRole] = useState<'admin' | 'user' | null>(null);
  const [,setFullName] = useState('User'); // ✅ persistent fullName
  const [firstName, setFirstName] = useState('User'); // ✅ persistent firstName

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchUserData = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) {
        return;
      }

      const user = data.user;
      if (user) {
        // Role check
        setRole(user.email === 'rajvikamani2211@gmail.com' ? 'admin' : 'user');

        // ✅ Get name from metadata (stored during signup)
        const meta = user.user_metadata;

        if (meta?.firstName || meta?.lastName) {
          const fullNameValue = `${meta.firstName || ''} ${meta.lastName || ''}`.trim();
          const firstNameValue = meta.firstName || 'User';
          setFullName(fullNameValue);
          setFirstName(firstNameValue);
        } else {
          const emailName = user.email?.split('@')[0] || 'User';
          setFullName(user.email || 'User'); // fallback
          setFirstName(emailName);
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
        return <ChatWithSidebar selectedRegion={selectedRegion} selectedCategory={selectedCategory} regions={regions} categories={categories} />;
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
    <div className="bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 min-h-screen">

      {/* Header */}
      <div className="bg-white/80 backdrop-blur-md border-b border-gray-200/50 shadow-sm sticky top-0 z-40">
        <div className=" mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">

            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-2 sm:p-2.5 rounded-xl shadow-lg">
                <Shield className="h-7 w-7 sm:h-9 sm:w-9 text-white" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  ConstructAI
                </h1>
                <p className="text-xs text-gray-600 hidden sm:block font-medium">Your AI compliance co-pilot</p>
              </div>
            </div>

            {/* Desktop Icons */}
            <div className="hidden sm:flex items-center space-x-4">
              <div className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                <User className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-semibold text-gray-700">{firstName}</span>
              </div>

              {/* Profile Dropdown with Logout */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                  className="p-2.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
                >
                  <LogOut className="h-5 w-5" />
                </button>

                {/* Dropdown Menu */}
                {showProfileDropdown && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden">
                    <div className="py-1">
                      <div className="px-4 py-3 border-b border-gray-100">
                        <p className="text-xs text-gray-500">Signed in as</p>
                        <p className="text-sm font-semibold text-gray-900 truncate">{firstName}</p>
                      </div>
                      <button
                        onClick={async () => {
                          setShowProfileDropdown(false);
                          try {
                            const { error } = await supabase.auth.signOut();
                            if (error) {
                              return;
                            }
                            navigate('/');
                          } catch (err: any) {
                          }
                        }}
                        className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2 transition-colors"
                      >
                        <Power className="h-4 w-4" />
                        <span className="font-medium">Logout</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="sm:hidden p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
            >
              {showMobileMenu ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {showMobileMenu && (
        <div className="sm:hidden bg-white/95 backdrop-blur-md border-b shadow-lg animate-in slide-in-from-top">
          <div className="px-4 py-3 space-y-2">
            <div className="px-3 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 mb-3">
              <p className="text-xs text-gray-600">Signed in as</p>
              <p className="text-sm font-semibold text-gray-900">{firstName}</p>
            </div>

            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => { setActiveTab(tab.id); setShowMobileMenu(false); }}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-left transition-all duration-200 ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="font-medium">{tab.label}</span>
                </button>
              );
            })}

            {/* Mobile Logout */}
            <button
              onClick={async () => {
                try {
                  const { error } = await supabase.auth.signOut();
                  if (error) {
                    return;
                  }
                  navigate('/');
                } catch (err: any) {
                }
              }}
              className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-left text-red-600 hover:bg-red-50 transition-colors mt-2"
            >
              <Power className="h-5 w-5" />
              <span className="font-medium">Logout</span>
            </button>
          </div>
        </div>
      )}

      {/* Desktop Navigation */}
      <div className="hidden sm:block bg-white/70 backdrop-blur-md border-b border-gray-200/50 shadow-sm">
        <div className=" mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-2 sm:space-x-4">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-4 px-4 border-b-3 font-semibold text-sm transition-all duration-200 relative group ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-blue-600 hover:bg-blue-50/50'
                  }`}
                >
                  <Icon className={`h-5 w-5 transition-transform ${activeTab === tab.id ? 'scale-110' : 'group-hover:scale-105'}`} />
                  <span>{tab.label}</span>
                  {activeTab === tab.id && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-indigo-500"></div>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className=" mx-auto px-0 sm:px-4 lg:px-6 py-4 sm:py-6">
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 overflow-hidden">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default ConstructAI;
