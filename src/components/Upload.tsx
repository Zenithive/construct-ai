
import React, { useState, useRef, useEffect } from 'react';
import { Upload, FileText, Download, Loader2 } from 'lucide-react';
import supabase from '../supaBase/supabaseClient';
import axios from "axios";
type UploadedFile = {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadedAt: Date;
};

const UploadComponent = () => {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch uploaded files from Supabase Storage for the authenticated user
  const fetchFiles = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        setError('You must be logged in to view files.');
        return;
      }
      const userId = user.id;
      const { data, error } = await supabase.storage.from('files').list(`users/${userId}`);
      if (error) {
        setError(error.message);
        return;
      }
      const files = data.map((file) => ({
        id: `users/${userId}/${file.name}`,
        name: file.name,
        size: file.metadata?.size || 0,
        type: file.metadata?.mimetype || 'application/octet-stream',
        uploadedAt: new Date(file.created_at || Date.now()),
      }));
      setUploadedFiles(files);
    } catch (err: any) {
      setError('Failed to fetch files. Please try again.');
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        setMessage(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) {
      setError('Please select at least one file.');
      return;
    }

    setError(null);
    setMessage(null);
    setIsUploading(true);

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      setError('You must be logged in to upload files.');
      setIsUploading(false);
      return;
    }
    const userId = user.id;

    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    const newFiles: UploadedFile[] = [];

    for (const file of files) {
      const f = file as File;
      if (!allowedTypes.includes(f.type)) {
        setError(`Invalid file type for ${f.name}. Please upload PDF, DOC, or DOCX files.`);
        setIsUploading(false);
        return;
      }

      try {
        const fileName = `users/${userId}/doc_${Date.now()}_${f.name}`;
        const { error: uploadError } = await supabase.storage
          .from('files')
          .upload(fileName, f, {
            contentType: f.type,
            upsert: false,
          });

        if (uploadError) {
          setError(`Failed to upload ${f.name}: ${uploadError.message}`);
          setIsUploading(false);
          return;
        }

        // Also send to external API for processing
        const apiSuccess = await sendFileToAPI(f);
        if (!apiSuccess) {
        }

        newFiles.push({
          id: fileName,
          name: f.name,
          size: f.size,
          type: f.type,
          uploadedAt: new Date(),
        });
      } catch (err: any) {
        setError(`Failed to upload ${f.name}. Please try again.`);
        setIsUploading(false);
        return;
      }
    }

    setUploadedFiles((prev) => [...prev, ...newFiles]);
    setMessage('Files uploaded successfully!');
    setIsUploading(false);
    fetchFiles();
  };

  const handleDownload = async (fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('files')
        .download(fileName);

      if (error) {
        setError(error.message);
        return;
      }

      const url = window.URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName.split('/').pop()!.split('_').slice(1).join('_');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setError('Failed to download file. Please try again.');
    }
  };

  // Send file to external API for processing
  const sendFileToAPI = async (file: File) => {
    try {
      // Verify the file is actually a File object
      if (!(file instanceof File)) {
        return false;
      }

      const formData = new FormData();
      formData.append("file", file, file.name);

      const response = await axios.post("https://api.constructionai.chat/api/v1/company/documents/upload", formData);

      const data = response.data;

      if (data.status === "processing") {
        return true;
      } else {
        return false;
      }
    } catch (error: any) {
      return false;
    }
  };





  return (
    <div className="bg-gray-50">
      <div className="p-4 sm:p-6">
        <div className="text-center mb-6 sm:mb-8">
          <Upload className="h-12 w-12 sm:h-16 sm:w-16 text-blue-600 mx-auto mb-3 sm:mb-4" />
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Upload & Analyze Documents</h2>
          <p className="text-sm sm:text-base text-gray-600 px-4">Upload contracts, tenders, or regulations for AI analysis</p>
        </div>

        <div className="max-w-4xl mx-auto">
          {error && (
            <div className="bg-red-100 text-red-700 p-3 rounded-md mb-4 text-sm">
              {error}
            </div>
          )}
          {message && (
            <div className="bg-green-100 text-green-700 p-3 rounded-md mb-4 text-sm">
              {message}
            </div>
          )}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 sm:p-8 text-center hover:border-blue-500 transition-colors">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              multiple
              accept=".pdf,.doc,.docx"
              disabled={isUploading}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className={`px-4 py-2 sm:px-6 sm:py-3 rounded-lg mb-3 sm:mb-4 text-sm sm:text-base font-medium inline-flex items-center space-x-2 ${
                isUploading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 cursor-pointer'
              } text-white`}
            >
              {isUploading && <Loader2 className="h-4 w-4 animate-spin" />}
              <span>{isUploading ? 'Uploading...' : 'Choose Files'}</span>
            </button>
            <p className="text-gray-500 text-sm sm:text-base">or drag and drop PDF, DOC, DOCX files here</p>
          </div>

          {uploadedFiles.length > 0 && (
            <div className="mt-6 sm:mt-8">
              <h3 className="text-lg font-medium mb-3 sm:mb-4">Uploaded Files</h3>
              <div className="space-y-3">
                {uploadedFiles.map((file) => (
                  <div key={file.id} className="flex items-center space-x-3 p-3 sm:p-4 border rounded-lg bg-white hover:shadow-sm transition-shadow">
                    <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm sm:text-base truncate">{file.name}</div>
                      <div className="text-xs sm:text-sm text-gray-500">
                        {(file.size / 1024 / 1024).toFixed(2)} MB • Uploaded {file.uploadedAt.toLocaleTimeString()}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDownload(file.id)}
                      className="text-blue-600 hover:text-blue-800 flex-shrink-0"
                    >
                      <Download className="h-4 w-4 sm:h-5 sm:w-5" />
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