/**
 * POST /api/chat/sessions/[id]/send
 * Check usage → save user message → proxy AI stream → save AI message → increment usage on success.
 */
import { NextRequest } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { AuthError, requireAuth } from '@/lib/auth';
import { streamQuery } from '@/lib/ai';
import { checkCanSend, incrementUsage } from '@/lib/billing/usage';
import { insertChatMessage } from '@/lib/chat/messages';
import { assertSessionOwner } from '@/lib/chat/session';
import { err, errCode } from '@/lib/helpers';
import type { Source } from '@/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function sseLine(payload: Record<string, unknown>): string {
  return `data: ${JSON.stringify(payload)}\n\n`;
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authUser = requireAuth(req);
    const session = await assertSessionOwner(params.id, authUser.userId);
    if (!session) return err('Session not found.', 404);

    const usageCheck = await checkCanSend(authUser.userId);
    if (!usageCheck.allowed) {
      return errCode('LIMIT_EXCEEDED', 'Message limit reached for your plan.', 403, {
        usage: {
          used: usageCheck.used,
          limit: usageCheck.limit,
          remaining: usageCheck.remaining,
          planCode: usageCheck.planCode,
          periodStart: usageCheck.periodStart,
          periodEnd: usageCheck.periodEnd,
        },
      });
    }

    const body = await req.json();
    const {
      query: queryText,
      country_code,
      region,
      category,
      content,
    } = body ?? {};

    if (!queryText || typeof queryText !== 'string') {
      return err('query is required.');
    }
    if (!country_code || typeof country_code !== 'string') {
      return err('country_code is required.');
    }

    const displayContent =
      typeof content === 'string' && content.trim() ? content.trim() : queryText.trim();

    const userMessageId = uuidv4();
    await insertChatMessage({
      messageId: userMessageId,
      sessionId: params.id,
      userId: authUser.userId,
      messageType: 'user',
      content: displayContent,
      region: region ?? null,
      category: category ?? null,
    });

    const aiResponse = await streamQuery({
      query: queryText.trim(),
      country_code,
      user_id: authUser.userId,
      session_id: params.id,
    });

    if (!aiResponse.ok || !aiResponse.body) {
      const detail = await aiResponse.text().catch(() => '');
      console.error('[POST send] AI error', aiResponse.status, detail);
      return err('AI service unavailable. Please try again.', 502);
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    let buffer = '';
    let previousContent = '';
    let fullContent = '';
    let currentSources: Source[] = [];
    let receivedAnyContent = false;
    let clientAborted = false;

    req.signal.addEventListener('abort', () => {
      clientAborted = true;
    });

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        controller.enqueue(
          encoder.encode(
            sseLine({
              type: 'user_message',
              data: { id: userMessageId },
            })
          )
        );

        const reader = aiResponse.body!.getReader();

        const processLine = (line: string) => {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data: ') || trimmed.includes('[DONE]')) return;
          try {
            const jsonData = JSON.parse(trimmed.slice(6));
            if (jsonData.type === 'metadata' && jsonData.data) {
              currentSources = [
                ...(jsonData.data.db_sources || []),
                ...(jsonData.data.web_sources || []),
              ];
            }
            if (jsonData.type === 'content' && jsonData.data) {
              const chunk =
                jsonData.data.full_content ||
                jsonData.data.content ||
                jsonData.data.text ||
                '';
              if (chunk && chunk !== previousContent) {
                receivedAnyContent = true;
                previousContent = chunk;
                fullContent = chunk;
              }
            }
            if (jsonData.type === 'error') {
              throw new Error(
                jsonData.data?.message || jsonData.message || 'Stream error'
              );
            }
          } catch (e) {
            if (e instanceof Error && e.message?.includes('Stream error')) throw e;
          }
        };

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              buffer.split('\n').forEach((line) => {
                if (line.trim()) processLine(line);
              });
              break;
            }
            controller.enqueue(value);
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            for (const line of lines) {
              if (line.trim()) processLine(line);
            }
          }

          if (clientAborted) {
            controller.close();
            return;
          }

          if (!receivedAnyContent || !fullContent.trim()) {
            controller.enqueue(
              encoder.encode(
                sseLine({
                  type: 'error',
                  data: { message: 'Empty response from AI service.' },
                })
              )
            );
            controller.close();
            return;
          }

          const aiMessageId = uuidv4();
          await insertChatMessage({
            messageId: aiMessageId,
            sessionId: params.id,
            userId: authUser.userId,
            messageType: 'ai',
            content: fullContent,
            region: region ?? null,
            category: category ?? null,
            sources: currentSources.length > 0 ? currentSources : undefined,
          });

          await incrementUsage(authUser.userId);

          controller.enqueue(
            encoder.encode(
              sseLine({
                type: 'done',
                data: { aiMessageId, userMessageId },
              })
            )
          );
          controller.close();
        } catch (streamErr) {
          console.error('[POST send] stream error', streamErr);
          controller.enqueue(
            encoder.encode(
              sseLine({
                type: 'error',
                data: {
                  message:
                    streamErr instanceof Error
                      ? streamErr.message
                      : 'Stream processing failed.',
                },
              })
            )
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-User-Message-Id': userMessageId,
      },
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return err(e.message, 401);
    }
    console.error('[POST /api/chat/sessions/[id]/send]', e);
    return err('Internal server error.', 500);
  }
}
