/** Normalize DB / API feedback values to canonical lowercase. */
export function normalizeFeedbackType(
  raw: string | null | undefined
): 'like' | 'dislike' | null {
  if (raw == null || raw === '') return null;
  const t = String(raw).trim().toLowerCase();
  if (t === 'like') return 'like';
  if (t === 'dislike') return 'dislike';
  return null;
}
