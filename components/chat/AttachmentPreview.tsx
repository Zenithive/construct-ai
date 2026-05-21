'use client';

import { FileText, FileType, ImageIcon, Loader2, X } from 'lucide-react';
import {
  formatFileSize,
  getAttachmentIconKind,
  isImageMime,
  type ChatAttachment,
} from '@/lib/attachments';

type AttachmentPreviewProps = {
  attachments: ChatAttachment[];
  onRemove: (id: string) => void;
};

function FileTypeIcon({ mimeType, name }: { mimeType: string; name: string }) {
  const kind = getAttachmentIconKind(mimeType, name);
  const className = 'h-5 w-5 shrink-0';

  if (kind === 'pdf') {
    return (
      <span
        className={`${className} text-red-600`}
        aria-hidden
      >
        <FileType className="h-5 w-5" strokeWidth={1.75} />
      </span>
    );
  }
  if (kind === 'word') {
    return (
      <span
        className={`${className} text-blue-600`}
        aria-hidden
      >
        <FileText className="h-5 w-5" strokeWidth={1.75} />
      </span>
    );
  }
  return (
    <span
      className={`${className} text-[#999]`}
      aria-hidden
    >
      <FileText className="h-5 w-5" strokeWidth={1.75} />
    </span>
  );
}

function AttachmentChip({
  attachment,
  onRemove,
}: {
  attachment: ChatAttachment;
  onRemove: (id: string) => void;
}) {
  const isImage = isImageMime(attachment.type) && attachment.previewUrl;
  const isLoading = attachment.status === 'uploading';
  const isError = attachment.status === 'error';

  return (
    <div
      role="listitem"
      className="group relative flex max-w-[min(100%,220px)] min-w-0 items-center gap-2.5 rounded-xl border border-black/[0.09] bg-white px-2.5 py-2 shadow-sm transition-colors hover:bg-[#f7f7f5] sm:max-w-[220px]"
      title={attachment.name}
    >
      <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-black/[0.09] bg-[#f7f7f5]">
        {isImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={attachment.previewUrl}
            alt=""
            className={`h-full w-full object-cover transition-opacity ${isLoading ? 'opacity-50' : ''}`}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <FileTypeIcon mimeType={attachment.type} name={attachment.name} />
          </div>
        )}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <Loader2 className="h-4 w-4 animate-spin text-white" aria-hidden />
          </div>
        )}
        {!isImage && isImageMime(attachment.type) && !attachment.previewUrl && (
          <div className="flex h-full w-full items-center justify-center">
            <ImageIcon className="h-5 w-5 text-[var(--text-tertiary)]" />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1 pr-5">
        <p className="truncate text-[13px] font-medium leading-tight text-[#111]">
          {attachment.name}
        </p>
        <p className="mt-0.5 truncate text-[11px] text-[#999]">
          {formatFileSize(attachment.size)}
          {isLoading && ' · Uploading…'}
          {isError && ' · Failed'}
        </p>
      </div>

      <button
        type="button"
        onClick={() => onRemove(attachment.id)}
        className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-md text-[#999] opacity-100 transition-colors hover:bg-black/[0.06] hover:text-[#555] sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100"
        aria-label={`Remove ${attachment.name}`}
      >
        <X className="h-3.5 w-3.5" strokeWidth={2} />
      </button>
    </div>
  );
}

export function AttachmentPreview({
  attachments,
  onRemove,
}: AttachmentPreviewProps) {
  if (attachments.length === 0) return null;

  return (
    <div
      role="list"
      aria-label="Attached files"
      className="flex flex-wrap gap-2 px-2.5 pb-0 pt-2.5 sm:px-3"
    >
      {attachments.map((attachment, index) => (
        <div
          key={attachment.id}
          className="attachment-chip"
          style={{ animationDelay: `${index * 45}ms` }}
        >
          <AttachmentChip attachment={attachment} onRemove={onRemove} />
        </div>
      ))}
    </div>
  );
}
