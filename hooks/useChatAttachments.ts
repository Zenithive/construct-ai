'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import {
  AI_BASE_URL,
  getUserId,
  loadCurrentSessionId,
  uploadApi,
} from '@/services/apiClient';
import {
  type ChatAttachment,
  createAttachmentId,
  isAllowedChatAttachment,
  isImageMime,
  MAX_ATTACHMENT_BYTES,
  revokePreviewUrl,
} from '@/lib/attachments';

async function sendFileToDocumentApi(file: File): Promise<boolean> {
  try {
    const userId = getUserId();
    if (!userId) throw new Error('User not found.');
    const sessionId = loadCurrentSessionId();
    const formData = new FormData();
    formData.append('file', file, file.name);
    formData.append('user_id', userId);
    if (sessionId) formData.append('session_id', sessionId);
    const response = await axios.post(`${AI_BASE_URL}/api/v1/documents/upload`, formData);
    return response.data.status === 'processing';
  } catch {
    return false;
  }
}

export function useChatAttachments() {
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const attachmentsRef = useRef(attachments);

  useEffect(() => {
    attachmentsRef.current = attachments;
  }, [attachments]);

  useEffect(() => {
    return () => {
      attachmentsRef.current.forEach(a => revokePreviewUrl(a.previewUrl));
    };
  }, []);

  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(null), 5000);
    return () => clearTimeout(t);
  }, [error]);

  const isUploading = attachments.some(a => a.status === 'uploading');
  const hasReadyAttachments = attachments.some(a => a.status === 'success');

  const removeAttachment = useCallback((id: string) => {
    setAttachments(prev => {
      const target = prev.find(a => a.id === id);
      revokePreviewUrl(target?.previewUrl);
      return prev.filter(a => a.id !== id);
    });
  }, []);

  const clearAttachments = useCallback(() => {
    setAttachments(prev => {
      prev.forEach(a => revokePreviewUrl(a.previewUrl));
      return [];
    });
  }, []);

  const uploadSingle = useCallback(async (attachment: ChatAttachment) => {
    try {
      const result = (await uploadApi.uploadFile(attachment.file)) as {
        file?: { path?: string };
      };
      await sendFileToDocumentApi(attachment.file);
      setAttachments(prev =>
        prev.map(a =>
          a.id === attachment.id
            ? {
                ...a,
                status: 'success' as const,
                serverPath: result.file?.path,
              }
            : a
        )
      );
    } catch {
      setAttachments(prev =>
        prev.map(a =>
          a.id === attachment.id ? { ...a, status: 'error' as const } : a
        )
      );
      setError(`Failed to upload ${attachment.name}`);
    }
  }, []);

  const addFiles = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;
      setError(null);

      const valid: ChatAttachment[] = [];

      for (const file of files) {
        if (!isAllowedChatAttachment(file.type)) {
          setError(`Invalid file type: ${file.name}. Use PDF, DOC, DOCX, or images.`);
          continue;
        }
        if (file.size > MAX_ATTACHMENT_BYTES) {
          setError(`${file.name} exceeds the 10 MB limit.`);
          continue;
        }

        const previewUrl = isImageMime(file.type)
          ? URL.createObjectURL(file)
          : undefined;

        valid.push({
          id: createAttachmentId(),
          file,
          name: file.name,
          size: file.size,
          type: file.type,
          status: 'uploading',
          previewUrl,
        });
      }

      if (valid.length === 0) return;

      setAttachments(prev => [...prev, ...valid]);

      await Promise.all(valid.map(uploadSingle));
    },
    [uploadSingle]
  );

  return {
    attachments,
    error,
    isUploading,
    hasReadyAttachments,
    addFiles,
    removeAttachment,
    clearAttachments,
  };
}
