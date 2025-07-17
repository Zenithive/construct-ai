import React, { useState, useRef, useEffect } from 'react';
import { Send, Upload, FileText, AlertCircle, CheckSquare, Bell, Settings, User, MapPin, Search, Download, Share2, Clock, Shield, BookOpen, Zap } from 'lucide-react';

type UploadedFile = {
  id: number;
  name: string;
  size: number;
  type: string;
  uploadedAt: Date;
};

const UploadComponent = () => {
  const [uploadedFiles, setUploadedFiles] = useState([] as UploadedFile[]);
  const fileInputRef = useRef(null);

  const handleFileUpload = (event) => {
    const files = Array.from(event.target.files);
    const newFiles = files.map(file => {
      const f = file as File;
      return {
        id: Date.now() + Math.random(),
        name: f.name,
        size: f.size,
        type: f.type,
        uploadedAt: new Date()
      };
    });
    setUploadedFiles(prev => [...prev, ...newFiles]);
  };

  return (
    <div className="p-6">
      <div className="text-center mb-8">
        <Upload className="h-16 w-16 text-blue-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Upload & Analyze Documents</h2>
        <p className="text-gray-600">Upload contracts, tenders, or regulations for AI analysis</p>
      </div>

      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          multiple
          accept=".pdf,.doc,.docx"
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 mb-4"
        >
          Choose Files
        </button>
        <p className="text-gray-500">or drag and drop PDF, DOC, DOCX files here</p>
      </div>

      {uploadedFiles.length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-medium mb-4">Uploaded Files</h3>
          <div className="space-y-3">
            {uploadedFiles.map((file) => (
              <div key={file.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                <FileText className="h-8 w-8 text-blue-600" />
                <div className="flex-1">
                  <div className="font-medium">{file.name}</div>
                  <div className="text-sm text-gray-500">
                    {(file.size / 1024 / 1024).toFixed(2)} MB • Uploaded {file.uploadedAt.toLocaleTimeString()}
                  </div>
                </div>
                <button className="text-blue-600 hover:text-blue-800">
                  <Search className="h-5 w-5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadComponent;