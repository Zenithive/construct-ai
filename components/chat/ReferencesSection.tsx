'use client';

import { useState } from 'react';
import { BookOpen } from 'lucide-react';

type Source = { url?: string; title?: string; [key: string]: unknown };

/* ── Favicon with numbered fallback ─────────────────────────────────────── */
function FaviconImg({ domain, index }: { domain: string; index: number }) {
  const [errored, setErrored] = useState(false);

  if (!domain || errored) {
    return (
      <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded bg-[#E1F5EE] text-[9px] font-bold text-[#1D9E75]">
        {index + 1}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://www.google.com/s2/favicons?domain=${domain}&sz=16`}
      alt=""
      width={14}
      height={14}
      className="h-3.5 w-3.5 flex-shrink-0 rounded-sm"
      onError={() => setErrored(true)}
    />
  );
}

/* ── Main component ──────────────────────────────────────────────────────── */
export function ReferencesSection({
  sources,
  isStreaming,
}: {
  sources: Source[];
  isStreaming?: boolean;
}) {
  return (
    <div className="rounded-xl border border-[#5DCAA5]/30 bg-[#E1F5EE]/40 p-3.5">
      {/* Header row */}
      <div className="mb-2.5 flex items-center gap-1.5">
        {isStreaming ? (
          <div className="h-3.5 w-3.5 flex-shrink-0 animate-spin rounded-full border-2 border-[#1D9E75] border-t-transparent" />
        ) : (
          <BookOpen className="h-3.5 w-3.5 flex-shrink-0 text-[#1D9E75]" />
        )}
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#0F6E56]">
          {isStreaming
            ? `Searching ${sources.length} source${sources.length !== 1 ? 's' : ''}…`
            : 'References'}
        </span>
      </div>

      {/* Source cards */}
      <div className="flex flex-wrap gap-2">
        {sources.map((source, idx) => {
          let domain = '';
          try {
            domain = source.url
              ? new URL(source.url as string).hostname.replace('www.', '')
              : '';
          } catch { /* ignore malformed URLs */ }

          return (
            <a
              key={`ref-${idx}`}
              href={(source.url as string) || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex max-w-[13rem] items-start gap-2 rounded-lg border border-white bg-white px-2.5 py-2 text-left shadow-sm transition-all duration-150 hover:border-[#5DCAA5]/50 hover:bg-[#E1F5EE]/60 hover:shadow"
            >
              <FaviconImg domain={domain} index={idx} />
              <div className="min-w-0">
                <p className="line-clamp-2 text-xs font-medium leading-tight text-[#111] transition-colors group-hover:text-[#1D9E75]">
                  {(source.title as string) || 'Web Source'}
                </p>
                {domain && (
                  <p className="mt-0.5 truncate text-[10px] text-[#999]">{domain}</p>
                )}
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}
