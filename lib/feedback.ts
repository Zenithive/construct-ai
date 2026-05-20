/** Normalize DB / API feedback values to canonical title-case. */
export function normalizeFeedbackType(
  raw: string | null | undefined
): 'Like' | 'Dislike' | null {
  if (raw == null || raw === '') return null;
  const t = String(raw).trim().toLowerCase();
  if (t === 'like') return 'Like';
  if (t === 'dislike') return 'Dislike';
  return null;
}
