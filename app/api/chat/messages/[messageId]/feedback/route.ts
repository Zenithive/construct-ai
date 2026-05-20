/**
 * POST /api/chat/messages/[messageId]/feedback
 * Saves like/dislike feedback for an AI message in our DB and forwards
 * it to the Python AI backend.
 */
import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { queryOne } from "@/lib/db";
import { ok, err } from "@/lib/helpers";
import type { ChatMessageRow } from "@/types";

export async function POST(
  req: NextRequest,
  { params }: { params: { messageId: string } },
) {
  try {
    const authUser = requireAuth(req);
    const { messageId } = params;

    const body = await req.json();
    const { session_id, feedback_type, feedback_reason } = body ?? {};

    if (!session_id) return err("session_id is required.");
    if (!feedback_type || !["like", "dislike"].includes(feedback_type))
      return err('feedback_type must be "like" or "dislike".');

    // Update feedback directly on the message row
    const message = await queryOne<ChatMessageRow>(
      `UPDATE chat_messages
       SET feedback_type   = $1,
           feedback_reason = $2
       WHERE id = $3 AND session_id = $4 AND user_id = $5
       RETURNING id`,
      [
        feedback_type,
        feedback_reason ?? null,
        messageId,
        session_id,
        authUser.userId,
      ],
    );
    if (!message) return err("Message not found.", 404);

    // Forward to Python AI backend (fire-and-forget; don't block the response)
    try {
      console.log(
        `[feedback] Submitting feedback to Python AI backend: messageId=${messageId}, sessionId=${session_id}, feedbackType=${feedback_type}, feedbackReason=${feedback_reason}`,
      );
      const baseUrl =
        process.env.NEXT_PUBLIC_AI_BASE_URL ||
        "https://construction-ai-new-production-9b17.up.railway.app";

      fetch(`${baseUrl}/api/v1/chat/messages/${messageId}/feedback`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id,
          feedback_type,
          feedback_reason: feedback_reason ?? "",
        }),
      }).catch((e) =>
        console.warn("[feedback] Python AI backend unavailable:", e?.message),
      );
    } catch (_) {
      // Never let a Python backend error break the user-facing response
    }

    return ok({ success: true });
  } catch (e) {
    console.error("[POST /api/chat/messages/[messageId]/feedback]", e);
    return err("Internal server error.", 500);
  }
}
