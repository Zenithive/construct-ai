/**
 * GET /api/admin/users
 * Admin-only. Returns paginated user list with stats.
 *
 * Query params:
 *   page        number  (default 1)
 *   limit       number  (default 20, max 100)
 *   search      string  (matches name or email, case-insensitive)
 *   plan        string  (free | pro | enterprise)
 *   status      string  (inactive | active | past_due | canceled)
 *   dateFrom    ISO     (created_at >=)
 *   dateTo      ISO     (created_at <=)
 *   sortBy      string  (name | email | created_at | chats | tokens | plan_type) default created_at
 *   sortDir     string  (asc | desc) default desc
 */
import { NextRequest } from 'next/server';
import { requireAdmin, AuthError, ForbiddenError } from '@/lib/auth';
import { queryOne } from '@/lib/db';
import { ok, err, parsePagination } from '@/lib/helpers';
import pool from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req, queryOne);

    const sp = req.nextUrl.searchParams;
    const { limit, offset } = parsePagination(sp);

    const search  = sp.get('search')?.trim()  ?? '';
    const plan    = sp.get('plan')?.trim()    ?? '';
    const status  = sp.get('status')?.trim()  ?? '';
    const dateFrom = sp.get('dateFrom')?.trim() ?? '';
    const dateTo   = sp.get('dateTo')?.trim()   ?? '';

    const VALID_SORT = ['name', 'email', 'created_at', 'chats', 'tokens', 'plan_type'] as const;
    const VALID_DIR  = ['asc', 'desc'] as const;
    const rawSort = sp.get('sortBy') ?? 'created_at';
    const rawDir  = sp.get('sortDir') ?? 'desc';
    const sortBy  = VALID_SORT.includes(rawSort as typeof VALID_SORT[number]) ? rawSort : 'created_at';
    const sortDir = VALID_DIR.includes(rawDir as typeof VALID_DIR[number]) ? rawDir : 'desc';

    // Build dynamic WHERE clauses
    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (search) {
      conditions.push(
        `(LOWER(u.email) LIKE $${idx} OR LOWER(u."firstName" || ' ' || u."lastName") LIKE $${idx})`
      );
      params.push(`%${search.toLowerCase()}%`);
      idx++;
    }
    if (plan) {
      conditions.push(`u.plan_type = $${idx++}`);
      params.push(plan);
    }
    if (status) {
      conditions.push(`u.subscription_status = $${idx++}`);
      params.push(status);
    }
    if (dateFrom) {
      conditions.push(`u.created_at >= $${idx++}`);
      params.push(dateFrom);
    }
    if (dateTo) {
      conditions.push(`u.created_at <= $${idx++}`);
      params.push(dateTo);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    // Map sortBy to SQL expression
    const sortExpr: Record<string, string> = {
      name:       `LOWER(u."firstName" || ' ' || u."lastName")`,
      email:      'LOWER(u.email)',
      created_at: 'u.created_at',
      chats:      'chat_count',
      tokens:     'total_tokens',
      plan_type:  'u.plan_type',
    };
    const orderExpr = sortExpr[sortBy] ?? 'u.created_at';

    const dataQuery = `
      SELECT
        u.id,
        u.email,
        u."firstName"           AS "firstName",
        u."lastName"            AS "lastName",
        u.is_verified,
        u.country,
        u.plan_type,
        u.subscription_status,
        u.stripe_customer_id,
        u.current_period_start,
        u.current_period_end,
        u.created_at,
        u.role,
        COUNT(DISTINCT cs.id)::int                          AS chat_count,
        COALESCE(SUM(ut.used_tokens), 0)::bigint            AS total_tokens,
        COALESCE(SUM(ut.used_messages), 0)::int             AS total_messages
      FROM users u
      LEFT JOIN chat_sessions cs ON cs.user_id = u.id
      LEFT JOIN usage_tracking ut ON ut.user_id = u.id
      ${where}
      GROUP BY u.id
      ORDER BY ${orderExpr} ${sortDir.toUpperCase()}
      LIMIT $${idx++} OFFSET $${idx++}
    `;
    params.push(limit, offset);

    const countQuery = `
      SELECT COUNT(*)::int AS total
      FROM users u
      ${where}
    `;
    // count uses same params minus limit/offset
    const countParams = params.slice(0, params.length - 2);

    const [dataResult, countResult] = await Promise.all([
      pool.query(dataQuery, params),
      pool.query(countQuery, countParams),
    ]);

    const users = dataResult.rows.map(row => ({
      id:                 row.id,
      email:              row.email,
      firstName:          row.firstName,
      lastName:           row.lastName,
      isVerified:         row.is_verified,
      country:            row.country,
      planType:           row.plan_type,
      subscriptionStatus: row.subscription_status,
      stripeCustomerId:   row.stripe_customer_id,
      periodStart:        row.current_period_start,
      periodEnd:          row.current_period_end,
      createdAt:          row.created_at,
      role:               row.role,
      chatCount:          row.chat_count,
      totalTokens:        Number(row.total_tokens),
      totalMessages:      row.total_messages,
    }));

    const total = countResult.rows[0]?.total ?? 0;

    return ok({
      users,
      pagination: {
        total,
        page: Math.floor(offset / limit) + 1,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (e) {
    if (e instanceof AuthError)    return err(e.message, 401);
    if (e instanceof ForbiddenError) return err(e.message, 403);
    console.error('[GET /api/admin/users]', e);
    return err('Internal server error.', 500);
  }
}
