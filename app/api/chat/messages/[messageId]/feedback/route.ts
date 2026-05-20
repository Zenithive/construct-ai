/**
 * POST | PUT /api/chat/messages/[messageId]/feedback
 * Saves like/dislike feedback on the message row and forwards to the Python AI backend (PUT).
 */
import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { queryOne } from "@/lib/db";
import { ok, err } from "@/lib/helpers";
import { normalizeFeedbackType } from "@/lib/feedback";
import type { ChatMessageRow } from "@/types";

async function handleFeedback(
  req: NextRequest,
  params: { messageId: string },
): Promise<Response> {
  const authUser = requireAuth(req);
  const { messageId } = params;

  const body = await req.json();
  const { session_id, feedback_type, feedback_reason } = body ?? {};

  if (!session_id) return err("session_id is required.");

  const normalized = normalizeFeedbackType(feedback_type);
  if (!normalized)
    return err('feedback_type must be "Like" or "Dislike".');

  const message = await queryOne<ChatMessageRow>(
    `UPDATE chat_messages
       SET feedback_type   = $1,
           feedback_reason = $2
       WHERE id = $3 AND session_id = $4 AND user_id = $5
       RETURNING id`,
    [
      normalized,
      feedback_reason ?? null,
      messageId,
      session_id,
      authUser.userId,
    ],
  );
  if (!message) return err("Message not found.", 404);

  try {
    console.log(
      `[feedback] Submitting feedback to Python AI backend: messageId=${messageId}, sessionId=${session_id}, feedbackType=${normalized}, feedbackReason=${feedback_reason}`,
    );
    const baseUrl =
      process.env.NEXT_PUBLIC_AI_BASE_URL ||
      "https://construction-ai-new-production-9b17.up.railway.app";

    fetch(`${baseUrl}/api/v1/chat/messages/${messageId}/feedback`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id,
        feedback_type: normalized,
        feedback_reason: feedback_reason ?? "",
      }),
    }).catch((e) =>
      console.warn("[feedback] Python AI backend unavailable:", e?.message),
    );
  } catch (_) {
    // Never let a Python backend error break the user-facing response
  }

  return ok({ success: true });
}

export async function POST(
  req: NextRequest,
  { params }: { params: { messageId: string } },
) {
  try {
    return await handleFeedback(req, params);
  } catch (e) {
    console.error("[POST /api/chat/messages/[messageId]/feedback]", e);
    return err("Internal server error.", 500);
  }
}

/** Alias for clients that use REST PUT for partial updates. */
export async function PUT(
  req: NextRequest,
  context: { params: { messageId: string } },
) {
  try {
    return await handleFeedback(req, context.params);
  } catch (e) {
    console.error("[PUT /api/chat/messages/[messageId]/feedback]", e);
    return err("Internal server error.", 500);
  }
}
