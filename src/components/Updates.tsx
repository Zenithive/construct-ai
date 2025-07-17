import React, { useState, useRef, useEffect } from 'react';
import { Send, Upload, FileText, AlertCircle, CheckSquare, Bell, Settings, User, MapPin, Search, Download, Share2, Clock, Shield, BookOpen, Zap } from 'lucide-react';


type Alert = {
  id: number;
  title: string;
  region: string;
  category: string;
  date: string;
  severity: 'high' | 'medium' | 'low';
  summary: string;
};

const UpdatesComponent = () => {
  const mockAlerts: Alert[] = [
    {
      id: 1,
      title: "New Fire Safety Amendment",
      region: "India",
      category: "Fire Safety",
      date: "2 hours ago",
      severity: "high",
      summary: "Updated requirements for fire exits in commercial buildings"
    },
    {
      id: 2,
      title: "Labor Law Update",
      region: "India",
      category: "Labor",
      date: "1 day ago",
      severity: "medium",
      summary: "Changes to overtime compensation rules"
    }
  ];

  return (
    <div className="p-6">
      <div className="text-center mb-8">
        <Bell className="h-16 w-16 text-orange-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Regulation Updates</h2>
        <p className="text-gray-600">Stay informed about the latest construction law changes</p>
      </div>

      <div className="max-w-4xl mx-auto">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center space-x-2">
            <Bell className="h-5 w-5 text-blue-600" />
            <span className="font-medium text-blue-900">Alert Subscriptions</span>
          </div>
          <p className="text-blue-700 mt-2">
            You're subscribed to Fire Safety and Labor Law updates for India
          </p>
        </div>

        <div className="space-y-4">
          {mockAlerts.map((alert) => (
            <div key={alert.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <div className={`w-3 h-3 rounded-full ${
                      alert.severity === 'high' ? 'bg-red-500' : 
                      alert.severity === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                    }`}></div>
                    <span className="font-medium text-gray-900">{alert.title}</span>
                    <span className="text-sm text-gray-500">{alert.region}</span>
                  </div>
                  <p className="text-gray-700 mb-2">{alert.summary}</p>
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <span className="flex items-center space-x-1">
                      <Clock className="h-4 w-4" />
                      <span>{alert.date}</span>
                    </span>
                    <span className="px-2 py-1 bg-gray-100 rounded text-xs">
                      {alert.category}
                    </span>
                  </div>
                </div>
                <button className="text-blue-600 hover:text-blue-800">
                  <AlertCircle className="h-5 w-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default UpdatesComponent;