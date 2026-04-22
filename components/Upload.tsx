'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Upload, FileText, X, Loader2, CheckCircle } from 'lucide-react';
import { uploadApi, AI_BASE_URL } from '@/services/apiClient';
import axios from 'axios';

type UploadedFile = { id: string; name: string; size: number; type: string; uploadedAt: Date; status: 'uploading' | 'success' | 'error' };

const UploadComponent = () => {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (error) { const t = setTimeout(() => setError(null), 5000); return () => clearTimeout(t); } }, [error]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;
    setError(null); setIsUploading(true);
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

    for (const file of files) {
      if (!allowedTypes.includes(file.type)) { setError(`Invalid file type: ${file.name}. Only PDF, DOC, DOCX allowed.`); setIsUploading(false); return; }
      const tempFile: UploadedFile = { id: `temp-${Date.now()}-${file.name}`, name: file.name, size: file.size, type: file.type, uploadedAt: new Date(), status: 'uploading' };
      setUploadedFiles(prev => [...prev, tempFile]);
      try {
        const result = await uploadApi.uploadFile(file) as any;
        await sendFileToAPI(file);
        setUploadedFiles(prev => prev.map(f => f.id === tempFile.id ? { ...f, id: result.file.path, status: 'success' as const } : f));
      } catch {
        setUploadedFiles(prev => prev.map(f => f.id === tempFile.id ? { ...f, status: 'error' as const } : f));
        setError(`Failed to upload ${file.name}`);
      }
    }
    setIsUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const sendFileToAPI = async (file: File) => {
    try {
      const formData = new FormData();
      formData.append('file', file, file.name);
      const response = await axios.post(`${AI_BASE_URL}/api/v1/documents/upload`, formData);
      return response.data.status === 'processing';
    } catch { return false; }
  };

  return (
    <div className="h-full bg-white flex flex-col overflow-hidden">
      <div className="flex-shrink-0 border-b border-gray-200 px-6 py-4">
        <h1 className="text-xl font-semibold text-gray-900">Upload Documents</h1>
        <p className="text-sm text-gray-500 mt-1">Upload construction documents for AI analysis</p>
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm flex items-start space-x-2"><span className="mt-0.5">⚠</span><span>{error}</span></div>}
          <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-gray-300 hover:border-gray-400 rounded-xl p-12 text-center cursor-pointer transition-colors bg-gray-50 hover:bg-gray-100">
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} multiple accept=".pdf,.doc,.docx" disabled={isUploading} className="hidden" />
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mb-3"><Upload className="h-6 w-6 text-blue-600" /></div>
              <p className="text-sm font-medium text-gray-700 mb-1">{isUploading ? 'Uploading...' : 'Click to upload or drag and drop'}</p>
              <p className="text-xs text-gray-500">PDF, DOC, or DOCX (max 10MB)</p>
            </div>
          </div>
          {uploadedFiles.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Uploaded files ({uploadedFiles.length})</h3>
              <div className="space-y-2">
                {uploadedFiles.map(file => (
                  <div key={file.id} className="flex items-center space-x-3 p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex-shrink-0">
                      {file.status === 'uploading' ? <Loader2 className="h-5 w-5 text-blue-600 animate-spin" /> : file.status === 'success' ? <CheckCircle className="h-5 w-5 text-green-600" /> : <FileText className="h-5 w-5 text-gray-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                      <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB{file.status === 'uploading' && ' • Uploading...'}{file.status === 'success' && ' • Ready'}{file.status === 'error' && ' • Failed'}</p>
                    </div>
                    <button onClick={() => setUploadedFiles(prev => prev.filter(f => f.id !== file.id))} className="flex-shrink-0 p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors" title="Remove">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UploadComponent;
