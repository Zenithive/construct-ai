/**
 * Server-side proxy to the Python AI service (used by gated chat route in Phase 4).
 */

const DEFAULT_AI_BASE_URL =
  'https://construction-ai-new-production-9b17.up.railway.app';

export function getAiBaseUrl(): string {
  return (
    process.env.AI_SERVICE_BASE_URL ||
    process.env.NEXT_PUBLIC_AI_BASE_URL ||
    DEFAULT_AI_BASE_URL
  ).replace(/\/$/, '');
}

export interface StreamQueryParams {
  query: string;
  country_code: string;
  user_id: string;
  session_id: string;
  top_k?: number;
  include_sources?: boolean;
}

/**
 * Forward a streaming query to the Python AI service.
 * Caller is responsible for piping response.body to the client.
 */
export async function streamQuery(params: StreamQueryParams): Promise<Response> {
  const baseUrl = getAiBaseUrl();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const apiKey = process.env.AI_SERVICE_API_KEY;
  if (apiKey) headers['X-API-Key'] = apiKey;

  return fetch(`${baseUrl}/api/v1/query/stream`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      query: params.query,
      top_k: params.top_k ?? 10,
      include_sources: params.include_sources ?? true,
      country_code: params.country_code,
      user_id: params.user_id,
      session_id: params.session_id,
    }),
  });
}
