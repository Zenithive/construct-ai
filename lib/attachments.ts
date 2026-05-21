/**
 * Shared attachment types and helpers for chat file uploads.
 */

export type AttachmentStatus = 'uploading' | 'success' | 'error';

export type ChatAttachment = {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  status: AttachmentStatus;
  serverPath?: string;
  previewUrl?: string;
};

export const DOCUMENT_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
] as const;

export const IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
] as const;

export const CHAT_ATTACHMENT_MIME_TYPES = [...DOCUMENT_MIME_TYPES, ...IMAGE_MIME_TYPES];

export const CHAT_ATTACHMENT_ACCEPT =
  '.pdf,.doc,.docx,.jpg,.jpeg,.png,.webp,.gif,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/*';

export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

export function isImageMime(type: string): boolean {
  return type.startsWith('image/');
}

export function isAllowedChatAttachment(type: string): boolean {
  return (CHAT_ATTACHMENT_MIME_TYPES as readonly string[]).includes(type);
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function getAttachmentIconKind(
  mimeType: string,
  fileName: string
): 'pdf' | 'word' | 'image' | 'file' {
  if (isImageMime(mimeType)) return 'image';
  const lower = fileName.toLowerCase();
  if (mimeType === 'application/pdf' || lower.endsWith('.pdf')) return 'pdf';
  if (
    mimeType.includes('word') ||
    lower.endsWith('.doc') ||
    lower.endsWith('.docx')
  ) {
    return 'word';
  }
  return 'file';
}

export function createAttachmentId(): string {
  return `att-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function revokePreviewUrl(url?: string) {
  if (url) URL.revokeObjectURL(url);
}
