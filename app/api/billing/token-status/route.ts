/**
 * GET /api/billing/token-status
 * Proxies GET /api/v1/subscription/status/{user_id} on the AI service.
 * Returns: { user_id, is_subscribed, total_tokens_used, token_limit }
 */
import { NextRequest } from 'next/server';
import { AuthError, requireAuth } from '@/lib/auth';
import { getAiBaseUrl } from '@/lib/ai';
import { ok, err } from '@/lib/helpers';
import type { AiTokenStatus } from '@/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const authUser = requireAuth(req);

    const baseUrl = getAiBaseUrl();
    const url = `${baseUrl}/api/v1/subscription/status/${authUser.userId}`;

    const headers: Record<string, string> = {};
    const apiKey = process.env.AI_SERVICE_API_KEY;
    if (apiKey) headers['X-API-Key'] = apiKey;

    const res = await fetch(url, { headers, cache: 'no-store' });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error('[token-status] AI service error', res.status, text);
      return err('Failed to fetch token status from AI service.', 502);
    }

    const data = (await res.json()) as AiTokenStatus;

    return ok({
      userId: data.user_id,
      isSubscribed: data.is_subscribed,
      totalTokensUsed: data.total_tokens_used,
      tokenLimit: data.token_limit,
    });
  } catch (e) {
    if (e instanceof AuthError) return err(e.message, 401);
    console.error('[GET /api/billing/token-status]', e);
    return err('Internal server error.', 500);
  }
}
