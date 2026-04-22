/**
 * GET /api/alerts
 * Query params: ?region=india&category=fire-safety (optional)
 * Returns regulation alerts for the authenticated user.
 */
import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { query } from '@/lib/db';
import { ok, err } from '@/lib/helpers';
import type { AlertRow } from '@/types';

export async function GET(req: NextRequest) {
  try {
    const authUser = requireAuth(req);
    const { searchParams } = req.nextUrl;
    const region = searchParams.get('region');
    const category = searchParams.get('category');

    const conditions: string[] = ['user_id = $1'];
    const values: unknown[] = [authUser.userId];
    let idx = 2;

    if (region)   { conditions.push(`LOWER(region) = LOWER($${idx++})`);   values.push(region); }
    if (category) { conditions.push(`LOWER(category) = LOWER($${idx++})`); values.push(category); }

    const alerts = await query<AlertRow>(
      `SELECT id, title, region, category, severity, summary, date, created_at
       FROM alerts WHERE ${conditions.join(' AND ')} ORDER BY date DESC LIMIT 100`,
      values
    );

    return ok({ alerts: alerts.map(a => ({ id: a.id, title: a.title, region: a.region, category: a.category, severity: a.severity, summary: a.summary, date: a.date, created_at: a.created_at })) });
  } catch (e) {
    console.error('[GET /api/alerts]', e);
    return err('Internal server error.', 500);
  }
}
